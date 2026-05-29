'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval } from 'date-fns';
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  Percent, 
  Loader2, 
  Calendar, 
  AlertCircle,
  FileText,
  PieChart
} from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  BarChart,
  Bar
} from 'recharts';

export default function ReportsPage() {
  const supabase = createClient();
  const { staff } = useAuth();

  // Filters State
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'expenses' | 'discounts'>('overview');

  // Raw Data State
  const [bookings, setBookings] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Authorizations
  const isSuperAdmin = staff?.role === 'super_admin';
  const isBoss = staff?.role === 'boss';
  const isCOO = staff?.role === 'academy_coo';
  const isAuthorized = isSuperAdmin || isBoss || isCOO;

  useEffect(() => {
    if (staff) {
      fetchReportsData();
    }
  }, [staff, startDate, endDate]);

  async function fetchReportsData() {
    setIsLoading(true);
    try {
      // Parallel fetches for pristine performance
      const [bookingsRes, enrollmentsRes, expensesRes, paymentsRes, programsRes] = await Promise.all([
        supabase.from('bookings').select('*, venues(name)').neq('status', 'cancelled'),
        supabase.from('enrollments').select('*, programs(name, pricing_json)'),
        supabase.from('expenses').select('*, programs(name)'),
        supabase.from('payments').select('*').eq('status', 'completed'),
        supabase.from('programs').select('*')
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (enrollmentsRes.error) throw enrollmentsRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      if (programsRes.error) throw programsRes.error;

      setBookings(bookingsRes.data || []);
      setEnrollments(enrollmentsRes.data || []);
      setExpenses(expensesRes.data || []);
      setPayments(paymentsRes.data || []);
      setPrograms(programsRes.data || []);
    } catch (err) {
      console.error('Error fetching reports data:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // --- CALCULATION HELPER FUNCTIONS ---
  
  // Roster enrollment pricing
  const getEnrollmentPrice = (e: any) => {
    const pricing = e.programs?.pricing_json || {};
    const plan = e.pricing_plan || 'session';
    return pricing[plan] || pricing['session'] || 0;
  };

  // Filter lists inside date range
  const filterByDateRange = (list: any[], dateField: string) => {
    return list.filter(item => {
      const itemDate = item[dateField]?.substring(0, 10);
      if (!itemDate) return false;
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  // Data processing based on role gating
  const activeBookings = isCOO ? [] : filterByDateRange(bookings, 'created_at');
  const activeEnrollments = filterByDateRange(enrollments, 'created_at');
  const activeExpenses = filterByDateRange(
    isCOO ? expenses.filter(ex => ex.is_academy) : expenses, 
    'created_at'
  );
  const activePayments = filterByDateRange(
    isCOO ? payments.filter(p => p.stream === 'programs') : payments,
    'created_at'
  );

  // Financial Stream Segmentations
  
  // 1. Revenue
  // Stream 1 (Venues) Revenue: sum of booking payments (deposit + balance payments logged)
  const venueRevenue = isCOO ? 0 : activePayments
    .filter(p => p.stream === 'venues')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // Stream 2 (Academy) Revenue: sum of PAID active & completed enrollments pricing plans in date range
  const academyRevenue = activeEnrollments
    .filter(e => e.status !== 'cancelled' && e.payment_status === 'fully_paid')
    .reduce((sum, e) => sum + getEnrollmentPrice(e), 0);

  const totalRevenue = venueRevenue + academyRevenue;

  // 2. Expenses
  const venueExpenses = isCOO ? 0 : activeExpenses
    .filter(ex => !ex.is_academy)
    .reduce((sum, ex) => sum + Number(ex.amount || 0), 0);

  const academyExpenses = activeExpenses
    .filter(ex => ex.is_academy)
    .reduce((sum, ex) => sum + Number(ex.amount || 0), 0);

  const totalExpenses = venueExpenses + academyExpenses;

  // 3. Receivables (Unpaid Roster + Unpaid Booking Balances)
  const venueReceivables = isCOO ? 0 : activeBookings
    .filter(b => b.status === 'confirmed' && Number(b.balance) > 0)
    .reduce((sum, b) => sum + Number(b.balance || 0), 0);

  const academyReceivables = activeEnrollments
    .filter(e => e.status !== 'cancelled' && e.payment_status !== 'fully_paid')
    .reduce((sum, e) => sum + getEnrollmentPrice(e), 0);

  const totalReceivables = venueReceivables + academyReceivables;

  // 4. Net Margins
  const netMargin = totalRevenue - totalExpenses;
  const marginPercent = totalRevenue > 0 ? (netMargin / totalRevenue) * 100 : 0;

  // 5. Total Discounts (Super Admin / Boss visibility only)
  const totalDiscounts = isCOO ? 0 : activeBookings
    .reduce((sum, b) => sum + Number(b.discount_amount || 0), 0);

  // --- CHARTS GENERATION LOGIC ---
  // Generate multi-month aggregates (P&L Trendline)
  const getPLChartData = () => {
    const startInterval = subMonths(new Date(endDate), 5);
    const months = eachMonthOfInterval({ start: startInterval, end: new Date(endDate) });

    return months.map(m => {
      const monthStr = format(m, 'yyyy-MM');
      const monthLabel = format(m, 'MMM yyyy');

      // Bookings venue revenue this month
      const bRev = isCOO ? 0 : payments
        .filter(p => p.stream === 'venues' && p.created_at?.startsWith(monthStr))
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      // Academy revenue this month
      const aRev = enrollments
        .filter(e => e.status !== 'cancelled' && e.payment_status === 'fully_paid' && e.created_at?.startsWith(monthStr))
        .reduce((sum, e) => sum + getEnrollmentPrice(e), 0);

      // Expenses this month
      const mExp = expenses
        .filter(ex => (isCOO ? ex.is_academy : true) && ex.created_at?.startsWith(monthStr))
        .reduce((sum, ex) => sum + Number(ex.amount || 0), 0);

      const rev = bRev + aRev;
      const profit = rev - mExp;

      return {
        month: monthLabel,
        Revenue: rev,
        Expenses: mExp,
        'Net Margin': profit
      };
    });
  };

  const plChartData = getPLChartData();

  // --- CSV EXPORTERS ---
  const handleExportRevenue = () => {
    const headers = ['Financial Stream', 'Revenue Source / Item', 'Registration Date', 'Final Amount (KES)', 'Status'];
    const rows: any[] = [];

    // Stream 1 (Venues) Bookings
    if (!isCOO) {
      activeBookings.forEach(b => {
        rows.push([
          'Stream 1 (Venues)',
          `Booking: ${b.client_name} - ${b.venues?.name || 'Pitch'}`,
          format(new Date(b.created_at), 'yyyy-MM-dd'),
          b.total_amount - b.balance,
          b.status
        ]);
      });
    }

    // Stream 2 (Academy) Enrollments
    activeEnrollments.forEach(e => {
      if (e.status !== 'cancelled') {
        rows.push([
          'Stream 2 (Academy)',
          `Roster: ${e.participant_name} - ${e.programs?.name || 'Program'} (${e.pricing_plan})`,
          format(new Date(e.created_at), 'yyyy-MM-dd'),
          e.payment_status === 'fully_paid' ? getEnrollmentPrice(e) : 0,
          e.payment_status === 'fully_paid' ? 'Completed' : 'Pending'
        ]);
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    triggerDownload(csvContent, 'Revenue_Report');
  };

  const handleExportExpenses = () => {
    const headers = ['Attribution Stream', 'Category', 'Description', 'Logged By', 'Date', 'Amount (KES)'];
    const rows = activeExpenses.map(ex => [
      ex.is_academy ? 'Stream 2 (Academy)' : 'Stream 1 (Venues)',
      ex.category,
      `"${ex.description.replace(/"/g, '""')}"`,
      ex.logged_by || 'Staff',
      format(new Date(ex.created_at), 'yyyy-MM-dd'),
      ex.amount
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    triggerDownload(csvContent, 'Expenses_Report');
  };

  const handleExportDiscounts = () => {
    if (isCOO) return;
    const discounted = activeBookings.filter(b => Number(b.discount_amount) > 0);
    const headers = ['Date', 'Client Name', 'Original KES', 'Discount Given KES', 'Reason', 'Final Paid KES'];
    const rows = discounted.map(b => [
      format(new Date(b.created_at), 'yyyy-MM-dd'),
      `"${b.client_name.replace(/"/g, '""')}"`,
      b.original_amount || b.total_amount,
      b.discount_amount,
      `"${(b.discount_reason || 'Promo').replace(/"/g, '""')}"`,
      b.total_amount
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    triggerDownload(csvContent, 'Discounts_Report');
  };

  const triggerDownload = (csvContent: string, fileName: string) => {
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MVSA_${fileName}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!staff || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-32 text-white">
        <Loader2 className="w-12 h-12 animate-spin text-gold mb-4" />
        <p className="text-sm font-bold font-display uppercase tracking-widest text-white/50">Compiling Ledger Aggregates...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-32 text-white px-6 text-center">
        <AlertCircle className="w-16 h-16 text-error mb-4" />
        <h2 className="text-2xl font-bold font-display uppercase tracking-tight">Access Denied</h2>
        <p className="text-white/40 text-sm mt-1 max-w-md">Your security role does not have authorization to view the global Financial Reports Portal.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 p-6 lg:p-10 animate-entrance min-h-full">
      {/* Header */}
      <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-1 bg-gold rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">Executive Intelligence</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tighter leading-none italic uppercase">
            Financial Reports Portal
          </h1>
          <p className="text-white/40 text-sm font-medium mt-1">
            {isCOO ? 'Academy-only operations ledger audits and Stream 2 performance records.' : 'Consolidated P&L tracking, multi-stream revenues, margins, and discounts auditing.'}
          </p>
        </div>

        {/* Date Filters */}
        <div className="flex flex-wrap gap-4 items-center bg-white/5 p-4 rounded-2xl border border-white/10 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-xs text-white/40 font-bold uppercase">
            <Calendar className="w-4 h-4 text-gold" /> Filter Period:
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-xl bg-forest-dark border border-white/10 text-white font-bold text-xs focus:outline-none focus:border-gold/30"
            />
            <span className="text-white/30 text-xs">to</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-xl bg-forest-dark border border-white/10 text-white font-bold text-xs focus:outline-none focus:border-gold/30"
            />
          </div>
        </div>
      </header>

      {/* Tabs Menu */}
      <div className="flex border-b border-white/5 pb-4 mb-8 overflow-x-auto scrollbar-hide gap-4">
        {[
          { id: 'overview', label: 'Financial Overview', icon: BarChart3, visible: true },
          { id: 'revenue', label: 'Revenue Roster', icon: TrendingUp, visible: true },
          { id: 'expenses', label: 'Expenses Attributions', icon: TrendingDown, visible: true },
          { id: 'discounts', label: 'Discounts Ledger', icon: Percent, visible: isSuperAdmin }
        ].map(tab => {
          if (!tab.visible) return null;
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2.5 transition-all whitespace-nowrap border ${
                isActive 
                  ? 'bg-gold text-forest font-black border-gold shadow-gold-sm hover:scale-[1.01]' 
                  : 'text-white/50 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* =========================================================
          TAB 1: FINANCIAL OVERVIEW
          ========================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-10 animate-in fade-in duration-300">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Revenue */}
            <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch transition-all hover:scale-[1.01]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/10 text-emerald-400">
                  <DollarSign className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/5 px-2 py-1 rounded-lg">Revenue</span>
              </div>
              <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider">Gross Revenue</h3>
              <p className="text-3xl font-extrabold font-display text-white mt-1.5">KES {totalRevenue.toLocaleString()}</p>
              <div className="text-[9px] text-white/30 font-bold uppercase mt-3 space-y-1">
                {!isCOO && <p>Venues Stream: KES {venueRevenue.toLocaleString()}</p>}
                <p>Academy Stream: KES {academyRevenue.toLocaleString()}</p>
              </div>
            </div>

            {/* Total Expenses */}
            <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch transition-all hover:scale-[1.01]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/10 text-red-400">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest bg-red-500/5 px-2 py-1 rounded-lg">Expenses</span>
              </div>
              <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider">Total Operations Costs</h3>
              <p className="text-3xl font-extrabold font-display text-white mt-1.5">KES {totalExpenses.toLocaleString()}</p>
              <div className="text-[9px] text-white/30 font-bold uppercase mt-3 space-y-1">
                {!isCOO && <p>Venues Attributed: KES {venueExpenses.toLocaleString()}</p>}
                <p>Academy Attributed: KES {academyExpenses.toLocaleString()}</p>
              </div>
            </div>

            {/* Net Margin */}
            <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch transition-all hover:scale-[1.01]">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl border ${netMargin >= 0 ? 'bg-gold/10 border-gold/10 text-gold' : 'bg-red-500/10 border-red-500/10 text-red-400'}`}>
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                  netMargin >= 0 ? 'bg-gold/5 text-gold' : 'bg-red-500/5 text-red-400'
                }`}>
                  Profit Rate: {marginPercent.toFixed(1)}%
                </span>
              </div>
              <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider">Net Operations Margin</h3>
              <p className={`text-3xl font-extrabold font-display mt-1.5 ${netMargin >= 0 ? 'text-gold' : 'text-red-400'}`}>
                KES {netMargin.toLocaleString()}
              </p>
              <p className="text-[10px] text-white/30 font-medium mt-3">Attributable net balance in active period</p>
            </div>

            {/* Total Receivables */}
            <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch transition-all hover:scale-[1.01]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/10 text-amber-400">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/5 px-2 py-1 rounded-lg">Outstanding</span>
              </div>
              <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider">Outstanding Receivables</h3>
              <p className="text-3xl font-extrabold font-display text-white mt-1.5">KES {totalReceivables.toLocaleString()}</p>
              <div className="text-[9px] text-white/30 font-bold uppercase mt-3 space-y-1">
                {!isCOO && <p>Venues Balances: KES {venueReceivables.toLocaleString()}</p>}
                <p>Academy Ledgers: KES {academyReceivables.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Profit & Loss Trendline Visualizer */}
          <div className="bg-card p-8 rounded-[2.5rem] border border-white/5 shadow-pitch">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-gold animate-pulse" />
              <h2 className="text-xl font-bold font-display text-white italic uppercase tracking-tight">Financial Aggregates Progression Timeline</h2>
            </div>
            
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={plChartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffb800" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#ffb800" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorMargin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="month" stroke="#666" fontSize={10} tickLine={false} />
                  <YAxis stroke="#666" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                    labelStyle={{ fontWeight: 'black', color: '#ffb800' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                  <Area type="monotone" dataKey="Revenue" stroke="#ffb800" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="Net Margin" name="Profit Margin" stroke="#22C55E" strokeWidth={2} fillOpacity={1} fill="url(#colorMargin)" />
                  <Area type="monotone" dataKey="Expenses" stroke="#dc3545" strokeWidth={1.5} strokeDasharray="4 4" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: REVENUE ROSTER
          ========================================================= */}
      {activeTab === 'revenue' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-display font-extrabold text-white italic uppercase tracking-tight">Active Revenue Audits</h2>
              <p className="text-[10px] text-gold font-bold uppercase tracking-widest mt-1">Listing all resolved collections within the period</p>
            </div>
            <button 
              onClick={handleExportRevenue}
              className="flex items-center gap-2 px-5 py-3.5 bg-white/5 border border-white/10 hover:border-gold/30 rounded-2xl text-xs font-bold text-white/70 hover:text-white transition-all"
            >
              <Download className="w-4 h-4 text-gold" />
              Export Revenue
            </button>
          </div>

          <div className="glass rounded-[2rem] overflow-hidden shadow-pitch border border-white/5">
            <div className="scrollbar-hide overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Stream</th>
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Payer / Description</th>
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Date</th>
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em] text-right">KES Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white">
                  {/* Render Venues Bookings */}
                  {!isCOO && activeBookings.map(b => (
                    <tr key={`b-${b.id}`} className="hover:bg-white/[0.015] transition-colors">
                      <td className="px-8 py-5">
                        <span className="px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-sky-500/10 border border-sky-500/20 text-sky-400">Venues</span>
                      </td>
                      <td className="px-8 py-5 font-bold text-sm text-white">
                        {b.client_name} - {b.venues?.name || 'Pitch'}
                      </td>
                      <td className="px-8 py-5 text-xs text-white/50">{format(new Date(b.created_at), 'yyyy-MM-dd')}</td>
                      <td className="px-8 py-5 text-right font-black text-emerald-400 text-sm">KES {(b.total_amount - b.balance).toLocaleString()}</td>
                    </tr>
                  ))}

                  {/* Render Academy Enrollments */}
                  {activeEnrollments.filter(e => e.status !== 'cancelled' && e.payment_status === 'fully_paid').map(e => (
                    <tr key={`e-${e.id}`} className="hover:bg-white/[0.015] transition-colors">
                      <td className="px-8 py-5">
                        <span className="px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-purple-500/10 border border-purple-500/20 text-purple-400">Academy</span>
                      </td>
                      <td className="px-8 py-5 font-bold text-sm text-white">
                        {e.participant_name} - {e.programs?.name || 'Academy Cohort'} ({e.pricing_plan})
                      </td>
                      <td className="px-8 py-5 text-xs text-white/50">{format(new Date(e.created_at), 'yyyy-MM-dd')}</td>
                      <td className="px-8 py-5 text-right font-black text-emerald-400 text-sm">KES {getEnrollmentPrice(e).toLocaleString()}</td>
                    </tr>
                  ))}
                  
                  {totalRevenue === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-white/20 italic font-medium">No revenue records recorded in selected period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: EXPENSES ATTRIBUTIONS
          ========================================================= */}
      {activeTab === 'expenses' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-display font-extrabold text-white italic uppercase tracking-tight">Active Operating Expenses</h2>
              <p className="text-[10px] text-gold font-bold uppercase tracking-widest mt-1">Listing all logged costs and stream attributions</p>
            </div>
            <button 
              onClick={handleExportExpenses}
              className="flex items-center gap-2 px-5 py-3.5 bg-white/5 border border-white/10 hover:border-gold/30 rounded-2xl text-xs font-bold text-white/70 hover:text-white transition-all"
            >
              <Download className="w-4 h-4 text-gold" />
              Export Expenses
            </button>
          </div>

          <div className="glass rounded-[2rem] overflow-hidden shadow-pitch border border-white/5">
            <div className="scrollbar-hide overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Stream</th>
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Category</th>
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Description</th>
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Date</th>
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em] text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white">
                  {activeExpenses.map(ex => (
                    <tr key={ex.id} className="hover:bg-white/[0.015] transition-colors">
                      <td className="px-8 py-5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                          ex.is_academy 
                            ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' 
                            : 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                        }`}>
                          {ex.is_academy ? 'Academy' : 'Venues'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-white uppercase tracking-wider">{ex.category}</td>
                      <td className="px-8 py-5 text-sm font-medium text-white/80">{ex.description}</td>
                      <td className="px-8 py-5 text-xs text-white/50">{format(new Date(ex.created_at), 'yyyy-MM-dd')}</td>
                      <td className="px-8 py-5 text-right font-black text-red-400 text-sm">KES {ex.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  
                  {activeExpenses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-white/20 italic font-medium">No expenses logged in selected period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 4: DISCOUNTS LEDGER (super_admin strictly)
          ========================================================= */}
      {activeTab === 'discounts' && isSuperAdmin && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-display font-extrabold text-white italic uppercase tracking-tight">Active Venue Booking Discounts</h2>
              <p className="text-[10px] text-gold font-bold uppercase tracking-widest mt-1">Super Admin audit view of all custom discount markdowns</p>
            </div>
            <div className="flex gap-4">
              <span className="px-4 py-2 bg-gold/10 border border-gold/20 text-gold rounded-xl font-black text-xs flex items-center gap-1.5 uppercase">
                Total Markdown: KES {totalDiscounts.toLocaleString()}
              </span>
              <button 
                onClick={handleExportDiscounts}
                className="flex items-center gap-2 px-5 py-3.5 bg-white/5 border border-white/10 hover:border-gold/30 rounded-2xl text-xs font-bold text-white/70 hover:text-white transition-all"
              >
                <Download className="w-4 h-4 text-gold" />
                Export Discounts
              </button>
            </div>
          </div>

          <div className="glass rounded-[2rem] overflow-hidden shadow-pitch border border-white/5">
            <div className="scrollbar-hide overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Date</th>
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Client</th>
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Original Amount</th>
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Discount Given</th>
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Markdown Reason</th>
                    <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em] text-right">Final Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white">
                  {activeBookings.filter(b => Number(b.discount_amount) > 0).map(b => (
                    <tr key={b.id} className="hover:bg-white/[0.015] transition-colors">
                      <td className="px-8 py-5 text-xs text-white/50">{format(new Date(b.created_at), 'yyyy-MM-dd')}</td>
                      <td className="px-8 py-5 font-bold text-sm text-white">{b.client_name}</td>
                      <td className="px-8 py-5 text-sm text-white/60">KES {(b.original_amount || b.total_amount).toLocaleString()}</td>
                      <td className="px-8 py-5 font-bold text-sm text-amber-400">- KES {Number(b.discount_amount).toLocaleString()}</td>
                      <td className="px-8 py-5 text-xs italic text-white/40">{b.discount_reason || 'Promotional Discount'}</td>
                      <td className="px-8 py-5 text-right font-black text-emerald-400 text-sm">KES {b.total_amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  
                  {activeBookings.filter(b => Number(b.discount_amount) > 0).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center text-white/20 italic font-medium">No customized discounts logged in selected period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
