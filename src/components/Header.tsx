'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  Bell, 
  Search, 
  Calendar, 
  CheckCheck, 
  Smartphone, 
  AlertCircle, 
  RefreshCw,
  Loader2,
  Clock,
  DollarSign,
  Mail,
  Trophy,
  Users,
  ShieldCheck,
  User,
  X,
  ArrowRight
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { format } from 'date-fns';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { staff } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Global Search states (Priority 5 + Correction 3)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ bookings: any[]; enrollments: any[]; staff: any[] }>({
    bookings: [],
    enrollments: [],
    staff: []
  });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const userRole = staff?.role || '';
  const isSuperAdmin = userRole === 'super_admin';
  const isReceptionist = userRole === 'receptionist';
  const canSearch = isSuperAdmin || isReceptionist;

  useEffect(() => {
    if (!staff) return;

    async function loadAlerts() {
      const { data, error } = await supabase
        .from('admin_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error && data) {
        setAlerts(data);
      }
    }

    loadAlerts();

    // Subscribe to realtime database changes for admin_alerts
    const channel = supabase
      .channel('admin_alerts_realtime_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_alerts'
        },
        () => {
          loadAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [staff, supabase]);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Search handler
  useEffect(() => {
    if (!canSearch || searchQuery.trim().length < 2) {
      setSearchResults({ bookings: [], enrollments: [], staff: [] });
      setShowSearchDropdown(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setShowSearchDropdown(true);
      try {
        if (isSuperAdmin) {
          // Super Admin: Full search scope
          const bookingsPromise = supabase
            .from('bookings')
            .select('id, client_name, client_phone, ref_code, status, total_amount, created_at')
            .or(`client_name.ilike.%${searchQuery}%,client_phone.ilike.%${searchQuery}%`)
            .limit(5);

          const enrollmentsPromise = supabase
            .from('enrollments')
            .select('id, participant_name, parent_name, status')
            .ilike('participant_name', `%${searchQuery}%`)
            .limit(5);

          const staffPromise = supabase
            .from('staff')
            .select('id, name, email, role')
            .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
            .limit(5);

          const [bookingsRes, enrollmentsRes, staffRes] = await Promise.all([
            bookingsPromise,
            enrollmentsPromise,
            staffPromise
          ]);

          setSearchResults({
            bookings: bookingsRes.data || [],
            enrollments: enrollmentsRes.data || [],
            staff: staffRes.data || []
          });
        } else if (isReceptionist) {
          // Receptionist: Bookings only
          const { data, error } = await supabase
            .from('bookings')
            .select('id, client_name, client_phone, ref_code, status, total_amount, created_at')
            .or(`client_name.ilike.%${searchQuery}%,client_phone.ilike.%${searchQuery}%`)
            .limit(5);

          setSearchResults({
            bookings: data || [],
            enrollments: [],
            staff: []
          });
        }
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, isSuperAdmin, isReceptionist, canSearch, supabase]);

  const unreadCount = alerts.filter(n => !n.is_read).length;

  async function markAllAsRead() {
    if (unreadCount === 0 || isLoading) return;
    setIsLoading(true);
    const { error } = await supabase
      .from('admin_alerts')
      .update({ is_read: true })
      .eq('is_read', false);

    if (!error) {
      setAlerts(prev => prev.map(n => ({ ...n, is_read: true })));
    }
    setIsLoading(false);
  }

  async function toggleRead(id: number, currentRead: boolean) {
    const { error } = await supabase
      .from('admin_alerts')
      .update({ is_read: !currentRead })
      .eq('id', id);

    if (!error) {
      setAlerts(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: !currentRead } : n))
      );
    }
  }

  function getAlertIcon(type: string) {
    switch (type) {
      case 'new_whatsapp_booking':
        return <Smartphone className="w-3.5 h-3.5" />;
      case 'hold_expiring_soon':
        return <Clock className="w-3.5 h-3.5" />;
      case 'new_inquiry':
        return <Mail className="w-3.5 h-3.5" />;
      case 'new_enrollment':
        return <Trophy className="w-3.5 h-3.5" />;
      case 'balance_outstanding':
        return <DollarSign className="w-3.5 h-3.5" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5" />;
    }
  }

  function getAlertIconColor(type: string, isUnread: boolean) {
    if (!isUnread) return 'bg-white/5 text-white/40 border-white/5';
    switch (type) {
      case 'new_whatsapp_booking':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10';
      case 'hold_expiring_soon':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/10';
      case 'new_inquiry':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/10';
      case 'new_enrollment':
        return 'bg-gold/10 text-gold border-gold/10';
      case 'balance_outstanding':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/10';
      default:
        return 'bg-white/5 text-white/40 border-white/5';
    }
  }

  function formatTimeAgo(dateString: string) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return format(date, 'MMM d, h:mm a');
    } catch (e) {
      return 'Recently';
    }
  }

  // Navigate on global search click
  const handleResultClick = (type: 'booking' | 'enrollment' | 'staff', queryVal: string) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    
    if (type === 'booking') {
      router.push(`/bookings?search=${encodeURIComponent(queryVal)}`);
    } else if (type === 'enrollment') {
      router.push(`/academy-operations?search=${encodeURIComponent(queryVal)}`);
    } else if (type === 'staff') {
      router.push(`/staff?search=${encodeURIComponent(queryVal)}`);
    }
  };

  return (
    <header className="h-20 bg-forest-dark/40 backdrop-blur-md border-b border-white/5 sticky top-0 z-30 px-6 lg:px-10 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-white/5 rounded-xl transition-colors"
        >
          <Menu className="w-6 h-6 text-white" />
        </button>
        
        <div className="hidden md:flex items-center gap-2 text-white/60 font-medium text-sm">
          <Calendar className="w-4 h-4 text-gold" />
          <span>{format(new Date(), 'EEEE, MMMM do, yyyy')}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-6">
        {/* Global Search (Priority 5 + Correction 3) */}
        {canSearch && (
          <div className="relative" ref={searchContainerRef}>
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input 
              type="text" 
              placeholder={isSuperAdmin ? "Search all records..." : "Search client or phone..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim().length >= 2 && setShowSearchDropdown(true)}
              className="pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none focus:ring-4 focus:ring-gold/5 transition-all w-64 md:w-80"
            />

            {showSearchDropdown && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-forest-dark/95 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden divide-y divide-white/5 animate-entrance">
                <div className="p-4 bg-white/[0.02] flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gold">Search Results</span>
                  {isSearching && <Loader2 className="w-3.5 h-3.5 text-gold animate-spin" />}
                </div>

                <div className="max-h-[360px] overflow-y-auto scrollbar-hide py-2 divide-y divide-white/5">
                  {/* Bookings block */}
                  {searchResults.bookings.length > 0 && (
                    <div className="p-3 space-y-1">
                      <h5 className="text-[9px] font-black uppercase text-gold/60 tracking-wider px-2">Bookings</h5>
                      {searchResults.bookings.map(item => (
                        <button
                          key={item.id}
                          onClick={() => handleResultClick('booking', item.client_name)}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 flex justify-between items-center gap-2 transition-colors group"
                        >
                          <div className="min-w-0">
                            <p className="text-xs text-white font-bold truncate">{item.client_name}</p>
                            <p className="text-[9px] text-white/40 font-mono truncate">{item.client_phone} • {item.ref_code.substring(0, 8)}...</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[8px] bg-white/5 text-white/50 px-2 py-0.5 rounded uppercase font-bold">{item.status}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-gold opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Enrollments block (Super Admin only) */}
                  {isSuperAdmin && searchResults.enrollments.length > 0 && (
                    <div className="p-3 space-y-1">
                      <h5 className="text-[9px] font-black uppercase text-gold/60 tracking-wider px-2">Enrollments</h5>
                      {searchResults.enrollments.map(item => (
                        <button
                          key={item.id}
                          onClick={() => handleResultClick('enrollment', item.participant_name)}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 flex justify-between items-center gap-2 transition-colors group"
                        >
                          <div className="min-w-0">
                            <p className="text-xs text-white font-bold truncate">{item.participant_name}</p>
                            <p className="text-[9px] text-white/40 truncate">Parent: {item.parent_name || 'N/A'}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded uppercase font-bold">{item.status}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-gold opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Staff block (Super Admin only) */}
                  {isSuperAdmin && searchResults.staff.length > 0 && (
                    <div className="p-3 space-y-1">
                      <h5 className="text-[9px] font-black uppercase text-gold/60 tracking-wider px-2">Staff HR</h5>
                      {searchResults.staff.map(item => (
                        <button
                          key={item.id}
                          onClick={() => handleResultClick('staff', item.name)}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 flex justify-between items-center gap-2 transition-colors group"
                        >
                          <div className="min-w-0">
                            <p className="text-xs text-white font-bold truncate">{item.name}</p>
                            <p className="text-[9px] text-white/40 truncate font-mono">{item.email}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[8px] bg-gold/10 text-gold px-2 py-0.5 rounded uppercase font-bold">{item.role.replace('_', ' ')}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-gold opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* No results */}
                  {!isSearching && 
                   searchResults.bookings.length === 0 && 
                   searchResults.enrollments.length === 0 && 
                   searchResults.staff.length === 0 && (
                     <div className="py-12 text-center opacity-40">
                       <Search className="w-8 h-8 text-gold mx-auto mb-2" />
                       <p className="font-bold text-xs text-white uppercase">No records found</p>
                       <p className="text-[10px] text-white/50 mt-0.5">Try refining your keyword</p>
                     </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Realtime Live Alerts Dropdown (Priority 1) */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className={`p-2.5 hover:bg-white/5 rounded-2xl relative transition-colors ${isOpen ? 'text-gold bg-white/5' : 'text-white/60'}`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-forest-dark animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-forest-dark/95 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden animate-entrance">
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div>
                  <h4 className="text-sm font-extrabold text-white">Live Alerts</h4>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5">
                    {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-wider text-gold hover:text-white transition-all"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCheck className="w-3 h-3" />
                    )}
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[360px] overflow-y-auto scrollbar-hide divide-y divide-white/5">
                {alerts.length === 0 ? (
                  <div className="py-12 px-4 text-center opacity-40 text-xs flex flex-col items-center justify-center">
                    <Bell className="w-8 h-8 text-gold mb-2" />
                    <p className="font-bold text-white uppercase">Inbox Clean</p>
                    <p className="text-[10px] text-white/50 mt-0.5">No administrative alerts logged yet.</p>
                  </div>
                ) : (
                  alerts.map((item) => {
                    const isUnread = !item.is_read;
                    return (
                      <div 
                        key={item.id} 
                        className={`p-4 hover:bg-white/[0.02] transition-colors relative flex gap-3 items-start ${isUnread ? 'bg-white/[0.01]' : ''}`}
                      >
                        {/* Unread Indicator Glow Stripe */}
                        {isUnread && (
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gold to-gold-muted shadow-gold-sm" />
                        )}

                        <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${getAlertIconColor(item.type, isUnread)}`}>
                          {getAlertIcon(item.type)}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider truncate">
                              {item.type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[9px] text-white/30 shrink-0 font-medium mt-0.5">
                              {formatTimeAgo(item.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-white/70 leading-relaxed font-semibold break-words">
                            {item.message}
                          </p>
                          
                          <div className="flex justify-between items-center pt-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${isUnread ? 'bg-gold animate-pulse' : 'bg-white/20'}`} />
                              <span className="text-[8px] font-black uppercase tracking-widest text-white/30">
                                {isUnread ? 'unread' : 'read'}
                              </span>
                            </div>
                            <button 
                              onClick={() => toggleRead(item.id, item.is_read)}
                              className="text-[8px] font-black uppercase tracking-widest text-gold hover:text-white transition-colors"
                            >
                              {isUnread ? 'Mark read' : 'Mark unread'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-8 bg-white/10 hidden sm:block" />

        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-white leading-tight">{staff?.name || 'Loading...'}</p>
            <p className="text-[10px] font-bold text-gold uppercase tracking-tighter">
              {staff?.role?.replace('_', ' ') || '...'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gold font-bold border border-white/10">
            {staff?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
        </div>
      </div>
    </header>
  );
}
