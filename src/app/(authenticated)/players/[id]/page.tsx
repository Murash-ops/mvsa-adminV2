'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { 
  User, 
  Calendar, 
  FileText, 
  Activity, 
  Trophy, 
  AlertTriangle, 
  Star, 
  Loader2, 
  ArrowLeft, 
  PlusCircle, 
  X, 
  CheckCircle2, 
  Phone, 
  Heart, 
  ShieldCheck, 
  Award,
  Sparkles,
  Zap,
  Sliders
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ReferenceDot,
  Scatter
} from 'recharts';
import { format } from 'date-fns';

export default function PlayerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { staff } = useAuth();
  const supabase = createClient();
  const playerId = params.id;

  const [enrollment, setEnrollment] = useState<any | null>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Write Assessment Modal State
  const [isAssessOpen, setIsAssessOpen] = useState(false);
  const [playerType, setPlayerType] = useState<'outfield' | 'goalkeeper'>('outfield');
  const [overallGrade, setOverallGrade] = useState('B');
  const [attentionFlag, setAttentionFlag] = useState<'none' | 'new_player' | 'concern' | 'urgent'>('none');
  const [personalNote, setPersonalNote] = useState('');
  const [focusAreas, setFocusAreas] = useState('');
  
  // Rating states (1-5 scale)
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

  // Grade string mapping to 1-5 scale
  const gradeToValue = (grade: string): number => {
    const cleanGrade = grade.toUpperCase().trim();
    if (cleanGrade.startsWith('A')) return 5;
    if (cleanGrade.startsWith('B')) return 4;
    if (cleanGrade.startsWith('C')) return 3;
    if (cleanGrade.startsWith('D')) return 2;
    return 1; // E, F, or other defaults
  };

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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Enrollment Info
      const { data: enrollData, error: enrollError } = await supabase
        .from('enrollments')
        .select('*, programs(*)')
        .eq('id', playerId)
        .single();

      if (enrollError || !enrollData) {
        throw enrollError || new Error('Enrollment not found');
      }

      // Check Coach Authorization Scope
      if (staff?.role === 'coach' || staff?.role === 'instructor') {
        if (enrollData.programs?.instructor_id !== staff.id) {
          alert('Unauthorized: You are not the assigned coach for this program.');
          router.push('/instructor');
          return;
        }
      }

      setEnrollment(enrollData);

      // 2. Fetch Assessments
      const { data: assessData, error: assessError } = await supabase
        .from('player_assessments')
        .select('*, staff(name)')
        .eq('enrollment_id', playerId)
        .order('assessment_date', { ascending: true });

      if (assessError) throw assessError;

      const items = assessData || [];
      setAssessments(items);

      // 3. Map Chart Data
      const formatted = items.map((item: any) => {
        const tVals: number[] = Object.values(item.technical_ratings || {});
        const aVals: number[] = Object.values(item.attitude_ratings || {});
        const tAvg = tVals.reduce((a, b) => a + b, 0) / (tVals.length || 1);
        const aAvg = aVals.reduce((a, b) => a + b, 0) / (aVals.length || 1);
        
        return {
          date: format(new Date(item.assessment_date), 'MMM d, yyyy'),
          gradeNumeric: gradeToValue(item.overall_grade),
          grade: item.overall_grade,
          Technical: parseFloat(tAvg.toFixed(1)),
          Attitude: parseFloat(aAvg.toFixed(1)),
          flag: item.attention_flag !== 'none' ? item.attention_flag : null
        };
      });

      setChartData(formatted);
    } catch (err) {
      console.error('Error fetching player profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (staff && playerId) {
      fetchData();
    }
  }, [staff, playerId]);

  const handleOpenAssess = () => {
    setPlayerType('outfield');
    setOverallGrade('B+');
    setAttentionFlag('none');
    setPersonalNote('');
    setFocusAreas('');
    
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

  const handleLogAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('player_assessments')
        .insert([{
          enrollment_id: enrollment.id,
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

      alert('Assessment successfully added!');
      setIsAssessOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error creating player assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !enrollment) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-32 text-white">
        <Loader2 className="w-12 h-12 animate-spin text-gold mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-white/50">Fetching Player File...</p>
      </div>
    );
  }

  const latestAssessment = assessments[assessments.length - 1];
  const activeProgram = enrollment.programs;
  
  // Pricing JSON mapping helper
  const pricing = activeProgram?.pricing_json || {};
  const planFee = pricing[enrollment.pricing_plan] || pricing['session'] || 0;

  return (
    <div className="flex flex-col flex-1 p-6 lg:p-10 text-white text-left animate-entrance">
      
      {/* HEADER SECTION */}
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-3">
          <button 
            onClick={() => {
              if (staff?.role === 'coach' || staff?.role === 'instructor') {
                router.push('/instructor');
              } else {
                router.push('/enrollments');
              }
            }}
            className="flex items-center gap-2 text-white/40 hover:text-gold transition-colors text-xs font-bold uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" /> BACK TO ROSTER
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gold/10 border border-gold/25 flex items-center justify-center text-gold">
              <User className="w-5 h-5 stroke-[2px]" />
            </div>
            <div>
              <h1 className="text-3xl font-black font-display uppercase italic text-white tracking-tight leading-none">
                {enrollment.participant_name}
              </h1>
              <p className="text-xs text-white/40 font-bold uppercase tracking-wider mt-1">
                Active Athlete Profile • Age {enrollment.participant_age || 'N/A'} • {enrollment.gender || 'Not specified'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          {(staff?.role === 'coach' || staff?.role === 'instructor' || staff?.role === 'super_admin' || staff?.role === 'academy_coo') && (
            <button
              onClick={handleOpenAssess}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold text-xs tracking-widest uppercase shadow-gold-sm hover:shadow-gold-md hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <PlusCircle className="w-4 h-4 text-forest stroke-[2.5px]" />
              Write Assessment
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: ENROLLMENT & ACCOUNTING INFO */}
        <div className="space-y-8">
          <section className="bg-card p-8 rounded-[2rem] border border-white/5 shadow-pitch space-y-6">
            <h2 className="text-lg font-bold font-display italic text-white uppercase tracking-tight flex items-center gap-2 border-b border-white/5 pb-4">
              <ShieldCheck className="w-5 h-5 text-gold" /> ENROLLMENT DOSSIER
            </h2>

            {/* Passport Photo Placeholder or Display */}
            {enrollment.passport_photo_url ? (
              <div className="w-full h-48 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                <img 
                  src={enrollment.passport_photo_url} 
                  alt="Passport photo" 
                  className="w-full h-full object-cover" 
                />
              </div>
            ) : (
              <div className="w-full h-40 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center opacity-40">
                <User className="w-8 h-8 text-white mb-2" />
                <span className="text-[10px] font-bold uppercase tracking-wider">No photo uploaded</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-white/40 font-bold uppercase tracking-wider block">Assigned Program</span>
                  <span className="text-white font-extrabold text-sm block mt-1">{activeProgram?.name || 'Academy'}</span>
                </div>
                <div>
                  <span className="text-white/40 font-bold uppercase tracking-wider block">Pricing Plan</span>
                  <span className="text-gold font-extrabold text-sm block mt-1 uppercase">{enrollment.pricing_plan} Plan</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs border-t border-white/5 pt-4">
                <div>
                  <span className="text-white/40 font-bold uppercase tracking-wider block">Plan Fee</span>
                  <span className="text-white font-mono font-extrabold block mt-1">KES {planFee.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-white/40 font-bold uppercase tracking-wider block">Billing Status</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded inline-block mt-1 ${enrollment.payment_status === 'fully_paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {enrollment.payment_status}
                  </span>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 space-y-3 text-xs">
                <div>
                  <span className="text-white/40 font-bold uppercase tracking-wider block">Parent / Guardian Contacts</span>
                  <div className="flex items-center gap-2 mt-1.5 bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-white font-bold font-mono">
                    <Phone className="w-3.5 h-3.5 text-gold shrink-0" />
                    <span>{enrollment.client_phone}</span>
                  </div>
                </div>
                {enrollment.school_club && (
                  <div>
                    <span className="text-white/40 font-bold uppercase tracking-wider block">Representing School/Club</span>
                    <span className="text-white font-bold block mt-1">{enrollment.school_club}</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="bg-card p-8 rounded-[2rem] border border-white/5 shadow-pitch space-y-6">
            <h2 className="text-lg font-bold font-display italic text-white uppercase tracking-tight flex items-center gap-2 border-b border-white/5 pb-4">
              <Heart className="w-5 h-5 text-red-400" /> HEALTH & EXPERIENCES
            </h2>
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-white/40 font-bold uppercase tracking-wider block">Prior Football Experience</span>
                <p className="text-white font-medium mt-1 leading-relaxed">{enrollment.prior_experience || 'No previous club or team experience logged.'}</p>
              </div>
              <div className="border-t border-white/5 pt-4">
                <span className="text-white/40 font-bold uppercase tracking-wider block">Medical Conditions / Allergies</span>
                <div className={`p-4 rounded-xl border mt-2 leading-relaxed font-medium ${enrollment.medical_conditions ? 'border-red-500/25 bg-red-500/5 text-red-300' : 'border-white/5 bg-white/[0.01] text-white/50'}`}>
                  {enrollment.medical_conditions || 'Zero chronic medical conditions reported by parent.'}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: PROGRESSION CHART & ASSESSMENT HISTORY */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* RECHARTS HISTORICAL PROGRESSION CHART */}
          <section className="bg-card p-8 rounded-[2rem] border border-white/5 shadow-pitch text-white text-left">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold font-display italic text-white uppercase tracking-tight flex items-center gap-2">
                <Activity className="w-5 h-5 text-gold" /> Performance Progression
              </h2>
              <span className="text-[10px] font-black uppercase text-white/40 font-mono">1.0 to 5.0 Rating Scale</span>
            </div>

            <div className="h-80 w-full mt-6 bg-white/[0.01] border border-white/5 p-6 rounded-2xl">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-white/20 text-xs font-bold uppercase tracking-widest italic">
                  No Assessment Logs Filed Yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="date" stroke="#666" fontSize={10} tickLine={false} />
                    <YAxis domain={[1, 5]} stroke="#666" fontSize={10} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                      labelStyle={{ fontWeight: 'black', color: '#ffb800' }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    
                    {/* Primary Line: Overall Grade Mapped Value */}
                    <Line 
                      type="monotone" 
                      dataKey="gradeNumeric" 
                      name="Overall Grade (1-5)" 
                      stroke="#ffb800" 
                      strokeWidth={3}
                      activeDot={{ r: 8 }} 
                    />
                    
                    {/* Secondary Lines: Technical and Attitude averages */}
                    <Line 
                      type="monotone" 
                      dataKey="Technical" 
                      name="Technical Rating" 
                      stroke="#38bdf8" 
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Attitude" 
                      name="Attitude Score" 
                      stroke="#34d399" 
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                    />

                    {/* Active attention flag markers on timeline */}
                    {chartData.map((d, index) => {
                      if (!d.flag) return null;
                      let fill = '#94a3b8';
                      if (d.flag === 'urgent') fill = '#dc3545';
                      if (d.flag === 'concern') fill = '#f59e0b';
                      if (d.flag === 'new_player') fill = '#38bdf8';
                      return (
                        <ReferenceDot
                          key={index}
                          x={d.date}
                          y={d.gradeNumeric}
                          r={6}
                          fill={fill}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Attention Flags Legend */}
            {chartData.some(d => d.flag) && (
              <div className="flex flex-wrap items-center justify-center gap-6 mt-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl animate-in fade-in duration-300">
                <span className="text-[10px] font-black uppercase text-gold tracking-widest">TIMELINE ATTENTION FLAGS:</span>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#dc3545] rounded-full border border-white/20" />
                  <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Urgent Action Required</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#f59e0b] rounded-full border border-white/20" />
                  <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Developmental Concern</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#38bdf8] rounded-full border border-white/20" />
                  <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">New Player Audit</span>
                </div>
              </div>
            )}
          </section>

          {/* LATEST ASSESSMENT SUMMARY CARD */}
          <section className="bg-card p-8 rounded-[2rem] border border-white/5 shadow-pitch text-white">
            <h2 className="text-lg font-bold font-display italic text-white uppercase tracking-tight flex items-center gap-2 border-b border-white/5 pb-4 mb-6">
              <Award className="w-5 h-5 text-gold" /> Latest Assessment Summary
            </h2>

            {!latestAssessment ? (
              <div className="py-12 border border-dashed border-white/10 rounded-2xl text-center opacity-40">
                <FileText className="w-10 h-10 mx-auto mb-3" />
                <p className="font-bold text-sm">No assessments on file</p>
                <p className="text-xs mt-0.5">Assigned coach can file a performance audit anytime.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.01] border border-white/5 p-5 rounded-2xl">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gold tracking-widest">OVERALL RATING</span>
                    <div className="text-4xl font-black font-display text-white tracking-tight italic mt-1">
                      Grade: {latestAssessment.overall_grade}
                    </div>
                    <p className="text-[10px] text-white/40 mt-1 font-bold">
                      Evaluated on {format(new Date(latestAssessment.assessment_date), 'MMMM d, yyyy')} by Coach {latestAssessment.staff?.name || 'N/A'}
                    </p>
                  </div>

                  {latestAssessment.attention_flag !== 'none' && (
                    <div className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-black uppercase tracking-wider ${latestAssessment.attention_flag === 'urgent' ? 'bg-red-500/10 border-red-500/25 text-red-400' : latestAssessment.attention_flag === 'concern' ? 'bg-amber-500/10 border-amber-500/25 text-amber-400' : 'bg-sky-500/10 border-sky-500/25 text-sky-400'}`}>
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{latestAssessment.attention_flag} Flag</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Technical Breakdown */}
                  <div className="space-y-4">
                    <span className="text-xs font-black uppercase tracking-widest text-sky-400 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" /> Technical Metrics
                    </span>
                    <div className="space-y-3.5">
                      {Object.entries(latestAssessment.technical_ratings || {}).map(([metricId, rating]: [string, any]) => {
                        const allMetrics = [...technicalMetrics.outfield, ...technicalMetrics.goalkeeper];
                        const label = allMetrics.find(m => m.id === metricId)?.label || metricId;
                        return (
                          <div key={metricId} className="space-y-1 text-xs">
                            <div className="flex justify-between font-bold">
                              <span className="text-white/60">{label}</span>
                              <span className="text-white font-mono">{rating} / 5</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-sky-400 rounded-full" style={{ width: `${(rating / 5) * 100}%` }} />
                            </div>
                            {latestAssessment.technical_notes?.[metricId] && (
                              <p className="text-[10px] text-white/35 italic mt-1 leading-normal">
                                "{latestAssessment.technical_notes[metricId]}"
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Attitude Conduct Breakdown */}
                  <div className="space-y-4 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" /> Conduct & Discipline
                    </span>
                    <div className="space-y-3.5">
                      {Object.entries(latestAssessment.attitude_ratings || {}).map(([metricId, rating]: [string, any]) => {
                        const label = attitudeMetrics.find(m => m.id === metricId)?.label || metricId;
                        return (
                          <div key={metricId} className="space-y-1 text-xs">
                            <div className="flex justify-between font-bold">
                              <span className="text-white/60">{label}</span>
                              <span className="text-white font-mono">{rating} / 5</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(rating / 5) * 100}%` }} />
                            </div>
                            {latestAssessment.attitude_notes?.[metricId] && (
                              <p className="text-[10px] text-white/35 italic mt-1 leading-normal">
                                "{latestAssessment.attitude_notes[metricId]}"
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/5 pt-6 text-xs">
                  <div>
                    <span className="text-white/40 font-bold uppercase tracking-wider block">COACH'S REMARKS</span>
                    <p className="text-white font-medium mt-1 leading-relaxed">{latestAssessment.personal_note || 'None'}</p>
                  </div>
                  <div>
                    <span className="text-white/40 font-bold uppercase tracking-wider block">KEY FOCUS AREAS</span>
                    <p className="text-white font-medium mt-1 leading-relaxed">{latestAssessment.focus_areas || 'None'}</p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

      </div>

      {/* ========================================================
          COACH ASSESSMENT MODAL
          ======================================================== */}
      {isAssessOpen && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 border border-white/10 bg-[#16181d]/95 p-8 custom-scrollbar">
            <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6">
              <div>
                <h2 className="text-2xl font-display font-extrabold italic text-white uppercase">ADD ATHLETE PERFORMANCE AUDIT</h2>
                <p className="text-gold text-[10px] font-black uppercase tracking-widest mt-1">Filing report for {enrollment.participant_name}</p>
              </div>
              <button 
                onClick={() => setIsAssessOpen(false)}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-colors text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleLogAssessment} className="space-y-6 text-left">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gold block mb-2">Player Role</label>
                  <select
                    value={playerType}
                    onChange={(e) => setPlayerType(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-gold font-bold text-sm appearance-none"
                  >
                    <option value="outfield" className="bg-forest-dark text-white">Outfield Player</option>
                    <option value="goalkeeper" className="bg-forest-dark text-white">Goalkeeper</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gold block mb-2">Overall Grade</label>
                  <select
                    value={overallGrade}
                    onChange={(e) => setOverallGrade(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-gold font-bold text-sm appearance-none"
                  >
                    {['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'E', 'F'].map(g => (
                      <option key={g} value={g} className="bg-forest-dark text-white">{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gold block mb-2">Attention Marker</label>
                  <select
                    value={attentionFlag}
                    onChange={(e) => setAttentionFlag(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-gold font-bold text-sm appearance-none"
                  >
                    <option value="none" className="bg-forest-dark text-white">None (On Track)</option>
                    <option value="new_player" className="bg-forest-dark text-white">New Player</option>
                    <option value="concern" className="bg-forest-dark text-white">Concern (Needs Attention)</option>
                    <option value="urgent" className="bg-forest-dark text-white">Urgent (Immediate Meeting)</option>
                  </select>
                </div>
              </div>

              {/* TECHNICAL RATINGS */}
              <div className="border-t border-white/5 pt-6">
                <span className="text-xs font-black uppercase tracking-widest text-sky-400 block mb-4 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" /> Technical Proficiency (1 to 5 Stars)
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {technicalMetrics[playerType].map(metric => (
                    <div key={metric.id} className="space-y-2 bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                      <div className="flex justify-between items-center text-xs">
                        <label className="text-white font-bold">{metric.label}</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setTechRatings(prev => ({ ...prev, [metric.id]: star }))}
                              className="focus:outline-none"
                            >
                              <Star className={`w-4 h-4 ${star <= (techRatings[metric.id] || 0) ? 'text-gold fill-gold' : 'text-white/20'}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Add optional notes..."
                        value={techNotes[metric.id] || ''}
                        onChange={(e) => setTechNotes(prev => ({ ...prev, [metric.id]: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/35 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* CONDUCT & DISCIPLINE */}
              <div className="border-t border-white/5 pt-6">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-400 block mb-4 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" /> Conduct & Attitude (1 to 5 Stars)
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {attitudeMetrics.map(metric => (
                    <div key={metric.id} className="space-y-2 bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                      <div className="flex justify-between items-center text-xs">
                        <label className="text-white font-bold">{metric.label}</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setAttRatings(prev => ({ ...prev, [metric.id]: star }))}
                              className="focus:outline-none"
                            >
                              <Star className={`w-4 h-4 ${star <= (attRatings[metric.id] || 0) ? 'text-gold fill-gold' : 'text-white/20'}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Add optional notes..."
                        value={attNotes[metric.id] || ''}
                        onChange={(e) => setAttNotes(prev => ({ ...prev, [metric.id]: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/35 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/5 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-widest text-gold block">Coach's General Remarks</label>
                  <textarea
                    rows={3}
                    placeholder="Provide a comprehensive summary of player progress..."
                    value={personalNote}
                    onChange={(e) => setPersonalNote(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/35 focus:outline-none focus:border-gold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-widest text-gold block">Key Technical Focus Areas</label>
                  <textarea
                    rows={3}
                    placeholder="Define specific exercises or aspects to drill next..."
                    value={focusAreas}
                    onChange={(e) => setFocusAreas(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/35 focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsAssessOpen(false)}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold uppercase transition-all text-xs"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 spring-bounce hover:scale-[1.01] active:scale-[0.99] uppercase text-xs tracking-widest flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-forest" /> : 'Log Performance Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
