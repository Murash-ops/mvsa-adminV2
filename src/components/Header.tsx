'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu, Bell, Search, Calendar, CheckCheck, Smartphone, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from './AuthContext';
import { format } from 'date-fns';
import { createClient } from '@/utils/supabase/client';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { staff } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!staff) return;

    async function loadNotifications() {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error && data) {
        setNotifications(data);
      }
    }

    loadNotifications();

    // Subscribe to realtime database changes for notifications
    const channel = supabase
      .channel('notifications_realtime_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [staff, supabase]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  async function markAllAsRead() {
    if (unreadCount === 0 || isLoading) return;
    setIsLoading(true);
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
    setIsLoading(false);
  }

  async function toggleRead(id: number, currentRead: boolean) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: !currentRead })
      .eq('id', id);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: !currentRead } : n))
      );
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
        {/* Search stub */}
        <div className="hidden lg:relative lg:block">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input 
            type="text" 
            placeholder="Search bookings..."
            className="pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-white/40 focus:bg-white/10 focus:border-gold/30 focus:outline-none focus:ring-4 focus:ring-gold/5 transition-all w-64"
          />
        </div>

        {/* Realtime Notifications Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className={`p-2.5 hover:bg-white/5 rounded-2xl relative transition-colors ${isOpen ? 'text-gold bg-white/5' : 'text-white/60'}`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-error rounded-full border-2 border-forest-dark animate-pulse" />
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-forest-dark/95 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden animate-entrance">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-white">System Logs</h4>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5">
                    {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
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

              <div className="max-h-[360px] overflow-y-auto scrollbar-hide">
                {notifications.length === 0 ? (
                  <div className="py-12 px-4 text-center opacity-40 text-xs flex flex-col items-center justify-center">
                    <Bell className="w-8 h-8 text-gold mb-2" />
                    <p className="font-bold text-white uppercase">Prisinte Inbox</p>
                    <p className="text-[10px] text-white/50 mt-0.5">No notifications logged yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {notifications.map((item, index) => {
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

                          <div className={`p-2 rounded-xl border border-white/5 shrink-0 mt-0.5 ${item.status === 'failed' ? 'bg-error/10 text-error' : isUnread ? 'bg-gold/10 text-gold' : 'bg-white/5 text-white/40'}`}>
                            {item.type === 'client_confirmation' ? (
                              <Smartphone className="w-3.5 h-3.5" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider truncate">
                                {item.type.replace('_', ' ')} • {item.recipient_phone}
                              </span>
                              <span className="text-[9px] text-white/30 shrink-0 font-medium mt-0.5">
                                {formatTimeAgo(item.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-white/70 leading-relaxed font-medium break-words">
                              {item.message}
                            </p>
                            
                            <div className="flex justify-between items-center pt-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'sent' ? 'bg-success' : item.status === 'failed' ? 'bg-error' : 'bg-warning'}`} />
                                <span className="text-[8px] font-black uppercase tracking-widest text-white/30">
                                  {item.status}
                                </span>
                                {item.error_message && (
                                  <span className="text-[8px] font-medium text-error/60 truncate max-w-[120px]">
                                    ({item.error_message})
                                  </span>
                                )}
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
                    })}
                  </div>
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
