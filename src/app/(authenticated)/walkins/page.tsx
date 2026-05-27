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
      const today = data.filter((b: any) => isToday(new Date(b.created_at))).length;
      const revenue = data.reduce((sum: number, b: any) => sum + Number(b.deposit_amount), 0);
      
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
      // Ensure session is fully hydrated on the client
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Your session is unauthenticated or expired. Please re-login.');
      }

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
          stream: 'venues',
          status: 'completed',
          paid_at: new Date().toISOString()
        }]);
        
      if (paymentError) throw paymentError;

      alert('Payment confirmed successfully!');
      await fetchWalkins();
      
    } catch (err: any) {
      alert(err.message || 'Error confirming booking');
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col flex-1 p-6 lg:p-10 animate-entrance min-h-full">
      <header className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-1 bg-gold rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">Operations</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tighter leading-none italic uppercase">
            Walk-ins
          </h1>
          <p className="text-white/40 text-sm font-medium mt-1">Offline logs and walk-in transaction history.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center w-full lg:w-auto">
          <div className="relative group w-full sm:w-auto">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-gold transition-colors" />
            <input 
              type="text" 
              placeholder="Search walk-ins..." 
              className="pl-12 pr-6 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none w-full sm:w-64 transition-all"
            />
          </div>
          
          <button 
            onClick={() => setIsQuickLogOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 spring-bounce hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider group whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4 text-forest stroke-[2.5px] group-hover:rotate-90 transition-transform duration-500" /> 
            QUICK LOG
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="glass p-6 rounded-3xl shadow-pitch hover:border-white/10 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center border border-gold/20">
              <Users className="w-6 h-6 text-gold" />
            </div>
            <div>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-0.5">Today's Walk-ins</p>
              <h3 className="text-2xl lg:text-3xl font-display font-extrabold text-white italic">
                {isLoading ? '...' : stats.todayCount}
              </h3>
            </div>
          </div>
        </div>

        <div className="glass p-6 rounded-3xl shadow-pitch hover:border-white/10 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
              <TrendingUp className="w-6 h-6 text-gold" />
            </div>
            <div>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-0.5">Total Walk-in Revenue</p>
              <h3 className="text-2xl lg:text-3xl font-display font-extrabold text-white italic">
                KES {isLoading ? '...' : stats.totalRevenue.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-gold/10 to-gold-muted/5 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        
        <div className="relative glass rounded-[2rem] overflow-hidden shadow-pitch">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Client Details</th>
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Venue</th>
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Financials</th>
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Status</th>
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Timestamp</th>
                  <th className="px-8 py-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  [1, 2, 3, 4].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-8 py-8 h-12 bg-white/5"></td>
                    </tr>
                  ))
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-40">
                        <Clock className="w-12 h-12 text-gold animate-pulse" />
                        <p className="font-display font-bold text-xl text-white">No walk-in records found yet.</p>
                        <button 
                          onClick={() => setIsQuickLogOpen(true)}
                          className="mt-4 px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10 hover:border-white/20 transition-all"
                        >
                          LOG FIRST WALK-IN
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-white/[0.02] transition-colors group/row">
                      <td className="px-8 py-6">
                        <div className="font-bold text-white text-lg tracking-tight group-hover/row:text-gold transition-colors">{booking.client_name}</div>
                        <div className="text-xs text-white/40 font-mono tracking-wider">{booking.client_phone}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
                          <span className="w-1.5 h-1.5 bg-gold rounded-full"></span>
                          <span className="font-bold text-[10px] text-charcoal-light uppercase tracking-wider">{booking.venues?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-lg font-black text-white tracking-tighter">
                            KES {Number(booking.deposit_amount).toLocaleString()}
                          </span>
                          <span className="text-[10px] font-black text-gold uppercase tracking-[0.1em]">Logged Amount</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`
                          inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border
                          ${booking.status === 'confirmed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                            booking.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' : 
                            'bg-red-500/10 text-red-400 border-red-500/20'}
                        `}>
                          {booking.status === 'confirmed' ? <CheckCircle className="w-3 h-3" /> : 
                           booking.status === 'pending' ? <Clock className="w-3 h-3" /> : 
                           <XCircle className="w-3 h-3" />}
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-medium text-charcoal-light">
                          {format(new Date(booking.created_at), 'MMM d, yyyy')}
                        </div>
                        <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                          {format(new Date(booking.created_at), 'h:mm a')}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end items-center gap-3">
                          {booking.status === 'pending' && (
                            <button 
                              onClick={() => confirmBooking(booking.id, booking.deposit_amount)}
                              className="px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
                            >
                              Verify Payment
                            </button>
                          )}
                          <button className="p-2.5 hover:bg-white/5 rounded-xl transition-all group/opt">
                            <MoreVertical className="w-4 h-4 text-white/40 group-hover/opt:text-gold" />
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
