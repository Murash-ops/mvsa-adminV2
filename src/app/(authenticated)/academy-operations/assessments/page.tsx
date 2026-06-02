'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { 
  Trophy, 
  Search, 
  Filter, 
  Calendar, 
  Users, 
  Loader2, 
  ArrowLeft,
  Activity,
  AlertTriangle,
  User,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  ClipboardCheck
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function StandaloneAssessmentsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { staff } = useAuth();
  
  // Auth state checks
  const isAuthorized = staff?.role === 'super_admin' || staff?.role === 'academy_coo';

  // Data States
  const [assessments, setAssessments] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedCoachId, setSelectedCoachId] = useState('');
  const [selectedAttentionFlag, setSelectedAttentionFlag] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isAuthorized) {
      fetchInitialData();
      fetchAssessments();
    }
  }, [isAuthorized]);

  async function fetchInitialData() {
    try {
      // 1. Fetch active programs
      const { data: pData } = await supabase
        .from('programs')
        .select('id, name')
        .eq('is_active', true);
      setPrograms(pData || []);

      // 2. Fetch coaches
      const { data: cData } = await supabase
        .from('staff')
        .select('id, name')
        .eq('role', 'coach')
        .order('name');
      setCoaches(cData || []);
    } catch (err) {
      console.error('Error fetching filters data:', err);
    }
  }

  async function fetchAssessments() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('player_assessments')
        .select(`
          id,
          assessment_date,
          overall_grade,
          attention_flag,
          technical_ratings,
          attitude_ratings,
          enrollment_id,
          enrollments:enrollment_id (
            id,
            participant_name,
            program_id,
            programs:program_id (id, name)
          ),
          coach:coach_id (
            id,
            name
          )
        `)
        .order('assessment_date', { ascending: false });

      if (error) throw error;
      setAssessments(data || []);
    } catch (err) {
      console.error('Error fetching assessments:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Helper to average standard JSON ratings
  const getRatingsAverage = (ratings: any) => {
    const values = Object.values(ratings || {});
    if (values.length === 0) return 0;
    const numValues = values.map(v => Number(v)).filter(v => !isNaN(v));
    if (numValues.length === 0) return 0;
    return numValues.reduce((a, b) => a + b, 0) / numValues.length;
  };

  // Client-side filtering
  const filteredAssessments = assessments.filter(record => {
    // 1. Search Query
    const playerName = record.enrollments?.participant_name?.toLowerCase() || '';
    const search = searchQuery.toLowerCase();
    if (search && !playerName.includes(search)) return false;

    // 2. Program Filter
    if (selectedProgramId && record.enrollments?.program_id?.toString() !== selectedProgramId) return false;

    // 3. Coach Filter
    if (selectedCoachId && record.coach?.id !== selectedCoachId) return false;

    // 4. Attention Flag Filter
    if (selectedAttentionFlag !== 'all') {
      const flag = record.attention_flag?.toLowerCase() || 'none';
      if (selectedAttentionFlag === 'none' && flag !== 'none') return false;
      if (selectedAttentionFlag !== 'none' && flag !== selectedAttentionFlag) return false;
    }

    // 5. Date Range Filter
    if (startDate || endDate) {
      const dateStr = record.assessment_date;
      if (dateStr) {
        if (startDate && dateStr < startDate) return false;
        if (endDate && dateStr > endDate) return false;
      } else {
        return false;
      }
    }

    return true;
  });

  // Calculate Metrics
  const totalCount = filteredAssessments.length;
  const urgentCount = filteredAssessments.filter(a => a.attention_flag === 'urgent').length;
  const concernCount = filteredAssessments.filter(a => a.attention_flag === 'concern').length;
  
  const averageGrade = (() => {
    let sum = 0;
    let count = 0;
    filteredAssessments.forEach(ass => {
      if (ass.overall_grade) {
        const val = parseFloat(ass.overall_grade);
        if (!isNaN(val)) {
          sum += val;
          count++;
          return;
        }
      }
      const techAvg = getRatingsAverage(ass.technical_ratings);
      const attAvg = getRatingsAverage(ass.attitude_ratings);
      if (techAvg || attAvg) {
        sum += (techAvg + attAvg) / 2;
        count++;
      }
    });
    return count > 0 ? (sum / count).toFixed(1) : 'N/A';
  })();

  // Render Access Denied state if unauthorized
  if (staff && !isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center flex-grow p-10 min-h-screen text-center bg-forest-darkest">
        <div className="glass max-w-md p-8 rounded-[2rem] border border-red-500/20 bg-red-950/5 flex flex-col items-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-display font-extrabold text-white uppercase italic tracking-tight">Access Restricted</h2>
          <p className="text-white/50 text-xs font-semibold uppercase tracking-widest text-gold mt-1">Super Admin & Academy COO Only</p>
          <p className="text-white/40 text-sm font-medium mt-4 leading-relaxed">
            You do not possess the required clearance to view the comprehensive Player Assessments ledger.
          </p>
          <Link 
            href="/" 
            className="mt-8 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-white/10"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 p-6 lg:p-10 animate-entrance min-h-full">
      {/* Header */}
      <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 text-left">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Link 
              href="/academy-operations" 
              className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-gold transition-colors border border-white/10 rounded-lg px-3 py-1.5 hover:bg-white/5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Operations
            </Link>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-1 bg-gold rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">REVENUE STREAM 2</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tighter leading-none italic uppercase">
            Player Assessments
          </h1>
          <p className="text-white/40 text-sm font-medium mt-1">Dedicated ledger for squad assessments, skills mapping, and performance flags.</p>
        </div>
      </header>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 text-left">
        <div className="glass p-6 rounded-3xl border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Averages Squad Score</p>
            <p className="text-3xl font-black text-gold font-mono mt-1">{averageGrade}{averageGrade !== 'N/A' && '/10'}</p>
          </div>
          <div className="w-12 h-12 bg-gold/10 border border-gold/20 rounded-2xl flex items-center justify-center">
            <Trophy className="w-5 h-5 text-gold" />
          </div>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total Reports</p>
            <p className="text-3xl font-black text-white font-mono mt-1">{totalCount}</p>
          </div>
          <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-black text-red-400">Urgent Flags</p>
            <p className="text-3xl font-black text-red-400 font-mono mt-1">{urgentCount}</p>
          </div>
          <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-black text-gold">Concern Flags</p>
            <p className="text-3xl font-black text-gold font-mono mt-1">{concernCount}</p>
          </div>
          <div className="w-12 h-12 bg-gold/10 border border-gold/20 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-gold" />
          </div>
        </div>
      </div>

      {/* Control Panel / Filter Bar */}
      <section className="glass rounded-[2rem] border border-white/5 overflow-hidden shadow-pitch text-left">
        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-4 flex-1">
            
            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1 md:flex-initial">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search player name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:border-gold/30 text-xs font-medium"
              />
            </div>

            {/* Program Filter */}
            <div className="relative">
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className="pl-4 pr-10 py-3 rounded-2xl border border-white/10 bg-white/5 text-white text-xs font-bold appearance-none bg-forest-dark focus:outline-none focus:border-gold/30"
              >
                <option value="">All Programs</option>
                {programs.map(prog => (
                  <option key={prog.id} value={prog.id}>{prog.name}</option>
                ))}
              </select>
            </div>

            {/* Coach Filter */}
            <div className="relative">
              <select
                value={selectedCoachId}
                onChange={(e) => setSelectedCoachId(e.target.value)}
                className="pl-4 pr-10 py-3 rounded-2xl border border-white/10 bg-white/5 text-white text-xs font-bold appearance-none bg-forest-dark focus:outline-none focus:border-gold/30"
              >
                <option value="">All Coaches</option>
                {coaches.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Attention Flag Filter */}
            <div className="relative">
              <select
                value={selectedAttentionFlag}
                onChange={(e) => setSelectedAttentionFlag(e.target.value)}
                className="pl-4 pr-10 py-3 rounded-2xl border border-white/10 bg-white/5 text-white text-xs font-bold appearance-none bg-forest-dark focus:outline-none focus:border-gold/30"
              >
                <option value="all">All Flags</option>
                <option value="none">No Flags</option>
                <option value="concern">Concern</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-white text-xs font-bold focus:outline-none focus:border-gold/30"
              />
              <span className="text-white/40 text-xs font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-white text-xs font-bold focus:outline-none focus:border-gold/30"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-white/30">
            <Filter className="w-3.5 h-3.5" /> ACTIVE FILTERS
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-gold animate-spin" />
              <p className="text-xs text-white/40 uppercase tracking-widest font-black">Syncing assessments ledger...</p>
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="text-center py-20 text-white/30 border-b border-white/5 p-6">
              <Trophy className="w-12 h-12 text-white/10 mx-auto mb-3" />
              <p className="text-sm font-bold uppercase tracking-wider">No matching assessments found</p>
              <p className="text-xs text-white/20 mt-1">Adjust filters or search parameters above to view historic evaluations.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01] text-[10px] font-black uppercase tracking-wider text-white/40">
                  <th className="py-5 px-8">Player Name</th>
                  <th className="py-5 px-6">Program</th>
                  <th className="py-5 px-6">Assessing Coach</th>
                  <th className="py-5 px-6 text-center">Overall Grade</th>
                  <th className="py-5 px-6 text-center">Attention Status</th>
                  <th className="py-5 px-6">Assessment Date</th>
                  <th className="py-5 px-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredAssessments.map((record) => {
                  const formattedDate = new Date(record.assessment_date).toLocaleDateString('en-KE', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  // Calculate calculated rating average
                  const techAvg = getRatingsAverage(record.technical_ratings);
                  const attAvg = getRatingsAverage(record.attitude_ratings);
                  const calculatedGrade = techAvg && attAvg ? ((techAvg + attAvg) / 2).toFixed(1) : (techAvg || attAvg || 0).toFixed(1);
                  const overallGradeDisplay = record.overall_grade || (calculatedGrade !== '0.0' ? `${calculatedGrade} / 10` : 'N/A');

                  const flag = record.attention_flag || 'none';

                  return (
                    <tr 
                      key={record.id} 
                      onClick={() => router.push(`/players/${record.enrollment_id}`)}
                      className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                    >
                      <td className="py-4.5 px-8 font-bold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-gold" />
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-gold transition-colors">{record.enrollments?.participant_name || 'N/A'}</p>
                          <p className="text-[10px] text-white/40 mt-0.5">ID: {record.enrollment_id}</p>
                        </div>
                      </td>
                      <td className="py-4.5 px-6 font-display font-extrabold text-white uppercase italic">
                        {record.enrollments?.programs?.name || 'N/A'}
                      </td>
                      <td className="py-4.5 px-6 font-medium text-white/70">
                        {record.coach?.name || 'Unassigned Coach'}
                      </td>
                      <td className="py-4.5 px-6 text-center font-mono font-bold text-gold text-sm">
                        {overallGradeDisplay}
                      </td>
                      <td className="py-4.5 px-6 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-md font-bold uppercase tracking-wider text-[9px] ${
                          flag === 'urgent'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : flag === 'concern'
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : 'bg-white/5 text-white/40 border-white/10'
                        }`}>
                          {flag === 'urgent' && <ShieldAlert className="w-3 h-3 text-red-400 animate-pulse" />}
                          {flag === 'concern' && <AlertTriangle className="w-3 h-3 text-yellow-400" />}
                          {flag}
                        </span>
                      </td>
                      <td className="py-4.5 px-6 font-mono text-white/60">
                        {formattedDate}
                      </td>
                      <td className="py-4.5 px-8 text-right" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/players/${record.enrollment_id}`}
                          className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-gold hover:text-white transition-colors border border-gold/20 rounded-lg px-2.5 py-1 hover:bg-gold/10"
                        >
                          Profile <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
