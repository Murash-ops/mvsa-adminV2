'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { Calendar, TrendingUp, AlertCircle, Users, PlusCircle } from 'lucide-react';
import { QuickLogModal } from '@/components/QuickLogModal';
import { ActivityTimeline } from '@/components/ActivityTimeline';

export default function Home() {
  const supabase = createClient();
  const router = useRouter();
  const { staff } = useAuth();
  const [stats, setStats] = useState({
    todayBookings: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    totalClients: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);

  useEffect(() => {
    if (staff?.role === 'instructor') {
      router.push('/instructor');
      return;
    }
    
    async function fetchStats() {
      const today = new Date().toISOString().split('T')[0];
      
      const [bookingsRes, paymentsRes] = await Promise.all([
        supabase.from('bookings').select('*'),
        supabase.from('payments').select('amount')
      ]);

      if (bookingsRes.data) {
        const todayBookings = bookingsRes.data.filter(b => b.created_at.startsWith(today)).length;
        const pending = bookingsRes.data.filter(b => b.status === 'pending').length;
        const uniqueClients = new Set(bookingsRes.data.map(b => b.client_phone)).size;
        
        const revenue = paymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        setStats(prev => ({
          ...prev,
          todayBookings,
          totalRevenue: revenue,
          pendingPayments: pending,
          totalClients: uniqueClients
        }));
      }
      setIsLoading(false);
    }

    fetchStats();
  }, [staff, router, supabase]);

  const cards = [
    { title: "Today's Bookings", value: stats.todayBookings, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Total Revenue", value: `KES ${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { title: "Pending Payments", value: stats.pendingPayments, icon: AlertCircle, color: "text-yellow-600", bg: "bg-yellow-50" },
    { title: "Total Clients", value: stats.totalClients, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="flex flex-col flex-1 p-8">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-forest">Dashboard Overview</h1>
          <p className="text-charcoal-light text-sm">Real-time performance metrics for MVSA Arena.</p>
        </div>
        <button 
          onClick={() => setIsQuickLogOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-forest text-white rounded-2xl font-bold shadow-lg shadow-forest/20 hover:bg-forest-dark transition-all active:scale-[0.98]"
        >
          <PlusCircle className="w-5 h-5 text-gold" />
          Quick Log Walk-in
        </button>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {cards.map((card, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-border-color shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${card.bg}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
            <h3 className="text-muted text-sm font-medium mb-1">{card.title}</h3>
            <p className="text-3xl font-bold font-display">{isLoading ? '...' : card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-border-color">
          <h2 className="text-xl font-bold mb-6 italic flex items-center gap-2">
            Recent Activity
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          </h2>
          <div className="space-y-6">
            <ActivityTimeline />
          </div>
        </div>
        <div className="bg-forest p-8 rounded-2xl text-white">
          <h2 className="text-xl font-bold mb-2">Arena Capacity</h2>
          <p className="text-white/60 text-sm mb-6">Currently tracking 2 venues</p>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Main Turf</span>
                <span className="font-bold">85% Full</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gold w-[85%]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <QuickLogModal 
        isOpen={isQuickLogOpen} 
        onClose={() => {
          setIsQuickLogOpen(false);
          // Optionally refresh stats here if needed, or rely on future real-time updates
        }} 
      />
    </div>
  );
}
