'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format } from 'date-fns';
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Image as ImageIcon, 
  FileText, 
  Trash2,
  X,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/components/AuthContext';

export default function ExpensesPage() {
  const supabase = createClient();
  const { staff } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Scope filter state
  const [scopeFilter, setScopeFilter] = useState<'all' | 'arena' | 'academy'>('all');

  // Form state
  const [formData, setFormData] = useState({
    category: 'operations',
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    is_academy: false,
    program_id: ''
  });
  const [file, setFile] = useState<File | null>(null);

  // Edit and Context menu state
  const [activeMenuExpenseId, setActiveMenuExpenseId] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    id: 0,
    category: 'operations',
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    is_academy: false,
    program_id: ''
  });
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Selection and Bulk Actions state (Priority 2)
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<number[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isSuperAdmin = (staff?.role as string) === 'super_admin';

  const toggleSelectExpense = (id: number) => {
    setSelectedExpenseIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllExpenses = (visibleExpenses: any[]) => {
    const visibleIds = visibleExpenses.map(e => e.id);
    const allSelected = visibleIds.every(id => selectedExpenseIds.includes(id));
    if (allSelected) {
      setSelectedExpenseIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedExpenseIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleBulkDeleteExpenses = async () => {
    if (selectedExpenseIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete the ${selectedExpenseIds.length} selected expenses?`)) return;

    setIsBulkDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Your session is unauthenticated or expired. Please re-login.');
      }

      const { error } = await supabase
        .from('expenses')
        .delete()
        .in('id', selectedExpenseIds);

      if (error) throw error;

      alert(`Successfully deleted ${selectedExpenseIds.length} expenses!`);
      setSelectedExpenseIds([]);
      fetchExpenses();
    } catch (err: any) {
      alert(`Bulk delete error: ${err.message}`);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Filtered expenses (Priority 5)
  const filteredExpenses = expenses.filter(e => {
    const matchesScope = scopeFilter === 'arena' ? !e.is_academy : scopeFilter === 'academy' ? e.is_academy : true;
    const matchesSearch = searchQuery ? (e.description || '').toLowerCase().includes(searchQuery.toLowerCase()) : true;
    return matchesScope && matchesSearch;
  });

  useEffect(() => {
    if (staff) {
      fetchExpenses();
    }
    fetchPrograms();
  }, [staff]);

  async function fetchPrograms() {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('is_active', true);
    if (!error && data) {
      setPrograms(data);
    }
  }

  async function fetchExpenses() {
    setIsLoading(true);
    let query = supabase
      .from('expenses')
      .select(`
        *,
        logged_by_staff:logged_by (name),
        programs (name)
      `);

    if (staff?.role === 'academy_coo') {
      query = query.eq('is_academy', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data) {
      setExpenses(data);
    }
    setIsLoading(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let receipt_url = null;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `receipts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filePath, file);

        if (uploadError) {
          // Fallback to 'player-profiles' if receipts bucket is missing/unconfigured
          const { error: fallbackError } = await supabase.storage
            .from('player-profiles')
            .upload(`receipts/${fileName}`, file);
          
          if (fallbackError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from('player-profiles')
            .getPublicUrl(`receipts/${fileName}`);
          
          receipt_url = publicUrl;
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('receipts')
            .getPublicUrl(filePath);
          
          receipt_url = publicUrl;
        }
      }

      // Ensure the Supabase client session is hydrated on the client before writing,
      // so triggers or RLS policies successfully identify the admin user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Your session is unauthenticated or expired. Please re-login.');
      }

      const { data: userData } = await supabase.auth.getUser();

      const { error: insertError } = await supabase
        .from('expenses')
        .insert([{
          category: formData.category,
          amount: parseFloat(formData.amount),
          description: formData.description,
          receipt_url,
          logged_by: userData.user?.id,
          is_academy: formData.is_academy,
          stream: formData.is_academy ? 'programs' : 'venues',
          program_id: formData.is_academy && formData.program_id ? parseInt(formData.program_id) : null,
          created_at: new Date(formData.date).toISOString()
        }]);

      if (insertError) throw insertError;

      setIsModalOpen(false);
      setFormData({
        category: 'operations',
        amount: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        is_academy: false,
        program_id: ''
      });
      setFile(null);
      fetchExpenses();
    } catch (error: any) {
      alert(error.message || 'Error saving expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    setIsEditSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Your session is unauthenticated or expired. Please re-login.');
      }

      const { error: updateError } = await supabase
        .from('expenses')
        .update({
          category: editFormData.category,
          amount: parseFloat(editFormData.amount),
          description: editFormData.description,
          is_academy: editFormData.is_academy,
          stream: editFormData.is_academy ? 'programs' : 'venues',
          program_id: editFormData.is_academy && editFormData.program_id ? parseInt(editFormData.program_id) : null,
          created_at: new Date(editFormData.date).toISOString()
        })
        .eq('id', selectedExpense.id);

      if (updateError) throw updateError;

      alert('Expense updated successfully!');
      setIsEditModalOpen(false);
      setSelectedExpense(null);
      fetchExpenses();
    } catch (error: any) {
      alert(error.message || 'Error updating expense');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expense: any) => {
    if (!window.confirm(`Are you sure you want to delete this expense for "${expense.description}"?`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Your session is unauthenticated or expired. Please re-login.');
      }

      const { error: deleteError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expense.id);

      if (deleteError) throw deleteError;

      alert('Expense deleted successfully!');
      fetchExpenses();
    } catch (error: any) {
      alert(error.message || 'Error deleting expense');
    } finally {
      setActiveMenuExpenseId(null);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'instructor': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'maintenance': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'operations': return 'bg-green-100 text-green-800 border-green-200';
      case 'marketing': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6 lg:p-10 animate-entrance min-h-full">
      <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-1 bg-gold rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">Financials</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tighter leading-none italic uppercase">
            Expenses
          </h1>
          <p className="text-white/40 text-sm font-medium mt-1">Track and manage facility operational costs.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 spring-bounce hover:scale-[1.02] active:scale-[0.98] group"
          >
            <Plus className="w-4 h-4 text-forest stroke-[2.5px]" /> 
            LOG EXPENSE
          </button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass p-6 rounded-3xl shadow-pitch hover:border-white/10 transition-all">
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5">Arena Facility Operations</p>
          <p className="text-3xl font-display font-extrabold text-white italic">
            KES {expenses.filter(e => !e.is_academy).reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-white/30 font-medium mt-1">General arena running costs</p>
        </div>
        <div className="glass p-6 rounded-3xl shadow-pitch hover:border-white/10 transition-all">
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5">Academy Operations</p>
          <p className="text-3xl font-display font-extrabold text-gold italic">
            KES {expenses.filter(e => e.is_academy).reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-gold/30 font-medium mt-1">Segregated youth/fitness program costs</p>
        </div>
        <div className="glass p-6 rounded-3xl shadow-pitch hover:border-white/10 transition-all">
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5">Total Combined Costs</p>
          <p className="text-3xl font-display font-extrabold text-white italic">
            KES {expenses.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-white/30 font-medium mt-1">Total combined monthly cash outflows</p>
        </div>
      </div>

      <div className="relative group mb-10">
        <div className="absolute -inset-1 bg-gradient-to-r from-gold/10 to-gold-muted/5 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        
        <div className="relative glass rounded-[2rem] overflow-hidden shadow-pitch">
          <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/[0.01]">
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button 
                onClick={() => setScopeFilter('all')}
                className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all ${scopeFilter === 'all' ? 'bg-gold border-gold text-forest font-extrabold' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
              >
                All Operations
              </button>
              <button 
                onClick={() => setScopeFilter('arena')}
                className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all ${scopeFilter === 'arena' ? 'bg-gold border-gold text-forest font-extrabold' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
              >
                Arena Only
              </button>
              <button 
                onClick={() => setScopeFilter('academy')}
                className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all ${scopeFilter === 'academy' ? 'bg-gold border-gold text-forest font-extrabold' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
              >
                Academy Only
              </button>
            </div>
            
            <div className="relative w-full sm:w-auto">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input 
                type="text" 
                placeholder="Search description..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-6 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none w-full sm:w-64 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="scrollbar-hide overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  {isSuperAdmin && (
                    <th className="pl-8 py-5 w-12 text-center">
                      <input 
                        type="checkbox" 
                        checked={filteredExpenses.length > 0 && filteredExpenses.every(e => selectedExpenseIds.includes(e.id))}
                        onChange={() => toggleSelectAllExpenses(filteredExpenses)}
                        className="w-4 h-4 bg-white/5 border border-white/10 rounded focus:ring-gold text-gold cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Date</th>
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Category</th>
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Business Unit</th>
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Description</th>
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Amount</th>
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Receipt</th>
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Logged By</th>
                  <th className="px-8 py-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={isSuperAdmin ? 9 : 8} className="px-8 py-6 h-12 bg-white/5"></td>
                    </tr>
                  ))
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 9 : 8} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center opacity-40">
                        <Receipt className="w-12 h-12 mb-4 text-gold" />
                        <p className="font-bold text-lg text-white">No expenses logged yet</p>
                        <p className="text-sm text-charcoal-light">No records found matching filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-white/[0.02] transition-colors">
                      {isSuperAdmin && (
                        <td className="pl-8 py-6 w-12 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedExpenseIds.includes(expense.id)}
                            onChange={() => toggleSelectExpense(expense.id)}
                            className="w-4 h-4 bg-white/5 border border-white/10 rounded focus:ring-gold text-gold cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-8 py-6 text-sm font-medium text-charcoal-light">
                        {format(new Date(expense.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border bg-white/5 text-white/80 border-white/10`}>
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        {expense.is_academy ? (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider">
                              Academy
                            </span>
                            {expense.programs?.name && (
                              <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                                {expense.programs.name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-white/5 text-white/55 border border-white/10 text-[9px] font-black uppercase tracking-wider">
                            Arena Operations
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-sm font-medium max-w-xs truncate text-white">
                        {expense.description}
                      </td>
                      <td className="px-8 py-6 font-black text-white text-lg">
                        KES {expense.amount.toLocaleString()}
                      </td>
                      <td className="px-8 py-6">
                        {expense.receipt_url ? (
                          <a 
                            href={expense.receipt_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-2 text-gold hover:text-white transition-colors font-bold text-xs"
                          >
                            <ImageIcon className="w-4 h-4" /> VIEW
                          </a>
                        ) : (
                          <span className="text-[10px] font-bold text-white/40 uppercase italic">No Receipt</span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-xs font-bold text-charcoal-light/75">
                        {expense.logged_by_staff?.name || 'Unknown'}
                      </td>
                      <td className="px-8 py-6 text-right">
                        {staff?.role !== 'boss' ? (
                          <div className="relative inline-block text-left">
                            <button 
                              onClick={() => setActiveMenuExpenseId(activeMenuExpenseId === expense.id ? null : expense.id)}
                              className="p-2.5 hover:bg-white/5 rounded-xl transition-all relative"
                            >
                              <MoreVertical className="w-4 h-4 text-white/40 hover:text-white" />
                            </button>
                            
                            {activeMenuExpenseId === expense.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-40 bg-transparent" 
                                  onClick={() => setActiveMenuExpenseId(null)}
                                />
                                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-charcoal border border-white/10 shadow-2xl z-50 overflow-hidden divide-y divide-white/5 py-1 text-left animate-in fade-in slide-in-from-top-2 duration-200">
                                  <button
                                    onClick={() => {
                                      setSelectedExpense(expense);
                                      setEditFormData({
                                        id: expense.id,
                                        category: expense.category,
                                        amount: expense.amount.toString(),
                                        description: expense.description,
                                        date: format(new Date(expense.created_at), 'yyyy-MM-dd'),
                                        is_academy: expense.is_academy,
                                        program_id: expense.program_id?.toString() || ''
                                      });
                                      setIsEditModalOpen(true);
                                      setActiveMenuExpenseId(null);
                                    }}
                                    className="w-full px-4 py-2.5 text-xs font-bold text-white/80 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-colors"
                                  >
                                    Edit Expense
                                  </button>
                                  <button
                                    onClick={() => handleDeleteExpense(expense)}
                                    className="w-full px-4 py-2.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                                  >
                                    Delete Expense
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest select-none pr-4">Log Only</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Log Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/10">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h2 className="text-2xl font-display font-extrabold italic tracking-tight text-white">LOG NEW EXPENSE</h2>
                <p className="text-gold text-[10px] font-black uppercase tracking-widest mt-1">Operational Cost Tracking</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gold">Category</label>
                  <select 
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-bold text-sm appearance-none"
                  >
                    <option value="instructor" className="bg-forest-dark text-white">Instructor Payout</option>
                    <option value="maintenance" className="bg-forest-dark text-white">Maintenance</option>
                    <option value="operations" className="bg-forest-dark text-white">General Operations</option>
                    <option value="marketing" className="bg-forest-dark text-white">Marketing</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gold">Date</label>
                  <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-bold text-sm"
                  />
                </div>
              </div>

              {/* Segregated Business Unit toggles */}
              <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-white block">Is Academy Expense?</label>
                    <span className="text-[10px] text-white/30 font-medium">Toggle if this belongs to youth/fitness programs</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_academy: !formData.is_academy })}
                    className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${formData.is_academy ? 'bg-gold animate-pulse' : 'bg-white/10'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-forest transition-all duration-300 ${formData.is_academy ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {formData.is_academy && (
                  <div className="space-y-2 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="text-xs font-black uppercase tracking-widest text-gold">Bind to Program</label>
                    <select
                      value={formData.program_id}
                      onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-bold text-sm appearance-none"
                    >
                      <option value="" className="bg-forest-dark text-white">General Academy (No specific program)</option>
                      {programs.map(prog => (
                        <option key={prog.id} value={prog.id.toString()} className="bg-forest-dark text-white">{prog.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gold">Amount (KES)</label>
                <input 
                  type="number" 
                  required
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-display font-bold text-xl italic"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gold">Description</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="What was this for?"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-medium text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gold">Receipt / Invoice</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden" 
                    id="receipt-upload"
                  />
                  <label 
                    htmlFor="receipt-upload"
                    className={`
                      w-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all
                      ${file ? 'border-success bg-success/5' : 'border-white/10 bg-white/5 hover:border-gold hover:bg-gold/5'}
                    `}
                  >
                    {file ? (
                      <div className="flex flex-col items-center">
                        <FileText className="w-8 h-8 text-success mb-2" />
                        <span className="text-xs font-bold text-success truncate max-w-[200px]">{file.name}</span>
                        <span className="text-[10px] text-success/60 uppercase font-bold mt-1">File Selected</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <ImageIcon className="w-8 h-8 text-white/40 mb-2 group-hover:text-gold transition-colors" />
                        <span className="text-xs font-bold text-white/40 group-hover:text-gold transition-colors">Click to upload receipt</span>
                        <span className="text-[10px] text-white/30 uppercase font-bold mt-1">Image files only</span>
                      </div>
                    )}
                  </label>
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
                      SAVE EXPENSE
                      <ChevronRight className="w-5 h-5 text-forest" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {isEditModalOpen && selectedExpense && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/10">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h2 className="text-2xl font-display font-extrabold italic tracking-tight text-white">EDIT EXPENSE</h2>
                <p className="text-gold text-[10px] font-black uppercase tracking-widest mt-1">Operational Cost Management</p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleEditExpense} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gold">Category</label>
                  <select 
                    required
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-bold text-sm appearance-none"
                  >
                    <option value="instructor" className="bg-forest-dark text-white">Instructor Payout</option>
                    <option value="maintenance" className="bg-forest-dark text-white">Maintenance</option>
                    <option value="operations" className="bg-forest-dark text-white">General Operations</option>
                    <option value="marketing" className="bg-forest-dark text-white">Marketing</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gold">Date</label>
                  <input 
                    type="date" 
                    required
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-bold text-sm"
                  />
                </div>
              </div>

              {/* Segregated Business Unit toggles */}
              <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-white block">Is Academy Expense?</label>
                    <span className="text-[10px] text-white/30 font-medium">Toggle if this belongs to youth/fitness programs</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, is_academy: !editFormData.is_academy })}
                    className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${editFormData.is_academy ? 'bg-gold' : 'bg-white/10'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-forest transition-all duration-300 ${editFormData.is_academy ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {editFormData.is_academy && (
                  <div className="space-y-2 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="text-xs font-black uppercase tracking-widest text-gold">Bind to Program</label>
                    <select
                      value={editFormData.program_id}
                      onChange={(e) => setEditFormData({ ...editFormData, program_id: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-bold text-sm appearance-none"
                    >
                      <option value="" className="bg-forest-dark text-white">General Academy (No specific program)</option>
                      {programs.map(prog => (
                        <option key={prog.id} value={prog.id.toString()} className="bg-forest-dark text-white">{prog.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gold">Amount (KES)</label>
                <input 
                  type="number" 
                  required
                  placeholder="0.00"
                  value={editFormData.amount}
                  onChange={(e) => setEditFormData({...editFormData, amount: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-display font-bold text-xl italic"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gold">Description</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="What was this for?"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-medium text-sm"
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold uppercase transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isEditSubmitting}
                  className="flex-1 py-4 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 spring-bounce hover:scale-[1.01] active:scale-[0.99] uppercase text-sm tracking-[0.15em]"
                >
                  {isEditSubmitting ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Floating Bulk Action Toolbar (Priority 2) */}
      {selectedExpenseIds.length > 0 && isSuperAdmin && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-forest-dark/90 backdrop-blur-md border border-white/10 px-6 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[90] flex items-center gap-6 animate-slide-up">
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase text-gold tracking-widest">{selectedExpenseIds.length} Selected</span>
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-tight">Bulk expense actions</span>
          </div>

          <div className="w-px h-8 bg-white/10" />

          <button
            onClick={handleBulkDeleteExpenses}
            disabled={isBulkDeleting}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Selected
          </button>

          <div className="w-px h-8 bg-white/10" />

          <button 
            onClick={() => setSelectedExpenseIds([])}
            className="text-[10px] font-black uppercase text-white/40 hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

