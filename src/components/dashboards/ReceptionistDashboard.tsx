'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  CheckCircle,
  PlusCircle,
  Loader2,
  Trophy
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type ReceptionistDashboardProps = {
  bookings: any[];
  timeSlots: any[];
  staff: any;
  onOpenQuickLog: () => void;
  onRefresh: () => void;
};

export default function ReceptionistDashboard({
  bookings,
  timeSlots,
  staff,
  onOpenQuickLog,
  onRefresh
}: ReceptionistDashboardProps) {
  const supabase = createClient();
  const [isConfirmingId, setIsConfirmingId] = useState<number | null>(null);

  // Nairobi timezone local date
  const todayDateStr = new Date().toLocaleDateString('en-CA');

  // Filter Today's Confirmed Bookings list
  const todayConfirmed = bookings.filter(b => {
    if (b.status !== 'confirmed') return false;
    const isCreatedToday = b.created_at.startsWith(todayDateStr);
    
    // Check if slots belong to today
    const slotIdsSet = new Set(b.slot_ids || []);
    const hasTodaySlots = timeSlots.some(s => slotIdsSet.has(Number(s.id)));
    return isCreatedToday || hasTodaySlots;
  });

  // Filter Pending WhatsApp Bookings (source = 'whatsapp' and status = 'pending')
  const pendingWhatsApp = bookings.filter(b => b.source === 'whatsapp' && b.status === 'pending');

  // Available slots for today — visual grid showing what's free (6AM to 11PM)
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

  // Helper to format slot times string for summary
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

  // Receptionist Action: Confirm Pending WhatsApp booking
  const handleConfirmWhatsApp = async (b: any) => {
    setIsConfirmingId(b.id);
    try {
      // 1. Update booking status to confirmed, set deposit_amount = total_amount, balance = 0
      const { error: bookingErr } = await supabase
        .from('bookings')
        .update({ 
          status: 'confirmed',
          deposit_amount: b.total_amount,
          balance: 0 
        })
        .eq('id', b.id);
      
      if (bookingErr) throw bookingErr;

      // 2. Lock associated slots (status = 'booked')
      if (b.slot_ids && b.slot_ids.length > 0) {
        const { error: slotErr } = await supabase
          .from('time_slots')
          .update({ status: 'booked' })
          .in('id', b.slot_ids);
        if (slotErr) throw slotErr;
      }

      alert('WhatsApp Booking confirmed! Time slot locked and balance paid.');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error confirming booking');
    } finally {
      setIsConfirmingId(null);
    }
  };

  return (
    <div className="space-y-10 text-left">
      {/* ========================================================
          RAPID ACTION PANEL
          ======================================================== */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-8 bg-gradient-to-r from-gold/15 to-transparent border border-gold/25 rounded-[2rem] shadow-pitch text-white gap-6">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase text-gold tracking-widest">Rapid Booking Desk</span>
          <h2 className="text-xl font-black font-display text-white uppercase italic">Active Shift Portal</h2>
          <p className="text-xs text-white/50 leading-relaxed font-medium">
            Manage field allocations, log walk-ins immediately in under 5 taps, and verify WhatsApp queue deposits.
          </p>
        </div>

        <button
          onClick={onOpenQuickLog}
          className="flex items-center gap-2.5 px-8 py-5 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 spring-bounce hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <PlusCircle className="w-5 h-5 text-forest stroke-[2.5px]" />
          Quick Log Walk-in
        </button>
      </section>

      {/* ========================================================
          PENDING WHATSAPP BOOKINGS QUEUE
          ======================================================== */}
      <section className="bg-card p-8 rounded-[2rem] border border-white/5 shadow-pitch text-white">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold animate-pulse" />
            <h2 className="text-xl font-bold font-display text-white italic uppercase tracking-tight">Pending WhatsApp Queue</h2>
          </div>
          <span className="px-3.5 py-1.5 rounded-xl bg-gold/10 border border-gold/25 text-[10px] font-black uppercase text-gold tracking-widest font-mono">
            {pendingWhatsApp.length} Reservations Held
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
                  <th className="pb-4">Client</th>
                  <th className="pb-4">Venue</th>
                  <th className="pb-4">Slot Times</th>
                  <th className="pb-4">Hold Expiry</th>
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
                    <td className="py-4 pr-2 text-white/50 text-xs font-medium">
                      1 Hour from hold
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
          PITCH AVAILABILITY TRACKER GRID
          ======================================================== */}
      <section className="bg-card p-8 rounded-[2rem] border border-white/5 shadow-pitch text-white">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gold" />
            <h2 className="text-xl font-bold font-display text-white italic uppercase tracking-tight">Pitch Availability Tracker</h2>
          </div>
          <span className="text-[10px] font-black font-mono uppercase bg-emerald-500/15 text-emerald-400 px-3 py-1 rounded border border-emerald-500/20">
            Live Field Status
          </span>
        </div>

        <p className="text-xs text-white/40 mb-6 font-medium">
          Operational hourly turf status from 6:00 AM to 11:00 PM. Green denotes immediately bookable slots.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
                className={`py-3.5 px-4 rounded-xl border text-center font-mono text-xs font-bold transition-all ${statusStyles[status as keyof typeof statusStyles]}`}
              >
                <div>{displayTime}</div>
                <div className="text-[9px] uppercase tracking-widest mt-1 opacity-60 font-semibold">{status}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================
          TODAY'S CONFIRMED BOOKINGS SCHEDULE
          ======================================================== */}
      <section className="bg-card p-8 rounded-[2rem] border border-white/5 shadow-pitch text-white">
        <h2 className="text-xl font-bold font-display text-white mb-6 italic flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gold" /> Today's Confirmed Schedule
        </h2>

        <div className="overflow-x-auto pr-2 custom-scrollbar">
          {todayConfirmed.length === 0 ? (
            <div className="py-12 border border-dashed border-white/10 rounded-2xl text-center opacity-40">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-white" />
              <p className="font-bold text-sm text-white">No Confirmed Bookings</p>
              <p className="text-xs text-white/40 mt-0.5">Confirmed slot allocations for today will appear here.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/5 text-white/40 font-bold text-xs uppercase tracking-wider">
                  <th className="pb-4">Customer</th>
                  <th className="pb-4">Venue Allocation</th>
                  <th className="pb-4">Slot Times</th>
                  <th className="pb-4">Amount Paid</th>
                  <th className="pb-4 text-right">Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {todayConfirmed.map((b) => {
                  const paid = Number(b.total_amount) - Number(b.balance);
                  const isFullyPaid = Number(b.balance) === 0;

                  return (
                    <tr key={b.id} className="hover:bg-white/[0.005] transition-colors">
                      <td className="py-4 pr-2">
                        <div className="font-bold text-white text-sm">{b.client_name}</div>
                        <div className="text-[10px] text-white/40 mt-0.5 font-mono">{b.client_phone}</div>
                      </td>
                      <td className="py-4 pr-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                          {b.venues?.name || 'Venue'}
                        </span>
                      </td>
                      <td className="py-4 pr-2 text-white/70 font-mono text-xs">
                        {getBookingSlotsString(b)}
                      </td>
                      <td className="py-4 pr-2 font-mono text-xs text-gold">
                        KES {paid.toLocaleString()}
                      </td>
                      <td className="py-4 text-right">
                        <div className={`font-mono text-xs font-extrabold ${isFullyPaid ? 'text-green-400' : 'text-amber-400'}`}>
                          KES {Number(b.balance).toLocaleString()}
                        </div>
                        <div className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${isFullyPaid ? 'text-green-400/50' : 'text-amber-400/50'}`}>
                          {isFullyPaid ? 'Fully Paid' : 'Receivable'}
                        </div>
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
