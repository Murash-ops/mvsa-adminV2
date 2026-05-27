'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format } from 'date-fns';
import { 
  Mail, 
  Phone, 
  MessageSquare, 
  Calendar, 
  CheckCircle, 
  Loader2, 
  Inbox, 
  ShieldCheck 
} from 'lucide-react';

type Inquiry = {
  id: number;
  name: string;
  phone: string;
  message: string;
  status: 'unread' | 'read' | 'resolved';
  created_at: string;
};

export default function InquiriesPage() {
  const supabase = createClient();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<number | null>(null);

  const fetchInquiries = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setInquiries(data as Inquiry[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const updateStatus = async (id: number, newStatus: Inquiry['status']) => {
    setIsSubmitting(id);
    const { error } = await supabase
      .from('inquiries')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert('Error updating status: ' + error.message);
    } else {
      setInquiries(prev => 
        prev.map(inq => inq.id === id ? { ...inq, status: newStatus } : inq)
      );
    }
    setIsSubmitting(null);
  };

  const stats = {
    total: inquiries.length,
    unread: inquiries.filter(i => i.status === 'unread').length,
    resolved: inquiries.filter(i => i.status === 'resolved').length
  };

  return (
    <div className="flex flex-col flex-1 p-6 lg:p-10 animate-entrance min-h-full">
      {/* Header */}
      <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-1 bg-gold rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">CRM & Leads</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tighter leading-none italic uppercase">
            Inquiries
          </h1>
          <p className="text-white/40 text-sm font-medium mt-1">
            Review and resolve public contact forms submitted by prospective clients.
          </p>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total Inquiries', value: stats.total, icon: Inbox, color: 'text-gold', bg: 'bg-white/5', border: 'border-white/10' },
          { label: 'Unread Messages', value: stats.unread, icon: Mail, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { label: 'Resolved Tickets', value: stats.resolved, icon: ShieldCheck, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' }
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className="glass p-6 rounded-3xl shadow-pitch hover:border-white/10 transition-all">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center border ${border}`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-0.5">{label}</p>
                <h3 className="text-2xl lg:text-3xl font-display font-extrabold text-white italic">
                  {isLoading ? '...' : value}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inquiries List */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-gold/10 to-gold-muted/5 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        
        <div className="relative glass rounded-[2rem] overflow-hidden shadow-pitch">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Contact details</th>
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Message</th>
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Status</th>
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em]">Timestamp</th>
                  <th className="px-8 py-5 text-[10px] uppercase font-black text-gold tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-8 py-8 h-12 bg-white/5"></td>
                    </tr>
                  ))
                ) : inquiries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-40">
                        <Inbox className="w-12 h-12 text-gold animate-pulse" />
                        <p className="font-display font-bold text-xl text-white">No inquiries logged yet.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  inquiries.map((inq) => (
                    <tr 
                      key={inq.id} 
                      className={`
                        hover:bg-white/[0.02] transition-colors group/row
                        ${inq.status === 'unread' ? 'bg-white/[0.01]' : ''}
                      `}
                    >
                      <td className="px-8 py-6">
                        <p className="font-bold text-white text-lg tracking-tight group-hover/row:text-gold transition-colors">
                          {inq.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-charcoal-light/70 font-mono mt-1 font-semibold">
                          <Phone className="w-3.5 h-3.5 text-gold/60" />
                          {inq.phone}
                        </div>
                      </td>
                      <td className="px-8 py-6 max-w-md">
                        <div className="flex gap-2 items-start text-sm text-white/80 font-medium">
                          <MessageSquare className="w-4 h-4 text-gold/40 mt-1 shrink-0" />
                          <p className="whitespace-pre-line leading-relaxed">{inq.message}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`
                          inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border
                          ${inq.status === 'resolved' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                            inq.status === 'unread' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' : 
                            'bg-white/5 text-white/50 border border-white/10'}
                        `}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            inq.status === 'resolved' ? 'bg-green-400' :
                            inq.status === 'unread' ? 'bg-amber-400' : 'bg-white/40'
                          }`} />
                          {inq.status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-charcoal-light text-sm font-medium">
                          <Calendar className="w-4 h-4 text-gold/50" />
                          {format(new Date(inq.created_at), 'MMM d, yyyy - h:mm a')}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-3">
                          {inq.status === 'unread' && (
                            <button
                              onClick={() => updateStatus(inq.id, 'read')}
                              disabled={isSubmitting === inq.id}
                              className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                              Mark Read
                            </button>
                          )}
                          {inq.status !== 'resolved' && (
                            <button
                              onClick={() => updateStatus(inq.id, 'resolved')}
                              disabled={isSubmitting === inq.id}
                              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-600/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                              {isSubmitting === inq.id ? (
                                <Loader2 className="w-3 h-3 animate-spin text-white" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5" />
                              )}
                              Resolve
                            </button>
                          )}
                          {inq.status === 'resolved' && (
                            <span className="text-[10px] text-white/30 italic font-bold">Resolved</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
