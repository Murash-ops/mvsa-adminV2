'use client';

import { useState, useEffect } from 'react';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Calendar,
  Building2,
  PieChart as PieIcon,
  Filter,
  PlusCircle,
  Loader2,
  X,
  Receipt,
  FileText,
  ImageIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie
} from 'recharts';
import { createClient } from '@/utils/supabase/client';

type BossDashboardProps = {
  bookings: any[];
  expenses: any[];
  enrollments: any[];
  programs: any[];
  staff: any;
  onRefresh: () => void;
};

export default function BossDashboard({
  bookings,
  expenses,
  enrollments,
  programs,
  staff,
  onRefresh
}: BossDashboardProps) {
  const supabase = createClient();
  
  // Filters State
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [streamFilter, setStreamFilter] = useState<'both' | 'venues' | 'academy'>('both');
  const [venueFilter, setVenueFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Expense Logger Modal
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<'instructor' | 'maintenance' | 'operations' | 'marketing'>('operations');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseIsAcademy, setExpenseIsAcademy] = useState(false);
  const [expenseProgramId, setExpenseProgramId] = useState('');
  const [expenseReceiptFile, setExpenseReceiptFile] = useState<File | null>(null);

  // Filtered Data States
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<any[]>([]);
  const [filteredEnrollments, setFilteredEnrollments] = useState<any[]>([]);

  // Apply filters locally in memory
  useEffect(() => {
    const today = new Date();
    
    // 1. Date Range Boundaries
    let startLimit = startOfDay(subDays(today, 30));
    let endLimit = endOfDay(today);
    
    if (dateFilter === 'today') {
      startLimit = startOfDay(today);
      endLimit = endOfDay(today);
    } else if (dateFilter === 'week') {
      startLimit = startOfDay(subDays(today, 7));
      endLimit = endOfDay(today);
    } else if (dateFilter === 'month') {
      startLimit = startOfDay(subDays(today, 30));
      endLimit = endOfDay(today);
    } else if (dateFilter === 'custom') {
      startLimit = startOfDay(parseISO(startDate));
      endLimit = endOfDay(parseISO(endDate));
    }

    // A. Filter Bookings
    const fBookings = bookings.filter(b => {
      const createdDate = parseISO(b.created_at);
      
      // Date Check
      const matchesDate = isWithinInterval(createdDate, { start: startLimit, end: endLimit });
      if (!matchesDate) return false;

      // Stream Check (Bookings are always Stream 1 - Venues)
      if (streamFilter === 'academy') return false;

      // Venue Check
      if (venueFilter !== 'all') {
        const venueName = b.venues?.name || '';
        if (venueFilter === 'turf' && venueName !== 'Main Arena Turf') return false;
        if (venueFilter === 'meeting' && venueName !== 'Meeting Room / Conference Hall') return false;
      }

      // Status Check
      if (statusFilter !== 'all') {
        if (statusFilter === 'confirmed' && b.status !== 'confirmed') return false;
        if (statusFilter === 'pending' && b.status !== 'pending') return false;
        if (statusFilter === 'cancelled' && b.status !== 'cancelled') return false;
      }

      return true;
    });

    // B. Filter Enrollments (Stream 2 - Academy)
    const fEnrollments = enrollments.filter(e => {
      const createdDate = parseISO(e.created_at);
      
      // Date Check
      const matchesDate = isWithinInterval(createdDate, { start: startLimit, end: endLimit });
      if (!matchesDate) return false;

      // Stream Check (Enrollments are always Stream 2)
      if (streamFilter === 'venues') return false;

      // Venue Check (Enrollments do not have a venue link - so hide if venue specific filter is active)
      if (venueFilter !== 'all') return false;

      // Status Check
      if (statusFilter !== 'all') {
        if (statusFilter === 'confirmed' && e.status !== 'active') return false;
        if (statusFilter === 'pending' && e.status !== 'pending') return false;
        if (statusFilter === 'cancelled' && e.status !== 'cancelled') return false;
      }

      return true;
    });

    // C. Filter Expenses
    const fExpenses = expenses.filter(e => {
      const createdDate = parseISO(e.created_at);
      
      // Date Check
      const matchesDate = isWithinInterval(createdDate, { start: startLimit, end: endLimit });
      if (!matchesDate) return false;

      // Stream Check
      if (streamFilter === 'venues' && e.is_academy) return false;
      if (streamFilter === 'academy' && !e.is_academy) return false;

      // Venue Check (Expenses are global, not bound to specific venue generally, keep if venue === 'all')
      if (venueFilter !== 'all' && !e.is_academy) {
        // If filtering venues specifically, only allow matching expenses if description indicates venue
        if (venueFilter === 'turf' && !e.description.toLowerCase().includes('turf')) return false;
        if (venueFilter === 'meeting' && !e.description.toLowerCase().includes('meeting')) return false;
      }

      return true;
    });

    setFilteredBookings(fBookings);
    setFilteredEnrollments(fEnrollments);
    setFilteredExpenses(fExpenses);
  }, [bookings, expenses, enrollments, dateFilter, startDate, endDate, streamFilter, venueFilter, statusFilter]);

  // Compute Metrics
  const totalRevenueBookings = filteredBookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + (Number(b.total_amount) - Number(b.balance)), 0);

  const getEnrollmentPrice = (e: any) => {
    const pricing = e.programs?.pricing_json || {};
    const plan = e.pricing_plan || 'session';
    return pricing[plan] || pricing['session'] || 0;
  };

  const totalRevenueAcademy = filteredEnrollments
    .filter(e => e.status !== 'cancelled' && e.payment_status === 'fully_paid')
    .reduce((sum, e) => sum + getEnrollmentPrice(e), 0);

  const totalRevenue = totalRevenueBookings + totalRevenueAcademy;

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netMargin = totalRevenue - totalExpenses;

  const outstandingBalancesBookings = filteredBookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + Number(b.balance), 0);

  const outstandingBalancesAcademy = filteredEnrollments
    .filter(e => e.status !== 'cancelled' && e.payment_status === 'unpaid')
    .reduce((sum, e) => sum + getEnrollmentPrice(e), 0);

  const outstandingBalances = outstandingBalancesBookings + outstandingBalancesAcademy;

  const bookingVolume = filteredBookings.length + filteredEnrollments.length;

  // Revenue by Venue Split
  const turfRev = filteredBookings
    .filter(b => b.status !== 'cancelled' && b.venues?.name === 'Main Arena Turf')
    .reduce((sum, b) => sum + (Number(b.total_amount) - Number(b.balance)), 0);

  const meetingRev = filteredBookings
    .filter(b => b.status !== 'cancelled' && b.venues?.name === 'Meeting Room / Conference Hall')
    .reduce((sum, b) => sum + (Number(b.total_amount) - Number(b.balance)), 0);

  const venueSplitData = [
    { name: 'Turf Pitch', value: turfRev, color: '#C5A55A' },
    { name: 'Meeting Room', value: meetingRev, color: '#2D5016' }
  ];

  // Booking Source Breakdown
  const walkinCount = filteredBookings.filter(b => b.source === 'walk_in').length;
  const whatsappCount = filteredBookings.filter(b => b.source === 'whatsapp').length + filteredEnrollments.filter(e => e.communication_pref === 'whatsapp').length;
  const onlineCount = filteredBookings.filter(b => b.source === 'online').length;

  const sourceData = [
    { name: 'Walk-in', count: walkinCount, color: '#ffb800' },
    { name: 'WhatsApp', count: whatsappCount, color: '#25D366' },
    { name: 'Online', count: onlineCount, color: '#38bdf8' }
  ];

  // Handle Expense Submit
  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let receipt_url = null;

      if (expenseReceiptFile) {
        const fileExt = expenseReceiptFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `receipts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filePath, expenseReceiptFile);

        if (uploadError) {
          const { error: fallbackError } = await supabase.storage
            .from('player-profiles')
            .upload(`receipts/${fileName}`, expenseReceiptFile);
          
          if (fallbackError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage
            .from('player-profiles')
            .getPublicUrl(`receipts/${fileName}`);
          receipt_url = publicUrl;
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('receipts')
            .getPublicUrl(filePath);
          receipt_url = publicUrl;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Unauthenticated');

      const { error } = await supabase
        .from('expenses')
        .insert([{
          category: expenseCategory,
          amount: parseFloat(expenseAmount),
          description: expenseDescription,
          receipt_url,
          logged_by: staff?.id,
          is_academy: expenseIsAcademy,
          stream: expenseIsAcademy ? 'programs' : 'venues',
          program_id: expenseIsAcademy && expenseProgramId ? parseInt(expenseProgramId) : null
        }]);

      if (error) throw error;

      alert('Expense logged successfully!');
      setIsExpenseOpen(false);
      
      // Reset Form
      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseIsAcademy(false);
      setExpenseProgramId('');
      setExpenseReceiptFile(null);

      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error saving expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* ========================================================
          GLOBAL FILTER PANEL
          ======================================================== */}
      <section className="bg-card border border-white/5 p-8 rounded-[2rem] shadow-pitch text-white text-left">
        <h2 className="text-xl font-bold font-display text-white mb-6 uppercase italic tracking-wider flex items-center gap-2">
          <Filter className="w-5 h-5 text-gold" /> Filter Executive Controls
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Date Range Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gold uppercase tracking-wider block">Date Range</label>
            <div className="space-y-2">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-xs focus:outline-none focus:border-gold/30 uppercase tracking-wider appearance-none"
              >
                <option value="today" className="bg-charcoal text-white">Today</option>
                <option value="week" className="bg-charcoal text-white">This Week (7d)</option>
                <option value="month" className="bg-charcoal text-white">This Month (30d)</option>
                <option value="custom" className="bg-charcoal text-white">Custom Range</option>
              </select>
              
              {dateFilter === 'custom' && (
                <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-200">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-xs font-bold focus:outline-none"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-xs font-bold focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Stream Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gold uppercase tracking-wider block">Financial Stream</label>
            <select
              value={streamFilter}
              onChange={(e) => setStreamFilter(e.target.value as any)}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-xs focus:outline-none focus:border-gold/30 uppercase tracking-wider appearance-none"
            >
              <option value="both" className="bg-charcoal text-white">Both Streams</option>
              <option value="venues" className="bg-charcoal text-white">Stream 1 (Venues)</option>
              <option value="academy" className="bg-charcoal text-white">Stream 2 (Academy)</option>
            </select>
          </div>

          {/* Venue Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gold uppercase tracking-wider block">Venue Pitch</label>
            <select
              value={venueFilter}
              onChange={(e) => setVenueFilter(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-xs focus:outline-none focus:border-gold/30 uppercase tracking-wider appearance-none"
              disabled={streamFilter === 'academy'}
            >
              <option value="all" className="bg-charcoal text-white">All Venues</option>
              <option value="turf" className="bg-charcoal text-white">Main Arena Turf</option>
              <option value="meeting" className="bg-charcoal text-white">Meeting Room / Hall</option>
            </select>
          </div>

          {/* Status Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gold uppercase tracking-wider block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-xs focus:outline-none focus:border-gold/30 uppercase tracking-wider appearance-none"
            >
              <option value="all" className="bg-charcoal text-white">All Bookings</option>
              <option value="confirmed" className="bg-charcoal text-white">Confirmed / Active</option>
              <option value="pending" className="bg-charcoal text-white">Pending Hold</option>
              <option value="cancelled" className="bg-charcoal text-white">Cancelled</option>
            </select>
          </div>
        </div>
      </section>

      {/* ========================================================
          METRICS PANEL
          ======================================================== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Card 1: Total Revenue */}
        <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch transition-all hover:scale-[1.02] text-left">
          <div className="flex justify-between items-start mb-5">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/10 text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="text-[9px] font-black tracking-widest px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded">REVENUE</span>
          </div>
          <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1.5">Total Revenue</h3>
          <p className="text-3xl font-extrabold font-display text-white">KES {totalRevenue.toLocaleString()}</p>
          <p className="text-[10px] text-white/30 font-medium mt-2">Filterable collections</p>
        </div>

        {/* Card 2: Total Expenses */}
        <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch transition-all hover:scale-[1.02] text-left">
          <div className="flex justify-between items-start mb-5">
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/10 text-red-400">
              <TrendingDown className="w-6 h-6" />
            </div>
            <span className="text-[9px] font-black tracking-widest px-2 py-0.5 bg-red-500/15 text-red-400 border border-red-500/20 rounded">OUTFLOWS</span>
          </div>
          <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1.5">Total Expenses</h3>
          <p className="text-3xl font-extrabold font-display text-white">KES {totalExpenses.toLocaleString()}</p>
          <p className="text-[10px] text-white/30 font-medium mt-2">Segregated running costs</p>
        </div>

        {/* Card 3: Net margin */}
        <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch transition-all hover:scale-[1.02] text-left">
          <div className="flex justify-between items-start mb-5">
            <div className={`p-3 rounded-2xl border ${netMargin >= 0 ? 'bg-gold/10 border-gold/10 text-gold' : 'bg-red-500/10 border-red-500/10 text-red-400'}`}>
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded ${netMargin >= 0 ? 'bg-gold/15 text-gold border border-gold/25' : 'bg-red-500/15 text-red-400 border border-red-500/25'}`}>
              NET MARGIN
            </span>
          </div>
          <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1.5">Net Margin</h3>
          <p className={`text-3xl font-extrabold font-display ${netMargin >= 0 ? 'text-gold' : 'text-red-400'}`}>
            KES {netMargin.toLocaleString()}
          </p>
          <p className="text-[10px] text-white/30 font-medium mt-2">Derived P&L balance</p>
        </div>

        {/* Card 4: Outstanding balances */}
        <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch transition-all hover:scale-[1.02] text-left">
          <div className="flex justify-between items-start mb-5">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/10 text-amber-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <span className="text-[9px] font-black tracking-widest px-2 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded">RECEIVABLES</span>
          </div>
          <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1.5">Outstanding Balances</h3>
          <p className="text-3xl font-extrabold font-display text-white">KES {outstandingBalances.toLocaleString()}</p>
          <p className="text-[10px] text-white/30 font-medium mt-2">Uncollected balances</p>
        </div>

        {/* Card 5: Booking volume */}
        <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch transition-all hover:scale-[1.02] text-left">
          <div className="flex justify-between items-start mb-5">
            <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/10 text-sky-400">
              <Building2 className="w-6 h-6" />
            </div>
            <span className="text-[9px] font-black tracking-widest px-2 py-0.5 bg-sky-500/15 text-sky-400 border border-sky-500/20 rounded">VOLUME</span>
          </div>
          <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1.5">Booking Volume</h3>
          <p className="text-3xl font-extrabold font-display text-white">{bookingVolume}</p>
          <p className="text-[10px] text-white/30 font-medium mt-2">Reservations + Registrations</p>
        </div>
      </section>

      {/* ========================================================
          ACTION BUTTON & VISUAL SPLITS
          ======================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Action Bar & Booking Source Breakdown */}
        <div className="lg:col-span-5 bg-card p-8 rounded-[2rem] border border-white/5 shadow-pitch flex flex-col justify-between text-left">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-gold" />
              <h3 className="text-xl font-bold font-display text-white italic uppercase tracking-tight">Booking Sources</h3>
            </div>
            
            <p className="text-xs text-white/40 font-medium">
              Segmented ratio analysis of bookings generated via Walk-in, WhatsApp hold, or Online platforms.
            </p>

            <div className="space-y-4">
              {sourceData.map((src) => {
                const totalCount = walkinCount + whatsappCount + onlineCount;
                const percentage = totalCount > 0 ? (src.count / totalCount) * 100 : 0;
                
                return (
                  <div key={src.name} className="space-y-1 bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white font-bold flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: src.color }} />
                        {src.name}
                      </span>
                      <span className="font-mono text-white/70 font-extrabold">{src.count} bookings ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%`, backgroundColor: src.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 mt-8">
            <button
              onClick={() => setIsExpenseOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-6 py-4.5 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 spring-bounce hover:scale-[1.01] active:scale-[0.99] uppercase text-xs tracking-widest"
            >
              <PlusCircle className="w-4 h-4 text-forest stroke-[2.5px]" />
              Log Corporate Expense
            </button>
            <p className="text-[10px] text-white/40 italic font-medium pt-3.5 text-center leading-relaxed">
              *Boss role operates in purely visual analytics mode. Action limited strictly to expense logs.
            </p>
          </div>
        </div>

        {/* Right: Revenue Split Chart */}
        <div className="lg:col-span-7 bg-card p-8 rounded-[2rem] border border-white/5 shadow-pitch text-left">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-gold" />
            <h3 className="text-xl font-bold font-display text-white italic uppercase tracking-tight">Revenue Stream Comparison</h3>
          </div>

          <div className="h-80 w-full mt-6 bg-white/[0.01] border border-white/5 p-6 rounded-2xl">
            {turfRev === 0 && meetingRev === 0 ? (
              <div className="h-full flex items-center justify-center text-white/20 text-xs font-bold uppercase tracking-widest italic">
                No Revenue Recorded In Filter Range
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={venueSplitData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} />
                  <YAxis stroke="#666" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                    labelStyle={{ fontWeight: 'black', color: '#ffb800' }}
                  />
                  <Bar dataKey="value" name="Revenue (KES)">
                    {venueSplitData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </section>

      {/* ========================================================
          EXPENSE LOGGER MODAL (Boss only logs)
          ======================================================== */}
      {isExpenseOpen && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/10 bg-[#16181d]/95">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h2 className="text-2xl font-display font-extrabold italic tracking-tight text-white uppercase">Log Expense</h2>
                <p className="text-gold text-[10px] font-black uppercase tracking-widest mt-1">Operational Outflow</p>
              </div>
              <button 
                onClick={() => setIsExpenseOpen(false)}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-colors text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleLogExpense} className="p-8 space-y-6 text-left">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gold">Category</label>
                  <select 
                    required
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-bold text-sm appearance-none"
                  >
                    <option value="instructor" className="bg-forest-dark text-white">Instructor Payout</option>
                    <option value="maintenance" className="bg-forest-dark text-white">Maintenance</option>
                    <option value="operations" className="bg-forest-dark text-white">General Operations</option>
                    <option value="marketing" className="bg-forest-dark text-white">Marketing</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gold">Stream Allocation</label>
                  <div className="flex items-center justify-between py-2 px-4 rounded-xl border border-white/10 bg-white/5 h-[46px]">
                    <span className="text-xs font-bold text-white">Academy Expense?</span>
                    <button
                      type="button"
                      onClick={() => setExpenseIsAcademy(!expenseIsAcademy)}
                      className={`w-10 h-5 rounded-full p-1 transition-all duration-300 ${expenseIsAcademy ? 'bg-gold' : 'bg-white/10'}`}
                    >
                      <div className={`w-3 h-3 rounded-full bg-forest transition-all duration-300 ${expenseIsAcademy ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {expenseIsAcademy && (
                <div className="space-y-2 pt-4 border-t border-white/5 animate-in fade-in duration-200">
                  <label className="text-xs font-black uppercase tracking-widest text-gold">Bind to Program</label>
                  <select
                    value={expenseProgramId}
                    onChange={(e) => setExpenseProgramId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-bold text-sm appearance-none font-sans"
                  >
                    <option value="" className="bg-forest-dark text-white">General Academy (No specific program)</option>
                    {programs.map(prog => (
                      <option key={prog.id} value={prog.id.toString()} className="bg-forest-dark text-white">{prog.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gold">Amount (KES)</label>
                <input 
                  type="number" 
                  required
                  placeholder="0.00"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-display font-bold text-xl italic"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gold">Description</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="What was this for?"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-medium text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gold">Receipt / Invoice</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setExpenseReceiptFile(e.target.files?.[0] || null)}
                    className="hidden" 
                    id="receipt-upload"
                  />
                  <label 
                    htmlFor="receipt-upload"
                    className={`
                      w-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all
                      ${expenseReceiptFile ? 'border-success bg-success/5' : 'border-white/10 bg-white/5 hover:border-gold hover:bg-gold/5'}
                    `}
                  >
                    {expenseReceiptFile ? (
                      <div className="flex flex-col items-center">
                        <FileText className="w-8 h-8 text-success mb-2" />
                        <span className="text-xs font-bold text-success truncate max-w-[200px]">{expenseReceiptFile.name}</span>
                        <span className="text-[10px] text-success/60 uppercase font-bold mt-1">File Selected</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <ImageIcon className="w-8 h-8 text-white/40 mb-2 group-hover:text-gold transition-colors" />
                        <span className="text-xs font-bold text-white/40 group-hover:text-gold transition-colors">Click to upload receipt</span>
                        <span className="text-[10px] text-white/30 uppercase font-bold mt-1">Image files only</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsExpenseOpen(false)}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold uppercase transition-all text-xs"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 spring-bounce hover:scale-[1.01] active:scale-[0.99] uppercase text-xs tracking-widest flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-forest" /> : 'Log Outflow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
