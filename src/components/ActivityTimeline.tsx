'use client';

import useSWR from 'swr';
import { createClient } from '@/utils/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Calendar, Receipt, Clock, ChevronRight } from 'lucide-react';

interface ActivityItem {
  id: string | number;
  type: 'booking_confirmed' | 'booking_pending' | 'expense';
  title: string;
  subtitle: string;
  amount: number;
  timestamp: Date;
}

const fetcher = async () => {
  const supabase = createClient();
  
  const [bookingsRes, expensesRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, venues(name)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
  ]);

  if (bookingsRes.error) throw bookingsRes.error;
  if (expensesRes.error) throw expensesRes.error;

  const activities: ActivityItem[] = [
    ...(bookingsRes.data || []).map((b: any) => ({
      id: `booking-${b.id}`,
      type: b.status === 'confirmed' ? 'booking_confirmed' : 'booking_pending' as any,
      title: b.client_name || 'Anonymous Client',
      subtitle: b.venues?.name || 'Unknown Venue',
      amount: b.total_amount || 0,
      timestamp: new Date(b.created_at)
    })),
    ...(expensesRes.data || []).map((e: any) => ({
      id: `expense-${e.id}`,
      type: 'expense' as any,
      title: e.description || 'Facility Expense',
      subtitle: e.category || 'Operations',
      amount: e.amount || 0,
      timestamp: new Date(e.created_at)
    }))
  ];

  // Sort combined activities by timestamp desc and take top 10
  return activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10);
};

export function ActivityTimeline() {
  const { data: activities, error, isLoading } = useSWR('dashboard-activity', fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="w-2 bg-white/5 rounded-full h-12" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/5 rounded w-1/3" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-error/5 text-error text-xs rounded-xl border border-error/10">
        Failed to load activity feed.
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
        <Clock className="w-12 h-12 mb-4 text-gold" />
        <p className="font-display font-bold text-lg text-white">No activity yet</p>
        <p className="text-sm text-white/40">New bookings and expenses will appear here.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-white/5" />

      <div className="space-y-8 relative">
        {activities.map((item, i) => {
          const isExpense = item.type === 'expense';
          const isPending = item.type === 'booking_pending';
          
          let dotColor = 'bg-success'; // confirmed
          if (isPending) dotColor = 'bg-warning';
          if (isExpense) dotColor = 'bg-error';

          const Icon = isExpense ? Receipt : Calendar;

          return (
            <div 
              key={item.id} 
              className={`flex gap-6 items-start animate-slide-up stagger-${Math.min(i + 1, 10)}`}
            >
              {/* Timeline Dot */}
              <div className="relative mt-1.5">
                <div className={`w-6 h-6 rounded-full border-4 border-pitch-surface shadow-sm ${dotColor} z-10 relative`} />
              </div>

              {/* Content */}
              <div className="flex-1 flex justify-between items-center bg-white/[0.01] p-4 rounded-2xl border border-white/5 hover:bg-white/[0.03] transition-all duration-300 group">
                <div className="flex gap-4 items-center">
                  <div className={`p-2.5 rounded-xl ${isExpense ? 'bg-error/10 text-error' : isPending ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white line-clamp-1">{item.title}</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mt-0.5">{item.subtitle}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-display font-extrabold text-gold italic">
                    {isExpense ? '-' : '+'} KES {item.amount.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-white/40 font-medium mt-0.5 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3 text-gold" />
                    {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <button className="w-full mt-8 py-3 border border-dashed border-white/10 bg-white/[0.01] hover:bg-white/[0.03] hover:border-gold/30 rounded-2xl text-xs font-bold text-white/60 hover:text-gold transition-all flex items-center justify-center gap-2 group">
        VIEW ALL ACTIVITY
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}
