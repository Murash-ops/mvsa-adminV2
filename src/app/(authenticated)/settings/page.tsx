'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { format } from 'date-fns';
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
  Edit3,
  Sparkles,
  User,
  Lock,
  Eye,
  Palette,
  SunMoon,
  Bell,
  MessageSquare,
  ShieldCheck,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Calendar,
  RefreshCw
} from 'lucide-react';

const Instagram = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const Facebook = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

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

export default function SettingsPage() {
  const supabase = createClient();
  const { staff, user } = useAuth();

  // Selected active tab state
  const [activeTab, setActiveTab] = useState<string>('account');

  // Loading & Saving States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // 1. Facility Settings State
  const [facilityName, setFacilityName] = useState('');
  const [facilityTagline, setFacilityTagline] = useState('');
  const [facilityDescription, setFacilityDescription] = useState('');
  const [phonePrimary, setPhonePrimary] = useState('');
  const [phoneSecondary, setPhoneSecondary] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [openTime, setOpenTime] = useState('06:00');
  const [closeTime, setCloseTime] = useState('23:00');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [facebookPage, setFacebookPage] = useState('');

  // 2. Booking Settings State
  const [depositEnforced, setDepositEnforced] = useState(true);
  const [depositValue, setDepositValue] = useState<number>(50);
  const [depositType, setDepositType] = useState<'percentage' | 'fixed'>('percentage');
  const [slotDuration, setSlotDuration] = useState<number>(60);
  const [bookingWindowDays, setBookingWindowDays] = useState<number>(30);
  const [cancellationPolicy, setCancellationPolicy] = useState('');

  // 3. Notification Settings State
  const [smsSender, setSmsSender] = useState('MVSA');
  const [autoSmsConfirmation, setAutoSmsConfirmation] = useState(true);
  const [autoSmsPayment, setAutoSmsPayment] = useState(true);
  const [autoSmsReminder, setAutoSmsReminder] = useState(true);
  const [reminderLeadTime, setReminderLeadTime] = useState<number>(2);

  // 4. Appearance Settings State
  const [darkMode, setDarkMode] = useState(true);
  const [logoUrl, setLogoUrl] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');

  // 5. Account Settings State
  const [accountName, setAccountName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 6. Venue Management State (Legacy/Pre-existing Rate Configuration)
  const [venues, setVenues] = useState<Venue[]>([]);
  const [editVenue, setEditVenue] = useState<Venue | null>(null);
  const [isEditVenueOpen, setIsEditVenueOpen] = useState(false);
  const [editVenueRates, setEditVenueRates] = useState({ morning: 0, off_peak: 0, peak: 0, weekend: 0 });
  const [editVenueName, setEditVenueName] = useState('');

  // 7. Homepage Content Settings State
  const [heroHeadline, setHeroHeadline] = useState('');
  const [heroSubheading, setHeroSubheading] = useState('');
  const [heroTextAboveCta, setHeroTextAboveCta] = useState('');
  const [heroImageUrlContent, setHeroImageUrlContent] = useState('');
  const [closingCtaHeadline, setClosingCtaHeadline] = useState('');
  const [instagramHandleContent, setInstagramHandleContent] = useState('');
  const [tiktokHandleContent, setTiktokHandleContent] = useState('');
  
  const [trustCard1Title, setTrustCard1Title] = useState('');
  const [trustCard1Desc, setTrustCard1Desc] = useState('');
  const [trustCard2Title, setTrustCard2Title] = useState('');
  const [trustCard2Desc, setTrustCard2Desc] = useState('');
  const [trustCard3Title, setTrustCard3Title] = useState('');
  const [trustCard3Desc, setTrustCard3Desc] = useState('');

  // 8. Programs Content Settings State
  const [allPrograms, setAllPrograms] = useState<any[]>([]);
  const [selectedProgId, setSelectedProgId] = useState<number | ''>('');
  const [progName, setProgName] = useState('');
  const [progDescription, setProgDescription] = useState('');
  const [progSchedule, setProgSchedule] = useState('');
  const [progAgeGroup, setProgAgeGroup] = useState('');
  const [progPosterUrl, setProgPosterUrl] = useState('');
  const [progIsActive, setProgIsActive] = useState(true);
  const [progWhatsappMessage, setProgWhatsappMessage] = useState('');
  const [progPosterFile, setProgPosterFile] = useState<File | null>(null);
  
  const [contentSubTab, setContentSubTab] = useState<'homepage' | 'programs'>('homepage');

  // 9. Audit Logs State (super_admin only)
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilterAction, setAuditFilterAction] = useState('all');
  const [auditFilterStaff, setAuditFilterStaff] = useState('all');
  const [auditFilterDate, setAuditFilterDate] = useState('all');
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  // Role permissions checking
  const userRole = (staff?.role as string) || '';
  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'super_admin' || userRole === 'admin' || userRole === 'boss' || userRole === 'receptionist' || userRole === 'academy_coo';

  // Auto-fill program edit form when program selected
  useEffect(() => {
    if (selectedProgId) {
      const prog = allPrograms.find(p => p.id === Number(selectedProgId));
      if (prog) {
        setProgName(prog.name || '');
        setProgDescription(prog.description || '');
        setProgSchedule(prog.schedule || '');
        setProgAgeGroup(prog.age_group || '');
        setProgPosterUrl(prog.poster_url || '');
        setProgIsActive(prog.is_active !== false);
        setProgWhatsappMessage(prog.whatsapp_message || '');
        setProgPosterFile(null);
      }
    } else {
      setProgName('');
      setProgDescription('');
      setProgSchedule('');
      setProgAgeGroup('');
      setProgPosterUrl('');
      setProgIsActive(true);
      setProgWhatsappMessage('');
      setProgPosterFile(null);
    }
  }, [selectedProgId, allPrograms]);

  // Load all settings from Database on mount
  const loadAllSettings = async () => {
    setIsLoading(true);
    try {
      // Fetch all site configuration records
      const { data, error } = await supabase.from('site_content').select('*');
      if (!error && data) {
        // Parse facility settings
        const facilityRow = data.find((r: any) => r.key === 'facility_settings');
        if (facilityRow?.value) {
          const v = facilityRow.value;
          setFacilityName(v.name || '');
          setFacilityTagline(v.tagline || '');
          setFacilityDescription(v.description || '');
          setPhonePrimary(v.phone_primary || '');
          setPhoneSecondary(v.phone_secondary || '');
          setWhatsapp(v.whatsapp || '');
          setEmail(v.email || '');
          setAddress(v.address || '');
          setOpenTime(v.open_time || '06:00');
          setCloseTime(v.close_time || '23:00');
          setInstagramHandle(v.instagram || '');
          setFacebookPage(v.facebook || '');
        }

        // Parse booking settings
        const bookingRow = data.find((r: any) => r.key === 'booking_settings');
        if (bookingRow?.value) {
          const v = bookingRow.value;
          setDepositEnforced(v.deposit_enforced !== false);
          setDepositValue(v.deposit_value || 50);
          setDepositType(v.deposit_type || 'percentage');
          setSlotDuration(v.slot_duration || 60);
          setBookingWindowDays(v.booking_window_days || 30);
          setCancellationPolicy(v.cancellation_policy || '');
        }

        // Parse notification settings
        const notificationRow = data.find((r: any) => r.key === 'notification_settings');
        if (notificationRow?.value) {
          const v = notificationRow.value;
          setSmsSender(v.sms_sender || 'MVSA');
          setAutoSmsConfirmation(v.auto_sms_confirmation !== false);
          setAutoSmsPayment(v.auto_sms_payment !== false);
          setAutoSmsReminder(v.auto_sms_reminder !== false);
          setReminderLeadTime(v.reminder_lead_time_hours || 2);
        }

        // Parse appearance settings
        const appearanceRow = data.find((r: any) => r.key === 'appearance_settings');
        if (appearanceRow?.value) {
          const v = appearanceRow.value;
          setDarkMode(v.dark_mode !== false);
          setLogoUrl(v.logo_url || '');
          setHeroImageUrl(v.hero_image_url || '');
        }

        // Parse homepage content settings
        const homepageRow = data.find((r: any) => r.key === 'homepage_content');
        if (homepageRow?.value) {
          const v = homepageRow.value;
          setHeroHeadline(v.hero_headline || '');
          setHeroSubheading(v.hero_subheading || '');
          setHeroTextAboveCta(v.hero_text_above_cta || '');
          setHeroImageUrlContent(v.hero_image_url || '');
          setClosingCtaHeadline(v.closing_cta_headline || '');
          setInstagramHandleContent(v.instagram || '');
          setTiktokHandleContent(v.tiktok || '');
          
          setTrustCard1Title(v.trust_card_1_title || '');
          setTrustCard1Desc(v.trust_card_1_desc || '');
          setTrustCard2Title(v.trust_card_2_title || '');
          setTrustCard2Desc(v.trust_card_2_desc || '');
          setTrustCard3Title(v.trust_card_3_title || '');
          setTrustCard3Desc(v.trust_card_3_desc || '');
        }
      }

      // Load venues
      const { data: venuesData } = await supabase
        .from('venues')
        .select('*')
        .order('id', { ascending: true });
      if (venuesData) {
        setVenues(venuesData as Venue[]);
      }

      // Load programs for Content Management
      const { data: programsData } = await supabase
        .from('programs')
        .select('*')
        .order('id', { ascending: true });
      if (programsData) {
        setAllPrograms(programsData);
      }
    } catch (err: any) {
      console.error('Error loading settings from DB:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllSettings();
  }, []);

  // Update profile states when Auth state loads
  useEffect(() => {
    if (staff) {
      setAccountName(staff.name || '');
      // Auto redirect active tab based on role permissions
      if (isSuperAdmin) {
        setActiveTab('facility');
      } else if (isAdmin) {
        setActiveTab('notification');
      } else {
        setActiveTab('account');
      }
    }
  }, [staff]);

  // Tab configurations dynamically checked
  const navTabs = [
    { id: 'facility', label: 'Facility Profile', icon: Building2, visible: isSuperAdmin },
    { id: 'venues', label: 'Venue Pricing', icon: MapPin, visible: isSuperAdmin },
    { id: 'booking', label: 'Booking Rules', icon: Clock, visible: isSuperAdmin },
    { id: 'notification', label: 'SMS & Alerts', icon: Bell, visible: isAdmin },
    { id: 'appearance', label: 'Appearance & Brand', icon: Palette, visible: isSuperAdmin },
    { id: 'content', label: 'Content Management', icon: Sparkles, visible: isSuperAdmin },
    { id: 'audit', label: 'Audit Log', icon: ShieldCheck, visible: isSuperAdmin },
    { id: 'account', label: 'Account & Security', icon: User, visible: true },
  ];

  // Load Audit Logs (super_admin only)
  const loadAuditLogs = async () => {
    if (!isSuperAdmin) return;
    setIsAuditLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select(`
          id,
          action,
          entity_table,
          entity_id,
          performed_by,
          details,
          created_at,
          staff:performed_by (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (err: any) {
      console.error('Error loading audit logs:', err.message);
    } finally {
      setIsAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit' && isSuperAdmin) {
      loadAuditLogs();
    }
  }, [activeTab, isSuperAdmin]);

  // Audit log client-side filters
  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesSearch = auditSearch.trim() === '' || 
      log.action?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.entity_table?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.entity_id?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.staff?.name?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(auditSearch.toLowerCase());

    const matchesAction = auditFilterAction === 'all' || log.action === auditFilterAction;

    const matchesStaff = auditFilterStaff === 'all' || log.performed_by === auditFilterStaff;

    let matchesDate = true;
    if (auditFilterDate !== 'all') {
      const logDate = new Date(log.created_at);
      const now = new Date();
      const diffMs = now.getTime() - logDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (auditFilterDate === 'today') {
        matchesDate = diffDays <= 1;
      } else if (auditFilterDate === 'week') {
        matchesDate = diffDays <= 7;
      } else if (auditFilterDate === 'month') {
        matchesDate = diffDays <= 30;
      }
    }

    return matchesSearch && matchesAction && matchesStaff && matchesDate;
  });

  const uniqueActions = Array.from(new Set(auditLogs.map(log => log.action))).filter(Boolean);
  
  const uniqueStaff = Array.from(
    new Map<string, string>(
      auditLogs
        .map(log => [log.performed_by, log.staff?.name] as [string, string])
        .filter(([id, name]) => id && name)
    ).entries()
  );

  const getActionBadgeStyle = (action: string) => {
    if (action.includes('confirm') || action.includes('approve') || action.includes('paid')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10';
    }
    if (action.includes('cancel') || action.includes('delete')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/10';
    }
    if (action.includes('create') || action.includes('add')) {
      return 'bg-sky-500/10 text-sky-400 border-sky-500/10';
    }
    if (action.includes('edit') || action.includes('change') || action.includes('update')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/10';
    }
    return 'bg-white/5 text-white/50 border-white/5';
  };

  // 1. Save Facility Profile Settings
  const handleSaveFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    try {
      const { error } = await supabase
        .from('site_content')
        .upsert({
          key: 'facility_settings',
          value: {
            name: facilityName,
            tagline: facilityTagline,
            description: facilityDescription,
            phone_primary: phonePrimary,
            phone_secondary: phoneSecondary,
            whatsapp: whatsapp,
            email: email,
            address: address,
            open_time: openTime,
            close_time: closeTime,
            instagram: instagramHandle,
            facebook: facebookPage
          },
          updated_by: user?.id
        });
      if (error) throw error;
      setSaveSuccess('facility');
      setTimeout(() => setSaveSuccess(null), 2000);
    } catch (err: any) {
      alert('Error updating facility profile: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Save Booking Rules
  const handleSaveBookingSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    try {
      const { error } = await supabase
        .from('site_content')
        .upsert({
          key: 'booking_settings',
          value: {
            deposit_enforced: depositEnforced,
            deposit_value: Number(depositValue),
            deposit_type: depositType,
            slot_duration: Number(slotDuration),
            booking_window_days: Number(bookingWindowDays),
            cancellation_policy: cancellationPolicy
          },
          updated_by: user?.id
        });
      if (error) throw error;
      setSaveSuccess('booking');
      setTimeout(() => setSaveSuccess(null), 2000);
    } catch (err: any) {
      alert('Error updating booking rules: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Save Notification Settings
  const handleSaveNotificationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    try {
      const { error } = await supabase
        .from('site_content')
        .upsert({
          key: 'notification_settings',
          value: {
            sms_sender: smsSender,
            auto_sms_confirmation: autoSmsConfirmation,
            auto_sms_payment: autoSmsPayment,
            auto_sms_reminder: autoSmsReminder,
            reminder_lead_time_hours: Number(reminderLeadTime)
          },
          updated_by: user?.id
        });
      if (error) throw error;
      setSaveSuccess('notification');
      setTimeout(() => setSaveSuccess(null), 2000);
    } catch (err: any) {
      alert('Error updating notifications: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Save Appearance Settings
  const handleSaveAppearance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    try {
      const { error } = await supabase
        .from('site_content')
        .upsert({
          key: 'appearance_settings',
          value: {
            dark_mode: darkMode,
            logo_url: logoUrl,
            hero_image_url: heroImageUrl
          },
          updated_by: user?.id
        });
      if (error) throw error;
      setSaveSuccess('appearance');
      setTimeout(() => setSaveSuccess(null), 2000);
    } catch (err: any) {
      alert('Error updating appearance: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Save Account Settings (Updates profile name and Auth password)
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    try {
      // A. Update display name in staff table
      if (user?.id) {
        const { error: staffError } = await supabase
          .from('staff')
          .update({ name: accountName })
          .eq('id', user.id);
        if (staffError) throw staffError;
      }

      // B. Update password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          alert('Passwords do not match!');
          setIsSaving(false);
          return;
        }
        const { error: authError } = await supabase.auth.updateUser({
          password: newPassword
        });
        if (authError) throw authError;
        setNewPassword('');
        setConfirmPassword('');
      }

      setSaveSuccess('account');
      setTimeout(() => setSaveSuccess(null), 2000);
    } catch (err: any) {
      alert('Error updating account credentials: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Save Homepage dynamic content in site_content table
  const handleSaveHomepageContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    try {
      const { error } = await supabase
        .from('site_content')
        .upsert({
          key: 'homepage_content',
          value: {
            hero_headline: heroHeadline,
            hero_subheading: heroSubheading,
            hero_text_above_cta: heroTextAboveCta,
            hero_image_url: heroImageUrlContent,
            closing_cta_headline: closingCtaHeadline,
            instagram: instagramHandleContent,
            tiktok: tiktokHandleContent,
            trust_card_1_title: trustCard1Title,
            trust_card_1_desc: trustCard1Desc,
            trust_card_2_title: trustCard2Title,
            trust_card_2_desc: trustCard2Desc,
            trust_card_3_title: trustCard3Title,
            trust_card_3_desc: trustCard3Desc
          },
          updated_by: user?.id
        });
      if (error) throw error;
      setSaveSuccess('homepage_content');
      setTimeout(() => setSaveSuccess(null), 2000);
    } catch (err: any) {
      alert('Error saving homepage content: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Save/Update Program records in programs table
  const handleSaveProgramContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgId) return;
    setIsSaving(true);
    setSaveSuccess(null);

    try {
      let poster_url = progPosterUrl;

      if (progPosterFile) {
        const fileExt = progPosterFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `posters/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('program-assets')
          .upload(filePath, progPosterFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('program-assets')
          .getPublicUrl(filePath);
        
        poster_url = publicUrl;
      }

      const { error } = await supabase
        .from('programs')
        .update({
          name: progName,
          description: progDescription,
          schedule: progSchedule,
          age_group: progAgeGroup,
          poster_url,
          is_active: progIsActive,
          whatsapp_message: progWhatsappMessage
        })
        .eq('id', selectedProgId);

      if (error) throw error;

      setSaveSuccess('program_content');
      
      // Reload programs
      const { data } = await supabase
        .from('programs')
        .select('*')
        .order('id', { ascending: true });
      if (data) setAllPrograms(data);

      setTimeout(() => setSaveSuccess(null), 2000);
    } catch (err: any) {
      alert('Error updating program content: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Legacy Venue rate editor save
  const openEditVenue = (venue: Venue) => {
    setEditVenue(venue);
    setEditVenueName(venue.name);
    setEditVenueRates({
      morning: venue.hourly_rates?.morning ?? 0,
      off_peak: venue.hourly_rates?.off_peak ?? 0,
      peak: venue.hourly_rates?.peak ?? 0,
      weekend: venue.hourly_rates?.weekend ?? 0,
    });
    setIsEditVenueOpen(true);
    setSaveSuccess(null);
  };

  const handleSaveVenue = async () => {
    if (!editVenue) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('venues')
        .update({
          name: editVenueName,
          hourly_rates: {
            morning: Number(editVenueRates.morning),
            off_peak: Number(editVenueRates.off_peak),
            peak: Number(editVenueRates.peak),
            weekend: Number(editVenueRates.weekend),
          },
        })
        .eq('id', editVenue.id);

      if (error) throw error;
      setSaveSuccess('venues');
      
      // Reload venues
      const { data } = await supabase
        .from('venues')
        .select('*')
        .order('id', { ascending: true });
      if (data) setVenues(data as Venue[]);

      setTimeout(() => {
        setIsEditVenueOpen(false);
        setSaveSuccess(null);
      }, 1200);
    } catch (err: any) {
      alert('Error updating venue rates: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6 lg:p-10 animate-entrance min-h-full">
      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-1 bg-gold rounded-full" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">Control Panel</span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tighter leading-none italic uppercase">
          SETTINGS
        </h1>
        <p className="text-white/40 text-sm font-medium mt-1">Configure facility profile, booking policies, SMS alerts, and account security.</p>
      </header>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-12 h-12 text-gold animate-spin stroke-[1.5px]" />
          <p className="text-white/40 text-sm font-bold uppercase tracking-wider font-mono">Synchronizing Settings...</p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* LEFT SIDEBAR NAVIGATION */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-1.5 bg-charcoal/20 border border-white/5 p-2 rounded-[1.5rem]">
            {navTabs
              .filter(t => t.visible)
              .map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSaveSuccess(null);
                    }}
                    className={`
                      w-full flex items-center gap-3.5 px-5 py-4 rounded-2xl border text-sm font-bold transition-all text-left spring-bounce
                      ${isActive
                        ? 'bg-gradient-to-r from-gold/15 to-gold-muted/5 border-gold/40 text-gold shadow-gold-sm hover:scale-[1.01]'
                        : 'bg-transparent border-transparent text-white/50 hover:bg-white/5 hover:text-white'
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-gold' : 'text-white/35'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
          </div>

          {/* MAIN FORM AREA */}
          <div className="flex-1 w-full relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-gold/10 to-gold-muted/5 rounded-[2.5rem] blur opacity-25" />
            
            <div className="relative glass border border-white/10 p-8 rounded-[2rem] shadow-pitch bg-charcoal/40 text-left">
              
              {/* --- SECTION 1: FACILITY PROFILE (super_admin) --- */}
              {activeTab === 'facility' && isSuperAdmin && (
                <form onSubmit={handleSaveFacility} className="space-y-6">
                  <div>
                    <h2 className="font-display font-black text-2xl text-white uppercase italic tracking-tight">Facility Identity</h2>
                    <p className="text-white/40 text-xs mt-0.5">Define core branding metadata mapped to site_content.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Facility Name</label>
                      <input
                        type="text"
                        required
                        value={facilityName}
                        onChange={(e) => setFacilityName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Motto / Tagline</label>
                      <input
                        type="text"
                        required
                        value={facilityTagline}
                        onChange={(e) => setFacilityTagline(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Short Facility Description</label>
                    <textarea
                      required
                      rows={3}
                      value={facilityDescription}
                      onChange={(e) => setFacilityDescription(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-medium resize-none leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Primary Phone Number</label>
                      <input
                        type="text"
                        required
                        value={phonePrimary}
                        onChange={(e) => setPhonePrimary(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Secondary Phone Number</label>
                      <input
                        type="text"
                        value={phoneSecondary}
                        onChange={(e) => setPhoneSecondary(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gold uppercase tracking-wider">WhatsApp Contact Number</label>
                      <input
                        type="text"
                        required
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Official Email Address</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Physical Address</label>
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Opening Time</label>
                      <input
                        type="time"
                        required
                        value={openTime}
                        onChange={(e) => setOpenTime(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Closing Time</label>
                      <input
                        type="time"
                        required
                        value={closeTime}
                        onChange={(e) => setCloseTime(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-white/5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gold uppercase tracking-wider flex items-center gap-1.5">
                        <Instagram className="w-3.5 h-3.5" /> Instagram Handle
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. mvsa_turf"
                        value={instagramHandle}
                        onChange={(e) => setInstagramHandle(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gold uppercase tracking-wider flex items-center gap-1.5">
                        <Facebook className="w-3.5 h-3.5" /> Facebook Page
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. MountainViewArena"
                        value={facebookPage}
                        onChange={(e) => setFacebookPage(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 flex justify-between items-center gap-4">
                    <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest font-mono">
                      Database: site_content.facility_settings
                    </p>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-8 py-3.5 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-xl font-extrabold text-xs tracking-widest uppercase transition-all duration-300 shadow-gold-sm hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saveSuccess === 'facility' ? 'UPDATED SYSTEM!' : 'SAVE PROFILE'}
                    </button>
                  </div>
                </form>
              )}

              {/* --- SECTION 2: VENUE MANAGEMENT (super_admin) --- */}
              {activeTab === 'venues' && isSuperAdmin && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-display font-black text-2xl text-white uppercase italic tracking-tight">Arena Tiers</h2>
                    <p className="text-white/40 text-xs mt-0.5">Edit hourly rental rates and availability groups.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {venues.map(venue => (
                      <div key={venue.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all">
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[9px] font-black tracking-widest px-2.5 py-1 bg-gold/10 text-gold border border-gold/20 rounded-lg uppercase font-mono">
                              {venue.type === 'turf' ? 'Turf' : 'Meeting Room'}
                            </span>
                          </div>
                          <h3 className="font-display font-bold text-lg text-white uppercase">{venue.name}</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5 text-xs text-white/60">
                          <div>
                            <span className="text-[9px] text-white/30 block uppercase tracking-wider">Morning</span>
                            <span className="font-mono font-bold text-white">KES {Number(venue.hourly_rates?.morning || 0).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-white/30 block uppercase tracking-wider">Off-Peak</span>
                            <span className="font-mono font-bold text-white">KES {Number(venue.hourly_rates?.off_peak || 0).toLocaleString()}</span>
                          </div>
                          <div className="mt-2">
                            <span className="text-[9px] text-white/30 block uppercase tracking-wider">Peak</span>
                            <span className="font-mono font-bold text-white">KES {Number(venue.hourly_rates?.peak || 0).toLocaleString()}</span>
                          </div>
                          <div className="mt-2">
                            <span className="text-[9px] text-white/30 block uppercase tracking-wider">Weekend</span>
                            <span className="font-mono font-bold text-white">KES {Number(venue.hourly_rates?.weekend || 0).toLocaleString()}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => openEditVenue(venue)}
                          className="mt-6 w-full text-center py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-gold" /> Edit Rates
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* --- SECTION 3: BOOKING RULES (super_admin) --- */}
              {activeTab === 'booking' && isSuperAdmin && (
                <form onSubmit={handleSaveBookingSettings} className="space-y-6">
                  <div>
                    <h2 className="font-display font-black text-2xl text-white uppercase italic tracking-tight">Booking Constraints</h2>
                    <p className="text-white/40 text-xs mt-0.5">Control deposit values, windows, and cancellation rules.</p>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <span className="text-sm font-bold text-white block">Enforce Upfront Deposit</span>
                        <span className="text-xs text-white/45">Mandatory deposit verification required for public client bookings.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={depositEnforced}
                          onChange={(e) => setDepositEnforced(e.target.checked)}
                          className="sr-only peer cursor-pointer"
                        />
                        <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest" />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Deposit Value</label>
                      <input
                        type="number"
                        required
                        value={depositValue}
                        onChange={(e) => setDepositValue(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Deposit Value Type</label>
                      <select
                        value={depositType}
                        onChange={(e) => setDepositType(e.target.value as any)}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-bold"
                      >
                        <option value="percentage" className="bg-charcoal text-white">Percentage (%)</option>
                        <option value="fixed" className="bg-charcoal text-white">Fixed Amount (KES)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Default Slot Duration (mins)</label>
                      <input
                        type="number"
                        required
                        value={slotDuration}
                        onChange={(e) => setSlotDuration(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Booking Window Lead Days</label>
                    <input
                      type="number"
                      required
                      value={bookingWindowDays}
                      onChange={(e) => setBookingWindowDays(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-mono font-bold"
                    />
                    <p className="text-[10px] text-white/30">Number of calendar days ahead that clients are allowed to place reservations.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Cancellation & Refund Policy</label>
                    <textarea
                      required
                      rows={4}
                      value={cancellationPolicy}
                      onChange={(e) => setCancellationPolicy(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-medium resize-none leading-relaxed"
                    />
                  </div>

                  <div className="pt-6 border-t border-white/5 flex justify-between items-center gap-4">
                    <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest font-mono">
                      Database: site_content.booking_settings
                    </p>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-8 py-3.5 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-xl font-extrabold text-xs tracking-widest uppercase transition-all duration-300 shadow-gold-sm hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saveSuccess === 'booking' ? 'UPDATED SYSTEM!' : 'SAVE BOOKING RULES'}
                    </button>
                  </div>
                </form>
              )}

              {/* --- SECTION 4: NOTIFICATION SETTINGS (super_admin & admin) --- */}
              {activeTab === 'notification' && isAdmin && (
                <form onSubmit={handleSaveNotificationSettings} className="space-y-6">
                  <div>
                    <h2 className="font-display font-black text-2xl text-white uppercase italic tracking-tight">Outbound Comms</h2>
                    <p className="text-white/40 text-xs mt-0.5">Configure SMS gateway parameters and automated transactional notifications.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gold uppercase tracking-wider">SMS Sender ID</label>
                    <input
                      type="text"
                      required
                      value={smsSender}
                      onChange={(e) => setSmsSender(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-bold"
                    />
                    <p className="text-[10px] text-white/30">Your registered SMS header identifier (e.g. MVSA).</p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <span className="text-[10px] font-bold text-gold uppercase tracking-wider block mb-2">Automated Triggers</span>
                    
                    {[
                      { label: 'Booking Confirmation Alert', desc: 'Dispatch SMS receipt immediately when deposit or walk-in is logged.', state: autoSmsConfirmation, setter: setAutoSmsConfirmation },
                      { label: 'Payment Receipt Alert', desc: 'Dispatch transactional SMS receipt when any ledger payment is recorded.', state: autoSmsPayment, setter: setAutoSmsPayment },
                      { label: 'Balance Reminder Alert', desc: 'Dispatch automated reminder for pending balances before game slot.', state: autoSmsReminder, setter: setAutoSmsReminder },
                    ].map((smsOpt, idx) => (
                      <div key={idx} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl flex items-center justify-between">
                        <div className="text-left">
                          <span className="text-xs font-bold text-white block">{smsOpt.label}</span>
                          <span className="text-[10px] text-white/40">{smsOpt.desc}</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={smsOpt.state}
                            onChange={(e) => smsOpt.setter(e.target.checked)}
                            className="sr-only peer cursor-pointer"
                          />
                          <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest" />
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="text-[10px] font-bold text-gold uppercase tracking-wider block">Reminder Lead Time (Hours)</label>
                    <input
                      type="number"
                      required
                      value={reminderLeadTime}
                      onChange={(e) => setReminderLeadTime(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-mono font-bold animate-in"
                    />
                    <p className="text-[10px] text-white/30">Number of hours before a scheduled time slot to send the automatic balance reminder.</p>
                  </div>

                  <div className="pt-6 border-t border-white/5 flex justify-between items-center gap-4">
                    <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest font-mono">
                      Database: site_content.notification_settings
                    </p>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-8 py-3.5 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-xl font-extrabold text-xs tracking-widest uppercase transition-all duration-300 shadow-gold-sm hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saveSuccess === 'notification' ? 'UPDATED SYSTEM!' : 'SAVE NOTIFICATION RULES'}
                    </button>
                  </div>
                </form>
              )}

              {/* --- SECTION 5: APPEARANCE (super_admin) --- */}
              {activeTab === 'appearance' && isSuperAdmin && (
                <form onSubmit={handleSaveAppearance} className="space-y-6">
                  <div>
                    <h2 className="font-display font-black text-2xl text-white uppercase italic tracking-tight">Branding & Assets</h2>
                    <p className="text-white/40 text-xs mt-0.5">Configure light/dark configurations and visual asset URLs.</p>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <span className="text-sm font-bold text-white block">Enforce Admin Dark Mode</span>
                        <span className="text-xs text-white/45">Toggles between modern pitch charcoal theme and classical visual modes.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={darkMode}
                          onChange={(e) => setDarkMode(e.target.checked)}
                          className="sr-only peer cursor-pointer"
                        />
                        <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest" />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gold uppercase tracking-wider block">Official Facility Logo Asset URL</label>
                    <input
                      type="text"
                      required
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-mono font-bold"
                    />
                    <p className="text-[10px] text-white/30">Local asset path or external HTTPS link representing your vector/image logo.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gold uppercase tracking-wider block">Public Landing Hero Background Image URL</label>
                    <input
                      type="text"
                      required
                      value={heroImageUrl}
                      onChange={(e) => setHeroImageUrl(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-mono font-bold"
                    />
                    <p className="text-[10px] text-white/30">The central background image path displayed behind the main landing page hero.</p>
                  </div>

                  <div className="pt-6 border-t border-white/5 flex justify-between items-center gap-4">
                    <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest font-mono">
                      Database: site_content.appearance_settings
                    </p>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-8 py-3.5 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-xl font-extrabold text-xs tracking-widest uppercase transition-all duration-300 shadow-gold-sm hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saveSuccess === 'appearance' ? 'UPDATED BRAND!' : 'SAVE BRANDING'}
                    </button>
                  </div>
                </form>
              )}

              {/* --- SECTION 6: CONTENT MANAGEMENT (super_admin only) --- */}
              {activeTab === 'content' && isSuperAdmin && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-display font-black text-2xl text-white uppercase italic tracking-tight">Public Content Management</h2>
                    <p className="text-white/40 text-xs mt-0.5 font-medium">Update homepage components and customize active Youth Academy & Fitness program cards.</p>
                  </div>

                  {/* Sub-tabs switch */}
                  <div className="flex gap-2 border-b border-white/5 pb-4">
                    <button
                      type="button"
                      onClick={() => setContentSubTab('homepage')}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${contentSubTab === 'homepage' ? 'bg-gold/15 border-gold/30 text-gold shadow-gold-sm' : 'bg-transparent border-transparent text-white/50 hover:bg-white/5'}`}
                    >
                      Homepage Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentSubTab('programs')}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${contentSubTab === 'programs' ? 'bg-gold/15 border-gold/30 text-gold shadow-gold-sm' : 'bg-transparent border-transparent text-white/50 hover:bg-white/5'}`}
                    >
                      Programs Management
                    </button>
                  </div>

                  {/* SUB-TAB A: HOMEPAGE SETTINGS */}
                  {contentSubTab === 'homepage' && (
                    <form onSubmit={handleSaveHomepageContent} className="space-y-6 animate-entrance">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Hero Headline</label>
                          <input
                            type="text"
                            required
                            value={heroHeadline}
                            onChange={(e) => setHeroHeadline(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-bold"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Hero Image URL</label>
                          <input
                            type="text"
                            required
                            value={heroImageUrlContent}
                            onChange={(e) => setHeroImageUrlContent(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-mono font-bold"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Hero Subheading</label>
                        <textarea
                          required
                          rows={2}
                          value={heroSubheading}
                          onChange={(e) => setHeroSubheading(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-medium resize-none leading-relaxed"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Text Above CTAs</label>
                        <input
                          type="text"
                          required
                          value={heroTextAboveCta}
                          onChange={(e) => setHeroTextAboveCta(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-bold"
                        />
                      </div>

                      {/* Trust cards */}
                      <div className="border-t border-white/5 pt-4 space-y-4">
                        <span className="text-[10px] font-bold text-gold uppercase tracking-wider block">Trust Cards 1-3 (Dynamic Badges)</span>
                        <div className="space-y-4">
                          {[
                            { label: 'Trust Card 1 Title & Description', title: trustCard1Title, setTitle: setTrustCard1Title, desc: trustCard1Desc, setDesc: setTrustCard1Desc },
                            { label: 'Trust Card 2 Title & Description', title: trustCard2Title, setTitle: setTrustCard2Title, desc: trustCard2Desc, setDesc: setTrustCard2Desc },
                            { label: 'Trust Card 3 Title & Description', title: trustCard3Title, setTitle: setTrustCard3Title, desc: trustCard3Desc, setDesc: setTrustCard3Desc }
                          ].map((tc, idx) => (
                            <div key={idx} className="bg-white/2 border border-white/5 p-4 rounded-xl space-y-3">
                              <span className="text-[9px] text-white/40 font-bold uppercase">{tc.label}</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input
                                  type="text"
                                  placeholder="Card Title"
                                  value={tc.title}
                                  onChange={(e) => tc.setTitle(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-xs font-bold"
                                />
                                <input
                                  type="text"
                                  placeholder="Card Description"
                                  value={tc.desc}
                                  onChange={(e) => tc.setDesc(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-xs"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-4 border-t border-white/5">
                        <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Closing CTA Section Headline</label>
                        <input
                          type="text"
                          required
                          value={closingCtaHeadline}
                          onChange={(e) => setClosingCtaHeadline(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-white/5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Public Instagram Handle</label>
                          <input
                            type="text"
                            placeholder="e.g. mvsa_turf"
                            value={instagramHandleContent}
                            onChange={(e) => setInstagramHandleContent(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-bold"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Public TikTok Handle</label>
                          <input
                            type="text"
                            placeholder="e.g. mvsa_turf"
                            value={tiktokHandleContent}
                            onChange={(e) => setTiktokHandleContent(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-bold"
                          />
                        </div>
                      </div>

                      <div className="pt-6 border-t border-white/5 flex justify-between items-center gap-4">
                        <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest font-mono">
                          Database: site_content.homepage_content
                        </p>
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="px-8 py-3.5 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-xl font-extrabold text-xs tracking-widest uppercase transition-all duration-300 shadow-gold-sm hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center gap-2"
                        >
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          {saveSuccess === 'homepage_content' ? 'HOMEPAGE UPDATED!' : 'SAVE HOMEPAGE'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* SUB-TAB B: PROGRAMS MANAGEMENT */}
                  {contentSubTab === 'programs' && (
                    <form onSubmit={handleSaveProgramContent} className="space-y-6 animate-entrance">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gold uppercase tracking-wider block">Select Program to Modify</label>
                        <select
                          value={selectedProgId}
                          onChange={(e) => setSelectedProgId(e.target.value !== '' ? Number(e.target.value) : '')}
                          className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-gold font-bold text-sm text-white"
                        >
                          <option value="" className="bg-charcoal text-white">-- Select Program Group --</option>
                          {allPrograms.map(p => (
                            <option key={p.id} value={p.id.toString()} className="bg-charcoal text-white">{p.name} ({p.type})</option>
                          ))}
                        </select>
                      </div>

                      {selectedProgId !== '' && (
                        <div className="space-y-6 pt-4 border-t border-white/5 animate-entrance">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Program Name</label>
                              <input
                                type="text"
                                required
                                value={progName}
                                onChange={(e) => setProgName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-bold"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Target Age Group</label>
                              <input
                                type="text"
                                required
                                value={progAgeGroup}
                                onChange={(e) => setProgAgeGroup(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-bold"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Active Cohort Schedule</label>
                              <input
                                type="text"
                                required
                                value={progSchedule}
                                onChange={(e) => setProgSchedule(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-bold"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Status Mode</label>
                              <div className="flex items-center justify-between py-2 px-4 rounded-xl border border-white/10 bg-white/5 h-[46px]">
                                <span className="text-xs font-bold text-white">Active Program Group?</span>
                                <button
                                  type="button"
                                  onClick={() => setProgIsActive(!progIsActive)}
                                  className={`w-10 h-5 rounded-full p-1 transition-all duration-300 ${progIsActive ? 'bg-gold' : 'bg-white/10'}`}
                                >
                                  <div className={`w-3 h-3 rounded-full bg-forest transition-all duration-300 ${progIsActive ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Description</label>
                            <textarea
                              required
                              rows={3}
                              value={progDescription}
                              onChange={(e) => setProgDescription(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-medium resize-none leading-relaxed"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gold uppercase tracking-wider">WhatsApp Redirection Pre-filled Message</label>
                            <textarea
                              required
                              rows={2}
                              value={progWhatsappMessage}
                              onChange={(e) => setProgWhatsappMessage(e.target.value)}
                              placeholder="e.g. Hi MVSA 👋 I'm interested in enrolling in..."
                              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-medium leading-relaxed"
                            />
                            <p className="text-[10px] text-white/30">Prefilled string opened in client WhatsApp when they click "Enroll via WhatsApp" on the public site.</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end pt-4 border-t border-white/5">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Program Poster URL</label>
                              <input
                                type="text"
                                readOnly
                                value={progPosterUrl}
                                className="w-full px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02] text-white/40 text-xs font-mono font-bold cursor-not-allowed"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-gold uppercase tracking-wider">Upload New Poster Image</label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setProgPosterFile(e.target.files?.[0] || null)}
                                className="w-full px-4 py-2 border border-white/10 bg-white/5 rounded-xl text-xs text-white"
                              />
                            </div>
                          </div>

                          <div className="pt-6 border-t border-white/5 flex justify-between items-center gap-4">
                            <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest font-mono">
                              Table: public.programs
                            </p>
                            <button
                              type="submit"
                              disabled={isSaving}
                              className="px-8 py-3.5 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-xl font-extrabold text-xs tracking-widest uppercase transition-all duration-300 shadow-gold-sm hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center gap-2"
                            >
                              {isSaving ? <Loader2 className="w-4 h-4 animate-spin font-display" /> : <Save className="w-4 h-4" />}
                              {saveSuccess === 'program_content' ? 'PROGRAM SAVED!' : 'UPDATE PROGRAM'}
                            </button>
                          </div>
                        </div>
                      )}
                    </form>
                  )}
                </div>
              )}

              {/* --- SECTION 7: ACCOUNT SECURITY (all roles) --- */}
              {activeTab === 'account' && (
                <form onSubmit={handleSaveAccount} className="space-y-6">
                  <div>
                    <h2 className="font-display font-black text-2xl text-white uppercase italic tracking-tight">Security & Profile</h2>
                    <p className="text-white/40 text-xs mt-0.5">Manage your dashboard display identity and update security credentials.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gold uppercase tracking-wider block">Full Display Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                          type="text"
                          required
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-bold"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gold uppercase tracking-wider block">Current Assigned Role</label>
                      <div className="relative">
                        <ShieldCheck className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                          type="text"
                          readOnly
                          value={userRole.toUpperCase()}
                          className="w-full pl-11 pr-4 py-3 border border-white/5 bg-white/[0.02] text-white/40 rounded-xl text-xs font-mono font-bold cursor-not-allowed uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 space-y-4">
                    <span className="text-[10px] font-bold text-gold uppercase tracking-wider block">Update Security Password</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">New Secret Password</label>
                        <div className="relative">
                          <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                          <input
                            type="password"
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-mono font-bold animate-in"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Confirm New Password</label>
                        <div className="relative">
                          <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                          <input
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none text-xs font-mono font-bold animate-in"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 flex justify-between items-center gap-4">
                    <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest font-mono">
                      Scope: public.staff + Supabase Auth
                    </p>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-8 py-3.5 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-xl font-extrabold text-xs tracking-widest uppercase transition-all duration-300 shadow-gold-sm hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saveSuccess === 'account' ? 'CREDENTIALS SAVED!' : 'UPDATE SECURITY PROFILE'}
                    </button>
                  </div>
                </form>
              )}

              {/* --- SECTION 8: SYSTEM AUDIT LOGS (super_admin only) --- */}
              {activeTab === 'audit' && isSuperAdmin && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="font-display font-black text-2xl text-white uppercase italic tracking-tight">System Audit Log</h2>
                      <p className="text-white/40 text-xs mt-0.5">Real-time ledger tracking administrative mutations, security actions, and database writes.</p>
                    </div>
                    <button
                      type="button"
                      onClick={loadAuditLogs}
                      disabled={isAuditLoading}
                      className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-black uppercase text-gold hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5 self-start"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isAuditLoading ? 'animate-spin' : ''}`} />
                      Refresh Logs
                    </button>
                  </div>

                  {/* Filter Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        type="text"
                        placeholder="Search logs..."
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-gold/30"
                      />
                    </div>

                    <div className="relative">
                      <select
                        value={auditFilterAction}
                        onChange={(e) => setAuditFilterAction(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-gold/30 appearance-none font-bold"
                      >
                        <option value="all" className="bg-charcoal text-white">All Actions</option>
                        {uniqueActions.map((act: any) => (
                          <option key={act} value={act} className="bg-charcoal text-white">
                            {act.replace(/_/g, ' ').toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="relative">
                      <select
                        value={auditFilterStaff}
                        onChange={(e) => setAuditFilterStaff(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-gold/30 appearance-none font-bold"
                      >
                        <option value="all" className="bg-charcoal text-white">All Operators</option>
                        {uniqueStaff.map(([id, name]: any) => (
                          <option key={id} value={id} className="bg-charcoal text-white">
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="relative">
                      <select
                        value={auditFilterDate}
                        onChange={(e) => setAuditFilterDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-gold/30 appearance-none font-bold"
                      >
                        <option value="all" className="bg-charcoal text-white">Any Timeframe</option>
                        <option value="today" className="bg-charcoal text-white">Past 24 Hours</option>
                        <option value="week" className="bg-charcoal text-white">Past 7 Days</option>
                        <option value="month" className="bg-charcoal text-white">Past 30 Days</option>
                      </select>
                    </div>
                  </div>

                  {/* Audit Logs Table */}
                  {isAuditLoading ? (
                    <div className="py-24 text-center">
                      <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-2" />
                      <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Syncing Audit Ledger...</p>
                    </div>
                  ) : filteredAuditLogs.length === 0 ? (
                    <div className="py-20 text-center border border-white/5 rounded-2xl bg-white/[0.01]">
                      <ShieldCheck className="w-10 h-10 text-gold/40 mx-auto mb-2" />
                      <p className="text-xs font-bold text-white uppercase tracking-wider">No Mutations Recorded</p>
                      <p className="text-[10px] text-white/40 mt-1">No activities matched the active filter criteria.</p>
                    </div>
                  ) : (
                    <div className="border border-white/5 rounded-2xl overflow-hidden bg-charcoal/20">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-black uppercase text-gold tracking-wider">
                              <th className="py-3 px-4">Timestamp</th>
                              <th className="py-3 px-4">Action Event</th>
                              <th className="py-3 px-4">Operator</th>
                              <th className="py-3 px-4">Entity Type</th>
                              <th className="py-3 px-4">Record ID</th>
                              <th className="py-3 px-4 text-right">Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-xs text-white/80">
                            {filteredAuditLogs.map((log: any) => {
                              const isExpanded = expandedLogId === log.id;
                              return (
                                <optgroup key={log.id} label="log-group" className="contents">
                                  <tr className="hover:bg-white/[0.01] transition-colors border-b border-white/5">
                                    <td className="py-3.5 px-4 font-medium text-white/50">
                                      {format(new Date(log.created_at), 'MMM d, h:mm a')}
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${getActionBadgeStyle(log.action)}`}>
                                        {log.action.replace(/_/g, ' ')}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 font-bold text-white">
                                      {log.staff?.name || 'Automated / System'}
                                    </td>
                                    <td className="py-3.5 px-4 font-mono text-[10px] text-white/60">
                                      {log.entity_table}
                                    </td>
                                    <td className="py-3.5 px-4 font-mono text-[10px] text-white/40">
                                      {log.entity_id}
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                      <button
                                        type="button"
                                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                        className="text-[10px] font-black uppercase tracking-wider text-gold hover:text-white transition-colors"
                                      >
                                        {isExpanded ? 'Hide Payload' : 'View Payload'}
                                      </button>
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr>
                                      <td colSpan={6} className="py-4 px-6 bg-white/[0.01] border-t border-b border-white/5">
                                        <div className="space-y-3">
                                          <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-black uppercase text-gold tracking-widest">JSON Payload Diff</span>
                                            <span className="text-[9px] text-white/30 font-mono">ID: {log.id}</span>
                                          </div>
                                          <pre className="text-[10px] font-mono text-white/70 bg-black/40 p-4 rounded-xl overflow-x-auto max-h-60 leading-normal scrollbar-hide border border-white/5">
                                            {JSON.stringify(log.details, null, 2)}
                                          </pre>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </optgroup>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* --- SUBMODAL: EDIT VENUE RATE TIERS (Legacy Rates configuration) --- */}
      {isEditVenueOpen && editVenue && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/10 bg-charcoal text-left">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h2 className="text-2xl font-display font-extrabold italic tracking-tight text-white uppercase">EDIT VENUE</h2>
                <p className="text-gold text-[10px] font-black uppercase tracking-widest mt-1">Pricing & Name</p>
              </div>
              <button onClick={() => setIsEditVenueOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gold block">Venue Name</label>
                <input
                  type="text"
                  value={editVenueName}
                  onChange={(e) => setEditVenueName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-gold/30 focus:outline-none font-bold text-sm"
                />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gold mb-4">Hourly Rates (KES)</p>
                <div className="space-y-3">
                  {[
                    { key: 'morning' as const, label: 'Morning Rate', hint: 'Weekday 8:00 AM – 12:00 PM' },
                    { key: 'off_peak' as const, label: 'Off-Peak Rate', hint: 'Weekday 12:00 PM – 6:00 PM' },
                    { key: 'peak' as const, label: 'Peak Rate', hint: 'Weekday evenings & weekend all-day' },
                    { key: 'weekend' as const, label: 'Weekend Rate (Legacy)', hint: 'Saturday & Sunday' },
                  ].map(({ key, label, hint }) => (
                    <div key={key} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{label}</p>
                        <p className="text-[10px] text-charcoal-light">{hint}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gold">KES</span>
                        <input
                          type="number"
                          value={editVenueRates[key]}
                          onChange={(e) => setEditVenueRates({ ...editVenueRates, [key]: Number(e.target.value) })}
                          className="w-24 px-3 py-2 text-right rounded-xl border border-white/10 bg-white/5 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-display font-bold text-white text-lg"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveVenue}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-gold to-gold-muted text-forest px-8 py-4 rounded-2xl font-extrabold text-sm tracking-[0.15em] uppercase transition-all duration-300 hover:shadow-gold-md active:scale-95 disabled:opacity-50"
              >
                {isSaving ? (
                  <><Loader2 className="w-5 h-5 animate-spin text-forest" /> SAVING...</>
                ) : saveSuccess === 'venues' ? (
                  <><CheckCircle className="w-5 h-5 text-forest" /> SAVED RATES!</>
                ) : (
                  <><Save className="w-5 h-5 text-forest" /> SAVE VENUE <ChevronRight className="w-5 h-5 text-forest" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
