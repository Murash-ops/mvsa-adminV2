'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format, isToday } from 'date-fns';
import { Search, MoreVertical, CheckCircle, XCircle, Clock, PlusCircle, TrendingUp, Users } from 'lucide-react';
import { QuickLogModal } from '@/components/QuickLogModal';

export default function WalkinsPage() {
  const supabase = createClient();
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [stats, setStats] = useState({
    todayCount: 0,
    totalRevenue: 0
  });

  const fetchWalkins = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        venues (name)
      `)
      .eq('source', 'walk_in')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBookings(data);
      
      // Calculate stats
      const today = data.filter(b => isToday(new Date(b.created_at))).length;
      const revenue = data.reduce((sum, b) => sum + Number(b.deposit_amount), 0);
      
      setStats({
        todayCount: today,
        totalRevenue: revenue
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchWalkins();
  }, []);

  const confirmBooking = async (bookingId: number, depositAmount: number) => {
    if (!window.confirm('Are you sure you want to confirm this payment?')) return;
    
    setIsLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);
      
      if (updateError) throw updateError;

      const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
          booking_id: bookingId,
          amount: depositAmount,
          payment_method: 'cash',
          status: 'completed',
          paid_at: new Date().toISOString()
        }]);
        
      if (paymentError) throw paymentError;

      await fetchWalkins();
      
    } catch (err: any) {
      alert(err.message || 'Error confirming booking');
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col flex-1 p-8 bg-surface/50 min-h-full">
      <header className="mb-10 flex justify-between items-end animate-slide-up">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-1 bg-gold rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-forest/60">Operations</span>
          </div>
          <h1 className="text-5xl font-display font-extrabold text-forest tracking-tighter leading-none">
            WALK-INS
          </h1>
          <p className="text-charcoal-light mt-2 font-medium">Offline logs and walk-in transaction history.</p>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-light group-focus-within:text-gold transition-colors" />
            <input 
              type="text" 
              placeholder="Search walk-ins..." 
              className="pl-12 pr-6 py-3 bg-white/80 backdrop-blur-sm border border-forest/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 w-64 transition-all hover:border-forest/20"
            />
          </div>
          
          <button 
            onClick={() => setIsQuickLogOpen(true)}
            className="flex items-center gap-3 px-6 py-3 bg-forest text-white rounded-2xl text-sm font-bold hover:bg-forest-dark transition-all shadow-xl shadow-forest/20 hover:-translate-y-0.5 active:scale-95 group"
          >
            <PlusCircle className="w-5 h-5 text-gold group-hover:rotate-90 transition-transform duration-500" /> 
            QUICK LOG
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="relative group overflow-hidden">
          <div className="absolute -inset-1 bg-gradient-to-r from-gold/20 to-transparent rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative bg-white/70 backdrop-blur-md border border-white/20 p-8 rounded-[2rem] shadow-xl flex items-center gap-6">
            <div className="w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center border border-gold/20">
              <Users className="w-8 h-8 text-gold" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-forest/40 mb-1">Today's Walk-ins</p>
              <h3 className="text-4xl font-display font-black text-forest tracking-tighter">
                {isLoading ? '...' : stats.todayCount}
              </h3>
            </div>
          </div>
        </div>

        <div className="relative group overflow-hidden">
          <div className="absolute -inset-1 bg-gradient-to-r from-forest/10 to-transparent rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative bg-white/70 backdrop-blur-md border border-white/20 p-8 rounded-[2rem] shadow-xl flex items-center gap-6">
            <div className="w-16 h-16 bg-forest/5 rounded-2xl flex items-center justify-center border border-forest/10">
              <TrendingUp className="w-8 h-8 text-forest" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-forest/40 mb-1">Total Walk-in Revenue</p>
              <h3 className="text-4xl font-display font-black text-forest tracking-tighter">
                KES {isLoading ? '...' : stats.totalRevenue.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-gold/20 to-forest/10 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        
        <div className="relative bg-white/70 backdrop-blur-md border border-white/20 rounded-[2rem] overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-forest/5 border-b border-forest/10">
                <th className="px-8 py-5 text-[10px] uppercase font-black text-forest tracking-[0.2em]">Client Details</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-forest tracking-[0.2em]">Venue</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-forest tracking-[0.2em]">Financials</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-forest tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-forest tracking-[0.2em]">Timestamp</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forest/5">
              {isLoading ? (
                [1, 2, 3, 4].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-8 py-8">
                      <div className="h-12 bg-forest/5 rounded-2xl w-full"></div>
                    </td>
                  </tr>
                ))
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-40">
                      <Clock className="w-12 h-12 text-forest" />
                      <p className="font-display font-bold text-xl text-forest">No walk-in records found yet.</p>
                      <button 
                        onClick={() => setIsQuickLogOpen(true)}
                        className="mt-4 px-6 py-2 border border-forest/20 rounded-xl text-xs font-bold text-forest hover:bg-forest hover:text-white transition-all"
                      >
                        LOG FIRST WALK-IN
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-white/50 transition-all duration-300 group/row">
                    <td className="px-8 py-6">
                      <p className="font-bold text-forest text-lg tracking-tight group-hover/row:text-gold transition-colors">{booking.client_name}</p>
                      <p className="text-xs text-charcoal-light font-mono opacity-60 tracking-wider">{booking.client_phone}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-forest/5 rounded-xl border border-forest/10">
                        <span className="w-1.5 h-1.5 bg-gold rounded-full"></span>
                        <span className="font-bold text-xs text-forest uppercase tracking-wider">{booking.venues?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-lg font-black text-forest tracking-tighter">
                          KES {Number(booking.deposit_amount).toLocaleString()}
                        </span>
                        <span className="text-[10px] font-black text-gold uppercase tracking-[0.1em]">Logged Amount</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`
                        inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border
                        ${booking.status === 'confirmed' ? 'bg-green-500/10 text-green-700 border-green-200' : 
                          booking.status === 'pending' ? 'bg-amber-500/10 text-amber-700 border-amber-200 animate-pulse' : 
                          'bg-red-500/10 text-red-700 border-red-200'}
                      `}>
                        {booking.status === 'confirmed' ? <CheckCircle className="w-3 h-3" /> : 
                         booking.status === 'pending' ? <Clock className="w-3 h-3" /> : 
                         <XCircle className="w-3 h-3" />}
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-medium text-charcoal-light">
                        {format(new Date(booking.created_at), 'MMM d, yyyy')}
                      </p>
                      <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
                        {format(new Date(booking.created_at), 'h:mm a')}
                      </p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end items-center gap-3">
                        {booking.status === 'pending' && (
                          <button 
                            onClick={() => confirmBooking(booking.id, booking.deposit_amount)}
                            className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-600/20 transition-all hover:-translate-y-0.5 active:scale-95"
                          >
                            Verify Payment
                          </button>
                        )}
                        <button className="p-2.5 hover:bg-forest/5 rounded-xl transition-all group/opt">
                          <MoreVertical className="w-5 h-5 text-charcoal-light group-hover/opt:text-forest" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <QuickLogModal 
        isOpen={isQuickLogOpen} 
        onClose={() => {
          setIsQuickLogOpen(false);
          fetchWalkins();
        }} 
      />
    </div>
  );
}
