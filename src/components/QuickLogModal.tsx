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
  Banknote
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

  // Calculate Total
  const totalAmount = selectedSlots.reduce((total, id) => {
    const slot = slots.find(s => s.id === id);
    if (!slot) return total;
    return total + (slot.price_tier === 'peak' ? 2000 : 1500);
  }, 0);

  // Auto-fill amount paid if empty or matches previous total
  useEffect(() => {
    if (totalAmount > 0 && (!amountPaid || parseFloat(amountPaid) === 0)) {
      setAmountPaid(totalAmount.toString());
    }
  }, [totalAmount]);

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

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Create Booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          venue_id: selectedVenue.id,
          client_phone: clientPhone,
          client_name: clientName,
          slot_ids: selectedSlots,
          total_amount: totalAmount,
          deposit_amount: parseFloat(amountPaid),
          balance: totalAmount - parseFloat(amountPaid),
          status: 'confirmed',
          source: 'walk_in'
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // 2. Create Payment
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          booking_id: booking.id,
          amount: parseFloat(amountPaid),
          payment_method: paymentMethod,
          status: 'completed',
          paid_at: new Date().toISOString()
        });

      if (paymentError) throw paymentError;

      // 3. Update Slots
      const { error: slotsError } = await supabase
        .from('time_slots')
        .update({ status: 'booked' })
        .in('id', selectedSlots);

      if (slotsError) throw slotsError;

      // 4. Fire-and-forget booking confirmation SMS (non-blocking)
      supabase.functions.invoke('send-booking-sms', {
        body: { bookingId: booking.id }
      }).then(({ data, error }) => {
        if (error) {
          console.error('Failed to send SMS confirmation:', error);
        } else {
          console.log('SMS confirmation processed:', data);
        }
      }).catch(err => {
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
        className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-border-color flex justify-between items-center bg-surface/50">
          <div>
            <h2 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2 text-forest">
              <CheckCircle2 className="w-6 h-6 text-gold" /> Quick Log Walk-in
            </h2>
            <p className="text-charcoal-light text-sm">Manually record a booking and payment.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-forest/5 rounded-full transition-colors text-charcoal-light hover:text-forest"
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
              <h3 className="text-3xl font-bold font-display mb-2">Booking Logged!</h3>
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
                          className="w-full pl-11 pr-4 py-3.5 bg-surface border border-border-color rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold transition-all"
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
                          className="w-full pl-11 pr-4 py-3.5 bg-surface border border-border-color rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold transition-all font-mono"
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
                          className="w-full pl-11 pr-4 py-3.5 bg-surface border border-border-color rounded-2xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold transition-all"
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
                          className="w-full pl-11 pr-4 py-3.5 bg-surface border border-border-color rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold transition-all"
                        />
                      </div>
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
                      <div key={i} className="h-14 bg-surface rounded-xl"></div>
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <div className="p-8 text-center bg-surface border border-dashed border-border-color rounded-3xl">
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
                              ? 'bg-muted/10 border-border-color text-muted opacity-50 cursor-not-allowed' 
                              : isSelected
                                ? 'bg-forest text-white border-forest shadow-lg shadow-forest/20'
                                : 'bg-surface border-border-color hover:border-gold/50'
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

              {/* Payment Section */}
              <div className="bg-surface/50 border border-border-color rounded-3xl p-8 space-y-6">
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
                              ? 'bg-white border-gold text-forest shadow-sm' 
                              : 'bg-transparent border-border-color text-muted hover:border-border-color/50'
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
                        <span className="text-charcoal-light">Total Fee</span>
                        <span className="font-mono font-bold">KES {totalAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-xs font-bold text-charcoal">Amount Paid</span>
                        <div className="relative flex-1 max-w-[150px]">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted uppercase">KES</span>
                          <input 
                            type="number"
                            value={amountPaid}
                            onChange={(e) => setAmountPaid(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-border-color rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-gold/20"
                          />
                        </div>
                      </div>
                      <div className="pt-3 border-t border-border-color flex justify-between items-center">
                        <span className="text-sm font-bold text-forest">Balance Due</span>
                        <span className="font-mono font-bold text-lg text-forest">
                          KES {(totalAmount - (parseFloat(amountPaid) || 0)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-error/10 border border-error/20 rounded-2xl flex items-center gap-3 text-error text-sm">
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
                    ? 'bg-muted/20 text-muted cursor-not-allowed shadow-none'
                    : 'bg-forest hover:bg-forest-dark text-white hover:shadow-forest/30 active:scale-[0.98]'
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
