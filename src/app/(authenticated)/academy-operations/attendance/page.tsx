'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  ClipboardCheck, 
  Search, 
  Filter, 
  Calendar, 
  Users, 
  Trophy, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Activity,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function HistoricAttendancePage() {
  const supabase = createClient();
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters State
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedProgramId, selectedDate]);

  async function fetchInitialData() {
    try {
      const { data: pData } = await supabase
        .from('programs')
        .select('id, name')
        .eq('is_active', true);
      setPrograms(pData || []);
    } catch (err) {
      console.error('Error fetching programs:', err);
    }
  }

  async function fetchAttendance() {
    setIsLoading(true);
    try {
      let query = supabase
        .from('attendance')
        .select(`
          id,
          date,
          present,
          program:program_id (id, name),
          enrollment:enrollment_id (participant_name, client_phone),
          instructor:instructor_id (name)
        `)
        .order('date', { ascending: false });

      if (selectedProgramId) {
        query = query.eq('program_id', selectedProgramId);
      }
      if (selectedDate) {
        query = query.eq('date', selectedDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAttendanceRecords(data || []);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Filter local state based on text search
  const filteredRecords = attendanceRecords.filter(record => {
    const studentName = record.enrollment?.participant_name?.toLowerCase() || '';
    const phone = record.enrollment?.client_phone || '';
    const coachName = record.instructor?.name?.toLowerCase() || '';
    const search = searchQuery.toLowerCase();
    return studentName.includes(search) || phone.includes(search) || coachName.includes(search);
  });

  // Calculate metrics
  const totalRecords = filteredRecords.length;
  const presentCount = filteredRecords.filter(r => r.present).length;
  const absentCount = totalRecords - presentCount;
  const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 100;

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
            Attendance Registers
          </h1>
          <p className="text-white/40 text-sm font-medium mt-1">Audit historic coach-signed session logs and check class attendance performance.</p>
        </div>
      </header>

      {/* Overview stats panels */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 text-left">
        <div className="glass p-6 rounded-3xl border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Attendance Rate</p>
            <p className="text-3xl font-black text-gold font-mono mt-1">{attendanceRate}%</p>
          </div>
          <div className="w-12 h-12 bg-gold/10 border border-gold/20 rounded-2xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-gold" />
          </div>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total Logs</p>
            <p className="text-3xl font-black text-white font-mono mt-1">{totalRecords}</p>
          </div>
          <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-black text-emerald-400">Presents</p>
            <p className="text-3xl font-black text-emerald-400 font-mono mt-1">{presentCount}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-black text-red-400">Absents</p>
            <p className="text-3xl font-black text-red-400 font-mono mt-1">{absentCount}</p>
          </div>
          <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
        </div>
      </div>

      {/* Control panel and filters */}
      <section className="glass rounded-[2rem] border border-white/5 overflow-hidden shadow-pitch text-left">
        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-4 flex-1">
            
            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1 md:flex-initial">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search athlete, phone, coach..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:border-gold/30 text-xs font-medium"
              />
            </div>

            {/* Program filter */}
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

            {/* Date filter */}
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-white text-xs font-bold focus:outline-none focus:border-gold/30"
              />
            </div>

          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-white/30">
            <Filter className="w-3.5 h-3.5" /> ACTIVE FILTERS
          </div>
        </div>

        {/* Attendance Register Grid / Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-gold animate-spin" />
              <p className="text-xs text-white/40 uppercase tracking-widest font-black">Syncing registers database...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-20 text-white/30 border-b border-white/5 p-6">
              <Users className="w-12 h-12 text-white/10 mx-auto mb-3" />
              <p className="text-sm font-bold uppercase tracking-wider">No matching logs found</p>
              <p className="text-xs text-white/20 mt-1">Adjust filters or search parameters above to view past registers.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01] text-[10px] font-black uppercase tracking-wider text-white/40">
                  <th className="py-5 px-8">Date</th>
                  <th className="py-5 px-6">Program</th>
                  <th className="py-5 px-6">Participant Athlete</th>
                  <th className="py-5 px-6">Assigned Facilitator</th>
                  <th className="py-5 px-6 text-center">Register Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredRecords.map((record) => {
                  const formattedDate = new Date(record.date).toLocaleDateString('en-KE', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });
                  return (
                    <tr key={record.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-4.5 px-8 font-mono font-bold text-white/80 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-white/25 shrink-0" />
                        {formattedDate}
                      </td>
                      <td className="py-4.5 px-6 font-display font-extrabold text-white uppercase italic">
                        {record.program?.name || 'Class'}
                      </td>
                      <td className="py-4.5 px-6">
                        <div className="font-bold text-white">{record.enrollment?.participant_name}</div>
                        <div className="text-[10px] text-white/40 mt-0.5">{record.enrollment?.client_phone}</div>
                      </td>
                      <td className="py-4.5 px-6 font-medium text-white/70">
                        {record.instructor?.name || 'Unassigned Facilitator'}
                      </td>
                      <td className="py-4.5 px-6 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-md font-bold uppercase tracking-wider text-[9px] ${
                          record.present
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {record.present ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Present
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-red-400" /> Absent
                            </>
                          )}
                        </span>
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
