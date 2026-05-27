'use client';

import { useAuth } from './AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, staff } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      if (pathname !== '/login') {
        router.push('/login');
      }
      return;
    }

    if (staff && pathname !== '/login') {
      const routePermissions: Record<string, string[]> = {
        '/academy-operations': ['super_admin', 'admin'],
        '/bookings': ['super_admin', 'admin'],
        '/walkins': ['super_admin', 'admin'],
        '/expenses': ['super_admin', 'admin'],
        '/programs': ['super_admin', 'admin'],
        '/instructor': ['super_admin', 'coach'],
        '/notifications': ['super_admin', 'admin'],
        '/staff': ['super_admin'],
        '/staff-management': ['super_admin'],
        '/settings': ['super_admin']
      };

      const baseRoute = '/' + pathname.split('/')[1];
      if (routePermissions[baseRoute] && !routePermissions[baseRoute].includes(staff.role)) {
        console.warn(`AuthGuard: Access denied to ${pathname} for role ${staff.role}. Redirecting to /`);
        router.push('/');
      }
    }
  }, [user, staff, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-forest mx-auto mb-4" />
          <p className="text-muted font-medium font-display tracking-widest">VERIFYING CREDENTIALS...</p>
        </div>
      </div>
    );
  }

  // If we have a user but no matching staff record, they shouldn't be in the admin panel
  if (user && !staff && pathname !== '/login') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white p-10 rounded-3xl border border-border-color text-center shadow-xl shadow-forest/5">
          <div className="w-20 h-20 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold font-display text-forest mb-4">Access Restricted</h1>
          <p className="text-charcoal-light mb-8">
            Your account does not have administrative permissions. Please contact the system administrator if you believe this is an error.
          </p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="w-full py-4 bg-forest text-white rounded-2xl font-bold"
          >
            RETURN TO LOGIN
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
