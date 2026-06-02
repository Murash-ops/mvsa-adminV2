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
  Trophy,
  Activity,
  Star,
  MessageSquare,
  AlertTriangle,
  User,
  ShieldAlert,
  Sliders,
  TrendingUp,
  X,
  TrendingDown,
  DollarSign,
  Briefcase,
  AlertCircle,
  CheckSquare,
  Square,
  ArrowLeft,
  Camera,
  Plus,
  UploadCloud,
  Edit,
  Trash2,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

export default function AcademyOperations() {
  const { staff } = useAuth();
  const supabase = createClient();
  
  // Data State
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('all');
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Roster Filter & Search
  const [rosterStatusFilter, setRosterStatusFilter] = useState<string>('active');
  const [rosterPaymentStatusFilter, setRosterPaymentStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Bulk Action states (Priority 2)
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<number[]>([]);
  const [isBulkSmsOpen, setIsBulkSmsOpen] = useState(false);
  const [bulkSmsText, setBulkSmsText] = useState('');
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  // Interactive Payment UI State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('mpesa');
  const [mpesaRef, setMpesaRef] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expense Logger Drawer State
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<'instructor' | 'maintenance' | 'operations' | 'marketing'>('operations');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseProgramId, setExpenseProgramId] = useState<string>('all');
  const [expenseReceiptFile, setExpenseReceiptFile] = useState<File | null>(null);
  const [expenseReceiptPreview, setExpenseReceiptPreview] = useState('');
  const [expenseUploading, setExpenseUploading] = useState(false);

  // Player Profile Drawer State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Edited Profile Form State
  const [editedName, setEditedName] = useState('');
  const [editedAge, setEditedAge] = useState('');
  const [editedGender, setEditedGender] = useState('Male');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedParentName, setEditedParentName] = useState('');
  const [editedCommPref, setEditedCommPref] = useState('whatsapp');
  const [editedPriorExp, setEditedPriorExp] = useState('Beginner');
  const [editedSchoolClub, setEditedSchoolClub] = useState('');
  const [editedMedical, setEditedMedical] = useState('');
  const [editedPricingPlan, setEditedPricingPlan] = useState('session');
  const [editedStatus, setEditedStatus] = useState('active');
  const [editedPhotoFile, setEditedPhotoFile] = useState<File | null>(null);
  const [editedPhotoPreview, setEditedPhotoPreview] = useState('');
  const [editedPhotoUploading, setEditedPhotoUploading] = useState(false);

  // Manual Enrollment Form States (COO Only Creator)
  const [isNewEnrollmentOpen, setIsNewEnrollmentOpen] = useState(false);
  const [newEnrollmentStep, setNewEnrollmentStep] = useState(1);
  const [newEnrollmentData, setNewEnrollmentData] = useState({
    participant_name: '',
    participant_age: '',
    gender: 'Male',
    prior_experience: 'Beginner',
    school_club: '',
    medical_conditions: '',
    parent_name: '',
    client_phone: '',
    communication_pref: 'whatsapp',
    program_id: '',
    pricing_plan: 'session',
    status: 'active',
    payment_status: 'pending'
  });
  const [newEnrollmentPhotoFile, setNewEnrollmentPhotoFile] = useState<File | null>(null);
  const [newEnrollmentPhotoPreview, setNewEnrollmentPhotoPreview] = useState('');

  const handleNewEnrollmentPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewEnrollmentPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEnrollmentPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitNewEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnrollmentData.participant_name || !newEnrollmentData.parent_name || !newEnrollmentData.client_phone || !newEnrollmentData.program_id) {
      alert('Please fill out all required fields');
      return;
    }
    setIsSubmitting(true);

    try {
      let photoUrl = '';

      // 1. Upload photo if present
      if (newEnrollmentPhotoFile) {
        const fileExt = newEnrollmentPhotoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `profiles/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('player-profiles')
          .upload(filePath, newEnrollmentPhotoFile);

        if (uploadError) {
          // fallback to general bucket if player-profiles fails
          const { error: fallbackError } = await supabase.storage
            .from('player-profiles')
            .upload(`receipts/${fileName}`, newEnrollmentPhotoFile);
          if (fallbackError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage
            .from('player-profiles')
            .getPublicUrl(`receipts/${fileName}`);
          photoUrl = publicUrl;
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('player-profiles')
            .getPublicUrl(filePath);
          photoUrl = publicUrl;
        }
      }

      // 2. Insert into public.enrollments
      const { error } = await supabase
        .from('enrollments')
        .insert([{
          participant_name: newEnrollmentData.participant_name,
          participant_age: parseInt(newEnrollmentData.participant_age) || null,
          gender: newEnrollmentData.gender,
          client_phone: newEnrollmentData.client_phone,
          parent_name: newEnrollmentData.parent_name,
          communication_pref: newEnrollmentData.communication_pref,
          prior_experience: newEnrollmentData.prior_experience,
          school_club: newEnrollmentData.school_club || null,
          medical_conditions: newEnrollmentData.medical_conditions || null,
          pricing_plan: newEnrollmentData.pricing_plan,
          status: newEnrollmentData.status,
          payment_status: newEnrollmentData.payment_status,
          passport_photo_url: photoUrl || null,
          program_id: parseInt(newEnrollmentData.program_id)
        }]);

      if (error) throw error;

      alert('Student enrollment successfully registered!');
      setIsNewEnrollmentOpen(false);
      
      // Reset form
      setNewEnrollmentStep(1);
      setNewEnrollmentData({
        participant_name: '',
        participant_age: '',
        gender: 'Male',
        prior_experience: 'Beginner',
        school_club: '',
        medical_conditions: '',
        parent_name: '',
        client_phone: '',
        communication_pref: 'whatsapp',
        program_id: '',
        pricing_plan: 'session',
        status: 'active',
        payment_status: 'pending'
      });
      setNewEnrollmentPhotoFile(null);
      setNewEnrollmentPhotoPreview('');

      refreshData();
    } catch (err: any) {
      alert(err.message || 'Error creating manual enrollment');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Load search from URL params on mount/load (Priority 5)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const searchParam = params.get('search');
      if (searchParam) {
        setSearchQuery(searchParam);
      }
    }
  }, [enrollments.length]);

  const toggleSelectEnrollment = (id: number) => {
    setSelectedEnrollmentIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllEnrollments = (visibleEnrollments: any[]) => {
    const visibleIds = visibleEnrollments.map(e => e.id);
    const allSelected = visibleIds.every(id => selectedEnrollmentIds.includes(id));
    if (allSelected) {
      setSelectedEnrollmentIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedEnrollmentIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleBulkConfirmEnrollment = async () => {
    if (selectedEnrollmentIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to approve enrollment for ${selectedEnrollmentIds.length} selected students?`)) return;

    setIsBulkSubmitting(true);
    try {
      const { error } = await supabase
        .from('enrollments')
        .update({ status: 'active' })
        .in('id', selectedEnrollmentIds);

      if (error) throw error;

      alert(`Approved ${selectedEnrollmentIds.length} enrollments successfully!`);
      setSelectedEnrollmentIds([]);
      await refreshData();
    } catch (err: any) {
      alert(`Bulk approval error: ${err.message}`);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleBulkMarkPaid = async () => {
    if (selectedEnrollmentIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to mark ${selectedEnrollmentIds.length} selected enrollments as fully paid?`)) return;

    setIsBulkSubmitting(true);
    try {
      const { error } = await supabase
        .from('enrollments')
        .update({ payment_status: 'fully_paid', status: 'active' })
        .in('id', selectedEnrollmentIds);

      if (error) throw error;

      alert(`Marked ${selectedEnrollmentIds.length} enrollments as fully paid!`);
      setSelectedEnrollmentIds([]);
      await refreshData();
    } catch (err: any) {
      alert(`Bulk payment update error: ${err.message}`);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleBulkSendEnrollmentSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEnrollmentIds.length === 0 || !bulkSmsText.trim()) return;

    setIsBulkSubmitting(true);
    try {
      const selected = enrollments.filter(e => selectedEnrollmentIds.includes(e.id));
      
      const smsToInsert = selected.map(e => ({
        recipient_phone: e.client_phone,
        message: bulkSmsText,
        type: 'client_confirmation',
        status: 'pending',
        sent_by: staff?.id
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(smsToInsert);

      if (error) throw error;

      alert(`Queued bulk SMS notifications for ${selected.length} parents.`);
      setIsBulkSmsOpen(false);
      setBulkSmsText('');
      setSelectedEnrollmentIds([]);
    } catch (err: any) {
      alert(`Bulk SMS dispatch error: ${err.message}`);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  async function fetchInitialData() {
    setIsLoading(true);
    try {
      // 1. Fetch programs
      const { data: progData, error: progErr } = await supabase
        .from('programs')
        .select('*')
        .eq('is_active', true);
      if (progErr) throw progErr;
      setPrograms(progData || []);

      // 2. Fetch all enrollments (we will filter status locally to provide cancellation tracking)
      const { data: enrollData, error: enrollErr } = await supabase
        .from('enrollments')
        .select('*, programs(name, type, pricing_json)');
      if (enrollErr) throw enrollErr;
      setEnrollments(enrollData || []);

      // 3. Fetch assessments with nested enrollments to match programs
      const { data: assessData, error: assessErr } = await supabase
        .from('player_assessments')
        .select('*, enrollments(participant_name, passport_photo_url, program_id), staff:coach_id(name)');
      if (assessErr) throw assessErr;
      setAssessments(assessData || []);

      // 4. Fetch segregated academy expenses strictly
      const { data: expData, error: expErr } = await supabase
        .from('expenses')
        .select('*')
        .eq('is_academy', true);
      if (expErr) throw expErr;
      setExpenses(expData || []);

    } catch (err: any) {
      alert(err.message || 'Error loading dashboard data');
    } finally {
      setIsLoading(false);
    }
  }

  // Reload data after updates
  async function refreshData() {
    try {
      const { data: enrollData } = await supabase
        .from('enrollments')
        .select('*, programs(name, type, pricing_json)');
      setEnrollments(enrollData || []);

      const { data: assessData } = await supabase
        .from('player_assessments')
        .select('*, enrollments(participant_name, passport_photo_url, program_id), staff:coach_id(name)');
      setAssessments(assessData || []);

      const { data: expData } = await supabase
        .from('expenses')
        .select('*')
        .eq('is_academy', true);
      setExpenses(expData || []);
    } catch (err) {
      console.error('Error refreshing operational data:', err);
    }
  }

  // Filter enrollments based on selected program, status filter, and search query
  const filteredEnrollments = enrollments.filter(e => {
    const matchesProgram = selectedProgramId === 'all' || e.program_id.toString() === selectedProgramId;
    const matchesStatus = rosterStatusFilter === 'all' || e.status === rosterStatusFilter;
    const matchesPaymentStatus = rosterPaymentStatusFilter === 'all' || e.payment_status === rosterPaymentStatusFilter;
    const matchesSearch = e.participant_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (e.parent_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.client_phone.includes(searchQuery);
    return matchesProgram && matchesStatus && matchesPaymentStatus && matchesSearch;
  });

  // Calculate pricing for an enrollment based on plan
  const getEnrollmentPrice = (e: any) => {
    const pricing = e.programs?.pricing_json || {};
    const plan = e.pricing_plan || 'session';
    return pricing[plan] || pricing['session'] || 0;
  };

  // P&L Funds Utilization Calculations
  // Total Revenue: sum of pricing plans of PAID active & completed enrollments (filtered by selected program)
  const filteredFinancialEnrollments = enrollments.filter(e => {
    const matchesProgram = selectedProgramId === 'all' || e.program_id.toString() === selectedProgramId;
    return matchesProgram && e.status !== 'cancelled';
  });

  const totalRevenue = filteredFinancialEnrollments
    .filter(e => e.payment_status === 'fully_paid')
    .reduce((sum, e) => sum + getEnrollmentPrice(e), 0);

  // Total Expenses: sum of academy expenses filtered by selected program if applicable
  const filteredExpenses = expenses.filter(exp => {
    return selectedProgramId === 'all' || exp.program_id?.toString() === selectedProgramId;
  });

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const netFunds = totalRevenue - totalExpenses;

  // Manual payment drawer handler
  const handleOpenPayment = (enrollment: any) => {
    setSelectedEnrollment(enrollment);
    const price = getEnrollmentPrice(enrollment);
    setPaymentAmount(price.toString());
    setPaymentMethod('mpesa');
    setMpesaRef('');
    setIsPaymentOpen(true);
  };

  const submitManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollment) return;
    setIsSubmitting(true);

    try {
      const refString = paymentMethod === 'cash' ? 'cash' : `${paymentMethod}:${mpesaRef}`;

      // Update enrollment to fully_paid AND set status = 'active' explicitly to trigger sheets sync!
      const { error } = await supabase
        .from('enrollments')
        .update({
          payment_status: 'fully_paid',
          status: 'active',
          checkout_request_id: refString
        })
        .eq('id', selectedEnrollment.id);

      if (error) throw error;

      alert(`Payment successfully logged for ${selectedEnrollment.participant_name}! Google Sheet sync triggered.`);
      setIsPaymentOpen(false);
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Error logging manual payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resolution Checklist for Charles & Karlmax
  const handleResolveAttention = async (assessmentId: number, playerName: string) => {
    if (!confirm(`Mark one-on-one intervention as completed for ${playerName}?`)) return;
    
    try {
      const { error } = await supabase
        .from('player_assessments')
        .update({ attention_flag: 'none' })
        .eq('id', assessmentId);

      if (error) throw error;
      alert(`Intervention logged. Attention flag cleared for ${playerName}.`);
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Error updating attention flag');
    }
  };

  // Log Academy Expense Form submission
  const submitAcademyExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let receiptUrl = null;

      // 1. Upload receipt if selected
      if (expenseReceiptFile) {
        const fileExt = expenseReceiptFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `receipts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filePath, expenseReceiptFile);

        if (uploadError) {
          console.warn("Receipt upload failed, checking bucket existence or retrying in public folder...");
          // Fallback upload to 'player-profiles' if receipts bucket is missing
          const { error: fallbackError } = await supabase.storage
            .from('player-profiles')
            .upload(`receipts/${fileName}`, expenseReceiptFile);
          
          if (fallbackError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from('player-profiles')
            .getPublicUrl(`receipts/${fileName}`);
          receiptUrl = publicUrl;
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('receipts')
            .getPublicUrl(filePath);
          receiptUrl = publicUrl;
        }
      }

      // 2. Insert into expenses
      const { error } = await supabase
        .from('expenses')
        .insert([{
          category: expenseCategory,
          amount: parseFloat(expenseAmount),
          description: expenseDescription,
          receipt_url: receiptUrl,
          is_academy: true,
          program_id: expenseProgramId === 'all' ? null : parseInt(expenseProgramId),
          logged_by: staff?.id || null
        }]);

      if (error) throw error;

      alert('Academy expense successfully logged!');
      setIsExpenseOpen(false);
      
      // Reset form
      setExpenseAmount('');
      setExpenseCategory('operations');
      setExpenseDescription('');
      setExpenseProgramId('all');
      setExpenseReceiptFile(null);
      setExpenseReceiptPreview('');
      
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Error logging academy cost');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Player Profile Drawer
  const handleOpenProfile = (profile: any) => {
    setSelectedProfile(profile);
    
    // Set edit form defaults
    setEditedName(profile.participant_name || '');
    setEditedAge(profile.participant_age?.toString() || '');
    setEditedGender(profile.gender || 'Male');
    setEditedPhone(profile.client_phone || '');
    setEditedParentName(profile.parent_name || '');
    setEditedCommPref(profile.communication_pref || 'whatsapp');
    setEditedPriorExp(profile.prior_experience || 'Beginner');
    setEditedSchoolClub(profile.school_club || '');
    setEditedMedical(profile.medical_conditions || '');
    setEditedPricingPlan(profile.pricing_plan || 'session');
    setEditedStatus(profile.status || 'active');
    setEditedPhotoFile(null);
    setEditedPhotoPreview(profile.passport_photo_url || '');
    
    setIsEditMode(false);
    setIsProfileOpen(true);
  };

  // Change Profile Photo replacement
  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditedPhotoFile(file);
      setEditedPhotoUploading(true);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      setEditedPhotoUploading(false);
    }
  };

  // Submit Player Profile modifications (Trigger sheets sync)
  const submitProfileChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    setIsSubmitting(true);

    try {
      let photoUrl = selectedProfile.passport_photo_url;

      // 1. Upload new photo if selected
      if (editedPhotoFile) {
        const fileExt = editedPhotoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `profiles/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('player-profiles')
          .upload(filePath, editedPhotoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('player-profiles')
          .getPublicUrl(filePath);

        photoUrl = publicUrl;
      }

      // 2. Update public.enrollments and set status to push webhook sync automatically
      const { error } = await supabase
        .from('enrollments')
        .update({
          participant_name: editedName,
          participant_age: parseInt(editedAge) || null,
          gender: editedGender,
          client_phone: editedPhone,
          parent_name: editedParentName,
          communication_pref: editedCommPref,
          prior_experience: editedPriorExp,
          school_club: editedSchoolClub || null,
          medical_conditions: editedMedical || null,
          pricing_plan: editedPricingPlan,
          status: editedStatus,
          passport_photo_url: photoUrl
        })
        .eq('id', selectedProfile.id);

      if (error) throw error;

      alert(`Player profile changes saved successfully! Google Sheet sync triggered.`);
      setIsProfileOpen(false);
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Error updating player profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to handle receipt selection
  const handleExpenseReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setExpenseReceiptFile(file);
      setExpenseUploading(true);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setExpenseReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      setExpenseUploading(false);
    }
  };

  // --- Squad Statistics Logic (Matching PDF Page 10) ---
  // Group assessments by student and keep their LATEST assessment to represent current stats
  const latestAssessmentsByPlayer: Record<number, any> = {};
  assessments.forEach(ass => {
    const current = latestAssessmentsByPlayer[ass.enrollment_id];
    if (!current || new Date(ass.assessment_date) > new Date(current.assessment_date)) {
      latestAssessmentsByPlayer[ass.enrollment_id] = ass;
    }
  });

  const activeAssessmentsList = Object.values(latestAssessmentsByPlayer).filter((ass: any) => {
    if (selectedProgramId === 'all') return true;
    return ass.enrollments?.program_id.toString() === selectedProgramId;
  });

  const getRatingsAverage = (ratings: Record<string, number>) => {
    const values = Object.values(ratings || {});
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  let squadTechAvg = 0;
  let squadAttAvg = 0;
  let highestTechPlayer = { name: 'N/A', score: 0 };
  let highestAttPlayer = { name: 'N/A', score: 0 };
  let needsSupportPlayer = { name: 'N/A', score: 6 };

  if (activeAssessmentsList.length > 0) {
    let techSum = 0;
    let attSum = 0;

    activeAssessmentsList.forEach((ass: any) => {
      const tAvg = getRatingsAverage(ass.technical_ratings);
      const aAvg = getRatingsAverage(ass.attitude_ratings);
      
      techSum += tAvg;
      attSum += aAvg;

      const playerName = ass.enrollments?.participant_name || 'Unknown Athlete';

      if (tAvg > highestTechPlayer.score) {
        highestTechPlayer = { name: playerName, score: tAvg };
      }
      if (aAvg > highestAttPlayer.score) {
        highestAttPlayer = { name: playerName, score: aAvg };
      }
      
      const combined = (tAvg + aAvg) / 2;
      if (combined < needsSupportPlayer.score) {
        needsSupportPlayer = { name: playerName, score: combined };
      }
    });

    squadTechAvg = techSum / activeAssessmentsList.length;
    squadAttAvg = attSum / activeAssessmentsList.length;
  }

  // --- Urgent Action Checklist (Matching PDF Page 11) ---
  const urgentInterventions = assessments.filter((ass: any) => {
    const isFlagged = ass.attention_flag === 'concern' || ass.attention_flag === 'urgent';
    const matchesProg = selectedProgramId === 'all' || ass.enrollments?.program_id.toString() === selectedProgramId;
    return isFlagged && matchesProg;
  });

  // --- Chart Data Preparation (Roster metric averages grouped by Date) ---
  const chartDataGrouped: Record<string, { techSum: number, attSum: number, count: number, dateObj: Date }> = {};
  
  assessments.forEach((ass: any) => {
    const matchesProg = selectedProgramId === 'all' || ass.enrollments?.program_id.toString() === selectedProgramId;
    if (!matchesProg) return;

    const formattedDate = format(new Date(ass.assessment_date), 'MMM d');
    const tAvg = getRatingsAverage(ass.technical_ratings);
    const aAvg = getRatingsAverage(ass.attitude_ratings);

    if (chartDataGrouped[formattedDate]) {
      chartDataGrouped[formattedDate].techSum += tAvg;
      chartDataGrouped[formattedDate].attSum += aAvg;
      chartDataGrouped[formattedDate].count += 1;
    } else {
      chartDataGrouped[formattedDate] = {
        techSum: tAvg,
        attSum: aAvg,
        count: 1,
        dateObj: new Date(ass.assessment_date)
      };
    }
  });

  const sortedChartData = Object.entries(chartDataGrouped)
    .sort((a, b) => a[1].dateObj.getTime() - b[1].dateObj.getTime())
    .map(([date, data]) => ({
      date,
      Technical: parseFloat((data.techSum / data.count).toFixed(1)),
      Attitude: parseFloat((data.attSum / data.count).toFixed(1))
    }));

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 p-6 lg:p-10 animate-entrance min-h-screen">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-1 bg-gold rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">Executive Command Center</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tighter leading-none italic uppercase">
            Academy Control Panel
          </h1>
          <p className="text-white/40 text-sm font-medium mt-1">
            Operational and Financial Audit Panel for Charles (CEO) and Karlmax (COO).
          </p>
        </div>

        {/* Filter controls and expense logger button */}
        <div className="flex flex-wrap items-center gap-4 shrink-0">
          <div className="relative shrink-0">
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold border border-white/10 focus:border-gold/30 transition-all text-sm appearance-none pr-12 focus:outline-none uppercase tracking-wider"
            >
              <option value="all" className="bg-forest-dark text-white">All Active Programs</option>
              {programs.map(prog => (
                <option key={prog.id} value={prog.id.toString()} className="bg-forest-dark text-white">{prog.name}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gold font-bold">▼</div>
          </div>

          <div className="flex gap-4">
            {(staff?.role === 'academy_coo' || staff?.role === 'super_admin') && (
              <button
                onClick={() => {
                  const defaultProg = programs.length > 0 ? programs[0].id.toString() : '';
                  setNewEnrollmentData(prev => ({ ...prev, program_id: defaultProg }));
                  setIsNewEnrollmentOpen(true);
                }}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-gold to-gold-muted hover:from-white hover:to-white text-forest font-black transition-all text-sm uppercase tracking-wider shadow-gold-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4 shrink-0" />
                New Enrollment
              </button>
            )}

            <button
              onClick={() => setIsExpenseOpen(true)}
              className="px-6 py-3.5 rounded-2xl bg-gold hover:bg-white text-forest font-black border border-gold hover:border-white transition-all text-sm uppercase tracking-wider shadow-gold-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4 shrink-0" />
              Log Academy Cost
            </button>
          </div>
        </div>
      </header>

      {/* Segregated Financial Aggregates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch transition-all hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-5">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/10 text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/5 px-2 py-1 rounded-lg">Revenue</span>
          </div>
          <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1.5">Registration Income</h3>
          <p className="text-3xl font-extrabold font-display text-white">KES {totalRevenue.toLocaleString()}</p>
          <p className="text-[10px] text-white/30 font-medium mt-1">Paid enrollments fee totals</p>
        </div>

        <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch transition-all hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-5">
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/10 text-red-400">
              <TrendingDown className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest bg-red-500/5 px-2 py-1 rounded-lg">Expenses</span>
          </div>
          <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1.5">Academy Costs Segregated</h3>
          <p className="text-3xl font-extrabold font-display text-white">KES {totalExpenses.toLocaleString()}</p>
          <p className="text-[10px] text-white/30 font-medium mt-1">Coach pay & operations costs strictly</p>
        </div>

        <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch transition-all hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-5">
            <div className={`p-3 rounded-2xl border ${netFunds >= 0 ? 'bg-gold/10 border-gold/10 text-gold' : 'bg-red-500/10 border-red-500/10 text-red-400'}`}>
              <Briefcase className="w-6 h-6" />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg ${netFunds >= 0 ? 'bg-gold/5 text-gold' : 'bg-red-500/5 text-red-400'}`}>
              Net Funds
            </span>
          </div>
          <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1.5">Academy Net Balance</h3>
          <p className={`text-3xl font-extrabold font-display ${netFunds >= 0 ? 'text-gold' : 'text-red-400'}`}>
            KES {netFunds.toLocaleString()}
          </p>
          <p className="text-[10px] text-white/30 font-medium mt-1">Academy-only funds margin</p>
        </div>

        <div className="bg-card p-6 rounded-3xl border border-white/5 shadow-pitch transition-all hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-5">
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/10 text-purple-400">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest bg-purple-500/5 px-2 py-1 rounded-lg">Roster</span>
          </div>
          <h3 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1.5"> Roster Registrations</h3>
          <p className="text-3xl font-extrabold font-display text-white">
            {filteredEnrollments.length} <span className="text-sm font-medium text-white/30">Total</span>
          </p>
          <p className="text-[10px] text-white/30 font-medium mt-1">
            {filteredEnrollments.filter(e => e.payment_status === 'fully_paid').length} Paid • {filteredEnrollments.filter(e => e.payment_status === 'unpaid').length} Unpaid
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
        {/* Real-time Squad Statistics */}
        <div className="lg:col-span-5 bg-card p-8 rounded-[2.5rem] border border-white/5 shadow-pitch flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="w-5 h-5 text-gold" />
              <h2 className="text-xl font-bold font-display text-white italic uppercase tracking-tight">Roster Squad Statistics</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">Squad Tech Average</span>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-2xl font-black text-white">{squadTechAvg > 0 ? squadTechAvg.toFixed(1) : '0.0'}</span>
                    <span className="text-[10px] text-white/40 font-bold uppercase">/ 5.0</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-3">
                    <div 
                      className="h-full bg-gradient-to-r from-gold to-gold-muted rounded-full" 
                      style={{ width: `${(squadTechAvg / 5) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">Squad Attitude Average</span>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-2xl font-black text-white">{squadAttAvg > 0 ? squadAttAvg.toFixed(1) : '0.0'}</span>
                    <span className="text-[10px] text-white/40 font-bold uppercase">/ 5.0</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-3">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" 
                      style={{ width: `${(squadAttAvg / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/40 font-bold uppercase tracking-wider">Highest Technical Player:</span>
                  <span className="text-white font-extrabold flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-gold fill-gold shrink-0" />
                    {highestTechPlayer.name} ({highestTechPlayer.score > 0 ? highestTechPlayer.score.toFixed(1) : 'N/A'})
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-white/5 pt-3.5">
                  <span className="text-white/40 font-bold uppercase tracking-wider">Highest Attitude Player:</span>
                  <span className="text-emerald-400 font-extrabold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    {highestAttPlayer.name} ({highestAttPlayer.score > 0 ? highestAttPlayer.score.toFixed(1) : 'N/A'})
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-white/5 pt-3.5">
                  <span className="text-white/40 font-bold uppercase tracking-wider">Needs Most Support:</span>
                  <span className="text-red-400 font-extrabold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {needsSupportPlayer.name} ({needsSupportPlayer.score < 6 ? needsSupportPlayer.score.toFixed(1) : 'N/A'})
                  </span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-6 bg-white/2 p-3.5 rounded-xl border border-white/5 text-center">
            *Based on evaluations compiled by assigned coaching staff.
          </p>
        </div>

        {/* Urgent Action Center */}
        <div className="lg:col-span-7 bg-card p-8 rounded-[2.5rem] border border-red-500/10 shadow-pitch flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <h2 className="text-xl font-bold font-display text-white italic uppercase tracking-tight">Urgent Action Center</h2>
              </div>
              <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-400 animate-pulse">
                {urgentInterventions.length} Attention Flags
              </span>
            </div>

            <div className="space-y-4 max-h-[17.5rem] overflow-y-auto pr-2 custom-scrollbar">
              {urgentInterventions.length === 0 ? (
                <div className="py-12 border border-dashed border-white/10 rounded-2xl text-center flex flex-col items-center justify-center">
                  <CheckSquare className="w-10 h-10 text-emerald-400 mb-2" />
                  <p className="font-bold text-sm text-white/60">Squad Conduct is Clear</p>
                  <p className="text-xs text-white/30 mt-0.5">No active attitude concerns require intervention.</p>
                </div>
              ) : (
                urgentInterventions.map((ass: any) => (
                  <div 
                    key={ass.id} 
                    className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-black text-sm text-white">{ass.enrollments?.participant_name}</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${ass.attention_flag === 'urgent' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                          {ass.attention_flag} priority
                        </span>
                      </div>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                        Assessment Date: {format(new Date(ass.assessment_date), 'MMM d, yyyy')}
                      </p>
                      {ass.personal_note && (
                        <p className="text-xs text-white/60 italic font-medium bg-white/[0.02] p-2.5 rounded-lg border border-white/5 mt-2">
                          "Coach Note: {ass.personal_note}"
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleResolveAttention(ass.id, ass.enrollments?.participant_name)}
                      className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/20 transition-all flex items-center gap-1.5 shrink-0 self-end sm:self-center"
                    >
                      <Square className="w-3.5 h-3.5 shrink-0" />
                      Intervention Completed
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 bg-white/[0.02] p-4 rounded-2xl border border-white/5 flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <p className="text-[10px] text-white/50 leading-relaxed font-medium">
              <strong>CEO/COO Directives:</strong> Flagged participants require direct mentor/parent review within 48 hours of coach publication. Record actions via direct check-off.
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Progression Visualization */}
      <div className="bg-card p-8 rounded-[2.5rem] border border-white/5 shadow-pitch mb-10">
        <div className="flex items-center gap-2 mb-8">
          <TrendingUp className="w-5 h-5 text-gold" />
          <h2 className="text-xl font-bold font-display text-white italic uppercase tracking-tight">Roster Metric Progression Trends</h2>
        </div>

        {sortedChartData.length === 0 ? (
          <div className="h-72 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center opacity-40">
            <TrendingUp className="w-12 h-12 text-gold animate-pulse mb-2" />
            <p className="font-bold text-white text-sm">Waiting for Progression Metrics</p>
            <p className="text-xs text-white/50 mt-0.5">Submit assessments inside the Coach Portal to render squad averages.</p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sortedChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="date" stroke="#666" fontSize={10} tickLine={false} />
                <YAxis domain={[1, 5]} stroke="#666" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                  labelStyle={{ fontWeight: 'black', color: '#ffb800' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                <Line type="monotone" dataKey="Technical" stroke="#ffb800" strokeWidth={3} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="Attitude" stroke="#22c55e" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Roster & Payments Ledger */}
      <div className="bg-card rounded-[2.5rem] border border-white/5 shadow-pitch overflow-hidden">
        <div className="p-8 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-2xl font-display font-extrabold italic text-white uppercase tracking-tight">Roster & Payments Ledger</h2>
            <p className="text-gold text-[10px] font-black uppercase tracking-widest mt-1">Click a row to audit the player profile drawer, modify records, or toggle statuses</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            {/* Roster status filter */}
            <div className="relative">
              <select
                value={rosterStatusFilter}
                onChange={(e) => setRosterStatusFilter(e.target.value)}
                className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold border border-white/10 focus:border-gold/30 transition-all text-xs appearance-none pr-10 focus:outline-none uppercase tracking-wider"
              >
                <option value="all" className="bg-forest-dark text-white">All Records</option>
                <option value="pending" className="bg-forest-dark text-white">Pending Roster</option>
                <option value="active" className="bg-forest-dark text-white">Active Roster</option>
                <option value="inactive" className="bg-forest-dark text-white">Inactive Roster</option>
                <option value="completed" className="bg-forest-dark text-white">Completed / Archived</option>
                <option value="cancelled" className="bg-forest-dark text-white">Cancelled Only</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gold text-xs">▼</div>
            </div>

            {/* Roster payment status filter */}
            <div className="relative">
              <select
                value={rosterPaymentStatusFilter}
                onChange={(e) => setRosterPaymentStatusFilter(e.target.value)}
                className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold border border-white/10 focus:border-gold/30 transition-all text-xs appearance-none pr-10 focus:outline-none uppercase tracking-wider"
              >
                <option value="all" className="bg-forest-dark text-white">All Payments</option>
                <option value="fully_paid" className="bg-forest-dark text-white">Fully Paid</option>
                <option value="unpaid" className="bg-forest-dark text-white">Unpaid</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gold text-xs">▼</div>
            </div>

            {/* Search bar */}
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search athlete, parent or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/20 text-xs focus:outline-none focus:border-gold/30 font-medium"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.005]">
                {(staff?.role === 'academy_coo' || staff?.role === 'super_admin') && (
                  <th className="p-6 w-12 text-center">
                    <input 
                      type="checkbox" 
                      checked={filteredEnrollments.length > 0 && filteredEnrollments.every(e => selectedEnrollmentIds.includes(e.id))}
                      onChange={(evt) => {
                        evt.stopPropagation();
                        toggleSelectAllEnrollments(filteredEnrollments);
                      }}
                      className="w-4 h-4 bg-white/5 border border-white/10 rounded focus:ring-gold text-gold cursor-pointer"
                    />
                  </th>
                )}
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40">Athlete</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40">Age / Gender</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40">Parent Details</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40">Program & Plan</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40 text-center">Payment Status</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredEnrollments.length === 0 ? (
                <tr>
                  <td colSpan={(staff?.role === 'academy_coo' || staff?.role === 'super_admin') ? 7 : 6} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 opacity-30">
                      <Users className="w-10 h-10 text-gold" />
                      <p className="font-bold text-sm text-white uppercase">No enrollments match parameters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEnrollments.map(e => {
                  const price = getEnrollmentPrice(e);
                  const isPaid = e.payment_status === 'fully_paid';
                  
                  return (
                    <tr 
                      key={e.id} 
                      onClick={() => handleOpenProfile(e)}
                      className="hover:bg-white/[0.015] transition-colors cursor-pointer"
                    >
                      {(staff?.role === 'academy_coo' || staff?.role === 'super_admin') && (
                        <td className="p-6 w-12 text-center" onClick={(evt) => evt.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={selectedEnrollmentIds.includes(e.id)}
                            onChange={() => toggleSelectEnrollment(e.id)}
                            className="w-4 h-4 bg-white/5 border border-white/10 rounded focus:ring-gold text-gold cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          {e.passport_photo_url ? (
                            <img 
                              src={e.passport_photo_url} 
                              alt="" 
                              className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0 shadow-md"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/20 border border-white/5 shrink-0">
                              <User className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <p className="font-extrabold text-white text-base">{e.participant_name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">ID: {e.id}</p>
                              {e.status !== 'active' && (
                                <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${e.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {e.status}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-6">
                        <p className="font-bold text-sm text-white">Age {e.participant_age || 'N/A'}</p>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mt-0.5">{e.gender || 'Not Specified'}</p>
                      </td>

                      <td className="p-6">
                        <p className="font-extrabold text-white text-sm">{e.parent_name}</p>
                        <p className="text-xs text-white/40 font-medium mt-0.5">{e.client_phone}</p>
                      </td>

                      <td className="p-6">
                        <p className="font-extrabold text-white text-sm">{e.programs?.name}</p>
                        <p className="text-[10px] text-gold font-bold uppercase tracking-widest mt-0.5">
                          {e.pricing_plan} plan (KES {price})
                        </p>
                      </td>

                      <td className="p-6">
                        <div className="flex justify-center">
                          {isPaid ? (
                            <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 shrink-0">
                              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                              Fully Paid
                            </span>
                          ) : (
                            <span className="px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-[9px] font-black uppercase tracking-widest text-red-400 flex items-center gap-1.5 shrink-0">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                              Pending Payment
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-6 text-right">
                        {!isPaid ? (
                          <button
                            onClick={(evt) => {
                              evt.stopPropagation();
                              handleOpenPayment(e);
                            }}
                            className="px-4 py-2.5 bg-gold hover:bg-white text-forest rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-gold-sm"
                          >
                            Log Payment
                          </button>
                        ) : (
                          <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest pr-4 select-none">
                            {e.checkout_request_id || 'Approved'}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Payment drawer overlay */}
      {isPaymentOpen && selectedEnrollment && (
        <div className="fixed inset-0 bg-charcoal/70 backdrop-blur-sm z-[100] flex justify-end animate-in fade-in duration-300">
          <div className="glass w-full max-w-md h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-white/10 bg-[#16181d]/90 overflow-y-auto">
            
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02] sticky top-0 z-10">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-gold font-display">Log Manual Payment Row</span>
                <h3 className="text-xl font-display font-black text-white italic uppercase tracking-tight mt-0.5">
                  PAYMENT: {selectedEnrollment.participant_name}
                </h3>
              </div>
              <button 
                onClick={() => setIsPaymentOpen(false)}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-colors border border-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitManualPayment} className="p-8 space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/40 font-bold uppercase tracking-wider">Program:</span>
                    <span className="text-white font-extrabold">{selectedEnrollment.programs?.name}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2 mt-2">
                    <span className="text-white/40 font-bold uppercase tracking-wider">Pricing Plan:</span>
                    <span className="text-gold font-extrabold uppercase tracking-widest">{selectedEnrollment.pricing_plan}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2 mt-2">
                    <span className="text-white/40 font-bold uppercase tracking-wider">Base Rate:</span>
                    <span className="text-white font-extrabold">KES {getEnrollmentPrice(selectedEnrollment).toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Payment Amount Collected (KES)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none focus:border-gold/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Payment Gateway Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'mpesa', label: 'M-Pesa' },
                      { id: 'cash', label: 'Cash' },
                      { id: 'bank', label: 'Bank' }
                    ].map(method => {
                      const isSel = paymentMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPaymentMethod(method.id)}
                          className={`py-3 rounded-xl border-2 font-bold text-[10px] uppercase tracking-widest transition-all ${isSel ? 'border-gold bg-gold/10 text-white font-black' : 'border-white/5 bg-white/5 text-white/40'}`}
                        >
                          {method.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {paymentMethod !== 'cash' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gold block">
                      {paymentMethod === 'mpesa' ? 'M-Pesa Transaction Ref (e.g. OER7Q8X9YZ)' : 'Bank Reference Number'}
                    </label>
                    <input
                      type="text"
                      placeholder="Enter verification code..."
                      value={mpesaRef}
                      onChange={(e) => setMpesaRef(e.target.value)}
                      required
                      className="w-full px-4 py-3.5 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm uppercase focus:outline-none focus:border-gold/30 placeholder-white/20"
                    />
                  </div>
                )}
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4.5 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 tracking-widest uppercase disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin text-forest" /> : 'APPROVE PAYMENT & SYNC'}
                </button>
                <p className="text-[9px] text-center text-white/30 font-bold uppercase tracking-wider mt-4">
                  Approving this logs the offline transaction and propagates stats to real-time sync ledgers instantly.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Student Enrollment Drawer */}
      {isNewEnrollmentOpen && (
        <div className="fixed inset-0 bg-charcoal/70 backdrop-blur-sm z-[100] flex justify-end animate-in fade-in duration-300">
          <div className="glass w-full max-w-md h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-white/10 bg-[#16181d]/90 overflow-y-auto">
            
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02] sticky top-0 z-10">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-gold font-display">Roster Operations</span>
                <h3 className="text-xl font-display font-black text-white italic uppercase tracking-tight mt-0.5">
                  New Student Enrollment
                </h3>
              </div>
              <button 
                onClick={() => setIsNewEnrollmentOpen(false)}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-colors border border-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Steps Indicator */}
            <div className="px-8 pt-6 pb-2">
              <div className="flex items-center justify-between">
                {[1, 2, 3].map(stepNum => (
                  <button
                    key={stepNum}
                    type="button"
                    onClick={() => {
                      if (stepNum < newEnrollmentStep) {
                        setNewEnrollmentStep(stepNum);
                      }
                    }}
                    className="flex flex-col items-center gap-1 flex-1 relative group"
                    disabled={stepNum > newEnrollmentStep}
                  >
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs transition-all ${
                      newEnrollmentStep === stepNum 
                        ? 'border-gold bg-gold text-forest font-black shadow-gold-sm' 
                        : newEnrollmentStep > stepNum
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-white/10 bg-white/5 text-white/30'
                    }`}>
                      {stepNum}
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-wider ${
                      newEnrollmentStep === stepNum ? 'text-gold' : 'text-white/40'
                    }`}>
                      {stepNum === 1 ? 'Student' : stepNum === 2 ? 'Parent' : 'Settings'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={submitNewEnrollment} className="p-8 space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-6">
                {/* STEP 1: Student Information */}
                {newEnrollmentStep === 1 && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Player / Athlete Name *</label>
                      <input
                        type="text"
                        value={newEnrollmentData.participant_name}
                        onChange={(e) => setNewEnrollmentData({ ...newEnrollmentData, participant_name: e.target.value })}
                        required
                        placeholder="Enter full name..."
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none focus:border-gold/30"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Age</label>
                        <input
                          type="number"
                          value={newEnrollmentData.participant_age}
                          onChange={(e) => setNewEnrollmentData({ ...newEnrollmentData, participant_age: e.target.value })}
                          placeholder="e.g. 12"
                          className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none focus:border-gold/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Gender</label>
                        <select
                          value={newEnrollmentData.gender}
                          onChange={(e) => setNewEnrollmentData({ ...newEnrollmentData, gender: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none focus:border-gold/30"
                        >
                          <option value="Male" className="bg-forest text-white">Male</option>
                          <option value="Female" className="bg-forest text-white">Female</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Experience Level</label>
                      <select
                        value={newEnrollmentData.prior_experience}
                        onChange={(e) => setNewEnrollmentData({ ...newEnrollmentData, prior_experience: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none focus:border-gold/30"
                      >
                        <option value="Beginner" className="bg-forest text-white">Beginner</option>
                        <option value="Intermediate" className="bg-forest text-white">Intermediate</option>
                        <option value="Advanced" className="bg-forest text-white">Advanced / Elite</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gold block">School or Club</label>
                      <input
                        type="text"
                        value={newEnrollmentData.school_club}
                        onChange={(e) => setNewEnrollmentData({ ...newEnrollmentData, school_club: e.target.value })}
                        placeholder="e.g. Hillcrest School"
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none focus:border-gold/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Medical Conditions & Allergies</label>
                      <textarea
                        value={newEnrollmentData.medical_conditions}
                        onChange={(e) => setNewEnrollmentData({ ...newEnrollmentData, medical_conditions: e.target.value })}
                        rows={2}
                        placeholder="Describe any allergies or conditions..."
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-medium text-sm focus:outline-none resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Athlete Photo (Optional)</label>
                      <div className="flex items-center gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                        <div className="relative w-16 h-16 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                          {newEnrollmentPhotoPreview ? (
                            <img src={newEnrollmentPhotoPreview} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Camera className="w-6 h-6 text-white/20" />
                          )}
                        </div>
                        <label className="flex-1 py-3 px-4 rounded-xl border border-dashed border-white/20 hover:border-gold text-white/60 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest text-center cursor-pointer">
                          Upload Photo
                          <input type="file" accept="image/*" className="hidden" onChange={handleNewEnrollmentPhotoChange} />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Parent / Guardian Information */}
                {newEnrollmentStep === 2 && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Parent / Guardian Name *</label>
                      <input
                        type="text"
                        value={newEnrollmentData.parent_name}
                        onChange={(e) => setNewEnrollmentData({ ...newEnrollmentData, parent_name: e.target.value })}
                        required
                        placeholder="Enter parent's full name..."
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none focus:border-gold/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Contact Phone Number *</label>
                      <input
                        type="tel"
                        value={newEnrollmentData.client_phone}
                        onChange={(e) => setNewEnrollmentData({ ...newEnrollmentData, client_phone: e.target.value })}
                        required
                        placeholder="e.g. +254 712 345 678"
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none focus:border-gold/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Communication Preference</label>
                      <select
                        value={newEnrollmentData.communication_pref}
                        onChange={(e) => setNewEnrollmentData({ ...newEnrollmentData, communication_pref: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none focus:border-gold/30"
                      >
                        <option value="whatsapp" className="bg-forest text-white">WhatsApp Preferred</option>
                        <option value="sms" className="bg-forest text-white">SMS Direct Alerts</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* STEP 3: Program & Settings */}
                {newEnrollmentStep === 3 && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Target Program *</label>
                      <select
                        value={newEnrollmentData.program_id}
                        onChange={(e) => setNewEnrollmentData({ ...newEnrollmentData, program_id: e.target.value })}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none focus:border-gold/30"
                      >
                        <option value="" disabled className="bg-forest text-white/50">Select program...</option>
                        {programs.map(prog => (
                          <option key={prog.id} value={prog.id.toString()} className="bg-forest text-white">{prog.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Pricing Plan</label>
                      <select
                        value={newEnrollmentData.pricing_plan}
                        onChange={(e) => setNewEnrollmentData({ ...newEnrollmentData, pricing_plan: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none focus:border-gold/30"
                      >
                        <option value="session" className="bg-forest text-white">Per Session / Walk-in</option>
                        <option value="monthly" className="bg-forest text-white">Monthly Cohort</option>
                        <option value="quarterly" className="bg-forest text-white">Quarterly Plan</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Enrollment Status</label>
                      <select
                        value={newEnrollmentData.status}
                        onChange={(e) => setNewEnrollmentData({ ...newEnrollmentData, status: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none focus:border-gold/30"
                      >
                        <option value="active" className="bg-forest text-white">Active Roster</option>
                        <option value="pending" className="bg-forest text-white">Pending Approval</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Initial Payment Status</label>
                      <select
                        value={newEnrollmentData.payment_status}
                        onChange={(e) => setNewEnrollmentData({ ...newEnrollmentData, payment_status: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none focus:border-gold/30"
                      >
                        <option value="pending" className="bg-forest text-white">Pending / Awaiting</option>
                        <option value="unpaid" className="bg-forest text-white">Unpaid Ledger</option>
                        <option value="fully_paid" className="bg-forest text-white">Fully Paid</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-white/5 flex gap-4">
                {newEnrollmentStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setNewEnrollmentStep(newEnrollmentStep - 1)}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold uppercase transition-all text-xs"
                  >
                    Back
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsNewEnrollmentOpen(false)}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold uppercase transition-all text-xs"
                  >
                    Cancel
                  </button>
                )}

                {newEnrollmentStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (newEnrollmentStep === 1 && !newEnrollmentData.participant_name) {
                        alert('Athlete name is required');
                        return;
                      }
                      if (newEnrollmentStep === 2 && (!newEnrollmentData.parent_name || !newEnrollmentData.client_phone)) {
                        alert('Parent name and phone number are required');
                        return;
                      }
                      setNewEnrollmentStep(newEnrollmentStep + 1);
                    }}
                    className="flex-1 py-4 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-1.5"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4 text-forest" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-4 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-forest" /> : 'REGISTER STUDENT'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Academy Cost Drawer */}
      {isExpenseOpen && (
        <div className="fixed inset-0 bg-charcoal/70 backdrop-blur-sm z-[100] flex justify-end animate-in fade-in duration-300">
          <div className="glass w-full max-w-md h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-white/10 bg-[#16181d]/90 overflow-y-auto">
            
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02] sticky top-0 z-10">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-gold font-display">Financial Logging System</span>
                <h3 className="text-xl font-display font-black text-white italic uppercase tracking-tight mt-0.5">
                  Log Academy Cost
                </h3>
              </div>
              <button 
                onClick={() => setIsExpenseOpen(false)}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-colors border border-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitAcademyExpense} className="p-8 space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Expense Amount (KES)</label>
                  <input
                    type="number"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    required
                    min="1"
                    placeholder="Enter cost value..."
                    className="w-full px-4 py-3.5 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none focus:border-gold/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Expense Category</label>
                  <select
                    value={expenseCategory}
                    onChange={(e: any) => setExpenseCategory(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none focus:border-gold/30 uppercase tracking-wider"
                  >
                    <option value="instructor" className="bg-forest-dark text-white">Instructor / Coach Payout</option>
                    <option value="maintenance" className="bg-forest-dark text-white">Maintenance & Equipment</option>
                    <option value="operations" className="bg-forest-dark text-white">Operations & Overhead</option>
                    <option value="marketing" className="bg-forest-dark text-white">Marketing & Flyers</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Link to Program (Optional)</label>
                  <select
                    value={expenseProgramId}
                    onChange={(e) => setExpenseProgramId(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none focus:border-gold/30 uppercase tracking-wider"
                  >
                    <option value="all" className="bg-forest-dark text-white">General Academy Overhead</option>
                    {programs.map(prog => (
                      <option key={prog.id} value={prog.id.toString()} className="bg-forest-dark text-white">{prog.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Description</label>
                  <textarea
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    required
                    rows={3}
                    placeholder="Enter expense breakdown, recipient details..."
                    className="w-full px-4 py-3.5 rounded-xl border border-white/10 bg-white/5 text-white font-medium text-sm focus:outline-none focus:border-gold/30 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Receipt Attachment (Optional)</label>
                  <div className="flex items-center gap-4">
                    <label className="flex-1 flex flex-col items-center justify-center py-6 border-2 border-dashed border-white/10 hover:border-gold/30 rounded-2xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all">
                      <UploadCloud className="w-8 h-8 text-gold mb-2" />
                      <span className="text-xs text-white/60 font-bold uppercase tracking-wider">
                        {expenseReceiptFile ? expenseReceiptFile.name : 'Upload Receipt Photo'}
                      </span>
                      <input type="file" accept="image/*" onChange={handleExpenseReceiptChange} className="hidden" />
                    </label>
                    {expenseReceiptPreview && (
                      <img 
                        src={expenseReceiptPreview} 
                        alt="Receipt preview" 
                        className="w-20 h-20 rounded-xl object-cover border border-white/10 shrink-0 shadow-md"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4.5 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 tracking-widest uppercase disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin text-forest" /> : 'SUBMIT ACADEMY COST'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Player Profile & Edit Drawer */}
      {isProfileOpen && selectedProfile && (
        <div className="fixed inset-0 bg-charcoal/70 backdrop-blur-sm z-[100] flex justify-end animate-in fade-in duration-300">
          <div className="glass w-full max-w-2xl h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-white/10 bg-[#16181d]/90 overflow-y-auto">
            
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02] sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors border border-white/10 text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-gold font-display">Athlete Executive File</span>
                  <h3 className="text-2xl font-display font-black text-white italic uppercase tracking-tight mt-0.5">
                    {isEditMode ? 'Edit Profile' : selectedProfile.participant_name}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditMode && (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="px-4 py-2 bg-gold hover:bg-white text-forest rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5 shrink-0" />
                    Edit Details
                  </button>
                )}
                <button 
                  onClick={() => setIsProfileOpen(false)}
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-colors border border-white/10 text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {isEditMode ? (
              /* PLAYER PROFILE EDIT MODE */
              <form onSubmit={submitProfileChanges} className="p-8 space-y-6">
                {/* Photo replacement */}
                <div className="flex items-center gap-6 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-white/10 shrink-0 bg-white/5">
                    {editedPhotoPreview ? (
                      <img src={editedPhotoPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20"><User className="w-10 h-10" /></div>
                    )}
                    <label className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity cursor-pointer text-center p-2 leading-tight">
                      <Camera className="w-4 h-4 mr-1 inline" /> Change
                      <input type="file" accept="image/*" onChange={handleProfilePhotoChange} className="hidden" />
                    </label>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-white font-extrabold text-sm uppercase">Athlete Passport Image</h4>
                    <p className="text-xs text-white/40 leading-relaxed font-medium">
                      Upload a passport photo size JPG or PNG of the child. Used for training registers and profile audits.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Participant Name</label>
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none focus:border-gold/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Participant Age</label>
                    <input
                      type="number"
                      value={editedAge}
                      onChange={(e) => setEditedAge(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none focus:border-gold/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Gender</label>
                    <select
                      value={editedGender}
                      onChange={(e) => setEditedGender(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none"
                    >
                      <option value="Male" className="bg-forest-dark text-white">Male</option>
                      <option value="Female" className="bg-forest-dark text-white">Female</option>
                      <option value="Other" className="bg-forest-dark text-white">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Pricing Plan</label>
                    <select
                      value={editedPricingPlan}
                      onChange={(e) => setEditedPricingPlan(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none"
                    >
                      <option value="session" className="bg-forest-dark text-white">Per Session</option>
                      <option value="monthly" className="bg-forest-dark text-white">Monthly Cohort</option>
                      <option value="term" className="bg-forest-dark text-white">Full Term Rate</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Parent Name</label>
                    <input
                      type="text"
                      value={editedParentName}
                      onChange={(e) => setEditedParentName(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none focus:border-gold/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Parent Phone Number</label>
                    <input
                      type="text"
                      value={editedPhone}
                      onChange={(e) => setEditedPhone(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none focus:border-gold/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Preferred Channel</label>
                    <select
                      value={editedCommPref}
                      onChange={(e) => setEditedCommPref(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none"
                    >
                      <option value="whatsapp" className="bg-forest-dark text-white">WhatsApp Messages</option>
                      <option value="sms" className="bg-forest-dark text-white">Standard SMS</option>
                      <option value="email" className="bg-forest-dark text-white">Email Newsletters</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Prior Experience</label>
                    <select
                      value={editedPriorExp}
                      onChange={(e) => setEditedPriorExp(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-sm focus:outline-none"
                    >
                      <option value="Beginner" className="bg-forest-dark text-white">Beginner Level</option>
                      <option value="Intermediate" className="bg-forest-dark text-white">Intermediate Player</option>
                      <option value="Advanced" className="bg-forest-dark text-white">Advanced Elite</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gold block">School or Local Sports Club</label>
                  <input
                    type="text"
                    value={editedSchoolClub}
                    onChange={(e) => setEditedSchoolClub(e.target.value)}
                    placeholder="Enter school or local team affiliation..."
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-medium text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Medical Conditions & Allergies</label>
                  <textarea
                    value={editedMedical}
                    onChange={(e) => setEditedMedical(e.target.value)}
                    rows={2}
                    placeholder="Describe any conditions, asthma, allergies or medication requirements..."
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-medium text-sm focus:outline-none resize-none"
                  />
                </div>

                {/* Enrollment status controls */}
                <div className="space-y-2 pt-4 border-t border-white/5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gold block">Enrollment Status Control</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'pending', label: 'Pending Roster', color: 'border-yellow-500 bg-yellow-500/10 text-yellow-400' },
                      { id: 'active', label: 'Active Roster', color: 'border-emerald-500 bg-emerald-500/10 text-emerald-400' },
                      { id: 'inactive', label: 'Inactive Roster', color: 'border-white/20 bg-white/5 text-white/50' },
                      { id: 'completed', label: 'Archived / Done', color: 'border-purple-500 bg-purple-500/10 text-purple-400' },
                      { id: 'cancelled', label: 'Cancelled / Expelled', color: 'border-red-500 bg-red-500/10 text-red-400' }
                    ].map(statusItem => {
                      const isSelected = editedStatus === statusItem.id;
                      return (
                        <button
                          key={statusItem.id}
                          type="button"
                          onClick={() => setEditedStatus(statusItem.id)}
                          className={`py-3 rounded-xl border-2 font-black text-[9px] uppercase tracking-widest transition-all ${isSelected ? statusItem.color : 'border-white/5 bg-white/5 text-white/30'}`}
                        >
                          {statusItem.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-white/30 font-medium leading-relaxed mt-2.5">
                    *Changing this updates registration state in Supabase and real-time outputs database webhooks sheets sync immediately.
                  </p>
                </div>

                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setIsEditMode(false)}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl text-xs uppercase tracking-widest border border-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-4 bg-gold hover:bg-white text-forest font-black rounded-xl text-xs uppercase tracking-widest transition-colors shadow-gold-sm flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              /* PLAYER PROFILE DETAILS VIEWING MODE */
              <div className="p-8 space-y-8">
                {/* Core Athlete Details Header Card */}
                <div className="p-6 rounded-[2rem] bg-white/[0.015] border border-white/5 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/10 bg-white/5 shrink-0 shadow-md">
                    {selectedProfile.passport_photo_url ? (
                      <img src={selectedProfile.passport_photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20"><User className="w-8 h-8" /></div>
                    )}
                  </div>
                  <div className="space-y-2 flex-1 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 justify-center sm:justify-start">
                      <h4 className="text-2xl font-display font-extrabold text-white uppercase italic tracking-tight">
                        {selectedProfile.participant_name}
                      </h4>
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest self-center ${selectedProfile.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : selectedProfile.status === 'completed' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {selectedProfile.status}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider">
                      Enrolled in: <strong className="text-white">{selectedProfile.programs?.name}</strong> • Plan: <strong className="text-gold uppercase tracking-widest">{selectedProfile.pricing_plan}</strong>
                    </p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-4 pt-4 border-t border-white/5 text-xs text-white/50">
                      <span>Age: <strong className="text-white">{selectedProfile.participant_age || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>Gender: <strong className="text-white">{selectedProfile.gender || 'Not Specified'}</strong></span>
                      <span>•</span>
                      <span>Comm: <strong className="text-gold uppercase font-extrabold tracking-widest">{selectedProfile.communication_pref}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Athlete Performance Progress Trends */}
                <div className="p-6 rounded-[2rem] bg-white/[0.015] border border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-gold" />
                    <h4 className="text-sm font-black uppercase tracking-wider text-white">Historical Performance Trends</h4>
                  </div>
                  
                  {(() => {
                    const playerAssessments = assessments
                      .filter(a => a.enrollment_id === selectedProfile.id)
                      .sort((a, b) => new Date(a.assessment_date).getTime() - new Date(b.assessment_date).getTime());
                    
                    const playerChartData = playerAssessments.map(a => ({
                      date: format(new Date(a.assessment_date), 'MMM d, yy'),
                      Technical: parseFloat(getRatingsAverage(a.technical_ratings).toFixed(1)),
                      Attitude: parseFloat(getRatingsAverage(a.attitude_ratings).toFixed(1))
                    }));

                    return playerChartData.length === 0 ? (
                      <div className="py-10 border border-dashed border-white/10 rounded-2xl text-center opacity-40 text-xs flex flex-col items-center justify-center">
                        <TrendingUp className="w-8 h-8 text-gold mb-2" />
                        <p className="font-bold text-white uppercase">No Assessment Logs Yet</p>
                        <p className="text-white/50 mt-0.5">Assigned coach must log player assessments in Coach Portal.</p>
                      </div>
                    ) : (
                      <div className="h-56 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={playerChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                            <XAxis dataKey="date" stroke="#666" fontSize={8} tickLine={false} />
                            <YAxis domain={[1, 5]} stroke="#666" fontSize={8} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '10px' }} />
                            <Line type="monotone" dataKey="Technical" stroke="#ffb800" strokeWidth={2} activeDot={{ r: 4 }} />
                            <Line type="monotone" dataKey="Attitude" stroke="#22c55e" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}
                </div>

                {/* Personal & Parental Contact Details */}
                <div className="p-6 rounded-[2rem] bg-white/[0.015] border border-white/5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <Briefcase className="w-4 h-4 text-gold" />
                    <h4 className="text-sm font-black uppercase tracking-wider text-white">Full Profile Audit Details</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs font-medium">
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-white/40 uppercase font-bold tracking-wider">Parent / Client Name:</span>
                      <span className="text-white font-extrabold">{selectedProfile.parent_name}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-white/40 uppercase font-bold tracking-wider">Parent Contact Phone:</span>
                      <span className="text-white font-extrabold">{selectedProfile.client_phone}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-white/40 uppercase font-bold tracking-wider">Prior Experience:</span>
                      <span className="text-white font-extrabold">{selectedProfile.prior_experience || 'Beginner'}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-white/40 uppercase font-bold tracking-wider">School / Sports Club:</span>
                      <span className="text-white font-extrabold">{selectedProfile.school_club || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between md:col-span-2 pb-2">
                      <span className="text-white/40 uppercase font-bold tracking-wider shrink-0 mr-4">Medical Conditions:</span>
                      <span className="text-white font-bold leading-relaxed">{selectedProfile.medical_conditions || 'None Declared'}</span>
                    </div>
                  </div>
                </div>

                {/* Coach Assessment Audit Logs List */}
                <div className="p-6 rounded-[2rem] bg-white/[0.015] border border-white/5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <MessageSquare className="w-4 h-4 text-gold" />
                    <h4 className="text-sm font-black uppercase tracking-wider text-white">Coach Assessment Logs History</h4>
                  </div>
                  
                  {(() => {
                    const technicalMetrics = {
                      outfield: [
                        { id: 'passing_short', label: 'Short Passing' },
                        { id: 'passing_long', label: 'Long Passing' },
                        { id: 'dribbling', label: 'Dribbling' },
                        { id: 'shooting', label: 'Shooting' },
                        { id: 'ball_mastery', label: 'Ball Mastery' },
                        { id: 'ball_control', label: 'Ball Control' }
                      ],
                      goalkeeper: [
                        { id: 'shot_stopping', label: 'Shot Stopping' },
                        { id: 'positioning', label: 'Positioning' },
                        { id: 'passing_short', label: 'Short Passing' },
                        { id: 'distribution_long', label: 'Distribution (Long)' },
                        { id: 'shooting_outfield', label: 'Shooting (Outfield)' },
                        { id: 'ball_control', label: 'Ball Control' }
                      ]
                    };

                    const attitudeMetrics = [
                      { id: 'teamwork', label: 'Teamwork & Conduct' },
                      { id: 'discipline', label: 'Discipline & Punctuality' },
                      { id: 'coachability', label: 'Coachability & Focus' }
                    ];

                    const playerAssessments = assessments
                      .filter(a => a.enrollment_id === selectedProfile.id)
                      .sort((a, b) => new Date(b.assessment_date).getTime() - new Date(a.assessment_date).getTime());
                    
                    return playerAssessments.length === 0 ? (
                      <p className="text-xs text-white/30 italic text-center py-4">No evaluations logged yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {playerAssessments.map(a => {
                          const tAvg = getRatingsAverage(a.technical_ratings);
                          const aAvg = getRatingsAverage(a.attitude_ratings);
                          return (
                            <div key={a.id} className="p-5 rounded-2.5xl bg-white/[0.015] border border-white/5 text-xs space-y-4 hover:border-white/10 transition-colors">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pb-3 border-b border-white/5">
                                <div>
                                  <span className="font-black text-white text-[13px] tracking-tight">
                                    {format(new Date(a.assessment_date), 'MMMM d, yyyy')}
                                  </span>
                                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5">
                                    Evaluated by: <span className="text-gold font-extrabold">{a.staff?.name || 'Attending Coach'}</span>
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${a.attention_flag === 'urgent' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : a.attention_flag === 'concern' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-transparent text-white/30'}`}>
                                    {a.attention_flag !== 'none' ? `${a.attention_flag.replace('_', ' ')} flag` : ''}
                                  </span>
                                  <span className="px-2.5 py-0.5 rounded bg-gold/10 border border-gold/20 text-gold font-black uppercase text-[9px] tracking-widest">
                                    Grade {a.overall_grade}
                                  </span>
                                </div>
                              </div>

                              {/* Granular Ratings Sections */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                                {/* Technical Metrics */}
                                <div className="space-y-3">
                                  <h5 className="text-[10px] font-black uppercase tracking-widest text-gold mb-2 border-b border-white/5 pb-1">
                                    Technical Breakdown ({a.player_type})
                                  </h5>
                                  <div className="space-y-2">
                                    {(technicalMetrics[a.player_type === 'goalkeeper' ? 'goalkeeper' : 'outfield']).map(metric => {
                                      const rating = a.technical_ratings?.[metric.id] || 0;
                                      const note = a.technical_notes?.[metric.id];
                                      return (
                                        <div key={metric.id} className="space-y-1 bg-white/[0.005] p-2 rounded-xl border border-white/5">
                                          <div className="flex justify-between items-center text-[11px]">
                                            <span className="text-white/60 font-medium">{metric.label}</span>
                                            <div className="flex items-center gap-1">
                                              {[1, 2, 3, 4, 5].map(star => (
                                                <div 
                                                  key={star} 
                                                  className={`w-1.5 h-1.5 rounded-full ${star <= rating ? 'bg-gold shadow-gold-sm' : 'bg-white/10'}`} 
                                                />
                                              ))}
                                              <span className="text-gold font-bold ml-1.5 text-[10px]">{rating}/5</span>
                                            </div>
                                          </div>
                                          {note && (
                                            <p className="text-[10px] text-white/40 italic leading-relaxed pl-1.5 border-l border-l-gold-muted/30 mt-0.5">
                                              {note}
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Attitude & Conduct Metrics */}
                                <div className="space-y-3">
                                  <h5 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2 border-b border-white/5 pb-1">
                                    Attitude &amp; Conduct
                                  </h5>
                                  <div className="space-y-2">
                                    {attitudeMetrics.map(metric => {
                                      const rating = a.attitude_ratings?.[metric.id] || 0;
                                      const note = a.attitude_notes?.[metric.id];
                                      return (
                                        <div key={metric.id} className="space-y-1 bg-white/[0.005] p-2 rounded-xl border border-white/5">
                                          <div className="flex justify-between items-center text-[11px]">
                                            <span className="text-white/60 font-medium">{metric.label}</span>
                                            <div className="flex items-center gap-1">
                                              {[1, 2, 3, 4, 5].map(star => (
                                                <div 
                                                  key={star} 
                                                  className={`w-1.5 h-1.5 rounded-full ${star <= rating ? 'bg-emerald-400 shadow-sm shadow-emerald-400/20' : 'bg-white/10'}`} 
                                                />
                                              ))}
                                              <span className="text-emerald-400 font-bold ml-1.5 text-[10px]">{rating}/5</span>
                                            </div>
                                          </div>
                                          {note && (
                                            <p className="text-[10px] text-white/40 italic leading-relaxed pl-1.5 border-l border-white/10 mt-0.5">
                                              {note}
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>

                              {/* Averages and Summary Notes */}
                              <div className="pt-3 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-medium text-white/50">
                                <div className="flex items-center justify-between bg-white/[0.01] p-2.5 rounded-xl border border-white/5">
                                  <span>Technical Avg:</span>
                                  <strong className="text-white text-[12px]">{tAvg.toFixed(1)} / 5.0</strong>
                                </div>
                                <div className="flex items-center justify-between bg-white/[0.01] p-2.5 rounded-xl border border-white/5">
                                  <span>Attitude Avg:</span>
                                  <strong className="text-emerald-400 text-[12px]">{aAvg.toFixed(1)} / 5.0</strong>
                                </div>
                              </div>

                              {a.focus_areas && (
                                <div className="p-2.5 rounded-xl bg-gold/5 border border-gold/10 text-[10px] leading-relaxed">
                                  <span className="font-extrabold uppercase text-gold tracking-widest block mb-1">Focus Areas:</span>
                                  <p className="text-white/70 font-medium">{a.focus_areas}</p>
                                </div>
                              )}

                              {a.personal_note && (
                                <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 text-[11px] leading-relaxed italic">
                                  <span className="font-bold text-white/40 uppercase tracking-widest block not-italic text-[9px] mb-1">General Review Note:</span>
                                  <p className="text-white/60 font-medium">"{a.personal_note}"</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Floating Roster Bulk Action Toolbar (Priority 2) */}
      {selectedEnrollmentIds.length > 0 && (staff?.role === 'academy_coo' || staff?.role === 'super_admin') && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-forest-dark/90 backdrop-blur-md border border-white/10 px-6 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[90] flex items-center gap-6 animate-slide-up">
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase text-gold tracking-widest">{selectedEnrollmentIds.length} Selected</span>
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-tight">Bulk student roster actions</span>
          </div>

          <div className="w-px h-8 bg-white/10" />

          <div className="flex gap-2">
            <button
              onClick={handleBulkConfirmEnrollment}
              disabled={isBulkSubmitting}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve Active
            </button>
            <button
              onClick={handleBulkMarkPaid}
              disabled={isBulkSubmitting}
              className="flex items-center gap-2 px-4 py-2.5 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
            >
              <DollarSign className="w-3.5 h-3.5" />
              Mark Paid
            </button>
            <button
              onClick={() => setIsBulkSmsOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Send SMS
            </button>
          </div>

          <div className="w-px h-8 bg-white/10" />

          <button 
            onClick={() => setSelectedEnrollmentIds([])}
            className="text-[10px] font-black uppercase text-white/40 hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* --- MODAL: BULK SMS COMPOSER FOR ENROLLMENTS (Priority 2) --- */}
      {isBulkSmsOpen && selectedEnrollmentIds.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsBulkSmsOpen(false)} />
          <div className="relative bg-charcoal border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <div>
                <h2 className="text-xl font-display font-black tracking-tight text-white uppercase flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-purple-400" /> Compose Bulk SMS
                </h2>
                <p className="text-white/40 text-xs mt-0.5">Sending alert notifications to {selectedEnrollmentIds.length} parents</p>
              </div>
              <button onClick={() => setIsBulkSmsOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleBulkSendEnrollmentSms} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gold uppercase tracking-wider mb-1.5">SMS Body Message</label>
                <textarea 
                  required
                  rows={4}
                  value={bulkSmsText}
                  onChange={(e) => setBulkSmsText(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all resize-none"
                  placeholder="Dear Parent, your child's training schedule at MVSA Academy has been updated. Please check details. Thank you!"
                />
                <span className="text-[10px] text-white/30 block mt-1">Characters: {bulkSmsText.length} | SMS count estimation: {Math.ceil(bulkSmsText.length / 160)}</span>
              </div>

              {/* Templates */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-gold uppercase tracking-widest block">Quick Templates</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Enrollment Approved', text: 'Dear Parent, your child\'s enrollment request at MVSA Academy has been approved successfully! Welcome to the squad.' },
                    { label: 'Fee Outstanding', text: 'Dear Parent, please note that registration fees are due for your child\'s training at MVSA. Please log payment.' },
                    { label: 'Schedule Postponed', text: 'Dear Parent, today\'s training session at MVSA Academy has been postponed due to heavy weather. Check updates.' }
                  ].map((tpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setBulkSmsText(tpl.text)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-[10px] font-bold text-white/60 hover:text-white transition-all"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsBulkSmsOpen(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isBulkSubmitting || !bulkSmsText.trim()}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-purple-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isBulkSubmitting ? 'Sending...' : 'Dispatch SMS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
