'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Settings,
  MapPin,
  Clock,
  DollarSign,
  Edit2,
  Save,
  X,
  Loader2,
  ChevronRight,
  Building2,
  Phone,
  Mail,
  Globe,
  CheckCircle,
  Plus,
  Sunrise,
} from 'lucide-react';

type Venue = {
  id: number;
  name: string;
  type: 'turf' | 'meeting_room';
  hourly_rates: {
    morning?: number;
    off_peak?: number;
    peak?: number;
    weekend?: number;
  };
  created_at: string;
};

const BUSINESS_INFO = {
  name: 'Mountain View Sports Arena',
  shortName: 'MVSA',
  tagline: 'Home of Football and Fitness.',
  address: 'Nairobi, Kenya',
  whatsapp: '0798 258 950',
  arena: '0783 209 442',
  academy: '0116 619 476',
  email: 'info@mvsa.co.ke',
  website: 'www.mvsa.co.ke',
  instagram: 'https://instagram.com/mvsa',
  hours: {
    weekdays: '6:00 AM – 10:00 PM',
    weekends: '7:00 AM – 9:00 PM',
  },
};

export default function SettingsPage() {
  const supabase = createClient();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editVenue, setEditVenue] = useState<Venue | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editRates, setEditRates] = useState({ morning: 0, off_peak: 0, peak: 0, weekend: 0 });
  const [editName, setEditName] = useState('');

  const fetchVenues = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .order('id', { ascending: true });
    if (!error && data) setVenues(data as Venue[]);
    setIsLoading(false);
  };

  useEffect(() => { fetchVenues(); }, []);

  const openEdit = (venue: Venue) => {
    setEditVenue(venue);
    setEditName(venue.name);
    setEditRates({
      morning: venue.hourly_rates?.morning ?? 0,
      off_peak: venue.hourly_rates?.off_peak ?? 0,
      peak: venue.hourly_rates?.peak ?? 0,
      weekend: venue.hourly_rates?.weekend ?? 0,
    });
    setIsEditOpen(true);
    setSaveSuccess(false);
  };

  const handleSaveVenue = async () => {
    if (!editVenue) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('venues')
      .update({
        name: editName,
        hourly_rates: {
          morning: Number(editRates.morning),
          off_peak: Number(editRates.off_peak),
          peak: Number(editRates.peak),
          weekend: Number(editRates.weekend),
        },
      })
      .eq('id', editVenue.id);

    if (error) {
      alert('Error updating venue: ' + error.message);
    } else {
      setSaveSuccess(true);
      fetchVenues();
      setTimeout(() => {
        setIsEditOpen(false);
        setSaveSuccess(false);
      }, 1200);
    }
    setIsSaving(false);
  };

  const venueTypeLabel = (type: string) =>
    type === 'turf' ? 'Turf / Pitch' : 'Meeting Room';

  const venueTypeColor = (type: string) =>
    type === 'turf'
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-blue-100 text-blue-800 border-blue-200';

  return (
    <div className="flex flex-col flex-1 p-8 bg-surface/50 min-h-full">
      {/* Header */}
      <header className="mb-10 animate-slide-up">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-1 bg-gold rounded-full" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-forest/60">Configuration</span>
        </div>
        <h1 className="text-5xl font-display font-extrabold text-forest tracking-tighter leading-none">
          SETTINGS
        </h1>
        <p className="text-charcoal-light mt-2 font-medium">Manage venues, pricing, and arena configuration.</p>
      </header>

      <div className="space-y-8">
        {/* ── Venue Management ── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-forest/5 rounded-2xl flex items-center justify-center border border-forest/10">
                <MapPin className="w-5 h-5 text-forest" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl text-forest tracking-tight">Venue Management</h2>
                <p className="text-xs text-charcoal-light font-medium">Configure pitches, rooms, and hourly pricing</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse bg-white/60 rounded-[2rem] h-48 border border-white/20" />
              ))
            ) : venues.map((venue) => (
              <div key={venue.id} className="relative group overflow-hidden">
                <div className="absolute -inset-1 bg-gradient-to-br from-gold/15 to-forest/5 rounded-[2.2rem] blur opacity-0 group-hover:opacity-100 transition duration-700" />
                <div className="relative bg-white/70 backdrop-blur-md border border-white/20 p-7 rounded-[2rem] shadow-xl">
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border mb-2 ${venueTypeColor(venue.type)}`}>
                        <Building2 className="w-3 h-3" />
                        {venueTypeLabel(venue.type)}
                      </span>
                      <h3 className="font-display font-black text-xl text-forest tracking-tight leading-tight">
                        {venue.name}
                      </h3>
                    </div>
                    <button
                      onClick={() => openEdit(venue)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-forest/5 hover:bg-forest hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest text-forest transition-all border border-forest/10 hover:border-forest group/btn"
                    >
                      <Edit2 className="w-3.5 h-3.5 group-hover/btn:rotate-12 transition-transform" />
                      Edit
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Morning', value: venue.hourly_rates?.morning, icon: Sunrise },
                      { label: 'Off-Peak', value: venue.hourly_rates?.off_peak, icon: Clock },
                      { label: 'Peak', value: venue.hourly_rates?.peak, icon: DollarSign },
                      { label: 'Weekend', value: venue.hourly_rates?.weekend, icon: DollarSign },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="bg-forest/3 border border-forest/8 rounded-2xl p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Icon className="w-3 h-3 text-forest/40" />
                          <span className="text-[8px] font-black uppercase tracking-wider text-forest/40">{label}</span>
                        </div>
                        <p className="font-display font-black text-forest text-xs tracking-tight">
                          {value ? `KES ${Number(value).toLocaleString()}` : <span className="text-forest/30 italic text-[10px]">Not set</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Business Information ── */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gold/10 rounded-2xl flex items-center justify-center border border-gold/20">
              <Building2 className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-forest tracking-tight">Business Information</h2>
              <p className="text-xs text-charcoal-light font-medium">Arena contact details and operating hours</p>
            </div>
          </div>

          <div className="relative group overflow-hidden">
            <div className="absolute -inset-1 bg-gradient-to-r from-gold/15 to-transparent rounded-[2.2rem] blur opacity-20" />
            <div className="relative bg-white/70 backdrop-blur-md border border-white/20 p-8 rounded-[2rem] shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Contact */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-forest/50 mb-3 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" /> Contact
                  </h3>
                  {[
                    { label: 'WhatsApp / Bookings', value: BUSINESS_INFO.whatsapp },
                    { label: 'Arena Line', value: BUSINESS_INFO.arena },
                    { label: 'Academy Line', value: BUSINESS_INFO.academy },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-3 border-b border-forest/5">
                      <span className="text-xs font-bold text-charcoal-light uppercase tracking-wider">{label}</span>
                      <span className="font-bold text-forest">{value}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-3 border-b border-forest/5">
                    <span className="text-xs font-bold text-charcoal-light uppercase tracking-wider flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</span>
                    <span className="font-bold text-forest">{BUSINESS_INFO.email}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-xs font-bold text-charcoal-light uppercase tracking-wider flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Website</span>
                    <span className="font-bold text-forest">{BUSINESS_INFO.website}</span>
                  </div>
                </div>

                {/* Hours */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-forest/50 mb-3 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> Operating Hours
                  </h3>
                  {[
                    { label: 'Mon – Fri', value: BUSINESS_INFO.hours.weekdays },
                    { label: 'Sat – Sun', value: BUSINESS_INFO.hours.weekends },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-3 border-b border-forest/5">
                      <span className="text-xs font-bold text-charcoal-light uppercase tracking-wider">{label}</span>
                      <span className="font-bold text-forest">{value}</span>
                    </div>
                  ))}

                  {/* Tagline */}
                  <div className="mt-6 p-5 bg-forest rounded-2xl text-white">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/50 mb-2">Arena Tagline</p>
                    <p className="font-display font-black text-lg italic leading-tight">&ldquo;{BUSINESS_INFO.tagline}&rdquo;</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-forest/10 flex items-center gap-3">
                <div className="w-8 h-8 bg-gold/10 rounded-xl flex items-center justify-center">
                  <Settings className="w-4 h-4 text-gold" />
                </div>
                <p className="text-xs text-charcoal-light font-medium">
                  To update contact details or operating hours, edit the <code className="text-xs bg-forest/5 px-1 py-0.5 rounded font-mono text-forest">BUSINESS_INFO</code> constant in{' '}
                  <code className="text-xs bg-forest/5 px-1 py-0.5 rounded font-mono text-forest">src/app/(authenticated)/settings/page.tsx</code>
                  , then redeploy.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Mpesa Config Notice ── */}
        <section>
          <div className="relative overflow-hidden bg-forest rounded-[2rem] p-8 text-white shadow-xl shadow-forest/20">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5" />
            <div className="relative z-10 flex items-start gap-5">
              <div className="w-12 h-12 bg-gold/20 rounded-2xl flex items-center justify-center border border-gold/30 shrink-0 mt-1">
                <DollarSign className="w-6 h-6 text-gold" />
              </div>
              <div>
                <h3 className="font-display font-black text-xl italic tracking-tight mb-2">M-Pesa Integration</h3>
                <p className="text-white/70 text-sm font-medium leading-relaxed">
                  M-Pesa STK Push is configured via Supabase Edge Functions and environment variables. To update your Safaricom Daraja credentials, update the following variables in your Supabase project:
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY', 'MPESA_CALLBACK_URL'].map(v => (
                    <code key={v} className="text-[11px] bg-white/10 border border-white/10 px-2.5 py-1 rounded-lg font-mono text-gold">
                      {v}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Edit Venue Modal */}
      {isEditOpen && editVenue && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-border-color flex justify-between items-center bg-forest text-white">
              <div>
                <h2 className="text-2xl font-display font-bold italic tracking-tight">EDIT VENUE</h2>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">Pricing & Name</p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted">Venue Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border-color bg-surface focus:outline-none focus:ring-2 focus:ring-gold/50 font-bold text-sm"
                />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted mb-4">Hourly Rates (KES)</p>
                <div className="space-y-3">
                  {[
                    { key: 'morning' as const, label: 'Morning Rate', hint: 'Weekday 8:00 AM – 12:00 PM' },
                    { key: 'off_peak' as const, label: 'Off-Peak Rate', hint: 'Weekday 12:00 PM – 6:00 PM' },
                    { key: 'peak' as const, label: 'Peak Rate', hint: 'Weekday evenings & weekend all-day' },
                    { key: 'weekend' as const, label: 'Weekend Rate (Legacy)', hint: 'Saturday & Sunday' },
                  ].map(({ key, label, hint }) => (
                    <div key={key} className="flex items-center gap-4 p-4 bg-surface rounded-2xl border border-border-color">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-forest">{label}</p>
                        <p className="text-[10px] text-charcoal-light">{hint}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-charcoal-light">KES</span>
                        <input
                          type="number"
                          value={editRates[key]}
                          onChange={(e) => setEditRates({ ...editRates, [key]: Number(e.target.value) })}
                          className="w-24 px-3 py-2 text-right rounded-xl border border-border-color bg-white focus:outline-none focus:ring-2 focus:ring-gold/50 font-display font-bold text-forest text-lg"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSaveVenue}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-3 bg-gold text-forest px-8 py-4 rounded-2xl font-bold text-sm tracking-[0.2em] uppercase transition-all shadow-xl shadow-gold/20 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> SAVING...</>
                ) : saveSuccess ? (
                  <><CheckCircle className="w-5 h-5" /> SAVED!</>
                ) : (
                  <><Save className="w-5 h-5" /> SAVE VENUE <ChevronRight className="w-5 h-5" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
