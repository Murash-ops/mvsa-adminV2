'use client';

import { Menu, Bell, Search, Calendar } from 'lucide-react';
import { useAuth } from './AuthContext';
import { format } from 'date-fns';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { staff } = useAuth();
  
  return (
    <header className="h-20 bg-white border-b border-border-color sticky top-0 z-30 px-6 lg:px-10 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-surface rounded-xl transition-colors"
        >
          <Menu className="w-6 h-6 text-forest" />
        </button>
        
        <div className="hidden md:flex items-center gap-2 text-muted font-medium text-sm">
          <Calendar className="w-4 h-4" />
          <span>{format(new Date(), 'EEEE, MMMM do, yyyy')}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-6">
        {/* Search stub */}
        <div className="hidden lg:relative lg:block">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input 
            type="text" 
            placeholder="Search bookings..."
            className="pl-11 pr-4 py-2.5 bg-surface border border-transparent rounded-2xl text-sm focus:bg-white focus:border-border-color focus:outline-none focus:ring-4 focus:ring-forest/5 transition-all w-64"
          />
        </div>

        <button className="p-2.5 hover:bg-surface rounded-2xl text-muted relative transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full border-2 border-white" />
        </button>

        <div className="w-px h-8 bg-border-color hidden sm:block" />

        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-forest leading-tight">{staff?.name}</p>
            <p className="text-[10px] font-bold text-gold uppercase tracking-tighter">
              {staff?.role.replace('_', ' ')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-forest/5 flex items-center justify-center text-forest font-bold border border-forest/10">
            {staff?.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
