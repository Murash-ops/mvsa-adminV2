'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Users, 
  Clock, 
  X,
  Loader2,
  ChevronRight,
  Trophy,
  Activity,
  User
} from 'lucide-react';

export default function ProgramsManagerPage() {
  const supabase = createClient();
  const [programs, setPrograms] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'academy',
    description: '',
    schedule: '',
    instructor_id: '',
    pricing_session: '',
    pricing_monthly: '',
    pricing_term: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    
    // Fetch Programs
    const { data: progData, error: progError } = await supabase
      .from('programs')
      .select(`
        *,
        instructor:instructor_id (name),
        enrollments:enrollments (count)
      `)
      .order('created_at', { ascending: false });

    // Fetch Instructors
    const { data: instData, error: instError } = await supabase
      .from('staff')
      .select('id, name')
      .eq('role', 'instructor');

    if (!progError && progData) setPrograms(progData);
    if (!instError && instData) setInstructors(instData);
    
    setIsLoading(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const pricing_json = {
        session: parseFloat(formData.pricing_session) || 0,
        monthly: parseFloat(formData.pricing_monthly) || 0,
        term: parseFloat(formData.pricing_term) || 0
      };

      const { error: insertError } = await supabase
        .from('programs')
        .insert([{
          name: formData.name,
          type: formData.type,
          description: formData.description,
          schedule: formData.schedule,
          instructor_id: formData.instructor_id || null,
          pricing_json
        }]);

      if (insertError) throw insertError;

      setIsModalOpen(false);
      setFormData({
        name: '',
        type: 'academy',
        description: '',
        schedule: '',
        instructor_id: '',
        pricing_session: '',
        pricing_monthly: '',
        pricing_term: ''
      });
      fetchData();
    } catch (error: any) {
      alert(error.message || 'Error saving program');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-8">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Programs Manager</h1>
          <p className="text-charcoal-light">Manage academies, fitness classes, and instructor assignments.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-forest text-white rounded-xl text-sm font-bold hover:bg-forest-dark transition-all shadow-lg shadow-forest/20 active:scale-95"
        >
          <Plus className="w-4 h-4" /> CREATE PROGRAM
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-[2rem] h-64 animate-pulse border border-border-color" />
          ))
        ) : programs.length === 0 ? (
          <div className="col-span-full bg-white p-20 rounded-[2.5rem] border border-dashed border-border-color flex flex-col items-center opacity-40">
            <Trophy className="w-16 h-16 mb-4" />
            <p className="font-bold text-xl">No programs created yet</p>
            <p className="text-sm">Click "Create Program" to define your first class or academy.</p>
          </div>
        ) : (
          programs.map((program) => (
            <div key={program.id} className="bg-white rounded-[2rem] border border-border-color shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all">
              <div className="p-8 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-2xl ${program.type === 'academy' ? 'bg-forest/5 text-forest' : 'bg-gold/10 text-gold'}`}>
                    {program.type === 'academy' ? <Trophy className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${program.type === 'academy' ? 'bg-forest text-white border-forest' : 'bg-gold/10 text-gold border-gold/30'}`}>
                    {program.type}
                  </span>
                </div>
                
                <h3 className="text-2xl font-display font-bold text-forest italic mb-2 tracking-tight">{program.name}</h3>
                <div className="flex items-center gap-2 text-xs font-bold text-muted mb-4">
                  <Clock className="w-3.5 h-3.5" />
                  {program.schedule}
                </div>
                
                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3 text-sm font-medium text-charcoal-light">
                    <User className="w-4 h-4 text-gold" />
                    {program.instructor?.name || 'No instructor assigned'}
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-charcoal-light">
                    <Users className="w-4 h-4 text-gold" />
                    {program.enrollments?.[0]?.count || 0} Participants Enrolled
                  </div>
                </div>

                <div className="flex gap-4 border-t border-border-color pt-6">
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Session</p>
                    <p className="text-sm font-bold text-forest">KES {program.pricing_json?.session || 0}</p>
                  </div>
                  <div className="flex-1 border-l border-border-color pl-4">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Monthly</p>
                    <p className="text-sm font-bold text-forest">KES {program.pricing_json?.monthly || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-surface/50 border-t border-border-color flex justify-between items-center px-8">
                <button className="text-[10px] font-black tracking-[0.2em] uppercase text-forest hover:text-gold transition-colors">
                  Edit Details
                </button>
                <button className="text-[10px] font-black tracking-[0.2em] uppercase text-forest hover:text-gold transition-colors">
                  View Roster
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Program Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-border-color flex justify-between items-center bg-forest text-white sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-display font-bold italic tracking-tight">CREATE NEW PROGRAM</h2>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">Academy & Fitness Setup</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted">Program Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Football Academy U12"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-border-color bg-surface focus:outline-none focus:ring-2 focus:ring-gold/50 font-bold text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted">Type</label>
                  <select 
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-border-color bg-surface focus:outline-none focus:ring-2 focus:ring-gold/50 font-bold text-sm"
                  >
                    <option value="academy">Youth Academy</option>
                    <option value="fitness">Adult Fitness</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted">Schedule</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Sat & Sun, 9:00 AM"
                  value={formData.schedule}
                  onChange={(e) => setFormData({...formData, schedule: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-border-color bg-surface focus:outline-none focus:ring-2 focus:ring-gold/50 font-medium text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted">Description</label>
                <textarea 
                  rows={2}
                  placeholder="Tell clients about this program..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-border-color bg-surface focus:outline-none focus:ring-2 focus:ring-gold/50 font-medium text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted">Assign Instructor</label>
                <select 
                  value={formData.instructor_id}
                  onChange={(e) => setFormData({...formData, instructor_id: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-border-color bg-surface focus:outline-none focus:ring-2 focus:ring-gold/50 font-bold text-sm"
                >
                  <option value="">Select an instructor...</option>
                  {instructors.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-border-color pt-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted mb-4">Pricing Configuration (KES)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted uppercase">Per Session</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={formData.pricing_session}
                      onChange={(e) => setFormData({...formData, pricing_session: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-border-color bg-surface focus:outline-none focus:ring-2 focus:ring-gold/50 font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted uppercase">Monthly</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={formData.pricing_monthly}
                      onChange={(e) => setFormData({...formData, pricing_monthly: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-border-color bg-surface focus:outline-none focus:ring-2 focus:ring-gold/50 font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted uppercase">Term (3 Mo)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={formData.pricing_term}
                      onChange={(e) => setFormData({...formData, pricing_term: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-border-color bg-surface focus:outline-none focus:ring-2 focus:ring-gold/50 font-bold text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 sticky bottom-0 bg-white">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-3 bg-forest text-white px-8 py-4 rounded-2xl font-bold text-sm tracking-[0.2em] uppercase transition-all shadow-xl shadow-forest/20 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'CREATE PROGRAM'}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
