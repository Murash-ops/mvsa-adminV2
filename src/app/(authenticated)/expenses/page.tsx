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

export default function ExpensesPage() {
  const supabase = createClient();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    category: 'operations',
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchExpenses();
  }, []);

  async function fetchExpenses() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        logged_by_staff:logged_by (name)
      `)
      .order('created_at', { ascending: false });

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

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(filePath);
        
        receipt_url = publicUrl;
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
          created_at: new Date(formData.date).toISOString()
        }]);

      if (insertError) throw insertError;

      setIsModalOpen(false);
      setFormData({
        category: 'operations',
        amount: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd')
      });
      setFile(null);
      fetchExpenses();
    } catch (error: any) {
      alert(error.message || 'Error saving expense');
    } finally {
      setIsSubmitting(false);
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
    <div className="flex flex-col flex-1 p-8">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Expenses</h1>
          <p className="text-charcoal-light">Track and manage facility operational costs.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-forest text-white rounded-xl text-sm font-bold hover:bg-forest-dark transition-all shadow-lg shadow-forest/20 active:scale-95"
          >
            <Plus className="w-4 h-4" /> LOG EXPENSE
          </button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-border-color shadow-sm">
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Total This Month</p>
          <p className="text-3xl font-display font-bold text-forest italic">
            KES {expenses.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-border-color shadow-sm">
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Pending Receipts</p>
          <p className="text-3xl font-display font-bold text-gold italic">
            {expenses.filter(e => !e.receipt_url).length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-border-color shadow-sm">
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Top Category</p>
          <p className="text-3xl font-display font-bold text-charcoal italic">Operations</p>
        </div>
      </div>

      <div className="bg-white border border-border-color rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border-color flex justify-between items-center bg-surface/30">
          <div className="flex gap-2">
            <button className="px-4 py-1.5 bg-white border border-border-color rounded-lg text-xs font-bold hover:bg-surface transition-colors flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" /> All Categories
            </button>
            <button className="px-4 py-1.5 bg-white border border-border-color rounded-lg text-xs font-bold hover:bg-surface transition-colors">
              Last 30 Days
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-light" />
            <input 
              type="text" 
              placeholder="Search description..." 
              className="pl-10 pr-4 py-1.5 bg-white border border-border-color rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gold/50 w-64"
            />
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface/50 border-b border-border-color">
              <th className="px-6 py-4 text-xs uppercase font-bold text-charcoal-light tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs uppercase font-bold text-charcoal-light tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs uppercase font-bold text-charcoal-light tracking-wider">Description</th>
              <th className="px-6 py-4 text-xs uppercase font-bold text-charcoal-light tracking-wider">Amount</th>
              <th className="px-6 py-4 text-xs uppercase font-bold text-charcoal-light tracking-wider">Receipt</th>
              <th className="px-6 py-4 text-xs uppercase font-bold text-charcoal-light tracking-wider">Logged By</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-color">
            {isLoading ? (
              [1, 2, 3, 4, 5].map(i => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={7} className="px-6 py-6 h-12 bg-surface/10"></td>
                </tr>
              ))
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center opacity-40">
                    <Receipt className="w-12 h-12 mb-4" />
                    <p className="font-bold text-lg">No expenses logged yet</p>
                    <p className="text-sm">Click the button above to start tracking costs.</p>
                  </div>
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-surface/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium">
                    {format(new Date(expense.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getCategoryColor(expense.category)}`}>
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium max-w-xs truncate">
                    {expense.description}
                  </td>
                  <td className="px-6 py-4 font-bold text-forest">
                    KES {expense.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {expense.receipt_url ? (
                      <a 
                        href={expense.receipt_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 text-gold hover:text-gold-dark transition-colors font-bold text-xs"
                      >
                        <ImageIcon className="w-4 h-4" /> VIEW
                      </a>
                    ) : (
                      <span className="text-[10px] font-bold text-muted uppercase italic">No Receipt</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-charcoal-light">
                    {expense.logged_by_staff?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-surface rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4 text-charcoal-light" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Log Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-border-color flex justify-between items-center bg-forest text-white">
              <div>
                <h2 className="text-2xl font-display font-bold italic tracking-tight">LOG NEW EXPENSE</h2>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">Operational Cost Tracking</p>
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
                  <label className="text-xs font-black uppercase tracking-widest text-muted">Category</label>
                  <select 
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-border-color bg-surface focus:outline-none focus:ring-2 focus:ring-gold/50 font-bold text-sm appearance-none"
                  >
                    <option value="instructor">Instructor Payout</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="operations">General Operations</option>
                    <option value="marketing">Marketing</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted">Date</label>
                  <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-border-color bg-surface focus:outline-none focus:ring-2 focus:ring-gold/50 font-bold text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted">Amount (KES)</label>
                <input 
                  type="number" 
                  required
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-border-color bg-surface focus:outline-none focus:ring-2 focus:ring-gold/50 font-display font-bold text-xl italic"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted">Description</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="What was this for?"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-border-color bg-surface focus:outline-none focus:ring-2 focus:ring-gold/50 font-medium text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted">Receipt / Invoice</label>
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
                      ${file ? 'border-success bg-success/5' : 'border-border-color bg-surface hover:border-gold hover:bg-gold/5'}
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
                        <ImageIcon className="w-8 h-8 text-muted mb-2 group-hover:text-gold transition-colors" />
                        <span className="text-xs font-bold text-muted group-hover:text-gold transition-colors">Click to upload receipt</span>
                        <span className="text-[10px] text-muted/60 uppercase font-bold mt-1">Image files only</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-3 bg-gold text-forest px-8 py-4 rounded-2xl font-bold text-sm tracking-[0.2em] uppercase transition-all shadow-xl shadow-gold/20 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      SAVING...
                    </>
                  ) : (
                    <>
                      SAVE EXPENSE
                      <ChevronRight className="w-5 h-5" />
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
