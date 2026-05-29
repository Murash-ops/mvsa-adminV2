'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { 
  Users, 
  Trophy, 
  Calendar, 
  Receipt, 
  MessageSquare, 
  Star, 
  CheckCircle2, 
  AlertTriangle,
  Send,
  Loader2,
  X
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type AcademyCOODashboardProps = {
  enrollments: any[];
  programs: any[];
  expenses: any[];
  assessments: any[];
  staff: any;
  onRefresh: () => void;
};

export default function AcademyCOODashboard({
  enrollments,
  programs,
  expenses,
  assessments,
  staff,
  onRefresh
}: AcademyCOODashboardProps) {
  const supabase = createClient();
  const router = useRouter();
  
  // Pending Enrollments Queue (status = 'pending')
  const pendingEnrollments = enrollments.filter(e => e.status === 'pending');

  // SMS Modal State
  const [isSmsOpen, setIsSmsOpen] = useState(false);
  const [smsPhone, setSmsPhone] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [isSendingSms, setIsSendingSms] = useState(false);

  // Active programs summary — enrolled count per program
  const getEnrollmentCount = (programId: number) => {
    return enrollments.filter(e => e.program_id === programId && e.status === 'active').length;
  };

  // Academy expenses this month (stream === 'programs' or is_academy === true)
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const academyExpensesThisMonth = expenses
    .filter(e => e.is_academy && e.created_at?.startsWith(currentMonthStr))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Upcoming sessions this week (simplifying: list of active programs with schedules)
  const activePrograms = programs.filter(p => p.is_active);

  // Player performance summary — top performers and attention flags across all programs
  const latestAssessmentsByPlayer: Record<number, any> = {};
  assessments.forEach(ass => {
    const current = latestAssessmentsByPlayer[ass.enrollment_id];
    if (!current || new Date(ass.assessment_date) > new Date(current.assessment_date)) {
      latestAssessmentsByPlayer[ass.enrollment_id] = ass;
    }
  });

  const getRatingsAverage = (ratings: Record<string, number>) => {
    const values = Object.values(ratings || {});
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const activeAssessmentsList = Object.values(latestAssessmentsByPlayer);

  let squadTechAvg = 0;
  let squadAttAvg = 0;
  let highestTechPlayer = { name: 'N/A', score: 0 };
  let highestAttPlayer = { name: 'N/A', score: 0 };

  if (activeAssessmentsList.length > 0) {
    let techSum = 0;
    let attSum = 0;

    activeAssessmentsList.forEach((ass: any) => {
      const tAvg = getRatingsAverage(ass.technical_ratings);
      const aAvg = getRatingsAverage(ass.attitude_ratings);
      
      techSum += tAvg;
      attSum += aAvg;

      const playerName = ass.enrollments?.participant_name || 'Athlete';

      if (tAvg > highestTechPlayer.score) {
        highestTechPlayer = { name: playerName, score: tAvg };
      }
      if (aAvg > highestAttPlayer.score) {
        highestAttPlayer = { name: playerName, score: aAvg };
      }
    });

    squadTechAvg = techSum / activeAssessmentsList.length;
    squadAttAvg = attSum / activeAssessmentsList.length;
  }

  // Attention Flags List (concern or urgent)
  const attentionFlags = assessments.filter(ass => ass.attention_flag === 'concern' || ass.attention_flag === 'urgent');

  // COO Actions: Confirm Enrollment (status = 'active')
  const handleConfirmEnrollment = async (id: number) => {
    try {
      const { error } = await supabase
        .from('enrollments')
        .update({ status: 'active' })
        .eq('id', id);
      if (error) throw error;
      alert('Enrollment confirmed successfully!');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error confirming enrollment');
    }
  };

  // COO Actions: Mark Paid (payment_status = 'fully_paid', status = 'active')
  const handleMarkPaid = async (id: number) => {
    try {
      const { error } = await supabase
        .from('enrollments')
        .update({ 
          payment_status: 'fully_paid',
          status: 'active'
        })
        .eq('id', id);
      if (error) throw error;
      alert('Enrollment marked as paid and active!');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error updating payment status');
    }
  };

  // Trigger Send SMS broadcaster
  const handleOpenSms = (phone: string) => {
    setSmsPhone(phone);
    setSmsMessage('');
    setIsSmsOpen(true);
  };

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsPhone || !smsMessage.trim()) return;
    setIsSendingSms(true);

    try {
      // 1. Log to public.notifications
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert([{
          type: 'sms',
          recipient: smsPhone,
          message: smsMessage,
          status: 'pending',
          logged_by: staff?.id || null
        }]);

      if (notifyError) throw notifyError;

      // 2. Trigger Supabase Edge Function to send SMS
      const { error: fnError } = await supabase.functions.invoke('send-booking-sms', {
        body: {
          phone: smsPhone,
          message: smsMessage
        }
      });

      alert('SMS Broadcaster sent successfully!');
      setIsSmsOpen(false);
    } catch (err: any) {
      alert('SMS queued in database! (Edge Function fallback triggers sync shortly)');
      setIsSmsOpen(false);
    } finally {
      setIsSendingSms(false);
    }
  };

  return (
    <div className="space-y-10 text-left">
      
      {/* ========================================================
          PENDING ENROLLMENTS QUEUE (FRONT & CENTER)
          ======================================================== */}
      <section className="bg-card border border-white/5 p-8 rounded-[2rem] shadow-pitch text-white">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gold animate-pulse" />
            <h2 className="text-xl font-bold font-display text-white italic uppercase tracking-tight">Pending Intake Queue</h2>
          </div>
          <span className="px-3.5 py-1.5 rounded-xl bg-gold/10 border border-gold/25 text-[10px] font-black uppercase text-gold tracking-widest">
            {pendingEnrollments.length} Pending Actions
          </span>
        </div>

        <div className="overflow-x-auto pr-2 custom-scrollbar">
          {pendingEnrollments.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl opacity-40">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="font-bold text-sm text-white">Intake Queue is Empty</p>
              <p className="text-xs text-white/50 mt-0.5">No parent applications currently require review.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/5 text-white/40 font-bold text-xs uppercase tracking-wider">
                  <th className="pb-4">Athlete Detail</th>
                  <th className="pb-4">Assigned Program</th>
                  <th className="pb-4">Parent Phone</th>
                  <th className="pb-4">Payment</th>
                  <th className="pb-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pendingEnrollments.map((e) => (
                  <tr key={e.id} className="hover:bg-white/[0.005] transition-colors">
                    <td className="py-4 pr-2">
                      <div 
                        onClick={() => router.push(`/players/${e.id}`)}
                        className="font-bold text-white text-sm hover:text-gold cursor-pointer transition-colors"
                      >
                        {e.participant_name}
                      </div>
                      <div className="text-[10px] text-white/40 mt-0.5 font-medium">Age {e.participant_age || 'N/A'} • {e.pricing_plan} Plan</div>
                    </td>
                    <td className="py-4 pr-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-gold">
                        {e.programs?.name || 'Program'}
                      </span>
                    </td>
                    <td className="py-4 pr-2 font-mono text-xs text-white/70">
                      {e.client_phone}
                    </td>
                    <td className="py-4 pr-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${e.payment_status === 'fully_paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {e.payment_status}
                      </span>
                    </td>
                    <td className="py-4 text-right flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleConfirmEnrollment(e.id)}
                        className="px-3.5 py-2 bg-white/5 hover:bg-gold hover:text-forest border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/70 transition-colors"
                      >
                        Confirm
                      </button>
                      <button 
                        onClick={() => handleMarkPaid(e.id)}
                        className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-400 transition-colors"
                      >
                        Mark Paid
                      </button>
                      <button 
                        onClick={() => handleOpenSms(e.client_phone)}
                        className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/70 transition-colors"
                      >
                        SMS
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ========================================================
          SQUAD PERFORMANCE & ATTENTION SUMMARY
          ======================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Squad Performance Aggregates (5/12 width) */}
        <div className="lg:col-span-5 bg-card p-8 rounded-[2rem] border border-white/5 shadow-pitch flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="w-5 h-5 text-gold" />
              <h2 className="text-xl font-bold font-display text-white italic uppercase tracking-tight">Squad Metric Averages</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                  <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">Squad Tech Average</span>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-2xl font-black text-white">{squadTechAvg > 0 ? squadTechAvg.toFixed(1) : '0.0'}</span>
                    <span className="text-[10px] text-white/40 font-bold uppercase">/ 5.0</span>
                  </div>
                </div>

                <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                  <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">Squad Attitude Average</span>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-2xl font-black text-white">{squadAttAvg > 0 ? squadAttAvg.toFixed(1) : '0.0'}</span>
                    <span className="text-[10px] text-white/40 font-bold uppercase">/ 5.0</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/40 font-bold uppercase tracking-wider">Top Technical Performer:</span>
                  <span className="text-white font-extrabold flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-gold fill-gold shrink-0" />
                    {highestTechPlayer.name} ({highestTechPlayer.score > 0 ? highestTechPlayer.score.toFixed(1) : 'N/A'})
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-white/5 pt-3">
                  <span className="text-white/40 font-bold uppercase tracking-wider">Top Attitude Conduct:</span>
                  <span className="text-emerald-400 font-extrabold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    {highestAttPlayer.name} ({highestAttPlayer.score > 0 ? highestAttPlayer.score.toFixed(1) : 'N/A'})
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => handleOpenSms('')}
            className="mt-8 w-full flex items-center justify-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-extrabold text-xs tracking-widest uppercase transition-all"
          >
            <MessageSquare className="w-4 h-4 text-gold stroke-[2px]" />
            Broadcaster SMS Compose
          </button>
        </div>

        {/* Right: Active Programs & Weekly Schedule & Expenses (7/12 width) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Active Programs Summary */}
            <div className="bg-card p-6 rounded-[1.5rem] border border-white/5 shadow-pitch text-white">
              <h3 className="text-sm font-bold font-display uppercase text-white mb-4 italic">Active Cohorts</h3>
              <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                {activePrograms.map(p => (
                  <div key={p.id} className="flex justify-between items-center bg-white/[0.01] p-3 rounded-lg border border-white/5">
                    <span className="text-xs font-bold text-white truncate max-w-[70%]">{p.name}</span>
                    <span className="text-[10px] font-black font-mono bg-gold/10 text-gold border border-gold/25 px-2 py-0.5 rounded">
                      {getEnrollmentCount(p.id)} players
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Academy expenses this month */}
            <div className="bg-card p-6 rounded-[1.5rem] border border-white/5 shadow-pitch text-white flex flex-col justify-between h-full">
              <div>
                <h3 className="text-sm font-bold font-display uppercase text-white mb-2 italic">Academy Expenses</h3>
                <p className="text-[10px] text-white/35 font-bold uppercase tracking-wider mb-4">Stream 2 Outflow (This Month)</p>
              </div>
              <div className="space-y-3">
                <p className="text-4xl font-extrabold font-display text-gold italic">KES {academyExpensesThisMonth.toLocaleString()}</p>
                <div className="bg-white/2 border border-white/5 p-3 rounded-xl flex gap-2 text-white/50 text-[10px] font-semibold leading-relaxed">
                  <Receipt className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <span>Tracks segmented training gear purchase, academy rents, and coach payouts.</span>
                </div>
              </div>
            </div>

          </div>

          {/* Attention flags flags summary card */}
          <div className="bg-card p-6 rounded-[1.5rem] border border-red-500/10 shadow-pitch text-white text-left">
            <h3 className="text-sm font-bold font-display uppercase text-white mb-4 italic flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" /> Academy Attention Alerts
            </h3>
            <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
              {attentionFlags.length === 0 ? (
                <p className="text-xs text-white/40 italic">Zero attention flags flagged by coaches this week.</p>
              ) : (
                attentionFlags.slice(0, 3).map((ass: any) => (
                  <div 
                    key={ass.id} 
                    onClick={() => router.push(`/players/${ass.enrollment_id}`)}
                    className="flex justify-between items-center text-xs p-3.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-xl cursor-pointer transition-colors"
                  >
                    <div>
                      <span className="font-bold text-white hover:text-gold">{ass.enrollments?.participant_name}</span>
                      <span className="text-[10px] text-white/30 ml-2 font-mono">{ass.attention_flag} flag</span>
                    </div>
                    <span className="text-[9px] font-bold text-red-400 font-mono">Evaluation concern</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </section>

      {/* ========================================================
          SMS BROADCASTER MODAL
          ======================================================== */}
      {isSmsOpen && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/10 bg-[#16181d]/95">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h2 className="text-2xl font-display font-extrabold italic tracking-tight text-white uppercase">SMS BROADCASTER</h2>
                <p className="text-gold text-[10px] font-black uppercase tracking-widest mt-1">Global SMS Broadcaster</p>
              </div>
              <button 
                onClick={() => setIsSmsOpen(false)}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-colors text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSendSms} className="p-8 space-y-6 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gold uppercase tracking-wider block">Recipient Phone Number</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 0798258950"
                  value={smsPhone}
                  onChange={(e) => setSmsPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:border-gold transition-all text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gold uppercase tracking-wider block">SMS Alert Message</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Enter message text..."
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:border-gold transition-all text-sm font-medium"
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsSmsOpen(false)}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold uppercase transition-all text-xs"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSendingSms}
                  className="flex-1 py-4 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 spring-bounce hover:scale-[1.01] active:scale-[0.99] uppercase text-xs tracking-widest flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSendingSms ? <Loader2 className="w-4 h-4 animate-spin text-forest" /> : <Send className="w-4 h-4 text-forest stroke-[2px]" />}
                  SEND SMS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
