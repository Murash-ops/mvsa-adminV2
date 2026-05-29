'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ChevronRight,
  ShieldCheck,
  Trophy,
  Activity,
  Star,
  MessageSquare,
  AlertTriangle,
  User,
  ShieldAlert,
  Sliders,
  TrendingUp,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

export default function InstructorPortal() {
  const { staff } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<any | null>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assessment Modal / Drawer state
  const [isAssessOpen, setIsAssessOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<any | null>(null);
  const [playerType, setPlayerType] = useState<'outfield' | 'goalkeeper'>('outfield');
  const [overallGrade, setOverallGrade] = useState('B');
  const [attentionFlag, setAttentionFlag] = useState<'none' | 'new_player' | 'concern' | 'urgent'>('none');
  const [personalNote, setPersonalNote] = useState('');
  const [focusAreas, setFocusAreas] = useState('');

  // Ratings states (1 to 5 stars)
  const [techRatings, setTechRatings] = useState<Record<string, number>>({});
  const [techNotes, setTechNotes] = useState<Record<string, string>>({});
  const [attRatings, setAttRatings] = useState<Record<string, number>>({
    teamwork: 4,
    discipline: 4,
    coachability: 4
  });
  const [attNotes, setAttNotes] = useState<Record<string, string>>({
    teamwork: '',
    discipline: '',
    coachability: ''
  });

  // Profile Viewer state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileEnrollment, setProfileEnrollment] = useState<any | null>(null);
  const [historicalAssessments, setHistoricalAssessments] = useState<any[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);

  // Technical metrics mapping
  const technicalMetrics = {
    outfield: [
      { id: 'passing_short', label: 'Short Passing' },
      { id: 'passing_long', label: 'Long Passing' },
      { id: 'dribbling', label: 'Dribbling' },
      { id: 'shooting', label: 'Shooting' },
      { id: 'ball_mastery', label: 'Ball Mastery' },
      { id: 'ball_control', label: 'Ball Control' }
    ],
    goalkeeper: [
      { id: 'shot_stopping', label: 'Shot Stopping' },
      { id: 'positioning', label: 'Positioning' },
      { id: 'passing_short', label: 'Short Passing' },
      { id: 'distribution_long', label: 'Distribution (Long)' },
      { id: 'shooting_outfield', label: 'Shooting (Outfield)' },
      { id: 'ball_control', label: 'Ball Control' }
    ]
  };

  const attitudeMetrics = [
    { id: 'teamwork', label: 'Teamwork & Conduct' },
    { id: 'discipline', label: 'Discipline & Punctuality' },
    { id: 'coachability', label: 'Coachability & Focus' }
  ];

  useEffect(() => {
    if (staff) {
      fetchPrograms();
    }
  }, [staff]);

  // Initializing ratings
  useEffect(() => {
    const defaultTech: Record<string, number> = {};
    const defaultTechNotes: Record<string, string> = {};
    technicalMetrics[playerType].forEach(metric => {
      defaultTech[metric.id] = 4;
      defaultTechNotes[metric.id] = '';
    });
    setTechRatings(defaultTech);
    setTechNotes(defaultTechNotes);
  }, [playerType]);

  async function fetchPrograms() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('instructor_id', staff?.id)
      .eq('is_active', true);

    if (!error && data) {
      setPrograms(data);
    }
    setIsLoading(false);
  }

  async function fetchRoster(programId: number) {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*')
      .eq('program_id', programId)
      .eq('status', 'active');

    if (!error && data) {
      setEnrollments(data);
      // Default all to present
      const initialAttendance: Record<number, boolean> = {};
      data.forEach((e: any) => initialAttendance[e.id] = true);
      setAttendance(initialAttendance);
    }
  }

  const toggleAttendance = (enrollmentId: number) => {
    setAttendance(prev => ({
      ...prev,
      [enrollmentId]: !prev[enrollmentId]
    }));
  };

  // Fetch student profile + assessments
  const handleOpenProfile = async (enrollment: any) => {
    setProfileEnrollment(enrollment);
    setIsProfileOpen(true);
    setProfileLoading(true);

    const { data, error } = await supabase
      .from('player_assessments')
      .select('*')
      .eq('enrollment_id', enrollment.id)
      .order('assessment_date', { ascending: true });

    if (!error && data) {
      // Map data for charts
      const chartData = data.map((item: any) => {
        const tVals: number[] = Object.values(item.technical_ratings || {});
        const aVals: number[] = Object.values(item.attitude_ratings || {});
        const tAvg = tVals.reduce((a, b) => a + b, 0) / (tVals.length || 1);
        const aAvg = aVals.reduce((a, b) => a + b, 0) / (aVals.length || 1);
        return {
          date: format(new Date(item.assessment_date), 'MMM d'),
          Technical: parseFloat(tAvg.toFixed(1)),
          Attitude: parseFloat(aAvg.toFixed(1)),
          Grade: item.overall_grade
        };
      });
      setHistoricalAssessments(chartData);
    }
    setProfileLoading(false);
  };

  // Open assessment drawer
  const handleOpenAssess = (enrollment: any) => {
    setSelectedEnrollment(enrollment);
    setPlayerType('outfield');
    setOverallGrade('B');
    setAttentionFlag('none');
    setPersonalNote('');
    setFocusAreas('');
    
    // reset scores
    const defaultTech: Record<string, number> = {};
    const defaultTechNotes: Record<string, string> = {};
    technicalMetrics.outfield.forEach(metric => {
      defaultTech[metric.id] = 4;
      defaultTechNotes[metric.id] = '';
    });
    setTechRatings(defaultTech);
    setTechNotes(defaultTechNotes);

    setAttRatings({
      teamwork: 4,
      discipline: 4,
      coachability: 4
    });
    setAttNotes({
      teamwork: '',
      discipline: '',
      coachability: ''
    });

    setIsAssessOpen(true);
  };

  const submitAttendance = async () => {
    if (!selectedProgram) return;
    setIsSubmitting(true);

    try {
      // 1. Log attendance records
      const attendanceRecords = enrollments.map(e => ({
        program_id: selectedProgram.id,
        enrollment_id: e.id,
        instructor_id: staff?.id,
        date: format(new Date(), 'yyyy-MM-dd'),
        present: attendance[e.id]
      }));

      const { error: attError } = await supabase
        .from('attendance')
        .insert(attendanceRecords);

      if (attError) throw attError;

      // 2. Auto-log instructor payout as expense
      const payoutRate = selectedProgram.payout_rate || 0;
      const payoutType = selectedProgram.payout_type || 'percentage';
      const presentCount = enrollments.filter(e => attendance[e.id]).length;
      
      let payoutAmount = 0;
      if (payoutType === 'percentage') {
        const sessionPrice = selectedProgram.pricing_json?.session || 0;
        payoutAmount = (sessionPrice * presentCount) * (payoutRate / 100);
      } else {
        payoutAmount = payoutRate;
      }

      if (payoutAmount > 0) {
        await supabase.from('expenses').insert([{
          category: 'instructor',
          amount: payoutAmount,
          description: `Payout for ${selectedProgram.name} (${presentCount} present) - ${format(new Date(), 'MMM d, yyyy')}`,
          logged_by: staff?.id
        }]);
      }

      alert('Attendance submitted and payout logged!');
      setSelectedProgram(null);
    } catch (err: any) {
      alert(err.message || 'Error submitting attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollment) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('player_assessments')
        .insert([{
          enrollment_id: selectedEnrollment.id,
          coach_id: staff?.id,
          player_type: playerType,
          technical_ratings: techRatings,
          technical_notes: techNotes,
          attitude_ratings: attRatings,
          attitude_notes: attNotes,
          overall_grade: overallGrade,
          personal_note: personalNote,
          focus_areas: focusAreas,
          attention_flag: attentionFlag
        }]);

      if (error) throw error;

      alert('Assessment successfully logged for ' + selectedEnrollment.participant_name);
      setIsAssessOpen(false);
    } catch (err: any) {
      alert(err.message || 'Error logging assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 p-6 lg:p-10 animate-entrance min-h-full">
      <header className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-1 bg-gold rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">Academy Portal</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tighter leading-none italic uppercase">
            Instructor Portal
          </h1>
          <p className="text-white/40 text-sm font-medium mt-1">Welcome back, {staff?.name}. Manage your classes and rosters.</p>
        </div>
      </header>

      {!selectedProgram ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.length === 0 ? (
            <div className="col-span-full glass p-20 rounded-[2.5rem] border border-dashed border-white/10 flex flex-col items-center justify-center">
              <ShieldCheck className="w-16 h-16 mb-4 text-gold" />
              <p className="font-display font-extrabold text-xl text-white uppercase italic tracking-tight">No assigned programs</p>
              <p className="text-sm text-charcoal-light mt-1">You haven't been assigned to any active programs yet.</p>
            </div>
          ) : (
            programs.map(prog => (
              <button
                key={prog.id}
                onClick={() => {
                  setSelectedProgram(prog);
                  fetchRoster(prog.id);
                }}
                className="relative group overflow-hidden text-left"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-gold/10 to-gold-muted/5 rounded-[2.2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000" />
                <div className="relative glass border border-white/10 p-8 rounded-[2rem] shadow-pitch hover:border-white/25 transition-all flex flex-col h-full">
                  <div className="w-12 h-12 bg-white/5 border border-white/10 text-gold rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Trophy className="w-6 h-6 text-gold" />
                  </div>
                  <h3 className="text-2xl font-display font-extrabold text-white italic mb-2 uppercase group-hover:text-gold transition-colors">{prog.name}</h3>
                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2 mb-6">
                    <Calendar className="w-3.5 h-3.5 text-gold" /> {prog.schedule}
                  </p>
                  <div className="mt-auto flex items-center justify-between text-xs font-black tracking-wider uppercase text-white">
                    Open Roster
                    <ChevronRight className="w-4 h-4 text-gold group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="max-w-4xl animate-in slide-in-from-bottom-4 duration-300">
          <button 
            onClick={() => setSelectedProgram(null)}
            className="text-xs font-black text-white/40 hover:text-gold transition-colors flex items-center gap-2 mb-6 uppercase tracking-widest"
          >
            ← Back to Programs
          </button>
          
          <div className="glass rounded-[2.5rem] border border-white/10 shadow-pitch overflow-hidden">
            <div className="p-8 border-b border-white/5 bg-white/[0.02] text-white flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-display font-extrabold italic tracking-tight text-white uppercase">{selectedProgram.name}</h2>
                <p className="text-gold text-[10px] font-black uppercase tracking-widest mt-1">Attendance & Assessments — {format(new Date(), 'MMMM d, yyyy')}</p>
              </div>
              <span className="px-4 py-1.5 rounded-xl bg-white/5 border border-white/15 text-[10px] font-black uppercase text-white/50 tracking-widest">
                Active roster
              </span>
            </div>

            <div className="p-8 space-y-4">
              {enrollments.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
                  <Users className="w-12 h-12 text-gold animate-pulse" />
                  <p className="font-display font-bold text-lg text-white uppercase italic tracking-tight">No students enrolled</p>
                </div>
              ) : (
                enrollments.map(e => {
                  const isPresent = attendance[e.id];
                  return (
                    <div 
                      key={e.id}
                      className={`
                        flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-3xl border-2 transition-all duration-300 gap-4
                        ${isPresent ? 'border-green-500/20 bg-green-500/2' : 'border-white/5 bg-white/[0.005] opacity-60'}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          onClick={() => toggleAttendance(e.id)}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all cursor-pointer shrink-0 ${isPresent ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-white/5 border-white/15 text-white/40'}`}
                        >
                          {isPresent ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {e.passport_photo_url ? (
                            <img src={e.passport_photo_url} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20 border border-white/5 shrink-0">
                              <User className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <p className="font-extrabold text-white text-base">{e.participant_name}</p>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{e.pricing_plan} Plan • Age {e.participant_age || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button 
                          onClick={() => router.push(`/players/${e.id}`)}
                          className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors border border-white/10"
                        >
                          View Profile
                        </button>
                        
                        {selectedProgram.type === 'academy' && (
                          <button 
                            onClick={() => handleOpenAssess(e)}
                            className="px-4 py-2.5 bg-gold text-forest hover:bg-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shadow-gold-sm"
                          >
                            Assess Player
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {enrollments.length > 0 && (
                <div className="pt-8 border-t border-white/5 mt-8">
                  <button 
                    onClick={submitAttendance}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-gold to-gold-muted text-forest py-5 rounded-2xl font-extrabold tracking-[0.15em] uppercase shadow-gold-md hover:shadow-gold-lg transition-all duration-300 spring-bounce hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-forest" /> : 'SUBMIT ATTENDANCE & LOG PAYOUT'}
                  </button>
                  <p className="text-[10px] text-center text-white/40 font-bold uppercase tracking-[0.15em] mt-6">
                    This will finalize today's session and generate your payout record.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Log Assessments Slider Panel (Drawer Overlay) */}
      {isAssessOpen && selectedEnrollment && (
        <div className="fixed inset-0 bg-charcoal/70 backdrop-blur-sm z-[100] flex justify-end animate-in fade-in duration-300">
          <div className="glass w-full max-w-2xl h-full shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto flex flex-col border-l border-white/10 bg-[#16181d]/90">
            
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02] sticky top-0 z-10">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-gold">Player Development Evaluation</span>
                <h3 className="text-2xl font-display font-black text-white italic uppercase tracking-tight mt-0.5">ASSESS: {selectedEnrollment.participant_name}</h3>
              </div>
              <button 
                onClick={() => setIsAssessOpen(false)}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-colors border border-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitAssessment} className="p-8 space-y-8 flex-1">
              {/* Position selector */}
              <div className="bg-white/3 p-5 rounded-2xl border border-white/5 space-y-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/50 block">Player Pitch Position</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'outfield', label: 'Outfield Player' },
                    { id: 'goalkeeper', label: 'Goalkeeper' }
                  ].map(pos => {
                    const isSel = playerType === pos.id;
                    return (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => setPlayerType(pos.id as any)}
                        className={`py-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wider transition-all duration-300 ${isSel ? 'border-gold bg-gold/10 text-white font-black' : 'border-white/5 bg-white/5 text-white/40'}`}
                      >
                        {pos.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Technical rating blocks */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <Sliders className="w-4 h-4 text-gold" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-white">Technical Core Performance</h4>
                </div>

                <div className="space-y-4">
                  {technicalMetrics[playerType].map(metric => {
                    const score = techRatings[metric.id] || 4;
                    return (
                      <div key={metric.id} className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                        <div className="md:col-span-4">
                          <p className="font-bold text-sm text-white">{metric.label}</p>
                          <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider">Technical</span>
                        </div>
                        
                        {/* Rating Stars */}
                        <div className="md:col-span-4 flex gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setTechRatings(prev => ({ ...prev, [metric.id]: star }))}
                              className="focus:outline-none"
                            >
                              <Star className={`w-5 h-5 ${star <= score ? 'text-gold fill-gold' : 'text-white/20'}`} />
                            </button>
                          ))}
                        </div>

                        {/* Note Input */}
                        <div className="md:col-span-4">
                          <input 
                            type="text" 
                            placeholder="Add brief observation..."
                            value={techNotes[metric.id] || ''}
                            onChange={(e) => setTechNotes(prev => ({ ...prev, [metric.id]: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-white/5 bg-white/3 text-white placeholder-white/20 text-xs focus:outline-none focus:border-gold/30 font-medium"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Attitude ratings blocks */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <Activity className="w-4 h-4 text-gold" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-white">Attitude, Conduct & Character</h4>
                </div>

                <div className="space-y-4">
                  {attitudeMetrics.map(metric => {
                    const score = attRatings[metric.id] || 4;
                    return (
                      <div key={metric.id} className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                        <div className="md:col-span-4">
                          <p className="font-bold text-sm text-white">{metric.label}</p>
                          <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider">Behavioral</span>
                        </div>
                        
                        {/* Rating Stars */}
                        <div className="md:col-span-4 flex gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setAttRatings(prev => ({ ...prev, [metric.id]: star }))}
                              className="focus:outline-none"
                            >
                              <Star className={`w-5 h-5 ${star <= score ? 'text-gold fill-gold' : 'text-white/20'}`} />
                            </button>
                          ))}
                        </div>

                        {/* Note Input */}
                        <div className="md:col-span-4">
                          <input 
                            type="text" 
                            placeholder="Add brief observation..."
                            value={attNotes[metric.id] || ''}
                            onChange={(e) => setAttNotes(prev => ({ ...prev, [metric.id]: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-white/5 bg-white/3 text-white placeholder-white/20 text-xs focus:outline-none focus:border-gold/30 font-medium"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary and Attention Flags */}
              <div className="grid grid-cols-2 gap-6 border-t border-white/5 pt-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gold">Overall Grade</label>
                  <select 
                    value={overallGrade}
                    onChange={(e) => setOverallGrade(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-gold/30 font-bold text-sm appearance-none"
                  >
                    {['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'].map(gr => (
                      <option key={gr} value={gr} className="bg-forest-dark text-white">{gr}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Attention Flag
                  </label>
                  <select 
                    value={attentionFlag}
                    onChange={(e) => setAttentionFlag(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-gold/30 font-bold text-sm appearance-none"
                  >
                    <option value="none" className="bg-forest-dark text-white">None (Standard Status)</option>
                    <option value="new_player" className="bg-forest-dark text-white">New Player (Onboarding)</option>
                    <option value="concern" className="bg-forest-dark text-white">Attitude Concern</option>
                    <option value="urgent" className="bg-forest-dark text-white">Urgent Intervention Needed</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gold">Personal Summary & Coach Note</label>
                <textarea 
                  rows={2}
                  placeholder="Summarize general session outcomes..."
                  value={personalNote}
                  onChange={(e) => setPersonalNote(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/20 focus:outline-none focus:border-gold/30 font-medium text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gold">Areas of Tactical/Physical Focus</label>
                <textarea 
                  rows={2}
                  placeholder="Outline key directives or drills for their next focus areas..."
                  value={focusAreas}
                  onChange={(e) => setFocusAreas(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/20 focus:outline-none focus:border-gold/30 font-medium text-sm"
                />
              </div>

              <div className="pt-4 sticky bottom-0 bg-[#16181d] pb-8">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4.5 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 tracking-widest uppercase disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin text-forest" /> : 'SAVE ASSESSMENT LOG'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile & Performance History Modal */}
      {isProfileOpen && profileEnrollment && (
        <div className="fixed inset-0 bg-charcoal/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="glass rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/10 max-h-[90vh] overflow-y-auto bg-[#16181d]/95">
            
            <div className="p-8 border-b border-white/5 flex justify-between items-center text-white bg-white/[0.01]">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-gold">Athlete Performance Profile</span>
                <h3 className="text-2xl font-display font-black text-white italic uppercase tracking-tight mt-0.5">{profileEnrollment.participant_name}</h3>
              </div>
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors border border-white/10 text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* General details grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center border-b border-white/5 pb-8">
                {/* Photo */}
                <div className="md:col-span-3 flex justify-center">
                  {profileEnrollment.passport_photo_url ? (
                    <img 
                      src={profileEnrollment.passport_photo_url} 
                      alt="" 
                      className="w-28 h-28 rounded-full object-cover border-2 border-gold shadow-lg" 
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                      <User className="w-12 h-12" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="md:col-span-9 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="text-white/40 font-bold uppercase tracking-wider">Age Group</p>
                    <p className="text-white font-extrabold text-sm mt-0.5">U{profileEnrollment.participant_age || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-white/40 font-bold uppercase tracking-wider">Gender</p>
                    <p className="text-white font-extrabold text-sm mt-0.5">{profileEnrollment.gender || 'Male'}</p>
                  </div>
                  <div>
                    <p className="text-white/40 font-bold uppercase tracking-wider">Pricing Plan</p>
                    <p className="text-gold font-extrabold text-sm mt-0.5 uppercase tracking-wider">{profileEnrollment.pricing_plan || 'Session'}</p>
                  </div>
                  <div>
                    <p className="text-white/40 font-bold uppercase tracking-wider">Prior Experience</p>
                    <p className="text-white font-extrabold text-sm mt-0.5">{profileEnrollment.prior_experience || 'Beginner'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-white/40 font-bold uppercase tracking-wider">School / Current Club</p>
                    <p className="text-white font-extrabold text-sm mt-0.5 truncate">{profileEnrollment.school_club || 'None Listed'}</p>
                  </div>
                  {profileEnrollment.medical_conditions && (
                    <div className="col-span-full bg-red-500/5 border border-red-500/10 p-3 rounded-xl flex gap-2 items-start text-white">
                      <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black uppercase text-red-400">Medical Conditions</p>
                        <p className="text-xs font-medium text-white/70 mt-0.5">{profileEnrollment.medical_conditions}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Charts section using Recharts */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gold" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-white">Historical Metric Progression</h4>
                </div>

                {profileLoading ? (
                  <div className="h-64 flex items-center justify-center bg-white/[0.01] rounded-2xl border border-white/5">
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                  </div>
                ) : historicalAssessments.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center bg-white/[0.01] rounded-2xl border border-dashed border-white/10 text-center px-8 opacity-40">
                    <TrendingUp className="w-10 h-10 mb-2 text-gold animate-pulse" />
                    <p className="font-bold text-sm text-white">No progression logs yet</p>
                    <p className="text-xs text-white/50 mt-0.5">Average scores will render dynamically as session assessments are submitted.</p>
                  </div>
                ) : (
                  <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={historicalAssessments}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                          <XAxis dataKey="date" stroke="#666" fontSize={10} tickLine={false} />
                          <YAxis domain={[1, 5]} stroke="#666" fontSize={10} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                            labelStyle={{ fontWeight: 'black', color: '#ffb800' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                          <Line type="monotone" dataKey="Technical" stroke="#ffb800" strokeWidth={3} activeDot={{ r: 8 }} />
                          <Line type="monotone" dataKey="Attitude" stroke="#22c55e" strokeWidth={3} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
