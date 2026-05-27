'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  MapPin, 
  Clock, 
  Calendar, 
  Activity, 
  Save, 
  Loader2, 
  Play, 
  CheckCircle, 
  AlertTriangle,
  History,
  FileText
} from 'lucide-react';

export default function VenuesManagementPage() {
  const supabase = createClient();
  const [venues, setVenues] = useState<any[]>([]);
  const [changeLogs, setChangeLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingVenueId, setEditingVenueId] = useState<number | null>(null);

  // Venue Edit Form State
  const [venueForm, setVenueForm] = useState({
    name: '',
    description: '',
    image_url: '',
    is_active: true,
    morning: '',
    off_peak: '',
    peak: '',
    weekend: ''
  });

  const [isUploading, setIsUploading] = useState(false);


  // Slot Generator State
  const [generatorForm, setGeneratorForm] = useState({
    startDate: '',
    endDate: ''
  });
  const [generatorStatus, setGeneratorStatus] = useState<{
    status: 'idle' | 'generating' | 'success' | 'error';
    message: string;
    progress: number;
    total: number;
  }>({
    status: 'idle',
    message: '',
    progress: 0,
    total: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      // 1. Fetch Venues
      const { data: vData, error: vError } = await supabase
        .from('venues')
        .select('*')
        .order('id');
      
      if (vError) throw vError;
      setVenues(vData || []);

      // 2. Fetch Change Logs (joined with staff for actor name)
      const { data: logData, error: logError } = await supabase
        .from('venue_change_logs')
        .select(`
          *,
          staff:changed_by (name, email)
        `)
        .order('changed_at', { ascending: false })
        .limit(20);

      if (logError) throw logError;
      setChangeLogs(logData || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleEditClick = (venue: any) => {
    setEditingVenueId(venue.id);
    setVenueForm({
      name: venue.name || '',
      description: venue.description || '',
      image_url: venue.image_url || '',
      is_active: venue.is_active !== false,
      morning: venue.hourly_rates?.morning?.toString() || '0',
      off_peak: venue.hourly_rates?.off_peak?.toString() || '0',
      peak: venue.hourly_rates?.peak?.toString() || '0',
      weekend: venue.hourly_rates?.weekend?.toString() || '0'
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, venueId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `venue-${venueId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('venue-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('venue-images')
        .getPublicUrl(filePath);

      setVenueForm(prev => ({
        ...prev,
        image_url: publicUrl
      }));
    } catch (err: any) {
      alert(err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveVenue = async (venueId: number) => {
    setIsSubmitting(true);
    try {
      const hourly_rates = {
        morning: parseFloat(venueForm.morning) || 0,
        off_peak: parseFloat(venueForm.off_peak) || 0,
        peak: parseFloat(venueForm.peak) || 0,
        weekend: parseFloat(venueForm.weekend) || 0
      };

      const { error } = await supabase
        .from('venues')
        .update({
          name: venueForm.name,
          description: venueForm.description,
          image_url: venueForm.image_url,
          is_active: venueForm.is_active,
          hourly_rates
        })
        .eq('id', venueId);

      if (error) throw error;
      setEditingVenueId(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error updating venue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunGenerator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatorForm.startDate || !generatorForm.endDate) {
      alert('Please specify both start and end dates.');
      return;
    }

    const start = new Date(generatorForm.startDate);
    const end = new Date(generatorForm.endDate);

    if (start > end) {
      alert('Start date must be before or equal to End date.');
      return;
    }

    // Generate date array
    const dates: string[] = [];
    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    setGeneratorStatus({
      status: 'generating',
      message: `Preparing to generate slots for ${dates.length} days...`,
      progress: 0,
      total: dates.length
    });

    let completed = 0;
    try {
      for (const dateStr of dates) {
        setGeneratorStatus(prev => ({
          ...prev,
          message: `Generating slots for ${dateStr}...`,
        }));

        // Execute the public.generate_time_slots_for_date PL/pgSQL function via Supabase RPC
        const { error } = await supabase.rpc('generate_time_slots_for_date', {
          p_date: dateStr
        });

        if (error) throw error;

        completed++;
        setGeneratorStatus(prev => ({
          ...prev,
          progress: completed,
          message: `Finished ${dateStr} (${completed}/${dates.length})`
        }));
      }

      setGeneratorStatus(prev => ({
        ...prev,
        status: 'success',
        message: `Successfully generated rolling hourly slots from 6:00 AM to 11:00 PM for all ${dates.length} days.`
      }));

      // Reset dates after successful generation
      setGeneratorForm({ startDate: '', endDate: '' });
    } catch (err: any) {
      console.error(err);
      setGeneratorStatus(prev => ({
        ...prev,
        status: 'error',
        message: err.message || 'An error occurred during slot generation. Please check constraints.'
      }));
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6 lg:p-10 animate-entrance min-h-full">
      <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 text-left">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-1 bg-gold rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">REVENUE STREAM 1</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tighter leading-none italic uppercase">
            Venues & Slots Management
          </h1>
          <p className="text-white/40 text-sm font-medium mt-1">Configure pricing rates, generate rolling scheduling slots, and audit change logs.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* Left Column: Venue Pricing Editor & Slot Generator */}
        <div className="lg:col-span-7 space-y-10">
          
          {/* Venue Pricing Editor */}
          <section className="glass rounded-[2rem] border border-white/5 overflow-hidden shadow-pitch">
            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-gold/15 border border-gold/30 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h2 className="text-xl font-display font-extrabold text-white uppercase italic tracking-tight">Physical Venues & Rates</h2>
                <p className="text-[10px] font-black uppercase tracking-wider text-gold mt-0.5">Edit venue parameters and hourly pricing</p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="w-8 h-8 text-gold animate-spin" />
                  <p className="text-xs text-white/40 uppercase tracking-widest font-black">Loading physical venues...</p>
                </div>
              ) : venues.length === 0 ? (
                <p className="text-white/40 text-center py-8 text-sm">No venues configured in public.venues.</p>
              ) : (
                venues.map(venue => {
                  const isEditing = editingVenueId === venue.id;
                  return (
                    <div key={venue.id} className="border border-white/5 rounded-2xl bg-white/[0.02] overflow-hidden p-6 transition-all">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4 mb-4 text-left">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-white/5 text-gold border border-gold/30 rounded-full">
                              {venue.type === 'turf' ? '5-Aside Pitch' : 'Event Hall'}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 border rounded-full ${venue.is_active !== false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                              {venue.is_active !== false ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <h3 className="text-lg font-display font-extrabold text-white mt-2 uppercase tracking-wide">{venue.name}</h3>
                        </div>
                        {!isEditing ? (
                          <button
                            onClick={() => handleEditClick(venue)}
                            className="px-4 py-2 border border-white/10 hover:border-gold/35 text-[10px] font-black uppercase tracking-wider text-white hover:text-gold rounded-xl transition-all"
                          >
                            EDIT PARAMETERS
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              disabled={isSubmitting}
                              onClick={() => handleSaveVenue(venue.id)}
                              className="px-4 py-2 bg-gold hover:bg-gold-muted text-forest text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
                            >
                              {isSubmitting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                              SAVE
                            </button>
                            <button
                              onClick={() => setEditingVenueId(null)}
                              className="px-4 py-2 border border-white/10 text-[10px] font-black uppercase tracking-wider text-white/50 hover:text-white rounded-xl transition-all"
                            >
                              CANCEL
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-4 text-left">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-white/40 uppercase">Display Name</label>
                              <input
                                type="text"
                                value={venueForm.name}
                                onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-gold/30 text-sm font-bold"
                              />
                            </div>
                            <div className="space-y-1.5 flex flex-col justify-end">
                              <label className="flex items-center gap-3 cursor-pointer p-3 border border-white/5 rounded-xl bg-white/[0.01] hover:bg-white/[0.03]">
                                <input
                                  type="checkbox"
                                  checked={venueForm.is_active}
                                  onChange={(e) => setVenueForm({ ...venueForm, is_active: e.target.checked })}
                                  className="w-4 h-4 rounded border border-white/10 text-gold focus:ring-gold/20 focus:ring-offset-0 focus:ring-2 accent-gold cursor-pointer"
                                />
                                <span className="text-xs font-bold text-white">
                                  Active on Public Booking Page
                                </span>
                              </label>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-white/40 uppercase">Description</label>
                            <textarea
                              rows={2}
                              value={venueForm.description}
                              onChange={(e) => setVenueForm({ ...venueForm, description: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-gold/30 text-sm"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-white/40 uppercase">Image URL</label>
                              <input
                                type="text"
                                value={venueForm.image_url}
                                onChange={(e) => setVenueForm({ ...venueForm, image_url: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-gold/30 text-sm font-mono"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-white/40 uppercase">Upload New Image</label>
                              <div className="relative">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(e, venue.id)}
                                  className="w-full px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none text-xs"
                                  disabled={isUploading}
                                />
                                {isUploading && (
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-gold" />
                                    <span className="text-[9px] font-bold text-gold uppercase">Uploading...</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/5 pt-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-white/40 uppercase">Morning rate</label>
                              <input
                                type="number"
                                value={venueForm.morning}
                                onChange={(e) => setVenueForm({ ...venueForm, morning: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-xs font-mono"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-white/40 uppercase">Off-Peak rate</label>
                              <input
                                type="number"
                                value={venueForm.off_peak}
                                onChange={(e) => setVenueForm({ ...venueForm, off_peak: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-xs font-mono"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-white/40 uppercase">Peak rate</label>
                              <input
                                type="number"
                                value={venueForm.peak}
                                onChange={(e) => setVenueForm({ ...venueForm, peak: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-xs font-mono"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-white/40 uppercase">Weekend rate</label>
                              <input
                                type="number"
                                value={venueForm.weekend}
                                onChange={(e) => setVenueForm({ ...venueForm, weekend: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-xs font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 text-left">
                          {venue.image_url && (
                            <div className="relative w-full h-40 rounded-xl overflow-hidden mt-2 border border-white/5">
                              <img src={venue.image_url} alt={venue.name} className="object-cover w-full h-full" />
                            </div>
                          )}
                          <p className="text-white/60 text-xs leading-relaxed font-medium mt-2">
                            {venue.description || 'No visual brochure description added.'}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/5 pt-4">
                            <div>
                              <p className="text-[9px] font-bold text-white/30 uppercase">Morning</p>
                              <p className="text-sm font-black text-white font-mono mt-0.5">KES {venue.hourly_rates?.morning || 0}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-white/30 uppercase">Off-Peak</p>
                              <p className="text-sm font-black text-white font-mono mt-0.5">KES {venue.hourly_rates?.off_peak || 0}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-white/30 uppercase">Peak Hour</p>
                              <p className="text-sm font-black text-gold font-mono mt-0.5">KES {venue.hourly_rates?.peak || 0}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-white/30 uppercase">Weekend</p>
                              <p className="text-sm font-black text-gold font-mono mt-0.5">KES {venue.hourly_rates?.weekend || 0}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Slot Generator Tool */}
          <section className="glass rounded-[2rem] border border-white/5 overflow-hidden shadow-pitch">
            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-gold/15 border border-gold/30 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h2 className="text-xl font-display font-extrabold text-white uppercase italic tracking-tight">Hourly Slot Generation Engine</h2>
                <p className="text-[10px] font-black uppercase tracking-wider text-gold mt-0.5">Generate daily booking schedules (6:00 AM to 11:00 PM)</p>
              </div>
            </div>

            <div className="p-8 text-left">
              <form onSubmit={handleRunGenerator} className="space-y-6">
                <div className="bg-gold/5 border border-gold/10 p-5 rounded-2xl flex items-start gap-3">
                  <Activity className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                  <p className="text-xs text-charcoal-light leading-relaxed font-medium">
                    This utility generates bookable slots with standard 15-minute intervals between games. It calls the database-level SECURE generator, which automatically attributes corresponding peak, off-peak, weekend, and morning pricing tiers to each slot. Existing slots are skipped to prevent duplicate overrides.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gold flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Start Date
                    </label>
                    <input 
                      type="date" 
                      required
                      value={generatorForm.startDate}
                      onChange={(e) => setGeneratorForm({ ...generatorForm, startDate: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gold flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> End Date
                    </label>
                    <input 
                      type="date" 
                      required
                      value={generatorForm.endDate}
                      onChange={(e) => setGeneratorForm({ ...generatorForm, endDate: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-bold text-sm"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={generatorStatus.status === 'generating'}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 spring-bounce hover:scale-[1.01] active:scale-[0.99] uppercase text-sm tracking-[0.15em] disabled:opacity-50"
                >
                  {generatorStatus.status === 'generating' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-forest" />
                      GENERATING GRID SLOTS...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 text-forest stroke-[2.5px]" /> GENERATE TIME SLOTS
                    </>
                  )}
                </button>
              </form>

              {/* Progress Console */}
              {generatorStatus.status !== 'idle' && (
                <div className="mt-8 border border-white/5 rounded-2xl p-6 bg-white/[0.01] space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {generatorStatus.status === 'generating' && <Loader2 className="w-4 h-4 text-gold animate-spin" />}
                      {generatorStatus.status === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                      {generatorStatus.status === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      <span className="text-xs font-bold uppercase tracking-wider text-white">{generatorStatus.message}</span>
                    </div>
                    {generatorStatus.status === 'generating' && (
                      <span className="text-xs font-mono font-bold text-gold">
                        {Math.round((generatorStatus.progress / generatorStatus.total) * 100)}%
                      </span>
                    )}
                  </div>

                  {generatorStatus.status === 'generating' && (
                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-gold to-gold-muted transition-all duration-300 rounded-full" 
                        style={{ width: `${(generatorStatus.progress / generatorStatus.total) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Right Column: Audit Logs Viewer */}
        <div className="lg:col-span-5">
          <section className="glass rounded-[2rem] border border-white/5 overflow-hidden shadow-pitch">
            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-gold/15 border border-gold/30 rounded-xl flex items-center justify-center">
                <History className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h2 className="text-xl font-display font-extrabold text-white uppercase italic tracking-tight">Audit Log Ledger</h2>
                <p className="text-[10px] font-black uppercase tracking-wider text-gold mt-0.5">Logs tracked by public.venue_change_logs</p>
              </div>
            </div>

            <div className="p-8 text-left">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="w-6 h-6 text-gold animate-spin" />
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Loading audit logs...</p>
                </div>
              ) : changeLogs.length === 0 ? (
                <div className="text-center py-12 text-white/30 border border-dashed border-white/5 rounded-2xl p-6">
                  <FileText className="w-12 h-12 text-white/10 mx-auto mb-3" />
                  <p className="text-xs font-bold uppercase tracking-wider">No audit logs logged yet</p>
                  <p className="text-[10px] text-white/20 mt-1">Changes made to rates will automatically stream here.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
                  {changeLogs.map(log => {
                    const dateFormatted = new Date(log.changed_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
                    const isRatesChanged = log.previous_rates && log.new_rates;
                    const isDetailsChanged = JSON.stringify(log.previous_details) !== JSON.stringify(log.new_details);
                    
                    const hasNameChanged = log.previous_details?.name !== log.new_details?.name;
                    const hasTypeChanged = log.previous_details?.type !== log.new_details?.type;
                    const hasDescChanged = log.previous_details?.description !== log.new_details?.description;
                    
                    return (
                      <div key={log.id} className="p-4 border border-white/5 rounded-xl bg-white/[0.01] space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="text-xs font-bold text-white">
                              {log.staff?.name || 'System Auto'}
                            </p>
                            <p className="text-[9px] text-white/30 font-medium">
                              {dateFormatted}
                            </p>
                          </div>
                          <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-gold/10 text-gold border border-gold/25 rounded-md">
                            Change Log
                          </span>
                        </div>

                        {isRatesChanged && log.new_rates && (
                          <div className="bg-white/5 p-3 rounded-lg border border-white/5 text-[10px] font-mono space-y-1.5">
                            <p className="text-white/40 uppercase font-black tracking-wider border-b border-white/5 pb-1">Price Adjustments</p>
                            {Object.entries(log.new_rates).map(([tier, rate]: [string, any]) => {
                              const prev = log.previous_rates?.[tier] || 0;
                              if (prev === rate) return null;
                              return (
                                <div key={tier} className="flex justify-between items-center text-white/80">
                                  <span className="capitalize">{tier}:</span>
                                  <span>KES {prev} ➔ <span className="text-gold font-bold">{rate}</span></span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {isDetailsChanged && (
                          <div className="bg-white/5 p-3 rounded-lg border border-white/5 text-[10px] font-mono space-y-1.5 text-white/70">
                            <p className="text-white/40 uppercase font-black tracking-wider border-b border-white/5 pb-1">Venue Info Changes</p>
                            {hasNameChanged && (
                              <div className="flex justify-between items-center text-white/80">
                                <span>Name:</span>
                                <span>{log.previous_details?.name || 'None'} ➔ <span className="text-gold font-bold">{log.new_details?.name}</span></span>
                              </div>
                            )}
                            {hasTypeChanged && (
                              <div className="flex justify-between items-center text-white/80">
                                <span>Type:</span>
                                <span>{log.previous_details?.type || 'None'} ➔ <span className="text-gold font-bold">{log.new_details?.type}</span></span>
                              </div>
                            )}
                            {hasDescChanged && (
                              <div className="text-white/80 space-y-1">
                                <span>Description:</span>
                                <p className="line-clamp-2 text-white/50 leading-relaxed italic bg-white/5 p-1.5 rounded">
                                  {log.previous_details?.description || 'None'} ➔ <span className="text-gold font-bold">{log.new_details?.description}</span>
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
