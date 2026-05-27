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
  User,
  Upload,
  Image as ImageIcon,
  FileText
} from 'lucide-react';

export default function ProgramsManagerPage() {
  const supabase = createClient();
  const [programs, setPrograms] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Create / Edit states
  const [editingProgram, setEditingProgram] = useState<any | null>(null);

  // File upload states
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [posterPreview, setPosterPreview] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'academy',
    description: '',
    schedule: '',
    instructor_id: '',
    pricing_session: '',
    pricing_monthly: '',
    pricing_term: '',
    payout_rate: '70',
    payout_type: 'percentage'
  });

  const [schemaFields, setSchemaFields] = useState<any[]>([]);

  const addSchemaField = () => {
    setSchemaFields([...schemaFields, { field_name: '', type: 'text', required: true, options: [] }]);
  };

  const removeSchemaField = (index: number) => {
    setSchemaFields(schemaFields.filter((_, idx) => idx !== index));
  };

  const updateSchemaField = (index: number, key: string, value: any) => {
    const updated = [...schemaFields];
    updated[index] = { ...updated[index], [key]: value };
    setSchemaFields(updated);
  };

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

    // Fetch Coaches (only valid coach role is allowed)
    const { data: instData, error: instError } = await supabase
      .from('staff')
      .select('id, name')
      .eq('role', 'coach');

    if (!progError && progData) setPrograms(progData);
    if (!instError && instData) setInstructors(instData);
    
    setIsLoading(false);
  }

  const handleOpenCreate = () => {
    setEditingProgram(null);
    setFormData({
      name: '',
      type: 'academy',
      description: '',
      schedule: '',
      instructor_id: '',
      pricing_session: '',
      pricing_monthly: '',
      pricing_term: '',
      payout_rate: '70',
      payout_type: 'percentage'
    });
    setSchemaFields([]);
    setCoverFile(null);
    setPosterFile(null);
    setCoverPreview('');
    setPosterPreview('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (program: any) => {
    setEditingProgram(program);
    setFormData({
      name: program.name || '',
      type: program.type || 'academy',
      description: program.description || '',
      schedule: program.schedule || '',
      instructor_id: program.instructor_id || '',
      pricing_session: program.pricing_json?.session?.toString() || '',
      pricing_monthly: program.pricing_json?.monthly?.toString() || '',
      pricing_term: program.pricing_json?.term?.toString() || '',
      payout_rate: program.payout_rate?.toString() || '70',
      payout_type: program.payout_type || 'percentage'
    });
    setSchemaFields(program.registration_schema || []);
    setCoverFile(null);
    setPosterFile(null);
    setCoverPreview(program.image_url || '');
    setPosterPreview(program.poster_url || '');
    setIsModalOpen(true);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPosterFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPosterPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadFileToStorage = async (file: File, folder: 'covers' | 'flyers'): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('program-assets')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('program-assets')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let finalImageUrl = coverPreview;
      let finalPosterUrl = posterPreview;

      // 1. Upload Cover if new file selected
      if (coverFile) {
        finalImageUrl = await uploadFileToStorage(coverFile, 'covers');
      }

      // 2. Upload Poster if new file selected
      if (posterFile) {
        finalPosterUrl = await uploadFileToStorage(posterFile, 'flyers');
      }

      const pricing_json = {
        session: parseFloat(formData.pricing_session) || 0,
        monthly: parseFloat(formData.pricing_monthly) || 0,
        term: parseFloat(formData.pricing_term) || 0
      };

      const payload = {
        name: formData.name,
        type: formData.type,
        description: formData.description,
        schedule: formData.schedule,
        instructor_id: formData.instructor_id || null,
        pricing_json,
        payout_rate: parseFloat(formData.payout_rate) || 70,
        payout_type: formData.payout_type,
        registration_schema: schemaFields,
        image_url: finalImageUrl || null,
        poster_url: finalPosterUrl || null
      };

      if (editingProgram) {
        // Update existing program
        const { error: updateError } = await supabase
          .from('programs')
          .update(payload)
          .eq('id', editingProgram.id);

        if (updateError) throw updateError;
      } else {
        // Insert new program
        const { error: insertError } = await supabase
          .from('programs')
          .insert([payload]);

        if (insertError) throw insertError;
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      alert(error.message || 'Error saving program');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6 lg:p-10 animate-entrance min-h-full">
      <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-1 bg-gold rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">Management</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tighter leading-none italic uppercase">
            Programs
          </h1>
          <p className="text-white/40 text-sm font-medium mt-1">Manage academies, fitness classes, and instructor assignments.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 spring-bounce hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider group"
        >
          <Plus className="w-4 h-4 text-forest stroke-[2.5px]" /> CREATE PROGRAM
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="glass rounded-[2rem] h-80 animate-pulse" />
          ))
        ) : programs.length === 0 ? (
          <div className="col-span-full glass p-20 rounded-[2.5rem] border border-dashed border-white/10 flex flex-col items-center gap-4 opacity-40">
            <Trophy className="w-16 h-16 mb-4 text-gold animate-pulse" />
            <p className="font-display font-bold text-xl text-white">No programs created yet</p>
            <p className="text-sm text-charcoal-light mt-1">Click "Create Program" to define your first class or academy.</p>
          </div>
        ) : (
          programs.map((program) => (
            <div key={program.id} className="relative glass rounded-[2rem] overflow-hidden flex flex-col group hover:border-white/10 hover:shadow-pitch transition-all duration-300">
              {/* Program Card Cover Photo */}
              <div className="relative w-full aspect-[16/7] overflow-hidden bg-forest-dark border-b border-white/5">
                {program.image_url ? (
                  <img 
                    src={program.image_url} 
                    alt={program.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-forest-dark via-forest to-pitch flex items-center justify-center">
                    <Trophy className="w-10 h-10 text-gold/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/20 to-transparent" />
                <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border backdrop-blur-md ${program.type === 'academy' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-gold/10 text-gold border-gold/20'}`}>
                  {program.type === 'academy' ? 'Academy' : 'Fitness'}
                </span>
              </div>

              <div className="p-8 flex-1 flex flex-col">
                <h3 className="text-2xl font-display font-extrabold text-white italic mb-2 tracking-tight group-hover:text-gold transition-colors">{program.name}</h3>
                <div className="flex items-center gap-2 text-xs font-medium text-white/40 mb-5">
                  <Clock className="w-3.5 h-3.5 text-white/40" />
                  {program.schedule}
                </div>
                
                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-center gap-3 text-sm font-medium text-charcoal-light">
                    <User className="w-4 h-4 text-gold" />
                    <span className="truncate">{program.instructor?.name || 'No instructor assigned'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-charcoal-light">
                    <Users className="w-4 h-4 text-gold" />
                    {program.enrollments?.[0]?.count || 0} Participants Enrolled
                  </div>
                </div>

                <div className="flex gap-4 border-t border-white/5 pt-5 mb-2">
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Session</p>
                    <p className="text-sm font-black text-white font-mono">KES {program.pricing_json?.session || 0}</p>
                  </div>
                  <div className="flex-1 border-l border-white/5 pl-4">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Monthly</p>
                    <p className="text-sm font-black text-gold font-mono">KES {program.pricing_json?.monthly || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-white/[0.01] border-t border-white/5 flex justify-between items-center px-8">
                <button 
                  onClick={() => handleOpenEdit(program)}
                  className="text-[10px] font-black tracking-[0.2em] uppercase text-charcoal-light hover:text-gold transition-colors"
                >
                  Edit Details
                </button>
                <button 
                  onClick={() => {
                    // Navigate or open roster
                    window.location.href = `/instructor`;
                  }}
                  className="text-[10px] font-black tracking-[0.2em] uppercase text-charcoal-light hover:text-gold transition-colors"
                >
                  View Roster
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Program Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto border border-white/10">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02] text-white sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-display font-extrabold italic tracking-tight text-white uppercase">
                  {editingProgram ? 'EDIT PROGRAM DETAILS' : 'CREATE NEW PROGRAM'}
                </h2>
                <p className="text-gold text-[10px] font-black uppercase tracking-widest mt-1">Academy & Fitness Setup</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Media Upload Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-white/5 pb-6">
                {/* Cover Upload */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gold flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> Landscape Cover Photo (16:9)
                  </label>
                  <div className="relative group rounded-xl border border-dashed border-white/20 hover:border-gold/30 bg-white/5 overflow-hidden transition-all h-36 flex flex-col items-center justify-center text-center cursor-pointer">
                    {coverPreview ? (
                      <div className="absolute inset-0">
                        <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Upload className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 flex flex-col items-center justify-center">
                        <Upload className="w-6 h-6 text-white/40 mb-2 group-hover:text-gold transition-colors" />
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Upload Cover</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleCoverChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Poster Upload */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Vertical Flyer/Poster (4:5)
                  </label>
                  <div className="relative group rounded-xl border border-dashed border-white/20 hover:border-gold/30 bg-white/5 overflow-hidden transition-all h-36 flex flex-col items-center justify-center text-center cursor-pointer">
                    {posterPreview ? (
                      <div className="absolute inset-0">
                        <img src={posterPreview} alt="Poster Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Upload className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 flex flex-col items-center justify-center">
                        <Upload className="w-6 h-6 text-white/40 mb-2 group-hover:text-gold transition-colors" />
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Upload Flyer</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handlePosterChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Standard Program Fields */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gold">Program Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Football Academy U12"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-bold text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gold">Type</label>
                  <select 
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-gold/30 focus:outline-none font-bold text-sm appearance-none"
                  >
                    <option value="academy" className="bg-forest-dark text-white">Youth Academy</option>
                    <option value="fitness" className="bg-forest-dark text-white">Adult Fitness</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gold">Schedule</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Sat & Sun, 9:00 AM"
                  value={formData.schedule}
                  onChange={(e) => setFormData({...formData, schedule: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-medium text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gold">Description</label>
                <textarea 
                  rows={2}
                  placeholder="Tell clients about this program..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-medium text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gold">Assign Instructor</label>
                <select 
                  value={formData.instructor_id}
                  onChange={(e) => setFormData({...formData, instructor_id: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-gold/30 focus:outline-none font-bold text-sm appearance-none"
                >
                  <option value="" className="bg-forest-dark text-white">Select an instructor...</option>
                  {instructors.map(inst => (
                    <option key={inst.id} value={inst.id} className="bg-forest-dark text-white">{inst.name}</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-white/5 pt-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-gold mb-4">Pricing Configuration (KES)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase">Per Session</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={formData.pricing_session}
                      onChange={(e) => setFormData({...formData, pricing_session: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase">Monthly</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={formData.pricing_monthly}
                      onChange={(e) => setFormData({...formData, pricing_monthly: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase">Term (3 Mo)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={formData.pricing_term}
                      onChange={(e) => setFormData({...formData, pricing_term: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-bold text-sm"
                    />
                  </div>
              </div>
            </div>

              {/* Coach Payout Configuration */}
              <div className="border-t border-white/5 pt-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-gold mb-4">Coach Payout Configuration</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gold">Payout Type</label>
                    <select 
                      value={formData.payout_type}
                      onChange={(e) => setFormData({...formData, payout_type: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-gold/30 focus:outline-none font-bold text-sm appearance-none"
                    >
                      <option value="percentage" className="bg-forest-dark text-white">Percentage of Revenue</option>
                      <option value="flat" className="bg-forest-dark text-white">Flat Fee per Session</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gold">
                      {formData.payout_type === 'percentage' ? 'Payout Percentage (%)' : 'Payout Flat Amount (KES)'}
                    </label>
                    <input 
                      type="number" 
                      required
                      placeholder={formData.payout_type === 'percentage' ? '70' : '3000'}
                      value={formData.payout_rate}
                      onChange={(e) => setFormData({...formData, payout_rate: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-bold text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Registration Form Fields Custom Schema Builder */}
              <div className="border-t border-white/5 pt-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-gold mb-4">Registration Form Fields (Custom Schema)</h3>
                <div className="space-y-4">
                  {schemaFields.map((field, index) => (
                    <div key={index} className="flex flex-col gap-3 bg-white/5 p-4 rounded-xl border border-white/5 relative">
                      <div className="flex gap-4 items-end">
                        <div className="flex-1 space-y-1.5 text-left">
                          <label className="text-[10px] font-bold text-white/40 uppercase">Field Name</label>
                          <input
                            type="text"
                            required
                            value={field.field_name}
                            onChange={(e) => updateSchemaField(index, 'field_name', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-xs"
                            placeholder="e.g. School Name"
                          />
                        </div>
                        <div className="w-32 space-y-1.5 text-left">
                          <label className="text-[10px] font-bold text-white/40 uppercase">Type</label>
                          <select
                            value={field.type}
                            onChange={(e) => updateSchemaField(index, 'type', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-xs bg-forest-dark"
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="textarea">Textarea</option>
                            <option value="select">Select</option>
                            <option value="checkbox">Checkbox</option>
                          </select>
                        </div>
                        <div className="flex flex-col items-center justify-center h-10 px-2 gap-1">
                          <label className="text-[10px] font-bold text-white/40 uppercase">Required</label>
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateSchemaField(index, 'required', e.target.checked)}
                            className="w-4 h-4 text-gold border-white/10 rounded focus:ring-0"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSchemaField(index)}
                          className="p-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors h-10 flex items-center justify-center border border-transparent hover:border-red-500/30"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {field.type === 'select' && (
                        <div className="w-full space-y-1.5 text-left border-t border-white/5 pt-2">
                          <label className="text-[10px] font-bold text-white/40 uppercase">Options (comma-separated)</label>
                          <input
                            type="text"
                            required
                            value={field.options?.join(', ') || ''}
                            onChange={(e) => updateSchemaField(index, 'options', e.target.value.split(',').map((s: string) => s.trim()))}
                            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-xs"
                            placeholder="e.g. Under 8, Under 10, Under 12"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addSchemaField}
                    className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-white/20 hover:border-gold/30 hover:bg-white/5 text-white/60 hover:text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider"
                  >
                    <Plus className="w-4 h-4" /> ADD CUSTOM FIELD
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 spring-bounce hover:scale-[1.01] active:scale-[0.99] uppercase text-sm tracking-[0.15em] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-forest" />
                      SAVING...
                    </>
                  ) : (
                    <>
                      {editingProgram ? 'SAVE CHANGES' : 'CREATE PROGRAM'}
                      <ChevronRight className="w-5 h-5 text-forest font-bold" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
