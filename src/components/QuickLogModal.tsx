'use client';

import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { createClient } from '@/utils/supabase/client';
import { 
  X, 
  User, 
  Phone, 
  MapPin, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  CreditCard,
  Banknote,
  PlusCircle
} from 'lucide-react';

interface Venue {
  id: number;
  name: string;
  type: string;
  hourly_rates: any;
}

interface TimeSlot {
  id: number;
  venue_id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: 'available' | 'booked' | 'held';
  price_tier: 'peak' | 'off_peak' | 'weekend';
}

export function QuickLogModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const supabase = createClient();
  
  // Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card'>('cash');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [isBackdated, setIsBackdated] = useState(false);
  const [backdateDate, setBackdateDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Discount Tracking States (Correction 2)
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<string>('');
  const [discountReason, setDiscountReason] = useState('');
  
  // Data State
  const [venues, setVenues] = useState<Venue[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch Venues
  useEffect(() => {
    if (!isOpen) return;
    async function fetchVenues() {
      const { data, error } = await supabase.from('venues').select('*').order('name');
      if (!error && data) {
        setVenues(data);
        if (data.length > 0) setSelectedVenue(data[0]);
      }
    }
    fetchVenues();
  }, [isOpen]);

  // Fetch Slots
  useEffect(() => {
    if (!isOpen || !selectedVenue) return;
    
    async function fetchSlots() {
      setIsLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .eq('venue_id', selectedVenue!.id)
        .eq('date', dateStr)
        .order('start_time', { ascending: true });
        
      if (!error && data) {
        setSlots(data);
      }
      setIsLoading(false);
    }
    fetchSlots();
  }, [isOpen, selectedVenue, selectedDate]);

  // Calculate Original Amount
  const originalAmount = selectedSlots.reduce((total, id) => {
    const slot = slots.find(s => s.id === id);
    if (!slot) return total;
    return total + (slot.price_tier === 'peak' ? 2000 : 1500);
  }, 0);

  // Calculate Live Discount & Final Total
  const discountVal = applyDiscount ? (parseFloat(discountAmount) || 0) : 0;
  const finalTotalAmount = originalAmount - discountVal;

  // Auto-fill amount paid if empty or matches previous total
  useEffect(() => {
    if (finalTotalAmount > 0 && (!amountPaid || parseFloat(amountPaid) === 0 || parseFloat(amountPaid) === originalAmount)) {
      setAmountPaid(finalTotalAmount.toString());
    }
  }, [finalTotalAmount, originalAmount]);

  const toggleSlot = (id: number) => {
    setSelectedSlots(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenue || selectedSlots.length === 0 || !clientName || !clientPhone) {
      setError('Please fill in all required fields.');
      return;
    }

    if (discountVal > originalAmount) {
      setError('Discount amount cannot exceed the original booking amount.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Ensure the Supabase client session is hydrated on the client before writing,
      // so triggers like enforce_booking_rules successfully identify the admin user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Your session is unauthenticated or expired. Please re-login.');
      }

      const createdAtTimestamp = isBackdated
        ? `${backdateDate}T12:00:00.000Z`
        : new Date().toISOString();

      const parsedAmountPaid = parseFloat(amountPaid) || 0;

      // 1. Create Booking
      const bookingPayload: any = {
        venue_id: selectedVenue.id,
        client_phone: clientPhone,
        client_name: clientName,
        slot_ids: selectedSlots,
        original_amount: originalAmount,
        discount_amount: discountVal,
        discount_reason: applyDiscount ? discountReason : null,
        total_amount: finalTotalAmount,
        deposit_amount: parsedAmountPaid,
        balance: finalTotalAmount - parsedAmountPaid,
        status: 'confirmed',
        source: 'walk_in'
      };

      if (isBackdated) {
        bookingPayload.created_at = createdAtTimestamp;
      }

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingPayload)
        .select()
        .single();

      if (bookingError) throw bookingError;

      // 2. Create Payment (only if payment is strictly > 0 to comply with check constraints)
      if (parsedAmountPaid > 0) {
        const paymentPayload: any = {
          booking_id: booking.id,
          amount: parsedAmountPaid,
          payment_method: paymentMethod,
          stream: 'venues',
          status: 'completed',
          paid_at: createdAtTimestamp
        };

        if (isBackdated) {
          paymentPayload.created_at = createdAtTimestamp;
        }

        const { error: paymentError } = await supabase
          .from('payments')
          .insert(paymentPayload);

        if (paymentError) throw paymentError;
      }

      // 3. Update Slots
      const { error: slotsError } = await supabase
        .from('time_slots')
        .update({ status: 'booked' })
        .in('id', selectedSlots);

      if (slotsError) throw slotsError;

      // 4. Fire-and-forget booking confirmation SMS (non-blocking)
      supabase.functions.invoke('send-booking-sms', {
        body: { bookingId: booking.id }
      }).then(({ data, error }: any) => {
        if (error) {
          console.error('Failed to send SMS confirmation:', error);
        } else {
          console.log('SMS confirmation processed:', data);
        }
      }).catch((err: any) => {
        console.error('Failed to trigger SMS confirmation:', err);
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
        // Reset state
        setSuccess(false);
        setClientName('');
        setClientPhone('');
        setSelectedSlots([]);
        setAmountPaid('');
        setIsBackdated(false);
        setBackdateDate(format(new Date(), 'yyyy-MM-dd'));
        setApplyDiscount(false);
        setDiscountAmount('');
        setDiscountReason('');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-charcoal/85 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-charcoal border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-surface/50">
          <div>
            <h2 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2 text-white">
              <CheckCircle2 className="w-6 h-6 text-gold" /> Quick Log Walk-in
            </h2>
            <p className="text-charcoal-light text-sm">Manually record a booking and payment.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-charcoal-light hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-8">
          {success ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95">
              <div className="w-24 h-24 bg-success/10 text-success rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-bold font-display mb-2 text-white">Booking Logged!</h3>
              <p className="text-charcoal-light max-w-md">The booking and payment have been recorded successfully. Redirecting...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-10">
              
              {/* Client Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-xs uppercase font-bold text-muted tracking-widest flex items-center gap-2">
                    <User className="w-4 h-4" /> Client Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-charcoal-light mb-1.5 ml-1">Full Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                        <input 
                          type="text"
                          required
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="w-full pl-11 pr-4 py-3.5 bg-surface border border-white/10 rounded-2xl text-sm text-white placeholder-white/35 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-charcoal-light mb-1.5 ml-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                        <input 
                          type="tel"
                          required
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="07XX XXX XXX"
                          className="w-full pl-11 pr-4 py-3.5 bg-surface border border-white/10 rounded-2xl text-sm text-white placeholder-white/35 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs uppercase font-bold text-muted tracking-widest flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Venue & Date
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-charcoal-light mb-1.5 ml-1">Select Venue</label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                        <select 
                          value={selectedVenue?.id}
                          onChange={(e) => setSelectedVenue(venues.find(v => v.id === Number(e.target.value)) || null)}
                          className="w-full pl-11 pr-4 py-3.5 bg-surface border border-white/10 rounded-2xl text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold transition-all"
                        >
                          {venues.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-charcoal-light mb-1.5 ml-1">Select Date</label>
                      <div className="relative">
                        <CalendarIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                        <input 
                          type="date"
                          value={format(selectedDate, 'yyyy-MM-dd')}
                          onChange={(e) => setSelectedDate(new Date(e.target.value))}
                          className="w-full pl-11 pr-4 py-3.5 bg-surface border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold transition-all"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col gap-3">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="checkbox"
                          checked={isBackdated}
                          onChange={(e) => setIsBackdated(e.target.checked)}
                          className="w-4 h-4 rounded border border-white/10 text-gold focus:ring-gold/20 focus:ring-offset-0 focus:ring-2 accent-gold cursor-pointer"
                        />
                        <span className="text-xs font-bold text-charcoal-light group-hover:text-white transition-colors">
                          Backdate Transaction Date
                        </span>
                      </label>

                      {isBackdated && (
                        <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                          <label className="block text-xs font-bold text-charcoal-light ml-1">Transaction Date</label>
                          <div className="relative">
                            <CalendarIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                            <input 
                              type="date"
                              required
                              value={backdateDate}
                              max={format(new Date(), 'yyyy-MM-dd')}
                              onChange={(e) => setBackdateDate(e.target.value)}
                              className="w-full pl-11 pr-4 py-3.5 bg-surface border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold transition-all"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Slot Selection Section */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-bold text-muted tracking-widest flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Select Time Slots
                </h3>
                {isLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 animate-pulse">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="h-14 bg-surface/50 border border-white/5 rounded-xl"></div>
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <div className="p-8 text-center bg-surface/30 border border-dashed border-white/10 rounded-3xl">
                    <AlertCircle className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted">No slots available for this date/venue.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {slots.map(slot => {
                      const isSelected = selectedSlots.includes(slot.id);
                      const isBooked = slot.status === 'booked';
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={isBooked}
                          onClick={() => toggleSlot(slot.id)}
                          className={`
                            relative py-3 rounded-xl border-2 text-center transition-all duration-200
                            ${isBooked 
                              ? 'bg-white/5 border-white/5 text-white/30 opacity-50 cursor-not-allowed' 
                              : isSelected
                                ? 'bg-forest text-white border-forest shadow-lg shadow-forest/20'
                                : 'bg-surface border-white/10 text-white/80 hover:border-gold/50'
                            }
                          `}
                        >
                          <span className="block font-mono font-bold text-sm">
                            {slot.start_time.substring(0, 5)}
                          </span>
                          <span className={`text-[9px] font-bold uppercase ${isSelected ? 'text-gold' : 'text-muted'}`}>
                            {slot.price_tier.replace('_', ' ')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Payment & Billing Section */}
              <div className="bg-surface/50 border border-white/10 rounded-3xl p-8 space-y-6">
                
                {/* 🏷️ Expandable Discount Panel (Correction 2) */}
                <div className="border-b border-white/5 pb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setApplyDiscount(!applyDiscount);
                      setDiscountAmount('');
                      setDiscountReason('');
                    }}
                    className="text-xs font-bold text-gold hover:text-white uppercase tracking-wider flex items-center gap-2 focus:outline-none transition-colors"
                  >
                    <PlusCircle className={`w-4.5 h-4.5 transition-transform duration-200 ${applyDiscount ? 'rotate-45 text-red-400' : 'text-gold'}`} />
                    {applyDiscount ? 'Cancel Discount' : 'Apply Discount / Special Promotion'}
                  </button>

                  {applyDiscount && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 animate-in slide-in-from-top-2 duration-200">
                      <div>
                        <label className="block text-xs font-bold text-charcoal-light mb-1.5 ml-1">Discount Amount (KES)</label>
                        <input 
                          type="number"
                          value={discountAmount}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (parseFloat(val) > originalAmount) {
                              setDiscountAmount(originalAmount.toString());
                            } else {
                              setDiscountAmount(val);
                            }
                          }}
                          placeholder="e.g. 500"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/35 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-gold/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-charcoal-light mb-1.5 ml-1">Discount Reason</label>
                        <input 
                          type="text"
                          value={discountReason}
                          onChange={(e) => setDiscountReason(e.target.value)}
                          placeholder="e.g. Family / Loyalty Discount"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-white/35 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/20"
                        />
                      </div>
                      <div className="sm:col-span-2 pt-2 text-xs font-mono font-extrabold text-amber-400">
                        Live Pricing: Original KES {originalAmount.toLocaleString()} → Discounted KES {finalTotalAmount.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-xs uppercase font-bold text-muted tracking-widest flex items-center gap-2">
                      <CreditCard className="w-4 h-4" /> Payment Details
                    </h3>
                    <div className="flex gap-2">
                      {[
                        { id: 'cash', icon: Banknote, label: 'Cash' },
                        { id: 'mpesa', icon: CreditCard, label: 'M-Pesa' },
                        { id: 'card', icon: CreditCard, label: 'Card' }
                      ].map(method => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPaymentMethod(method.id as any)}
                          className={`
                            flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all
                            ${paymentMethod === method.id 
                              ? 'bg-gold/15 border-gold text-white shadow-sm' 
                              : 'bg-transparent border-white/10 text-white/60 hover:border-white/20'
                            }
                          `}
                        >
                          <method.icon className={`w-5 h-5 ${paymentMethod === method.id ? 'text-gold' : 'text-muted'}`} />
                          <span className="text-xs font-bold tracking-wide">{method.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs uppercase font-bold text-muted tracking-widest flex items-center gap-2">
                      <Banknote className="w-4 h-4" /> Billing Summary
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-charcoal-light">Original Rate</span>
                        <span className={`font-mono font-bold text-white ${applyDiscount ? 'text-white/40 line-through' : ''}`}>
                          KES {originalAmount.toLocaleString()}
                        </span>
                      </div>
                      
                      {applyDiscount && (
                        <div className="flex justify-between items-center text-sm text-amber-400 font-bold">
                          <span>Discount Applied</span>
                          <span className="font-mono">- KES {discountVal.toLocaleString()}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-sm">
                        <span className="text-charcoal-light">Total Fee</span>
                        <span className="font-mono font-bold text-white">KES {finalTotalAmount.toLocaleString()}</span>
                      </div>
                      
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-xs font-bold text-charcoal-light">Amount Paid</span>
                        <div className="relative flex-1 max-w-[150px]">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted uppercase">KES</span>
                          <input 
                            type="number"
                            value={amountPaid}
                            onChange={(e) => setAmountPaid(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 text-white placeholder-white/35 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-gold/20"
                          />
                        </div>
                      </div>
                      <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                        <span className="text-sm font-bold text-white">Balance Due</span>
                        <span className="font-mono font-bold text-lg text-gold">
                          KES {Math.max(0, finalTotalAmount - (parseFloat(amountPaid) || 0)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || selectedSlots.length === 0}
                className={`
                  w-full py-5 rounded-2xl font-bold tracking-widest uppercase transition-all shadow-xl
                  ${isSubmitting || selectedSlots.length === 0
                    ? 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed shadow-none'
                    : 'bg-gold hover:bg-gold-muted text-forest-dark hover:shadow-gold/20 active:scale-[0.98]'
                  }
                `}
              >
                {isSubmitting ? 'LOGGING BOOKING...' : 'COMPLETE QUICK LOG'}
              </button>

            </form>
          )}
        </div>
      </div>
    </div>
  );
}
