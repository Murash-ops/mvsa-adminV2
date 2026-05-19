'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { format } from 'date-fns';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ChevronRight,
  ShieldCheck,
  Trophy
} from 'lucide-react';

export default function InstructorPortal() {
  const { staff } = useAuth();
  const supabase = createClient();
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<any | null>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (staff) {
      fetchPrograms();
    }
  }, [staff]);

  async function fetchPrograms() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('instructor_id', staff?.id)
      .eq('is_active', true);

    if (!error && data) {
      setPrograms(data);
    }
    setIsLoading(false);
  }

  async function fetchRoster(programId: number) {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*')
      .eq('program_id', programId)
      .eq('status', 'active');

    if (!error && data) {
      setEnrollments(data);
      // Default all to present
      const initialAttendance: Record<number, boolean> = {};
      data.forEach(e => initialAttendance[e.id] = true);
      setAttendance(initialAttendance);
    }
  }

  const toggleAttendance = (enrollmentId: number) => {
    setAttendance(prev => ({
      ...prev,
      [enrollmentId]: !prev[enrollmentId]
    }));
  };

  const submitAttendance = async () => {
    if (!selectedProgram) return;
    setIsSubmitting(true);

    try {
      // 1. Log attendance records
      const attendanceRecords = enrollments.map(e => ({
        program_id: selectedProgram.id,
        enrollment_id: e.id,
        instructor_id: staff?.id,
        date: format(new Date(), 'yyyy-MM-dd'),
        present: attendance[e.id]
      }));

      const { error: attError } = await supabase
        .from('attendance')
        .insert(attendanceRecords);

      if (attError) throw attError;

      // 2. Auto-log instructor payout as expense
      const payoutRate = selectedProgram.payout_rate || 0;
      const payoutType = selectedProgram.payout_type || 'percentage';
      const presentCount = enrollments.filter(e => attendance[e.id]).length;
      
      let payoutAmount = 0;
      if (payoutType === 'percentage') {
        const sessionPrice = selectedProgram.pricing_json?.session || 0;
        payoutAmount = (sessionPrice * presentCount) * (payoutRate / 100);
      } else {
        // Flat rate is usually per session
        payoutAmount = payoutRate;
      }

      if (payoutAmount > 0) {
        await supabase.from('expenses').insert([{
          category: 'instructor',
          amount: payoutAmount,
          description: `Payout for ${selectedProgram.name} (${presentCount} present) - ${format(new Date(), 'MMM d, yyyy')}`,
          logged_by: staff?.id
        }]);
      }

      alert('Attendance submitted and payout logged!');
      setSelectedProgram(null);
    } catch (err: any) {
      alert(err.message || 'Error submitting attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-display tracking-tight uppercase italic text-forest">Instructor Portal</h1>
        <p className="text-charcoal-light">Welcome back, {staff?.name}. Manage your classes and rosters.</p>
      </header>

      {!selectedProgram ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.length === 0 ? (
            <div className="col-span-full bg-white p-20 rounded-[2.5rem] border border-dashed border-border-color flex flex-col items-center opacity-40">
              <ShieldCheck className="w-16 h-16 mb-4" />
              <p className="font-bold text-xl">No assigned programs</p>
              <p className="text-sm">You haven't been assigned to any active programs yet.</p>
            </div>
          ) : (
            programs.map(prog => (
              <button
                key={prog.id}
                onClick={() => {
                  setSelectedProgram(prog);
                  fetchRoster(prog.id);
                }}
                className="bg-white p-8 rounded-[2rem] border border-border-color shadow-sm hover:shadow-md transition-all text-left group"
              >
                <div className="w-12 h-12 bg-forest/5 text-forest rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Trophy className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-display font-bold text-forest italic mb-2">{prog.name}</h3>
                <p className="text-xs font-bold text-muted uppercase tracking-widest flex items-center gap-2 mb-6">
                  <Calendar className="w-3.5 h-3.5" /> {prog.schedule}
                </p>
                <div className="flex items-center justify-between text-[10px] font-black tracking-widest uppercase text-forest">
                  Mark Attendance
                  <ChevronRight className="w-4 h-4 text-gold group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="max-w-3xl animate-in slide-in-from-bottom-4 duration-300">
          <button 
            onClick={() => setSelectedProgram(null)}
            className="text-xs font-bold text-muted hover:text-forest transition-colors flex items-center gap-2 mb-6 uppercase tracking-widest"
          >
            ← Back to Programs
          </button>
          
          <div className="bg-white rounded-[2.5rem] border border-border-color shadow-lg overflow-hidden">
            <div className="p-8 border-b border-border-color bg-forest text-white">
              <h2 className="text-3xl font-display font-bold italic tracking-tight">{selectedProgram.name}</h2>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">Attendance Roster — {format(new Date(), 'MMMM d, yyyy')}</p>
            </div>

            <div className="p-8 space-y-4">
              {enrollments.length === 0 ? (
                <div className="py-12 text-center opacity-40">
                  <Users className="w-12 h-12 mx-auto mb-4" />
                  <p className="font-bold">No students enrolled in this program.</p>
                </div>
              ) : (
                enrollments.map(e => (
                  <div 
                    key={e.id}
                    onClick={() => toggleAttendance(e.id)}
                    className={`
                      flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all
                      ${attendance[e.id] ? 'border-success bg-success/5 shadow-sm' : 'border-border-color bg-surface grayscale opacity-60'}
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${attendance[e.id] ? 'bg-success text-white' : 'bg-muted text-white'}`}>
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-forest">{e.participant_name}</p>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{e.client_phone}</p>
                      </div>
                    </div>
                    {attendance[e.id] ? (
                      <CheckCircle2 className="w-6 h-6 text-success" />
                    ) : (
                      <XCircle className="w-6 h-6 text-muted" />
                    )}
                  </div>
                ))
              )}

              {enrollments.length > 0 && (
                <div className="pt-8">
                  <button 
                    onClick={submitAttendance}
                    disabled={isSubmitting}
                    className="w-full bg-gold text-forest py-5 rounded-2xl font-bold tracking-[0.2em] uppercase shadow-xl shadow-gold/20 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'SUBMIT ATTENDANCE & LOG PAYOUT'}
                  </button>
                  <p className="text-[10px] text-center text-muted font-bold uppercase tracking-widest mt-6">
                    This will finalize today's session and generate your payout record.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
