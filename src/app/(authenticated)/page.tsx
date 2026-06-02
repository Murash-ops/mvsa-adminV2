'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { Loader2 } from 'lucide-react';

import SuperAdminDashboard from '@/components/dashboards/SuperAdminDashboard';
import BossDashboard from '@/components/dashboards/BossDashboard';
import AcademyCOODashboard from '@/components/dashboards/AcademyCOODashboard';
import ReceptionistDashboard from '@/components/dashboards/ReceptionistDashboard';
import { QuickLogModal } from '@/components/QuickLogModal';

export default function Home() {
  const supabase = createClient();
  const router = useRouter();
  const { staff, user } = useAuth();
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    if (!staff) return;

    if (staff.role === 'coach' || staff.role === 'instructor') {
      router.push('/instructor');
      return;
    }
    
    async function fetchStats() {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('fetchStats: Session not yet available in browser client.');
        setIsLoading(false);
        return;
      }

      // Use local date for Nairobi timezone matching
      const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

      try {
        // Fetch all strictly required tables in parallel (eliminates latency waterfalls)
        const [bookingsRes, slotsRes, expensesRes, programsRes, enrollmentsRes, assessmentsRes] = await Promise.all([
          supabase.from('bookings').select('*, venues(name)').order('created_at', { ascending: false }),
          supabase.from('time_slots').select('*').eq('date', today),
          supabase.from('expenses').select('*'),
          supabase.from('programs').select('*'),
          supabase.from('enrollments').select('*, programs(name, pricing_json)'),
          supabase.from('player_assessments').select('*, enrollments(participant_name)')
        ]);

        if (bookingsRes.error) throw bookingsRes.error;
        if (slotsRes.error) throw slotsRes.error;
        if (expensesRes.error) throw expensesRes.error;
        if (programsRes.error) throw programsRes.error;
        if (enrollmentsRes.error) throw enrollmentsRes.error;
        if (assessmentsRes.error) throw assessmentsRes.error;

        setBookings(bookingsRes.data || []);
        setTimeSlots(slotsRes.data || []);
        setExpenses(expensesRes.data || []);
        setPrograms(programsRes.data || []);
        setEnrollments(enrollmentsRes.data || []);
        setAssessments(assessmentsRes.data || []);

      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [staff, user, router, supabase, refreshTrigger]);

  // Realtime channel subscriptions for live dashboard metrics (Priority 4)
  useEffect(() => {
    if (!staff) return;

    const dashboardChannel = supabase
      .channel('dashboard_realtime_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        () => {
          triggerRefresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'enrollments'
        },
        () => {
          triggerRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dashboardChannel);
    };
  }, [staff, supabase]);

  if (isLoading || !staff) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-32 text-white">
        <Loader2 className="w-12 h-12 animate-spin text-gold mb-4" />
        <p className="text-sm font-bold font-display uppercase tracking-widest text-white/50">Aligning Operational Deck...</p>
      </div>
    );
  }

  // Render Dashboard based on Staff Role
  const renderDashboardByRole = () => {
    const role = staff.role;

    if (role === 'super_admin') {
      return (
        <SuperAdminDashboard 
          bookings={bookings}
          timeSlots={timeSlots}
          expenses={expenses}
          programs={programs}
          enrollments={enrollments}
          staff={staff}
          onOpenQuickLog={() => setIsQuickLogOpen(true)}
          onRefresh={triggerRefresh}
        />
      );
    } else if (role === 'boss') {
      return (
        <BossDashboard 
          bookings={bookings}
          expenses={expenses}
          enrollments={enrollments}
          programs={programs}
          staff={staff}
          onRefresh={triggerRefresh}
        />
      );
    } else if (role === 'academy_coo') {
      return (
        <AcademyCOODashboard 
          enrollments={enrollments}
          programs={programs}
          expenses={expenses}
          assessments={assessments}
          staff={staff}
          onRefresh={triggerRefresh}
        />
      );
    } else {
      // receptionist / admin / other staff roles default to booking desk
      return (
        <ReceptionistDashboard 
          bookings={bookings}
          timeSlots={timeSlots}
          staff={staff}
          onOpenQuickLog={() => setIsQuickLogOpen(true)}
          onRefresh={triggerRefresh}
        />
      );
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6 lg:p-10 animate-entrance min-h-full">
      
      {renderDashboardByRole()}

      <QuickLogModal 
        isOpen={isQuickLogOpen} 
        onClose={() => {
          setIsQuickLogOpen(false);
          triggerRefresh();
        }} 
      />
    </div>
  );
}
