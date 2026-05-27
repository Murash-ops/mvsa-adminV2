'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';
import { 
  LayoutDashboard, 
  CalendarDays, 
  ClipboardList, 
  Receipt, 
  Users, 
  Settings, 
  LogOut, 
  X,
  ShieldCheck,
  UserCircle,
  Trophy,
  MapPin,
  MessageSquare
} from 'lucide-react';

export function Sidebar({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const pathname = usePathname();
  const { staff, signOut } = useAuth();

  const menuSections = [
    {
      title: 'Core',
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, href: '/', roles: ['super_admin', 'admin', 'coach'] },
      ]
    },
    {
      title: 'Venue Management',
      items: [
        { name: 'Bookings', icon: CalendarDays, href: '/bookings', roles: ['super_admin', 'admin'], streamScope: ['all', 'stream_1'] },
        { name: 'Walk-ins', icon: ClipboardList, href: '/walkins', roles: ['super_admin', 'admin'], streamScope: ['all', 'stream_1'] },
        { name: 'Venues', icon: MapPin, href: '/venues', roles: ['super_admin'] },
      ]
    },
    {
      title: 'Academy Operations',
      items: [
        { name: 'Academy Operations', icon: Trophy, href: '/academy-operations', roles: ['super_admin', 'admin'], streamScope: ['all', 'stream_2'] },
        { name: 'Programs', icon: ShieldCheck, href: '/programs', roles: ['super_admin', 'admin'], streamScope: ['all', 'stream_2'] },
        { name: 'Coach Portal', icon: Trophy, href: '/instructor', roles: ['super_admin', 'coach'] },
      ]
    },
    {
      title: 'Finance & Comms',
      items: [
        { name: 'Expenses', icon: Receipt, href: '/expenses', roles: ['super_admin', 'admin'], streamScope: ['all', 'stream_1', 'stream_2'] },
        { name: 'SMS Alerts', icon: MessageSquare, href: '/notifications', roles: ['super_admin', 'admin'] },
      ]
    },
    {
      title: 'Administration',
      items: [
        { name: 'Staff Management', icon: Users, href: '/staff', roles: ['super_admin'] },
        { name: 'Settings', icon: Settings, href: '/settings', roles: ['super_admin'] },
      ]
    }
  ];

  const getFilteredSections = () => {
    if (!staff) return [];
    return menuSections.map(section => {
      const filteredItems = section.items.filter(item => {
        // 1. Role match check
        if (!item.roles.includes(staff.role)) return false;
        
        // 2. Stream scope check for admins
        if (staff.role === 'admin' && 'streamScope' in item && item.streamScope) {
          if (staff.stream_scope && staff.stream_scope !== 'all' && !item.streamScope.includes(staff.stream_scope)) {
            return false;
          }
        }
        return true;
      });
      return { ...section, items: filteredItems };
    }).filter(section => section.items.length > 0);
  };

  const filteredSections = getFilteredSections();

  const roleStyles = {
    super_admin: 'bg-gold/15 text-gold border-gold/30',
    admin: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    coach: 'bg-violet-500/15 text-violet-400 border-violet-500/30'
  };

  const roleLabels = {
    super_admin: 'Super Admin',
    admin: 'Administrator',
    coach: 'Academy Coach'
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-charcoal/40 bg-forest-dark/60 backdrop-blur-md z-40 lg:hidden animate-in fade-in duration-300"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 left-0 bottom-0 w-72 bg-gradient-to-b from-forest-dark to-pitch border-r border-pitch-border text-white z-50 transition-transform duration-150 ease-in-out lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Mobile Close Button */}
        <button 
          onClick={onClose}
          className="lg:hidden absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col h-full">
          {/* Brand Header */}
          <div className="p-8 border-b border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center border border-gold/20">
                <ShieldCheck className="w-6 h-6 text-gold" />
              </div>
              <div className="font-display font-bold text-2xl tracking-tight italic text-white" role="heading" aria-level={2}>MVSA ADMIN</div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-hide text-left">
            {filteredSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1.5">
                <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30 px-4 mb-2">
                  {section.title}
                </h4>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`
                          flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 spring-bounce group
                          ${isActive 
                            ? 'bg-gradient-to-r from-gold to-gold-muted text-forest font-extrabold shadow-gold-md scale-[1.02]' 
                            : 'text-white/60 hover:bg-white/5 hover:text-white'
                          }
                        `}
                      >
                        <item.icon className={`w-5 h-5 transition-all ${isActive ? 'text-forest stroke-[2.5px]' : 'text-white/40 group-hover:text-gold transition-colors'}`} />
                        <span className="tracking-wide text-xs font-semibold">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User Profile & Sign Out */}
          <div className="p-6 border-t border-white/5 bg-pitch-light/50">
            <div className="flex items-center gap-4 px-2 mb-6">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center text-gold border border-white/10 overflow-hidden">
                  <UserCircle className="w-7 h-7" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success border-2 border-forest-dark rounded-full animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate">{staff?.name || 'Loading...'}</div>
                <span className={`
                  text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border mt-1 inline-block
                  ${staff ? roleStyles[staff.role] : 'bg-white/5 text-white/40 border-white/10'}
                `}>
                  {staff ? roleLabels[staff.role] : '...'}
                </span>
              </div>
            </div>
            
            <button 
              onClick={signOut}
              className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-white/5 hover:bg-error/10 hover:text-error rounded-2xl transition-all font-bold text-xs tracking-widest text-white/60 group"
            >
              <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              SIGN OUT
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
