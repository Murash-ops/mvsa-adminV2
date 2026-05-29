'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Users, 
  PlusCircle, 
  DollarSign, 
  Trophy, 
  Clock, 
  ChevronRight,
  Shield,
  Activity,
  CheckCircle,
  Loader2,
  Settings,
  MessageSquare
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type SuperAdminDashboardProps = {
  bookings: any[];
  timeSlots: any[];
  expenses: any[];
  programs: any[];
  enrollments: any[];
  staff: any;
  onOpenQuickLog: () => void;
  onRefresh: () => void;
};

export default function SuperAdminDashboard({
  bookings,
  timeSlots,
  expenses,
  programs,
  enrollments,
  staff,
  onOpenQuickLog,
  onRefresh
}: SuperAdminDashboardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isConfirmingId, setIsConfirmingId] = useState<number | null>(null);

  // Nairobi timezone local date YYYY-MM-DD
  const todayDateStr = new Date().toLocaleDateString('en-CA');
  const currentYearMonth = new Date().toISOString().substring(0, 7); // "YYYY-MM"

  // 1. Venue Metrics (Stream 1)
  const todayBookings = bookings.filter(b => {
    if (b.status === 'cancelled') return false;
    const isCreatedToday = b.created_at.startsWith(todayDateStr);
    const slotIdsSet = new Set(b.slot_ids || []);
    const hasTodaySlots = timeSlots.some(s => slotIdsSet.has(Number(s.id)));
    return isCreatedToday || hasTodaySlots;
  });

  const todayBookingsCount = todayBookings.length;
  const todayBookingsRevenue = todayBookings.reduce((sum: number, b: any) => {
    const paid = Number(b.total_amount) - Number(b.balance);
    return sum + (paid > 0 ? paid : 0);
  }, 0);

  const thisMonthRevenue = bookings
    .filter((b: any) => b.status !== 'cancelled' && b.created_at && b.created_at.startsWith(currentYearMonth))
    .reduce((sum: number, b: any) => sum + (Number(b.total_amount) - Number(b.balance)), 0);

  const thisMonthExpenses = expenses
    .filter((e: any) => e.stream === 'venues' && e.created_at && e.created_at.startsWith(currentYearMonth))
    .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

  const netMargin = thisMonthRevenue - thisMonthExpenses;

  const outstandingBalances = bookings
    .filter((b: any) => b.status !== 'cancelled')
    .reduce((sum: number, b: any) => sum + Number(b.balance), 0);

  const thisMonthDiscounts = bookings
    .filter((b: any) => b.status !== 'cancelled' && b.created_at && b.created_at.startsWith(currentYearMonth))
    .reduce((sum: number, b: any) => sum + Number(b.discount_amount || 0), 0);

  // 2. Academy Metrics (Stream 2)
  const activeProgramsCount = programs.filter((p: any) => p.is_active).length;
  const totalEnrollmentsCount = enrollments.filter((e: any) => e.status === 'active').length;
  const thisMonthAcademyExpenses = expenses
    .filter((e: any) => e.stream === 'programs' && e.created_at && e.created_at.startsWith(currentYearMonth))
    .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

  // 3. WhatsApp Hold Reservations Queue
  const pendingWhatsApp = bookings.filter(b => b.source === 'whatsapp' && b.status === 'pending');

  // Available slots for today — visual grid (6AM to 11PM)
  const hours = Array.from({ length: 17 }, (_, i) => {
    const h = 6 + i;
    return h.toString().padStart(2, '0') + ':00:00';
  });

  const getSlotStatus = (time: string) => {
    const slot = timeSlots.find(s => s.start_time === time);
    return slot?.status || 'available';
  };

  const formatTimeStr = (timeStr: string) => {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  const getBookingSlotsString = (b: any) => {
    if (!b.slot_ids || b.slot_ids.length === 0) return 'No Slots Mapped';
    const formatted = b.slot_ids.map((id: any) => {
      const slot = timeSlots.find(s => Number(s.id) === Number(id));
      if (!slot) return '';
      const [h, m] = slot.start_time.split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${m} ${ampm}`;
    }).filter(Boolean);
    
    if (formatted.length === 0) return 'Walk-in / Scheduled';
    return formatted.join(', ');
  };

  const handleConfirmWhatsApp = async (b: any) => {
    setIsConfirmingId(b.id);
    try {
      const { error: bookingErr } = await supabase
        .from('bookings')
        .update({ 
          status: 'confirmed',
          deposit_amount: b.total_amount,
          balance: 0 
        })
        .eq('id', b.id);
      
      if (bookingErr) throw bookingErr;

      if (b.slot_ids && b.slot_ids.length > 0) {
        const { error: slotErr } = await supabase
          .from('time_slots')
          .update({ status: 'booked' })
          .in('id', b.slot_ids);
        if (slotErr) throw slotErr;
      }

      alert('WhatsApp Booking confirmed! Time slot locked.');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error confirming booking');
    } finally {
      setIsConfirmingId(null);
    }
  };

  const quickNavCards = [
    { label: 'Booking Desk', path: '/bookings', color: 'border-sky-400/20 hover:border-sky-400', desc: 'Manage Turf reservations & slots' },
    { label: 'Academy Cohorts', path: '/programs', color: 'border-violet-400/20 hover:border-violet-400', desc: 'Configure coaching & registrations' },
    { label: 'Roster Intakes', path: '/enrollments', color: 'border-gold/20 hover:border-gold', desc: 'Approve COO academy enrollments' },
    { label: 'Outflow Ledger', path: '/expenses', color: 'border-red-400/20 hover:border-red-400', desc: 'Audit Stream 1 & Stream 2 expenses' },
    { label: 'Content Manager', path: '/settings', color: 'border-emerald-400/20 hover:border-emerald-400', desc: 'Edit homepage settings & posters' }
  ];

  return (
    <div className="space-y-10 text-left">
      {/* ========================================================
          RAPID ACTION BAR
          ======================================================== */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center p-8 bg-gradient-to-r from-gold/10 to-transparent border border-white/5 rounded-[2rem] shadow-pitch text-white gap-6">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase text-gold tracking-widest flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> ROOT CONTROL PANEL
          </span>
          <h2 className="text-xl font-black font-display text-white uppercase italic">Super Admin Management Deck</h2>
          <p className="text-xs text-white/50 leading-relaxed font-medium">
            Full-stream operational control. Log walk-ins instantly, confirm reservations, adjust program cohorts, and edit web settings.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/settings')}
            className="flex items-center gap-2 px-6 py-4.5 bg-white/5 border border-white/10 hover:border-gold/40 text-white rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] text-xs tracking-wider"
          >
            <Settings className="w-4 h-4 text-gold stroke-[2px]" />
            SETTINGS MANAGER
          </button>
          <button
            onClick={onOpenQuickLog}
            className="flex items-center gap-2.5 px-6 py-4.5 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 spring-bounce hover:scale-[1.02] active:scale-[0.98] text-xs tracking-widest uppercase"
          >
            <PlusCircle className="w-4 h-4 text-forest stroke-[2.5px]" />
            Quick Walk-in
          </button>
        </div>
      </section>

      {/* ========================================================
          MACRO PERFORMANCE KPI GRID (BOTH STREAMS)
          ======================================================== */}
      <section className="space-y-6">
        <h3 className="text-sm font-black uppercase text-gold tracking-widest flex items-center gap-2">
          <Activity className="w-4 h-4" /> Multi-Stream Performance
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Today's Turf Bookings */}
          <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch transition-all hover:scale-[1.02]">
            <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1.5">Today's Turf Activity</h3>
            <p className="text-3xl font-extrabold font-display text-white">{todayBookingsCount} bookings</p>
            <p className="text-[10px] text-white/30 font-medium mt-2">
              Collected Revenue: KES {todayBookingsRevenue.toLocaleString()}
            </p>
          </div>

          {/* Card 2: Venues Revenue vs Expenses */}
          <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch transition-all hover:scale-[1.02]">
            <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1.5">Venues P&L (Month)</h3>
            <p className="text-2xl font-extrabold font-display text-emerald-400">KES {thisMonthRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-red-400 font-medium mt-2">
              Outflow: KES {thisMonthExpenses.toLocaleString()} (Margin: KES {netMargin.toLocaleString()})
            </p>
          </div>

          {/* Card 3: Academy Metrics */}
          <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch transition-all hover:scale-[1.02]">
            <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1.5">Academy Intakes (Month)</h3>
            <p className="text-2xl font-extrabold font-display text-gold italic">{totalEnrollmentsCount} students active</p>
            <p className="text-[10px] text-white/30 font-medium mt-2">
              Active Programs: {activeProgramsCount} • Expenses: KES {thisMonthAcademyExpenses.toLocaleString()}
            </p>
          </div>

          {/* Card 4: Global Receivables */}
          <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch transition-all hover:scale-[1.02]">
            <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1.5">Unpaid Receivables</h3>
            <p className="text-2xl font-extrabold font-display text-amber-400">KES {outstandingBalances.toLocaleString()}</p>
            <p className="text-[10px] text-amber-500 font-bold mt-2">
              Month discounts: KES {thisMonthDiscounts.toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================
          PENDING WHATSAPP RESERVATIONS QUEUE
          ======================================================== */}
      <section className="bg-card p-8 rounded-[2rem] border border-white/5 shadow-pitch text-white">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold animate-pulse" />
            <h2 className="text-xl font-bold font-display text-white italic uppercase tracking-tight">Pending WhatsApp Reservations</h2>
          </div>
          <span className="px-3 py-1 rounded-xl bg-gold/10 border border-gold/25 text-[10px] font-black uppercase text-gold tracking-widest font-mono">
            {pendingWhatsApp.length} Slot holds active
          </span>
        </div>

        <div className="overflow-x-auto pr-2 custom-scrollbar">
          {pendingWhatsApp.length === 0 ? (
            <div className="py-12 border border-dashed border-white/10 rounded-2xl text-center opacity-40">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="font-bold text-sm text-white">WhatsApp Queue is Clear</p>
              <p className="text-xs text-white/40 mt-0.5">No slots are currently held waiting for deposit checks.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/5 text-white/40 font-bold text-xs uppercase tracking-wider">
                  <th className="pb-4">Client Details</th>
                  <th className="pb-4">Venue</th>
                  <th className="pb-4">Slot Times</th>
                  <th className="pb-4">Amount Due</th>
                  <th className="pb-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pendingWhatsApp.map((b) => (
                  <tr key={b.id} className="hover:bg-white/[0.005] transition-colors">
                    <td className="py-4 pr-2">
                      <div className="font-bold text-white text-sm">{b.client_name}</div>
                      <div className="text-[10px] text-white/40 mt-0.5 font-mono">{b.client_phone}</div>
                    </td>
                    <td className="py-4 pr-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-gold">
                        {b.venues?.name || 'Venue'}
                      </span>
                    </td>
                    <td className="py-4 pr-2 text-white/70 font-mono text-xs">
                      {getBookingSlotsString(b)}
                    </td>
                    <td className="py-4 pr-2 font-mono text-xs text-gold font-extrabold">
                      KES {Number(b.total_amount).toLocaleString()}
                    </td>
                    <td className="py-4 text-right">
                      <button 
                        onClick={() => handleConfirmWhatsApp(b)}
                        disabled={isConfirmingId === b.id}
                        className="px-4 py-2 bg-gradient-to-r from-gold to-gold-muted hover:from-white hover:to-white text-forest rounded-xl text-[10px] font-black uppercase tracking-widest shadow-gold-sm transition-all flex items-center justify-center gap-1.5 ml-auto disabled:opacity-50"
                      >
                        {isConfirmingId === b.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-forest" />
                        ) : (
                          'Confirm Payment'
                        )}
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
          PITCH AVAILABILITY GRID & NAVIGATION SHORTS
          ======================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Quick Access Links (5/12 width) */}
        <div className="lg:col-span-5 bg-card p-8 rounded-[2rem] border border-white/5 shadow-pitch text-white flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="text-xl font-bold font-display uppercase tracking-tight italic flex items-center gap-2">
              <Settings className="w-5 h-5 text-gold" /> System Quick Navigation
            </h3>
            
            <p className="text-xs text-white/40 font-medium">
              Immediate links to specific admin management directories:
            </p>

            <div className="space-y-3">
              {quickNavCards.map((card) => (
                <button
                  key={card.label}
                  onClick={() => router.push(card.path)}
                  className={`w-full flex justify-between items-center p-4 bg-white/[0.01] hover:bg-white/[0.03] border ${card.color} rounded-xl text-left transition-all group`}
                >
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-white group-hover:text-gold transition-colors">{card.label}</span>
                    <p className="text-[10px] text-white/35 font-medium mt-0.5">{card.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30 group-hover:translate-x-1 group-hover:text-gold transition-all" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Pitch Availability Tracker (7/12 width) */}
        <div className="lg:col-span-7 bg-card p-8 rounded-[2rem] border border-white/5 shadow-pitch text-white">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold font-display text-white italic uppercase tracking-tight">Today's Live Pitch Tracker</h2>
            <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">6AM - 11PM</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {hours.map((time) => {
              const status = getSlotStatus(time);
              const displayTime = formatTimeStr(time);
              
              const statusStyles = {
                available: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15',
                booked: 'bg-white/5 text-white/30 border-white/5 pointer-events-none line-through',
                held: 'bg-amber-500/10 text-amber-400 border-amber-500/20 pointer-events-none'
              };

              return (
                <div 
                  key={time}
                  className={`py-3 px-3 rounded-xl border text-center font-mono text-xs font-bold transition-all ${statusStyles[status as keyof typeof statusStyles]}`}
                >
                  <div>{displayTime}</div>
                  <div className="text-[9px] uppercase tracking-widest mt-1 opacity-60 font-semibold">{status}</div>
                </div>
              );
            })}
          </div>
        </div>

      </section>
    </div>
  );
}
