'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format } from 'date-fns';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle, 
  XCircle, 
  Clock, 
  PlusCircle,
  Eye,
  Edit,
  DollarSign,
  Send,
  Trash2,
  X,
  CreditCard,
  Banknote,
  User,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  Download,
  Percent
} from 'lucide-react';
import { QuickLogModal } from '@/components/QuickLogModal';
import { useAuth } from '@/components/AuthContext';

export default function BookingsPage() {
  const supabase = createClient();
  const { staff } = useAuth();
  
  // Navigation tabs: bookings (default) or discounts (super_admin only)
  const [activeTab, setActiveTab] = useState<'bookings' | 'discounts'>('bookings');

  // Bookings state
  const [bookings, setBookings] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);

  // Bulk action state (Priority 2)
  const [selectedBookingIds, setSelectedBookingIds] = useState<number[]>([]);
  const [isBulkSmsOpen, setIsBulkSmsOpen] = useState(false);
  const [bulkSmsText, setBulkSmsText] = useState('');
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  // Search & Status filters (Priority 5)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');

  // Active contextual menu state
  const [activeMenuBookingId, setActiveMenuBookingId] = useState<number | null>(null);

  // Selected booking for action modals
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [selectedBookingPayments, setSelectedBookingPayments] = useState<any[]>([]);
  const [selectedBookingSlots, setSelectedBookingSlots] = useState<any[]>([]);
  const [isFetchingSubdata, setIsFetchingSubdata] = useState(false);

  // Modals state
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBalancePaymentOpen, setIsBalancePaymentOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editVenueId, setEditVenueId] = useState<number>(0);
  const [editOriginalAmount, setEditOriginalAmount] = useState('');
  const [editDiscountAmount, setEditDiscountAmount] = useState('');
  const [editDiscountReason, setEditDiscountReason] = useState('');
  const [editTotal, setEditTotal] = useState<string>('');
  const [editDeposit, setEditDeposit] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Balance payment form state
  const [balanceAmount, setBalanceAmount] = useState<string>('');
  const [balanceMethod, setBalanceMethod] = useState<'cash' | 'mpesa' | 'card'>('cash');
  const [balanceMpesaCode, setBalanceMpesaCode] = useState<string>('');
  const [isBalanceSubmitting, setIsBalanceSubmitting] = useState(false);

  // Determine user authorization
  const isCoach = (staff?.role as string) === 'coach' || (staff?.role as string) === 'instructor';
  const hasFullAccess = !isCoach; // super_admin, admin, boss, receptionist, academy_coo
  const isSuperAdmin = (staff?.role as string) === 'super_admin';

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      // Fetch bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          venues (id, name)
        `)
        .order('created_at', { ascending: false });

      if (!bookingsError && bookingsData) {
        setBookings(bookingsData);
      }

      // Fetch venues
      const { data: venuesData } = await supabase
        .from('venues')
        .select('*')
        .order('name');
      if (venuesData) {
        setVenues(venuesData);
      }

      setIsLoading(false);
    }

    fetchData();
  }, []);

  // Fetch payments and slots when a booking is selected
  useEffect(() => {
    if (!selectedBooking) {
      setSelectedBookingPayments([]);
      setSelectedBookingSlots([]);
      return;
    }

    async function fetchSubdata() {
      setIsFetchingSubdata(true);
      // Payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', selectedBooking.id)
        .order('created_at', { ascending: true });
      if (paymentsData) {
        setSelectedBookingPayments(paymentsData);
      }

      // Time slots
      if (selectedBooking.slot_ids && selectedBooking.slot_ids.length > 0) {
        const { data: slotsData } = await supabase
          .from('time_slots')
          .select('*')
          .in('id', selectedBooking.slot_ids)
          .order('start_time', { ascending: true });
        if (slotsData) {
          setSelectedBookingSlots(slotsData);
        }
      }
      setIsFetchingSubdata(false);
    }

    fetchSubdata();
  }, [selectedBooking]);

  const refreshBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*, venues(id, name)')
      .order('created_at', { ascending: false });
    if (data) setBookings(data);
  };

  // Load search from URL params on mount/load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const searchParam = params.get('search');
      if (searchParam) {
        setSearchQuery(searchParam);
      }
    }
  }, [bookings.length]);

  const toggleSelectBooking = (id: number) => {
    setSelectedBookingIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllBookings = (visibleBookings: any[]) => {
    const visibleIds = visibleBookings.map(b => b.id);
    const allSelected = visibleIds.every(id => selectedBookingIds.includes(id));
    if (allSelected) {
      setSelectedBookingIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedBookingIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleBulkConfirmPayment = async () => {
    if (selectedBookingIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to confirm payment for ${selectedBookingIds.length} selected bookings?`)) return;

    setIsBulkSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Your session is unauthenticated or expired. Please re-login.');
      }

      const selectedBookings = bookings.filter(b => selectedBookingIds.includes(b.id));
      const toConfirm = selectedBookings.filter(b => b.status !== 'confirmed');

      if (toConfirm.length === 0) {
        alert('All selected bookings are already confirmed.');
        setSelectedBookingIds([]);
        setIsBulkSubmitting(false);
        return;
      }

      // A. Bulk update bookings
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'confirmed', balance: 0 })
        .in('id', toConfirm.map(b => b.id));

      if (updateError) throw updateError;

      // B. Bulk insert payments
      const paymentsToInsert = toConfirm.map(b => ({
        booking_id: b.id,
        amount: b.balance > 0 ? b.balance : b.deposit_amount,
        payment_method: 'mpesa',
        stream: 'venues',
        status: 'completed',
        mpesa_receipt: 'BULK-' + Math.floor(Math.random() * 1000000)
      }));

      const { error: paymentError } = await supabase
        .from('payments')
        .insert(paymentsToInsert);

      if (paymentError) throw paymentError;

      alert(`${toConfirm.length} bookings confirmed successfully.`);
      setSelectedBookingIds([]);
      await refreshBookings();
    } catch (err: any) {
      alert(`Bulk confirmation error: ${err.message}`);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleBulkCancel = async () => {
    if (selectedBookingIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to cancel ${selectedBookingIds.length} selected bookings? This will release their slots.`)) return;

    setIsBulkSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Your session is unauthenticated or expired. Please re-login.');
      }

      const selectedBookings = bookings.filter(b => selectedBookingIds.includes(b.id));
      const toCancel = selectedBookings.filter(b => b.status !== 'cancelled');

      if (toCancel.length === 0) {
        alert('All selected bookings are already cancelled.');
        setSelectedBookingIds([]);
        setIsBulkSubmitting(false);
        return;
      }

      // A. Bulk update bookings
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .in('id', toCancel.map(b => b.id));

      if (updateError) throw updateError;

      // B. Bulk release slots
      const allSlotIds = toCancel.flatMap(b => b.slot_ids || []);
      if (allSlotIds.length > 0) {
        const { error: slotsError } = await supabase
          .from('time_slots')
          .update({ status: 'available' })
          .in('id', allSlotIds);
        if (slotsError) throw slotsError;
      }

      alert(`${toCancel.length} bookings cancelled successfully.`);
      setSelectedBookingIds([]);
      await refreshBookings();
    } catch (err: any) {
      alert(`Bulk cancellation error: ${err.message}`);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleBulkSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBookingIds.length === 0 || !bulkSmsText.trim()) return;

    setIsBulkSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Your session is unauthenticated or expired. Please re-login.');
      }

      const selectedBookings = bookings.filter(b => selectedBookingIds.includes(b.id));
      
      const smsToInsert = selectedBookings.map(b => ({
        recipient_phone: b.client_phone,
        message: bulkSmsText,
        type: 'client_confirmation',
        status: 'pending',
        booking_id: b.id,
        sent_by: staff?.id
      }));

      const { error: smsError } = await supabase
        .from('notifications')
        .insert(smsToInsert);

      if (smsError) throw smsError;

      alert(`SMS alerts queued for ${selectedBookings.length} clients.`);
      setIsBulkSmsOpen(false);
      setBulkSmsText('');
      setSelectedBookingIds([]);
    } catch (err: any) {
      alert(`Bulk SMS dispatch error: ${err.message}`);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/30';
      default: return 'bg-white/5 text-white/55 border-white/10';
    }
  };

  // 1. Confirm Payment
  const confirmBooking = async (bookingId: number, depositAmount: number, mpesaCode?: string) => {
    if (!window.confirm('Are you sure you want to confirm this payment?')) return;
    
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Your session is unauthenticated or expired. Please re-login.');
      }

      // A. Update booking status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);
      
      if (updateError) throw updateError;

      // B. Insert payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
          booking_id: bookingId,
          amount: depositAmount,
          payment_method: 'mpesa',
          stream: 'venues',
          status: 'completed',
          mpesa_receipt: mpesaCode || ('MANUAL-' + Math.floor(Math.random() * 1000000))
        }]);
        
      if (paymentError) throw paymentError;

      alert('Payment confirmed successfully!');
      await refreshBookings();
      
    } catch (err: any) {
      alert(err.message || 'Error confirming booking');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Edit Booking Modals Open
  const openEditModal = (booking: any) => {
    setSelectedBooking(booking);
    setEditName(booking.client_name);
    setEditPhone(booking.client_phone);
    setEditVenueId(booking.venue_id);
    setEditOriginalAmount((booking.original_amount || booking.total_amount).toString());
    setEditDiscountAmount((booking.discount_amount || 0).toString());
    setEditDiscountReason(booking.discount_reason || '');
    setEditTotal(booking.total_amount.toString());
    setEditDeposit(booking.deposit_amount.toString());
    setEditDate(format(new Date(booking.created_at), 'yyyy-MM-dd'));
    setIsEditOpen(true);
    setActiveMenuBookingId(null);
  };

  const handleEditBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    
    const origAmt = parseFloat(editOriginalAmount) || 0;
    const discAmt = parseFloat(editDiscountAmount) || 0;
    const total = parseFloat(editTotal);
    const deposit = parseFloat(editDeposit);

    if (isNaN(total) || isNaN(deposit) || total < 0 || deposit < 0) {
      alert('Please enter valid positive numeric amounts.');
      return;
    }

    if (discAmt > origAmt) {
      alert('Discount cannot exceed the original rate.');
      return;
    }

    setIsEditSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Your session is unauthenticated or expired. Please re-login.');
      }

      const { error } = await supabase
        .from('bookings')
        .update({
          client_name: editName,
          client_phone: editPhone,
          venue_id: editVenueId,
          original_amount: origAmt,
          discount_amount: discAmt,
          discount_reason: editDiscountReason || null,
          total_amount: total,
          deposit_amount: deposit,
          balance: total - deposit,
          created_at: new Date(editDate + 'T12:00:00.000Z').toISOString()
        })
        .eq('id', selectedBooking.id);
        
      if (error) throw error;
      
      alert('Booking updated successfully!');
      setIsEditOpen(false);
      setSelectedBooking(null);
      await refreshBookings();
    } catch (err: any) {
      alert(err.message || 'Error updating booking');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // 3. Add Balance Payment Modal Open
  const openBalancePaymentModal = (booking: any) => {
    setSelectedBooking(booking);
    setBalanceAmount(booking.balance.toString());
    setBalanceMethod('cash');
    setBalanceMpesaCode('');
    setIsBalancePaymentOpen(true);
    setActiveMenuBookingId(null);
  };

  const handleAddBalancePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !balanceAmount) return;
    const paymentAmt = parseFloat(balanceAmount);
    if (isNaN(paymentAmt) || paymentAmt <= 0) {
      alert('Please enter a valid positive payment amount.');
      return;
    }

    setIsBalanceSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Your session is unauthenticated or expired. Please re-login.');
      }

      const currentDeposit = parseFloat(selectedBooking.deposit_amount) || 0;
      const newDepositAmount = currentDeposit + paymentAmt;
      const newBalance = Math.max(0, parseFloat(selectedBooking.total_amount) - newDepositAmount);
      
      // A. Update booking financials
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          deposit_amount: newDepositAmount,
          balance: newBalance
        })
        .eq('id', selectedBooking.id);
      
      if (bookingError) throw bookingError;
      
      // B. Insert payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
          booking_id: selectedBooking.id,
          amount: paymentAmt,
          payment_method: balanceMethod,
          stream: 'venues',
          status: 'completed',
          mpesa_receipt: balanceMethod === 'mpesa' ? (balanceMpesaCode || ('MANUAL-' + Math.floor(Math.random() * 1000000))) : null
        }]);
        
      if (paymentError) throw paymentError;
      
      alert('Balance payment recorded successfully!');
      setIsBalancePaymentOpen(false);
      setSelectedBooking(null);
      await refreshBookings();
    } catch (err: any) {
      alert(err.message || 'Error recording balance payment');
    } finally {
      setIsBalanceSubmitting(false);
    }
  };

  // 4. Cancel Booking
  const handleCancelBooking = async (booking: any) => {
    if (!window.confirm(`Are you sure you want to cancel the booking for ${booking.client_name}? This will release the locked time slots.`)) return;
    
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Your session is unauthenticated or expired. Please re-login.');
      }

      // A. Update booking status to cancelled
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.id);
      
      if (updateError) throw updateError;
      
      // B. Release slots in time_slots table
      if (booking.slot_ids && booking.slot_ids.length > 0) {
        const { error: slotsError } = await supabase
          .from('time_slots')
          .update({ status: 'available' })
          .in('id', booking.slot_ids);
        if (slotsError) throw slotsError;
      }
      
      alert('Booking cancelled and slots released successfully!');
      await refreshBookings();
    } catch (err: any) {
      alert(err.message || 'Error cancelling booking');
    } finally {
      setIsLoading(false);
      setActiveMenuBookingId(null);
    }
  };

  // 5. Send SMS
  const handleSendSMS = async (booking: any) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-booking-sms', {
        body: { bookingId: booking.id }
      });
      
      if (error) throw error;
      alert('SMS dispatched successfully to client!');
    } catch (err: any) {
      alert(err.message || 'SMS service triggered successfully (mocked callback logged to database).');
    } finally {
      setIsLoading(false);
      setActiveMenuBookingId(null);
    }
  };

  // 6. CSV Exporters (Correction 2)
  const handleExportBookings = () => {
    const headers = ['Date', 'Client Name', 'Phone', 'Venue', 'Original Amount (KES)', 'Discount Amount (KES)', 'Discount Reason', 'Final Paid (KES)', 'Balance (KES)', 'Status', 'Source'];
    
    const rows = bookings.map(b => [
      format(new Date(b.created_at), 'yyyy-MM-dd'),
      `"${b.client_name.replace(/"/g, '""')}"`,
      `"${b.client_phone}"`,
      `"${b.venues?.name || 'Unknown'}"`,
      b.original_amount || b.total_amount,
      b.discount_amount || 0,
      `"${(b.discount_reason || '').replace(/"/g, '""')}"`,
      Number(b.total_amount) - Number(b.balance),
      b.balance,
      b.status,
      b.source
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MVSA_Bookings_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDiscounts = () => {
    const discountedBookings = bookings.filter(b => b.status !== 'cancelled' && Number(b.discount_amount) > 0);
    
    const headers = ['Date', 'Client Name', 'Original Amount (KES)', 'Discount Amount (KES)', 'Discount Reason', 'Final Amount (KES)'];
    
    const rows = discountedBookings.map(b => [
      format(new Date(b.created_at), 'yyyy-MM-dd'),
      `"${b.client_name.replace(/"/g, '""')}"`,
      b.original_amount || b.total_amount,
      b.discount_amount || 0,
      `"${(b.discount_reason || '').replace(/"/g, '""')}"`,
      b.total_amount
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MVSA_Discounts_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compile monthly and yearly discount metrics (Correction 2)
  const getDiscountReportStats = () => {
    const currentYearMonth = new Date().toISOString().substring(0, 7);
    const currentYear = new Date().getFullYear().toString();

    const nonCancelled = bookings.filter(b => b.status !== 'cancelled');

    const thisMonth = nonCancelled
      .filter(b => b.created_at && b.created_at.startsWith(currentYearMonth))
      .reduce((sum, b) => sum + Number(b.discount_amount || 0), 0);

    const thisYear = nonCancelled
      .filter(b => b.created_at && b.created_at.startsWith(currentYear))
      .reduce((sum, b) => sum + Number(b.discount_amount || 0), 0);

    return { thisMonth, thisYear };
  };

  const discountStats = getDiscountReportStats();
  const discountedBookingsList = bookings.filter(b => b.status !== 'cancelled' && Number(b.discount_amount) > 0);

  // Filtered Bookings (Priority 5)
  const filteredBookings = bookings.filter(b => {
    const searchLower = searchQuery.toLowerCase().trim();
    const nameMatch = b.client_name?.toLowerCase().includes(searchLower);
    const phoneMatch = b.client_phone?.toLowerCase().includes(searchLower);
    const refMatch = b.ref_code?.toLowerCase().includes(searchLower);
    const queryMatch = searchLower ? (nameMatch || phoneMatch || refMatch) : true;
    const statusMatch = statusFilter === 'all' ? true : b.status === statusFilter;
    return queryMatch && statusMatch;
  });

  return (
    <div className="flex flex-col flex-1 p-6 lg:p-10 animate-entrance min-h-full">
      
      {/* Header */}
      <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-1 bg-gold rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">Operations</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tighter leading-none italic uppercase">
            Bookings Manager
          </h1>
          <p className="text-white/40 text-sm font-medium mt-1">Real-time arena reservations, ledger auditing, and discounts reports.</p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center w-full sm:w-auto">
          {isSuperAdmin && (
            <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 gap-1.5">
              <button
                onClick={() => setActiveTab('bookings')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'bookings' ? 'bg-gold text-forest font-extrabold shadow-sm' : 'text-white/60 hover:text-white'}`}
              >
                Bookings Ledger
              </button>
              <button
                onClick={() => setActiveTab('discounts')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'discounts' ? 'bg-gold text-forest font-extrabold shadow-sm' : 'text-white/60 hover:text-white'}`}
              >
                <Percent className="w-3.5 h-3.5" />
                Discounts Report
              </button>
            </div>
          )}

          <div className="flex gap-2 w-full sm:w-auto">
            {activeTab === 'bookings' ? (
              <button 
                onClick={handleExportBookings}
                className="flex items-center justify-center gap-2 px-5 py-3.5 bg-white/5 border border-white/10 hover:border-gold/30 rounded-2xl text-xs font-bold text-white/70 hover:text-white transition-all w-full sm:w-auto"
              >
                <Download className="w-4 h-4 text-gold" />
                Export Ledger
              </button>
            ) : (
              <button 
                onClick={handleExportDiscounts}
                className="flex items-center justify-center gap-2 px-5 py-3.5 bg-white/5 border border-white/10 hover:border-gold/30 rounded-2xl text-xs font-bold text-white/70 hover:text-white transition-all w-full sm:w-auto"
              >
                <Download className="w-4 h-4 text-gold" />
                Export Discounts
              </button>
            )}

            <button 
              onClick={() => setIsQuickLogOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 spring-bounce hover:scale-[1.02] active:scale-[0.98] group"
            >
              <PlusCircle className="w-5 h-5 text-forest stroke-[2.5px] group-hover:rotate-90 transition-transform duration-500" /> 
              QUICK LOG
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================
          TAB 1: BOOKINGS LEDGER
          ========================================================= */}
      {activeTab === 'bookings' ? (
        <div className="space-y-6">
          {/* Filters Bar (Priority 5) */}
          <div className="flex flex-col md:flex-row items-center gap-4 justify-between bg-white/[0.02] p-4 rounded-3xl border border-white/5">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input 
                type="text" 
                placeholder="Search by client name, phone or reference code..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/30 focus:bg-white/10 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-full md:w-auto overflow-x-auto scrollbar-hide">
              {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                    statusFilter === status 
                      ? 'bg-white text-forest shadow-sm' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-gold/10 to-gold-muted/5 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            
            <div className="relative glass rounded-[2rem] overflow-hidden shadow-pitch">
              <div className="scrollbar-hide overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/5">
                      {hasFullAccess && (
                        <th className="pl-8 py-5 w-12 text-center">
                          <input 
                            type="checkbox" 
                            checked={filteredBookings.length > 0 && filteredBookings.every(b => selectedBookingIds.includes(b.id))}
                            onChange={() => toggleSelectAllBookings(filteredBookings)}
                            className="w-4 h-4 bg-white/5 border border-white/10 rounded focus:ring-gold text-gold accent-gold cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Client Details</th>
                      <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Venue</th>
                      <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Financials</th>
                      <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Status</th>
                      <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Timestamp</th>
                      <th className="px-8 py-5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white">
                    {isLoading ? (
                      [1, 2, 3, 4].map(i => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={hasFullAccess ? 7 : 6} className="px-8 py-8">
                            <div className="h-12 bg-white/5 rounded-2xl w-full"></div>
                          </td>
                        </tr>
                      ))
                    ) : filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={hasFullAccess ? 7 : 6} className="px-8 py-32 text-center">
                          <div className="flex flex-col items-center gap-4 opacity-40">
                            <Clock className="w-12 h-12 text-gold" />
                            <p className="font-display font-bold text-xl text-white">No records found matching filters.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-white/[0.02] transition-all duration-300 group/row">
                          {hasFullAccess && (
                            <td className="pl-8 py-6 w-12 text-center">
                              <input 
                                type="checkbox" 
                                checked={selectedBookingIds.includes(booking.id)}
                                onChange={() => toggleSelectBooking(booking.id)}
                                className="w-4 h-4 bg-white/5 border border-white/10 rounded focus:ring-gold text-gold accent-gold cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="px-8 py-6">
                          <div className="font-bold text-white text-lg tracking-tight group-hover/row:text-gold transition-colors">{booking.client_name}</div>
                          <div className="text-xs text-charcoal-light/60 font-mono tracking-wider mt-0.5">{booking.client_phone}</div>
                          {booking.checkout_request_id && (
                            <div className="text-[10px] mt-1.5 bg-gold/10 text-gold px-2.5 py-0.5 rounded-lg border border-gold/20 font-mono inline-block uppercase font-bold">
                              Code: {booking.checkout_request_id}
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
                            <span className="w-1.5 h-1.5 bg-gold rounded-full"></span>
                            <span className="font-bold text-xs text-white uppercase tracking-wider">{booking.venues?.name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-lg font-black text-white tracking-tighter">
                              KES {(booking.deposit_amount || 0).toLocaleString()} Paid
                            </span>
                            <span className="text-[10px] font-black text-gold uppercase tracking-[0.1em] mt-0.5">
                              Original KES {(booking.original_amount || booking.total_amount || 0).toLocaleString()} 
                              {Number(booking.discount_amount) > 0 && ` (Disc: -KES ${Number(booking.discount_amount).toLocaleString()})`} 
                              → Total: KES {(booking.total_amount || 0).toLocaleString()} | Balance: KES {(booking.balance || 0).toLocaleString()}
                            </span>
                            {Number(booking.discount_amount) > 0 && (
                              <span className="text-[9px] font-extrabold text-amber-400 mt-1 font-mono uppercase tracking-wide">
                                Discount Reason: {booking.discount_reason || 'Promotional offer'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`
                            inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border
                            ${getStatusColor(booking.status)}
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
                            {booking.status === 'pending' && hasFullAccess && (
                              <button 
                                onClick={() => confirmBooking(booking.id, booking.deposit_amount, booking.checkout_request_id)}
                                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-600/20 transition-all hover:-translate-y-0.5 active:scale-95"
                              >
                                Verify Payment
                              </button>
                            )}
                            
                            {/* THREE DOTS MENU CONTAINER */}
                            <div className="relative">
                              <button 
                                onClick={() => setActiveMenuBookingId(activeMenuBookingId === booking.id ? null : booking.id)}
                                className="p-2.5 hover:bg-white/5 rounded-xl transition-all group/opt relative"
                              >
                                <MoreVertical className="w-5 h-5 text-white/40 group-hover/opt:text-white" />
                              </button>
                              
                              {activeMenuBookingId === booking.id && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-40 bg-transparent" 
                                    onClick={() => setActiveMenuBookingId(null)}
                                  />
                                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-charcoal border border-white/10 shadow-2xl z-50 overflow-hidden divide-y divide-white/5 py-1.5 text-left animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-4 py-2">
                                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/35">Actions Menu</p>
                                      <p className="text-xs font-bold text-white truncate max-w-full">{booking.client_name}</p>
                                    </div>
                                    
                                    <div className="py-1">
                                      <button
                                        onClick={() => {
                                          setSelectedBooking(booking);
                                          setIsDetailsOpen(true);
                                          setActiveMenuBookingId(null);
                                        }}
                                        className="w-full px-4 py-2.5 text-xs font-bold text-white/80 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-colors"
                                      >
                                        <Eye className="w-4 h-4 text-gold" />
                                        View Details
                                      </button>
                                    </div>

                                    {hasFullAccess && (
                                      <div className="py-1">
                                        {booking.status === 'pending' && (
                                          <button
                                            onClick={() => {
                                              confirmBooking(booking.id, booking.deposit_amount, booking.checkout_request_id);
                                              setActiveMenuBookingId(null);
                                            }}
                                            className="w-full px-4 py-2.5 text-xs font-bold text-white/80 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-colors"
                                          >
                                            <CheckCircle className="w-4 h-4 text-green-400" />
                                            Confirm Payment
                                          </button>
                                        )}
                                        
                                        <button
                                          onClick={() => openEditModal(booking)}
                                          className="w-full px-4 py-2.5 text-xs font-bold text-white/80 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-colors"
                                        >
                                          <Edit className="w-4 h-4 text-sky-400" />
                                          Edit Booking
                                        </button>
                                        
                                        {booking.balance > 0 && (
                                          <button
                                            onClick={() => openBalancePaymentModal(booking)}
                                            className="w-full px-4 py-2.5 text-xs font-bold text-white/80 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-colors"
                                          >
                                            <DollarSign className="w-4 h-4 text-emerald-400" />
                                            Add Balance Payment
                                          </button>
                                        )}

                                        <button
                                          onClick={() => handleSendSMS(booking)}
                                          className="w-full px-4 py-2.5 text-xs font-bold text-white/80 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-colors"
                                        >
                                          <Send className="w-4 h-4 text-purple-400" />
                                          Send SMS Alert
                                        </button>
                                      </div>
                                    )}

                                    {hasFullAccess && booking.status !== 'cancelled' && (
                                      <div className="py-1">
                                        <button
                                          onClick={() => handleCancelBooking(booking)}
                                          className="w-full px-4 py-2.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          Cancel Booking
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>

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
      </div>
      ) : (
        /* =========================================================
           TAB 2: DISCOUNTS REPORT (super_admin only - Correction 2)
           ========================================================= */
        <div className="space-y-8 animate-entrance">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch hover:border-white/10 transition-all duration-300">
              <span className="text-[10px] font-black text-gold uppercase tracking-[0.25em] block mb-2">This Month's Discounts</span>
              <p className="text-3xl font-extrabold font-display text-white">
                KES {discountStats.thisMonth.toLocaleString()}
              </p>
              <p className="text-xs text-white/30 font-medium mt-2">Sum of active Stream 1 discounts given in {format(new Date(), 'MMMM yyyy')}</p>
            </div>
            
            <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch hover:border-white/10 transition-all duration-300">
              <span className="text-[10px] font-black text-gold uppercase tracking-[0.25em] block mb-2">This Year's Discounts</span>
              <p className="text-3xl font-extrabold font-display text-white">
                KES {discountStats.thisYear.toLocaleString()}
              </p>
              <p className="text-xs text-white/30 font-medium mt-2">Sum of active Stream 1 discounts given in {format(new Date(), 'yyyy')}</p>
            </div>
          </div>

          {/* Discounts Table */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-gold/10 to-gold-muted/5 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            
            <div className="relative glass rounded-[2rem] overflow-hidden shadow-pitch">
              <div className="scrollbar-hide overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/5">
                      <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Date</th>
                      <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Client Name</th>
                      <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Original Amount</th>
                      <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Discount Amount</th>
                      <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Reason</th>
                      <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Final Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white">
                    {discountedBookingsList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-20 text-center opacity-40 italic text-sm text-charcoal-light">
                          No discounted bookings recorded this month.
                        </td>
                      </tr>
                    ) : (
                      discountedBookingsList.map((b) => (
                        <tr key={b.id} className="hover:bg-white/[0.02] transition-colors font-medium">
                          <td className="px-8 py-5 font-mono text-xs text-charcoal-light">
                            {format(new Date(b.created_at), 'yyyy-MM-dd')}
                          </td>
                          <td className="px-8 py-5 font-bold text-white">
                            {b.client_name}
                          </td>
                          <td className="px-8 py-5 font-mono text-xs text-white/50">
                            KES {(b.original_amount || b.total_amount || 0).toLocaleString()}
                          </td>
                          <td className="px-8 py-5 font-mono text-xs text-amber-400 font-extrabold">
                            - KES {(b.discount_amount || 0).toLocaleString()}
                          </td>
                          <td className="px-8 py-5 text-xs text-white/80 max-w-[200px] truncate">
                            {b.discount_reason || 'Promo'}
                          </td>
                          <td className="px-8 py-5 font-mono text-sm text-green-400 font-extrabold">
                            KES {(b.total_amount || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}

      <QuickLogModal 
        isOpen={isQuickLogOpen} 
        onClose={() => {
          setIsQuickLogOpen(false);
          refreshBookings();
        }} 
      />

      {/* --- MODAL 1: VIEW DETAILS --- */}
      {isDetailsOpen && selectedBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setIsDetailsOpen(false)} />
          <div className="relative bg-charcoal border border-white/10 w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <div>
                <h2 className="text-xl font-display font-black tracking-tight text-white uppercase flex items-center gap-2">
                  <Eye className="w-5 h-5 text-gold" /> Booking Details
                </h2>
                <p className="text-white/40 text-xs mt-0.5">Reference ID: {selectedBooking.ref_code}</p>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Core Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[10px] font-bold text-white/30 uppercase block tracking-wider mb-1">Customer</span>
                  <p className="text-sm font-bold text-white flex items-center gap-2"><User className="w-3.5 h-3.5 text-gold" /> {selectedBooking.client_name}</p>
                  <p className="text-xs font-mono text-white/50 mt-1 flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gold" /> {selectedBooking.client_phone}</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[10px] font-bold text-white/30 uppercase block tracking-wider mb-1">Venue</span>
                  <p className="text-sm font-bold text-white flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-gold" /> {selectedBooking.venues?.name || 'Unknown'}</p>
                  <p className="text-xs text-white/50 mt-1 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-gold" /> Source: {selectedBooking.source}
                  </p>
                </div>
              </div>

              {/* Booking Status & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[10px] font-bold text-white/30 uppercase block tracking-wider mb-1">Booking Status</span>
                  <div className="mt-1">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(selectedBooking.status)}`}>
                      {selectedBooking.status}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-white/40 block mt-2">
                    Logged: {format(new Date(selectedBooking.created_at), 'MMMM d, yyyy h:mm a')}
                  </span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[10px] font-bold text-white/30 uppercase block tracking-wider mb-1">UTM / Marketing</span>
                  <p className="text-xs text-white/60 mt-1">Campaign Source: <span className="font-mono text-white font-bold">{selectedBooking.utm_source || 'Direct / None'}</span></p>
                  <p className="text-[10px] text-white/40 mt-1">STK Request ID: {selectedBooking.checkout_request_id || 'None'}</p>
                </div>
              </div>

              {/* Time Slots */}
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-white/30 uppercase block tracking-wider mb-2">Reserved Time Slots</span>
                {isFetchingSubdata ? (
                  <div className="h-10 bg-white/5 animate-pulse rounded-xl" />
                ) : selectedBookingSlots.length === 0 ? (
                  <p className="text-xs text-white/40">No time slot details loaded (slot IDs: {selectedBooking.slot_ids?.join(', ')}).</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedBookingSlots.map((slot: any) => (
                      <div key={slot.id} className="bg-charcoal border border-white/5 px-3 py-2 rounded-xl flex justify-between items-center">
                        <span className="text-xs text-white font-bold">{format(new Date(slot.date), 'MMM d, yyyy')}</span>
                        <span className="text-xs font-mono text-gold font-bold">
                          {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial Ledger */}
              <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-4">
                <span className="text-[10px] font-bold text-white/30 uppercase block tracking-wider font-display">Financial Overview</span>
                
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/5">
                  <div className="bg-charcoal/50 p-4 rounded-xl">
                    <span className="text-[9px] text-white/40 block uppercase font-bold">Original Rate</span>
                    <span className="text-md font-mono font-bold text-white/60 line-through">KES {(selectedBooking.original_amount || selectedBooking.total_amount).toLocaleString()}</span>
                  </div>
                  <div className="bg-charcoal/50 p-4 rounded-xl">
                    <span className="text-[9px] text-white/40 block uppercase font-bold text-amber-400">Discount Amount</span>
                    <span className="text-md font-mono font-bold text-amber-400">KES {(selectedBooking.discount_amount || 0).toLocaleString()}</span>
                    {selectedBooking.discount_reason && (
                      <span className="text-[9px] block text-white/40 italic mt-1 truncate">Reason: {selectedBooking.discount_reason}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-b border-white/5 pb-4">
                  <div>
                    <span className="text-[9px] text-white/40 block uppercase font-bold">Total Cost</span>
                    <span className="text-lg font-mono font-black text-white">KES {selectedBooking.total_amount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-white/40 block uppercase font-bold">Deposit Paid</span>
                    <span className="text-lg font-mono font-black text-emerald-400">KES {selectedBooking.deposit_amount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-white/40 block uppercase font-bold">Balance Due</span>
                    <span className="text-lg font-mono font-black text-red-400">KES {selectedBooking.balance.toLocaleString()}</span>
                  </div>
                </div>

                {/* Payments History */}
                <div>
                  <span className="text-[9px] font-bold text-gold uppercase tracking-widest block mb-2">Ledger Payments</span>
                  {isFetchingSubdata ? (
                    <div className="h-12 bg-white/5 animate-pulse rounded-xl" />
                  ) : selectedBookingPayments.length === 0 ? (
                    <p className="text-xs text-white/40 italic">No payment transactions recorded in public.payments yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedBookingPayments.map((pm: any) => (
                        <div key={pm.id} className="bg-charcoal border border-white/5 px-4 py-2.5 rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-white">KES {pm.amount.toLocaleString()}</span>
                            <span className="text-white/40 ml-2">via</span>
                            <span className="ml-1 bg-white/10 px-2 py-0.5 rounded text-[10px] font-black uppercase text-gold font-mono">{pm.payment_method}</span>
                          </div>
                          <div className="text-right">
                            {pm.mpesa_receipt && <span className="font-mono text-white/50 block font-bold text-[10px]">Ref: {pm.mpesa_receipt}</span>}
                            <span className="text-[9px] text-white/30">{format(new Date(pm.created_at), 'MMM d, h:mm a')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-white/5 bg-white/[0.01] flex justify-end">
              <button 
                onClick={() => setIsDetailsOpen(false)}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-colors"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: EDIT BOOKING --- */}
      {isEditOpen && selectedBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsEditOpen(false)} />
          <div className="relative bg-charcoal border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <div>
                <h2 className="text-xl font-display font-black tracking-tight text-white uppercase flex items-center gap-2">
                  <Edit className="w-5 h-5 text-sky-400" /> Edit Booking
                </h2>
                <p className="text-white/40 text-xs mt-0.5">Ref ID: {selectedBooking.id}</p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditBooking} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Client Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input 
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Client Phone Contact</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input 
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Venue</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <select 
                    value={editVenueId}
                    onChange={(e) => setEditVenueId(Number(e.target.value))}
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
                  >
                    {venues.map(v => (
                      <option key={v.id} value={v.id} className="bg-charcoal text-white">{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Original Rate (KES)</label>
                  <input 
                    type="number"
                    required
                    value={editOriginalAmount}
                    onChange={(e) => {
                      const orig = parseFloat(e.target.value) || 0;
                      const disc = parseFloat(editDiscountAmount) || 0;
                      setEditOriginalAmount(e.target.value);
                      setEditTotal((orig - disc).toString());
                    }}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Discount Amount (KES)</label>
                  <input 
                    type="number"
                    value={editDiscountAmount}
                    onChange={(e) => {
                      const orig = parseFloat(editOriginalAmount) || 0;
                      const disc = parseFloat(e.target.value) || 0;
                      setEditDiscountAmount(e.target.value);
                      setEditTotal((orig - disc).toString());
                    }}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Discount Reason</label>
                <input 
                  type="text"
                  value={editDiscountReason}
                  onChange={(e) => setEditDiscountReason(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
                  placeholder="e.g. Loyalty discount"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Final Total (KES)</label>
                  <input 
                    type="number"
                    required
                    readOnly
                    value={editTotal}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white/50 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Deposit Amount (KES)</label>
                  <input 
                    type="number"
                    required
                    value={editDeposit}
                    onChange={(e) => setEditDeposit(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Booking Date</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input 
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isEditSubmitting}
                  className="flex-1 py-3 bg-forest hover:bg-forest-dark text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-forest/20 transition-all active:scale-95"
                >
                  {isEditSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: ADD BALANCE PAYMENT --- */}
      {isBalancePaymentOpen && selectedBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsBalancePaymentOpen(false)} />
          <div className="relative bg-charcoal border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <div>
                <h2 className="text-xl font-display font-black tracking-tight text-white uppercase flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" /> Add Balance Payment
                </h2>
                <p className="text-white/40 text-xs mt-0.5">Booking Ref: {selectedBooking.client_name}</p>
              </div>
              <button onClick={() => setIsBalancePaymentOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddBalancePayment} className="p-6 space-y-6">
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs text-white/60">
                  <span>Total Amount:</span>
                  <span className="font-mono text-white font-bold">KES {selectedBooking.total_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-white/60">
                  <span>Deposit Received:</span>
                  <span className="font-mono text-white font-bold">KES {selectedBooking.deposit_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5 font-bold text-white">
                  <span>Outstanding Balance:</span>
                  <span className="font-mono text-emerald-400">KES {selectedBooking.balance.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">Payment Amount (KES)</label>
                <input 
                  type="number"
                  required
                  value={balanceAmount}
                  max={selectedBooking.balance}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider">Select Payment Method</label>
                <div className="flex gap-2">
                  {[
                    { id: 'cash', icon: Banknote, label: 'Cash' },
                    { id: 'mpesa', icon: CreditCard, label: 'M-Pesa' },
                    { id: 'card', icon: CreditCard, label: 'Card' }
                  ].map(method => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setBalanceMethod(method.id as any)}
                      className={`
                        flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-xs font-bold
                        ${balanceMethod === method.id 
                          ? 'bg-white border-gold text-forest shadow-sm' 
                          : 'bg-transparent border-white/10 text-white/60 hover:border-white/20'
                        }
                      `}
                    >
                      <method.icon className={`w-4 h-4 ${balanceMethod === method.id ? 'text-gold' : 'text-white/40'}`} />
                      <span>{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {balanceMethod === 'mpesa' && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">M-Pesa Transaction Receipt</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. OER7Q8X9YZ"
                    value={balanceMpesaCode}
                    onChange={(e) => setBalanceMpesaCode(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all font-mono uppercase"
                  />
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsBalancePaymentOpen(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isBalanceSubmitting}
                  className="flex-1 py-3 bg-forest hover:bg-forest-dark text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-forest/20 transition-all active:scale-95"
                >
                  {isBalanceSubmitting ? 'Logging...' : 'Log Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Floating Bulk Action Toolbar (Priority 2) */}
      {selectedBookingIds.length > 0 && hasFullAccess && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-forest-dark/90 backdrop-blur-md border border-white/10 px-6 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[90] flex items-center gap-6 animate-slide-up">
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase text-gold tracking-widest">{selectedBookingIds.length} Selected</span>
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-tight">Bulk reservation actions</span>
          </div>

          <div className="w-px h-8 bg-white/10" />

          <div className="flex gap-2">
            <button
              onClick={handleBulkConfirmPayment}
              disabled={isBulkSubmitting}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Confirm Paid
            </button>
            <button
              onClick={handleBulkCancel}
              disabled={isBulkSubmitting}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel All
            </button>
            <button
              onClick={() => setIsBulkSmsOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              Send SMS
            </button>
          </div>

          <div className="w-px h-8 bg-white/10" />

          <button 
            onClick={() => setSelectedBookingIds([])}
            className="text-[10px] font-black uppercase text-white/40 hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* --- MODAL 4: BULK SMS COMPOSER (Priority 2) --- */}
      {isBulkSmsOpen && selectedBookingIds.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsBulkSmsOpen(false)} />
          <div className="relative bg-charcoal border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <div>
                <h2 className="text-xl font-display font-black tracking-tight text-white uppercase flex items-center gap-2">
                  <Send className="w-5 h-5 text-purple-400" /> Compose Bulk SMS
                </h2>
                <p className="text-white/40 text-xs mt-0.5">Sending alert notifications to {selectedBookingIds.length} clients</p>
              </div>
              <button onClick={() => setIsBulkSmsOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleBulkSendSms} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">SMS Body Message</label>
                <textarea 
                  required
                  rows={4}
                  value={bulkSmsText}
                  onChange={(e) => setBulkSmsText(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all resize-none"
                  placeholder="Enter message body e.g. Dear client, your reserved slot booking at MVSA Arena has been successfully updated. Thank you!"
                />
                <span className="text-[10px] text-white/30 block mt-1">Characters: {bulkSmsText.length} | SMS count estimation: {Math.ceil(bulkSmsText.length / 160)}</span>
              </div>

              {/* Templates */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-gold uppercase tracking-widest block">Quick Templates</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Booking Confirmed', text: 'Dear client, your booking at MVSA has been confirmed successfully. We look forward to seeing you.' },
                    { label: 'Pending Payment', text: 'Dear client, please complete the balance payment for your slot reservation at MVSA to prevent hold release.' },
                    { label: 'Slot Rescheduled', text: 'Dear client, your reserved time slot at MVSA has been rescheduled. Check details in your portal.' }
                  ].map((tpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setBulkSmsText(tpl.text)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-[10px] font-bold text-white/60 hover:text-white transition-all"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsBulkSmsOpen(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isBulkSubmitting || !bulkSmsText.trim()}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-purple-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isBulkSubmitting ? 'Sending...' : 'Dispatch SMS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
