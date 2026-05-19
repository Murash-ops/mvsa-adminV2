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
  UserCircle
} from 'lucide-react';

export function Sidebar({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const pathname = usePathname();
  const { staff, signOut } = useAuth();

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/', roles: ['super_admin', 'admin', 'instructor'] },
    { name: 'Bookings', icon: CalendarDays, href: '/bookings', roles: ['super_admin', 'admin'] },
    { name: 'Walk-ins', icon: ClipboardList, href: '/walkins', roles: ['super_admin', 'admin'] },
    { name: 'Expenses', icon: Receipt, href: '/expenses', roles: ['super_admin', 'admin'] },
    { name: 'Programs', icon: ShieldCheck, href: '/programs', roles: ['super_admin', 'admin'] },
    { name: 'Instructor Portal', icon: ShieldCheck, href: '/instructor', roles: ['instructor'] },
    { name: 'Staff Management', icon: Users, href: '/staff', roles: ['super_admin'] },
    { name: 'Settings', icon: Settings, href: '/settings', roles: ['super_admin'] },
  ];

  const filteredItems = menuItems.filter(item => staff && item.roles.includes(staff.role));

  const roleStyles = {
    super_admin: 'bg-gold/10 text-gold border-gold/30',
    admin: 'bg-green-100 text-green-800 border-green-200',
    instructor: 'bg-blue-100 text-blue-800 border-blue-200'
  };

  const roleLabels = {
    super_admin: 'Super Admin',
    admin: 'Administrator',
    instructor: 'Instructor'
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 left-0 bottom-0 w-72 bg-forest text-white z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static
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
              <div className="w-10 h-10 bg-gold/20 rounded-xl flex items-center justify-center border border-gold/30">
                <ShieldCheck className="w-6 h-6 text-gold" />
              </div>
              <h2 className="font-display font-bold text-2xl tracking-tight italic">MVSA ADMIN</h2>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group
                    ${isActive 
                      ? 'bg-gold text-forest font-bold shadow-lg shadow-gold/20' 
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-forest' : 'text-white/40 group-hover:text-gold transition-colors'}`} />
                  <span className="tracking-wide text-sm">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Sign Out */}
          <div className="p-6 border-t border-white/5 bg-forest-dark/30">
            <div className="flex items-center gap-4 px-2 mb-6">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-gold border border-white/5 overflow-hidden">
                  <UserCircle className="w-7 h-7" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success border-2 border-forest rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{staff?.name || 'Loading...'}</p>
                <span className={`
                  text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border mt-1 inline-block
                  ${staff ? roleStyles[staff.role] : 'bg-white/5 text-white/40'}
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
