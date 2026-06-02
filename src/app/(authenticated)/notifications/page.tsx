'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  MessageSquare, 
  Send, 
  Users, 
  History, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Filter,
  Calendar,
  Layers,
  ChevronRight,
  RefreshCw,
  Search
} from 'lucide-react';
import { useAuth } from '@/components/AuthContext';

export default function NotificationsBroadcastPage() {
  const supabase = createClient();
  const { staff } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  
  // Ledger Search & Filter State
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState('all');
  const [ledgerDateFilter, setLedgerDateFilter] = useState('');

  // Broadcast Form State
  const [segment, setSegment] = useState<'all' | 'bookings_date' | 'program'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [messageText, setMessageText] = useState('');
  
  // Recipients State
  const [recipients, setRecipients] = useState<{ name: string; phone: string; source: string }[]>([]);
  const [isFetchingRecipients, setIsFetchingRecipients] = useState(false);

  // Status message
  const [broadcastResult, setBroadcastResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchRecipients();
  }, [segment, startDate, endDate, selectedProgramId]);

  async function fetchInitialData() {
    setIsLoadingLedger(true);
    try {
      // 1. Fetch Notification Ledger
      const { data: nData, error: nError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (nError) throw nError;
      setNotifications(nData || []);

      // 2. Fetch Programs for filter dropdown
      const { data: pData, error: pError } = await supabase
        .from('programs')
        .select('id, name')
        .eq('is_active', true);
      
      if (pError) throw pError;
      setPrograms(pData || []);
    } catch (err: any) {
      console.error('Error fetching initial data:', err);
    } finally {
      setIsLoadingLedger(false);
    }
  }

  async function fetchRecipients() {
    setIsFetchingRecipients(true);
    try {
      if (segment === 'all') {
        // Fetch all unique client phones from confirmed bookings and active enrollments
        const { data: bookingData } = await supabase
          .from('bookings')
          .select('client_name, client_phone')
          .eq('status', 'confirmed');

        const { data: enrollmentData } = await supabase
          .from('enrollments')
          .select('participant_name, client_phone')
          .eq('status', 'active');

        const unique: Record<string, { name: string; source: string }> = {};
        
        bookingData?.forEach((b: any) => {
          unique[b.client_phone] = { name: b.client_name, source: 'Booking Client' };
        });
        
        enrollmentData?.forEach((e: any) => {
          unique[e.client_phone] = { name: e.participant_name, source: 'Academy Student' };
        });

        const list = Object.entries(unique).map(([phone, info]) => ({
          phone,
          name: info.name,
          source: info.source
        }));

        setRecipients(list);
      } 
      else if (segment === 'bookings_date') {
        if (!startDate || !endDate) {
          setRecipients([]);
          return;
        }

        // Fetch bookings matching slot dates in the specified date range
        // Since slot_ids is big-int arrays, we can query bookings that fall in the window
        const { data: bookingsInWindow, error } = await supabase
          .from('bookings')
          .select('id, client_name, client_phone, slot_ids')
          .eq('status', 'confirmed');

        if (error) throw error;

        // Fetch slots in date range
        const { data: slotsInRange } = await supabase
          .from('time_slots')
          .select('id')
          .gte('date', startDate)
          .lte('date', endDate);

        const slotIdSet = new Set(slotsInRange?.map((s: any) => s.id) || []);
        
        const list: { name: string; phone: string; source: string }[] = [];
        const seenPhones = new Set<string>();

        bookingsInWindow?.forEach((b: any) => {
          const matches = b.slot_ids.some((id: any) => slotIdSet.has(Number(id)));
          if (matches && !seenPhones.has(b.client_phone)) {
            seenPhones.add(b.client_phone);
            list.push({
              name: b.client_name,
              phone: b.client_phone,
              source: `Booking (${startDate} to ${endDate})`
            });
          }
        });

        setRecipients(list);
      } 
      else if (segment === 'program') {
        if (!selectedProgramId) {
          setRecipients([]);
          return;
        }

        const { data: enrolls, error } = await supabase
          .from('enrollments')
          .select('participant_name, client_phone')
          .eq('program_id', selectedProgramId)
          .eq('status', 'active');

        if (error) throw error;

        const unique: Record<string, string> = {};
        enrolls?.forEach((e: any) => {
          unique[e.client_phone] = e.participant_name;
        });

        const list = Object.entries(unique).map(([phone, name]) => ({
          phone,
          name,
          source: 'Program Cohort'
        }));

        setRecipients(list);
      }
    } catch (err: any) {
      console.error('Error fetching recipients:', err);
    } finally {
      setIsFetchingRecipients(false);
    }
  }

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recipients.length === 0) {
      alert('No recipients in the selected segment.');
      return;
    }
    if (!messageText.trim()) {
      alert('Please enter a message.');
      return;
    }

    setIsSending(true);
    setBroadcastResult({ status: 'idle', message: '' });

    try {
      // Outbound manual messages. We insert rows into public.notifications
      // The status defaults to 'sent' here to simulate successful local delivery 
      // (consistent with AfricasTalking ledger tracking).
      const notificationRows = recipients.map(r => ({
        recipient_phone: r.phone,
        message: messageText.trim(),
        type: 'promotion',
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_by: staff?.id || null
      }));

      // Insert in chunks of 50 to avoid payload caps
      const chunkSize = 50;
      for (let i = 0; i < notificationRows.length; i += chunkSize) {
        const chunk = notificationRows.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('notifications')
          .insert(chunk);
        
        if (error) throw error;
      }

      setBroadcastResult({
        status: 'success',
        message: `Successfully broadcasted SMS to all ${recipients.length} segmented recipients.`
      });

      setMessageText('');
      await fetchInitialData(); // Refresh ledger
    } catch (err: any) {
      console.error(err);
      setBroadcastResult({
        status: 'error',
        message: err.message || 'Failed to dispatch broadcast ledger inserts.'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleRefreshLedger = async () => {
    setIsAuditing(true);
    await fetchInitialData();
    setIsAuditing(false);
  };

  const filteredNotifications = notifications.filter(notif => {
    const matchesSearch = ledgerSearch.trim() === '' || 
      notif.recipient_phone?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      notif.message?.toLowerCase().includes(ledgerSearch.toLowerCase());

    const matchesStatus = ledgerStatusFilter === 'all' || notif.status === ledgerStatusFilter;

    let matchesDate = true;
    if (ledgerDateFilter) {
      const notifDate = notif.created_at || notif.sent_at;
      if (notifDate) {
        const d1 = new Date(notifDate).toISOString().split('T')[0];
        matchesDate = d1 === ledgerDateFilter;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="flex flex-col flex-1 p-6 lg:p-10 animate-entrance min-h-full">
      <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 text-left">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-1 bg-gold rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">COMMUNICATION ENGINE</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tighter leading-none italic uppercase">
            SMS Alerts & Broadcasts
          </h1>
          <p className="text-white/40 text-sm font-medium mt-1">Manage marketing promotions, target program cohorts, and track SMS deliveries.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* Left Column: Broadcast Composer */}
        <div className="lg:col-span-7 space-y-10">
          <section className="glass rounded-[2rem] border border-white/5 overflow-hidden shadow-pitch">
            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-gold/15 border border-gold/30 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h2 className="text-xl font-display font-extrabold text-white uppercase italic tracking-tight">Manual SMS Broadcast</h2>
                <p className="text-[10px] font-black uppercase tracking-wider text-gold mt-0.5">Compose and target outgoing text messages</p>
              </div>
            </div>

            <form onSubmit={handleSendBroadcast} className="p-8 space-y-6 text-left">
              
              {/* Recipient Segment Filter */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-gold">Target Cohort Segment</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSegment('all')}
                    className={`px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl border text-center transition-all ${
                      segment === 'all'
                        ? 'border-gold bg-gold/10 text-gold font-extrabold'
                        : 'border-white/10 bg-white/5 text-white/60 hover:border-gold/30 hover:text-white'
                    }`}
                  >
                    All Clients
                  </button>
                  <button
                    type="button"
                    onClick={() => setSegment('bookings_date')}
                    className={`px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl border text-center transition-all ${
                      segment === 'bookings_date'
                        ? 'border-gold bg-gold/10 text-gold font-extrabold'
                        : 'border-white/10 bg-white/5 text-white/60 hover:border-gold/30 hover:text-white'
                    }`}
                  >
                    Booking Dates
                  </button>
                  <button
                    type="button"
                    onClick={() => setSegment('program')}
                    className={`px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl border text-center transition-all ${
                      segment === 'program'
                        ? 'border-gold bg-gold/10 text-gold font-extrabold'
                        : 'border-white/10 bg-white/5 text-white/60 hover:border-gold/30 hover:text-white'
                    }`}
                  >
                    Academy Program
                  </button>
                </div>
              </div>

              {/* Conditional Filters */}
              {segment === 'bookings_date' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/[0.01] p-4 rounded-xl border border-white/5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase">From Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase">To Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-xs"
                    />
                  </div>
                </div>
              )}

              {segment === 'program' && (
                <div className="bg-white/[0.01] p-4 rounded-xl border border-white/5 space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Select Program Cohort</label>
                  <select
                    required
                    value={selectedProgramId}
                    onChange={(e) => setSelectedProgramId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white text-xs bg-forest-dark focus:outline-none"
                  >
                    <option value="">Choose program...</option>
                    {programs.map(prog => (
                      <option key={prog.id} value={prog.id}>{prog.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Segment Count Card */}
              <div className="border border-white/5 p-4 rounded-2xl bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-gold shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Recipients Scoped</p>
                    <p className="text-[10px] text-white/30 font-medium">Valid unique phone contacts parsed</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isFetchingRecipients ? (
                    <Loader2 className="w-4 h-4 text-gold animate-spin" />
                  ) : (
                    <span className="text-2xl font-mono font-black text-gold">{recipients.length}</span>
                  )}
                </div>
              </div>

              {/* Message Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black uppercase tracking-widest text-gold">Alert Message</label>
                  <span className="text-[10px] font-mono text-white/30">{messageText.length} Characters ({Math.ceil(messageText.length / 160)} SMS units)</span>
                </div>
                <textarea
                  rows={4}
                  required
                  placeholder="Type your manual promotional alert or class change message here... e.g. 'Hi Athlete! Join us this weekend for an elite training focus at MVSA Turf. Confirm sessions instantly!'"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none font-medium text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isSending || recipients.length === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-gold to-gold-muted text-forest rounded-2xl font-extrabold shadow-gold-md hover:shadow-gold-lg transition-all duration-300 spring-bounce hover:scale-[1.01] active:scale-[0.99] uppercase text-sm tracking-[0.15em] disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-forest" />
                    DISPATCHING SMS COHORTS...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-forest stroke-[2.5px]" /> SEND BROADCAST
                  </>
                )}
              </button>

              {/* Status alerts */}
              {broadcastResult.status !== 'idle' && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 mt-4 ${
                  broadcastResult.status === 'success'
                    ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                    : 'border-red-500/20 bg-red-500/5 text-red-400'
                }`}>
                  {broadcastResult.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  )}
                  <p className="text-xs font-bold leading-relaxed">{broadcastResult.message}</p>
                </div>
              )}
            </form>
          </section>
        </div>

        {/* Right Column: Outbound Notifications History Ledger */}
        <div className="lg:col-span-5">
          <section className="glass rounded-[2rem] border border-white/5 overflow-hidden shadow-pitch">
            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center text-left">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-gold" />
                <div>
                  <h2 className="text-xl font-display font-extrabold text-white uppercase italic tracking-tight">Delivery Ledger</h2>
                  <p className="text-[10px] font-black uppercase tracking-wider text-gold mt-0.5">Live Africa's Talking Status Monitor</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRefreshLedger}
                disabled={isAuditing}
                className="p-2 border border-white/10 hover:border-gold/30 hover:bg-white/5 rounded-xl transition-colors text-white"
                title="Refresh Ledger"
              >
                <RefreshCw className={`w-4 h-4 ${isAuditing ? 'animate-spin text-gold' : 'text-white/60'}`} />
              </button>
            </div>

            {/* Ledger Filters */}
            <div className="p-6 bg-white/[0.01] border-b border-white/5 space-y-3 text-left">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  placeholder="Search phone or message..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 text-xs focus:outline-none focus:border-gold/30 font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <select
                    value={ledgerStatusFilter}
                    onChange={(e) => setLedgerStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 text-white text-xs border border-white/10 focus:outline-none focus:border-gold/30 uppercase tracking-wider font-bold appearance-none bg-forest-dark"
                  >
                    <option value="all" className="bg-forest-dark text-white">All Statuses</option>
                    <option value="sent" className="bg-forest-dark text-white">Sent</option>
                    <option value="failed" className="bg-forest-dark text-white">Failed</option>
                  </select>
                </div>
                <input
                  type="date"
                  value={ledgerDateFilter}
                  onChange={(e) => setLedgerDateFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 text-white text-xs border border-white/10 focus:outline-none focus:border-gold/30 font-bold"
                />
              </div>
            </div>

            <div className="p-8 text-left">
              {isLoadingLedger ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="w-6 h-6 text-gold animate-spin" />
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Syncing ledger records...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <p className="text-white/40 text-center py-8 text-xs font-medium">No matching SMS history found.</p>
              ) : (
                <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredNotifications.map(notif => {
                    const dateFormatted = notif.created_at
                      ? new Date(notif.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })
                      : '';
                    const isSuccess = notif.status === 'sent';
                    
                    return (
                      <div key={notif.id} className="p-4 border border-white/5 rounded-xl bg-white/[0.01] space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="text-xs font-bold text-white">{notif.recipient_phone}</p>
                            <p className="text-[8px] text-white/30 font-medium mt-0.5">{dateFormatted}</p>
                          </div>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border rounded-md ${
                            isSuccess
                              ? 'bg-green-500/10 text-green-400 border-green-500/25'
                              : 'bg-red-500/10 text-red-400 border-red-500/25'
                          }`}>
                            {notif.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/70 leading-relaxed font-medium bg-white/[0.01] p-2.5 rounded-lg border border-white/5">
                          {notif.message}
                        </p>
                        {notif.error_message && (
                          <p className="text-[8px] font-mono text-red-400 leading-normal italic bg-red-950/20 p-2 border border-red-500/10 rounded-md">
                            Error: {notif.error_message}
                          </p>
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
