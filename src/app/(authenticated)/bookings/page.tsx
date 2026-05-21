'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format } from 'date-fns';
import { Search, Filter, MoreVertical, CheckCircle, XCircle, Clock, PlusCircle } from 'lucide-react';
import { QuickLogModal } from '@/components/QuickLogModal';

export default function BookingsPage() {
  const supabase = createClient();
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);

  useEffect(() => {
    async function fetchBookings() {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          venues (name)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setBookings(data);
      }
      setIsLoading(false);
    }

    fetchBookings();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const confirmBooking = async (bookingId: number, depositAmount: number, mpesaCode?: string) => {
    if (!window.confirm('Are you sure you want to confirm this payment?')) return;
    
    setIsLoading(true);
    try {
      // 1. Update booking status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);
      
      if (updateError) throw updateError;

      // 2. Insert payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
          booking_id: bookingId,
          amount: depositAmount,
          method: 'mpesa_manual',
          status: 'completed',
          mpesa_receipt: mpesaCode || ('MANUAL-' + Math.floor(Math.random() * 1000000))
        }]);
        
      if (paymentError) throw paymentError;

      // Refresh list
      const { data, error } = await supabase
        .from('bookings')
        .select(`*, venues (name)`)
        .order('created_at', { ascending: false });
      if (!error && data) setBookings(data);
      
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
            BOOKINGS
          </h1>
          <p className="text-charcoal-light mt-2 font-medium">Real-time arena reservations and financial overview.</p>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-light group-focus-within:text-gold transition-colors" />
            <input 
              type="text" 
              placeholder="Search bookings..." 
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

      <div className="relative group">
        {/* Decorative background blur */}
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
                      <p className="font-display font-bold text-xl text-forest">No records found yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                bookings.map((booking, idx) => (
                  <tr key={booking.id} className="hover:bg-white/50 transition-all duration-300 group/row">
                    <td className="px-8 py-6">
                      <p className="font-bold text-forest text-lg tracking-tight group-hover/row:text-gold transition-colors">{booking.client_name}</p>
                      <p className="text-xs text-charcoal-light font-mono opacity-60 tracking-wider">{booking.client_phone}</p>
                      {booking.checkout_request_id && (
                        <p className="text-[10px] mt-1 bg-gold/10 text-gold px-2 py-0.5 rounded font-mono inline-block uppercase font-bold">
                          Code: {booking.checkout_request_id}
                        </p>
                      )}
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
                          KES {booking.deposit_amount.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-black text-gold uppercase tracking-[0.1em]">Deposit Received</span>
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
                            onClick={() => confirmBooking(booking.id, booking.deposit_amount, booking.checkout_request_id)}
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
          // Refresh logic...
          const fetchBookings = async () => {
            setIsLoading(true);
            const { data } = await supabase.from('bookings').select('*, venues(name)').order('created_at', { ascending: false });
            if (data) setBookings(data);
            setIsLoading(false);
          };
          fetchBookings();
        }} 
      />
    </div>
  );
}
