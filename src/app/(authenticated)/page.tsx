'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  Users, 
  PlusCircle, 
  Activity, 
  Clock,
  DollarSign,
  TrendingDown,
  ChevronRight
} from 'lucide-react';
import { QuickLogModal } from '@/components/QuickLogModal';
import { ActivityTimeline } from '@/components/ActivityTimeline';

export default function Home() {
  const supabase = createClient();
  const router = useRouter();
  const { staff, user } = useAuth();
  
  const [stats, setStats] = useState({
    todayBookingsCount: 0,
    todayBookingsRevenue: 0,
    thisMonthRevenue: 0,
    thisMonthExpenses: 0,
    netMargin: 0,
    outstandingBalances: 0
  });

  const [todayBookings, setTodayBookings] = useState<any[]>([]);
  const [todaySlots, setTodaySlots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);

  useEffect(() => {
    if (staff?.role === 'coach') {
      router.push('/instructor');
      return;
    }
    
    async function fetchStats() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('fetchStats: Session not yet available in browser client.');
        return;
      }

      // Use local date for Nairobi timezone matching
      const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
      const currentYearMonth = new Date().toISOString().substring(0, 7); // "YYYY-MM"

      try {
        // Fetch only the strictly required tables parallelly (eliminates latency waterfalls)
        const [bookingsRes, slotsRes, expensesRes] = await Promise.all([
          supabase.from('bookings').select('*, venues(name)').order('created_at', { ascending: false }),
          supabase.from('time_slots').select('*').eq('date', today),
          supabase.from('expenses').select('*')
        ]);

        if (bookingsRes.error) throw bookingsRes.error;
        if (slotsRes.error) throw slotsRes.error;
        if (expensesRes.error) throw expensesRes.error;

        const allBookings = bookingsRes.data || [];
        const slotsToday = slotsRes.data || [];
        const allExpenses = expensesRes.data || [];

        // 1. Identify bookings scheduled for today
        const todaySlotIds = new Set(slotsToday.map((s: any) => s.id));
        const bookingsToday = allBookings.filter((b: any) => {
          if (b.status === 'cancelled') return false;
          // Matches if slot_ids intersect with today's slots or fell back for today's walk-ins
          const hasTodaySlot = Array.isArray(b.slot_ids) && b.slot_ids.some((id: any) => todaySlotIds.has(Number(id)));
          const isCreatedToday = b.created_at.startsWith(today);
          return hasTodaySlot || (isCreatedToday && (!b.slot_ids || b.slot_ids.length === 0));
        });

        // 2. Compute metrics
        const sTodayBookingsCount = bookingsToday.length;
        const sTodayBookingsRevenue = bookingsToday.reduce((sum: number, b: any) => {
          const paid = Number(b.total_amount) - Number(b.balance);
          return sum + (paid > 0 ? paid : 0);
        }, 0);

        // This Month's Revenue: Stream 1 - Venues
        const sThisMonthRevenue = allBookings
          .filter((b: any) => b.status !== 'cancelled' && b.created_at && b.created_at.startsWith(currentYearMonth))
          .reduce((sum: number, b: any) => sum + (Number(b.total_amount) - Number(b.balance)), 0);

        // This Month's Expenses
        const sThisMonthExpenses = allExpenses
          .filter((e: any) => e.stream === 'venues' && e.created_at && e.created_at.startsWith(currentYearMonth))
          .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

        // Net Operating Margin
        const sNetMargin = sThisMonthRevenue - sThisMonthExpenses;

        // Outstanding Balances Total (for all non-cancelled bookings)
        const sOutstandingBalances = allBookings
          .filter((b: any) => b.status !== 'cancelled')
          .reduce((sum: number, b: any) => sum + Number(b.balance), 0);

        setStats({
          todayBookingsCount: sTodayBookingsCount,
          todayBookingsRevenue: sTodayBookingsRevenue,
          thisMonthRevenue: sThisMonthRevenue,
          thisMonthExpenses: sThisMonthExpenses,
          netMargin: sNetMargin,
          outstandingBalances: sOutstandingBalances
        });

        setTodayBookings(bookingsToday);
        setTodaySlots(slotsToday);

      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (staff) {
      fetchStats();
    }
  }, [staff, user, router, supabase]);

  // Helper to format a time slot to human readable time
  function formatTimeSlot(slotId: any) {
    const slot = todaySlots.find((s: any) => Number(s.id) === Number(slotId));
    if (!slot) return '';
    const [h, m] = slot.start_time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  }

  // Helper to render all slot times for a booking
  function getBookingSlotsString(b: any) {
    if (!b.slot_ids || b.slot_ids.length === 0) return 'No Slots Mapped';
    const formatted = b.slot_ids.map((id: any) => formatTimeSlot(id)).filter(Boolean);
    if (formatted.length === 0) return 'Walk-in / Scheduled';
    return formatted.join(', ');
  }

  const isStream1Visible = staff?.role === 'super_admin' || staff?.stream_scope === 'all' || staff?.stream_scope === 'stream_1';

  return (
    <div className="flex flex-col flex-1 p-6 lg:p-10 animate-entrance min-h-full">
      <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-1 bg-gold rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">Overview</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold font-display tracking-tight text-white uppercase italic">
            Dashboard Panel
          </h1>
          <p className="text-white/40 text-sm font-medium mt-1">
            Real-time venue analytics, active reservations, and financial margins at a glance.
          </p>
        </div>
        
        {isStream1Visible && (
          <button 
            onClick={() => setIsQuickLogOpen(true)}
            className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 spring-bounce hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="w-5 h-5 text-forest stroke-[2.5px]" />
            Quick Log Walk-in
          </button>
        )}
      </header>

      {/* =========================================================
          SIMPLIFIED METRICS GRID (5-CARD SECURE PANEL)
          ========================================================= */}
      <section className="mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          
          {/* Card 1: Today's Bookings */}
          <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch hover:border-white/10 transition-all duration-300 hover:scale-[1.02] spring-bounce">
            <div className="flex justify-between items-start mb-5">
              <div className="p-3 rounded-2xl bg-sky-400/10 border border-white/5">
                <Calendar className="w-6 h-6 text-sky-400" />
              </div>
            </div>
            <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1.5">Today's Bookings</h3>
            <p className="text-3xl font-extrabold font-display text-white">
              {isLoading ? '...' : stats.todayBookingsCount}
            </p>
            <p className="text-[10px] text-white/30 font-medium mt-2">
              Revenue: KES {isLoading ? '...' : stats.todayBookingsRevenue.toLocaleString()}
            </p>
          </div>

          {/* Card 2: This Month's Revenue */}
          <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch hover:border-white/10 transition-all duration-300 hover:scale-[1.02] spring-bounce">
            <div className="flex justify-between items-start mb-5">
              <div className="p-3 rounded-2xl bg-green-400/10 border border-white/5">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1.5">Month's Revenue</h3>
            <p className="text-3xl font-extrabold font-display text-white">
              {isLoading ? '...' : `KES ${stats.thisMonthRevenue.toLocaleString()}`}
            </p>
            <p className="text-[10px] text-white/30 font-medium mt-2">Stream 1 - Venue Bookings</p>
          </div>

          {/* Card 3: This Month's Expenses */}
          <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch hover:border-white/10 transition-all duration-300 hover:scale-[1.02] spring-bounce">
            <div className="flex justify-between items-start mb-5">
              <div className="p-3 rounded-2xl bg-red-400/10 border border-white/5">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1.5">Month's Expenses</h3>
            <p className="text-3xl font-extrabold font-display text-white">
              {isLoading ? '...' : `KES ${stats.thisMonthExpenses.toLocaleString()}`}
            </p>
            <p className="text-[10px] text-white/30 font-medium mt-2">Venue Outflows</p>
          </div>

          {/* Card 4: Net Operating Margin */}
          <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch hover:border-white/10 transition-all duration-300 hover:scale-[1.02] spring-bounce">
            <div className="flex justify-between items-start mb-5">
              <div className={`p-3 rounded-2xl border border-white/5 ${stats.netMargin >= 0 ? 'bg-emerald-400/10' : 'bg-red-400/10'}`}>
                <DollarSign className={`w-6 h-6 ${stats.netMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
              </div>
            </div>
            <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1.5">Net Margin</h3>
            <p className={`text-3xl font-extrabold font-display ${stats.netMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {isLoading ? '...' : `KES ${stats.netMargin.toLocaleString()}`}
            </p>
            <p className="text-[10px] text-white/30 font-medium mt-2">Net profitability this month</p>
          </div>

          {/* Card 5: Outstanding Balances */}
          <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch hover:border-white/10 transition-all duration-300 hover:scale-[1.02] spring-bounce">
            <div className="flex justify-between items-start mb-5">
              <div className="p-3 rounded-2xl bg-amber-400/10 border border-white/5">
                <AlertCircle className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1.5">Total Balances</h3>
            <p className="text-3xl font-extrabold font-display text-white">
              {isLoading ? '...' : `KES ${stats.outstandingBalances.toLocaleString()}`}
            </p>
            <p className="text-[10px] text-white/30 font-medium mt-2">Total unpaid receivables</p>
          </div>

        </div>
      </section>

      {/* =========================================================
          TODAY'S BOOKINGS FEED & OPERATIONAL TIMELINES
          ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Today's Bookings List (2/3 width) */}
        <div className="lg:col-span-2 bg-card p-8 rounded-3xl border border-white/5 shadow-pitch text-white">
          <h2 className="text-xl font-bold font-display text-white mb-6 italic flex items-center gap-2.5">
            Today's Scheduled Bookings
            <span className="text-[10px] font-black font-mono uppercase bg-gold/10 text-gold px-2 py-0.5 rounded border border-gold/25">
              {todayBookings.length} Active
            </span>
          </h2>
          
          <div className="overflow-x-auto">
            {isLoading ? (
              <p className="text-xs text-white/30 italic text-center py-12">Loading active slot schedule...</p>
            ) : todayBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                <Calendar className="w-12 h-12 mb-4 text-white" />
                <p className="font-display font-bold text-lg text-white">No Bookings Today</p>
                <p className="text-sm text-white/40">New online or walk-in reservations will populate here.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-white/40 font-bold text-xs uppercase tracking-wider">
                    <th className="pb-4">Customer</th>
                    <th className="pb-4">Venue</th>
                    <th className="pb-4">Slot Times</th>
                    <th className="pb-4">Paid</th>
                    <th className="pb-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {todayBookings.map((b) => {
                    const paid = Number(b.total_amount) - Number(b.balance);
                    const isFullyPaid = Number(b.balance) === 0;

                    return (
                      <tr key={b.id} className="group hover:bg-white/[0.01] transition-colors">
                        <td className="py-4 pr-2">
                          <div className="font-bold text-white line-clamp-1">{b.client_name}</div>
                          <div className="text-[10px] font-mono text-white/35 mt-0.5">{b.client_phone}</div>
                        </td>
                        <td className="py-4 pr-2">
                          <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${b.venues?.type === 'turf' ? 'bg-success/10 text-success' : 'bg-sky-400/10 text-sky-400'}`}>
                            {b.venues?.name || 'Venue'}
                          </span>
                        </td>
                        <td className="py-4 pr-2 text-white/70 font-mono text-xs">
                          {getBookingSlotsString(b)}
                        </td>
                        <td className="py-4 pr-2 font-mono text-xs text-gold">
                          KES {paid.toLocaleString()}
                        </td>
                        <td className="py-4 text-right pr-1">
                          <div className={`font-mono text-xs font-extrabold ${isFullyPaid ? 'text-green-400' : 'text-amber-400'}`}>
                            KES {Number(b.balance).toLocaleString()}
                          </div>
                          <div className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${isFullyPaid ? 'text-green-400/50' : 'text-amber-400/50'}`}>
                            {isFullyPaid ? 'Fully Paid' : 'Outstanding'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <button 
            onClick={() => router.push('/bookings')}
            className="w-full mt-6 py-3 border border-dashed border-white/10 bg-white/[0.01] hover:bg-white/[0.03] hover:border-gold/30 rounded-2xl text-xs font-bold text-white/60 hover:text-gold transition-all flex items-center justify-center gap-2 group"
          >
            VIEW BOOKINGS MANAGER
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Right: Operational Activity Logs (1/3 width) */}
        <div className="bg-card p-8 rounded-3xl border border-white/5 shadow-pitch text-white">
          <h2 className="text-xl font-bold font-display text-white mb-8 italic flex items-center gap-2.5">
            Operational Activity
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          </h2>
          <div className="space-y-6">
            <ActivityTimeline />
          </div>
        </div>

      </div>

      <QuickLogModal 
        isOpen={isQuickLogOpen} 
        onClose={() => {
          setIsQuickLogOpen(false);
          // Auto-trigger stats reload
          window.location.reload();
        }} 
      />
    </div>
  );
}
