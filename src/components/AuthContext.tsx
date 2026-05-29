'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

type Staff = {
  id: string;
  name: string;
  role: 'super_admin' | 'admin' | 'boss' | 'academy_coo' | 'receptionist' | 'coach' | 'instructor';
  email: string;
  stream_scope?: 'all' | 'stream_1' | 'stream_2';
};

type AuthContextType = {
  user: User | null;
  staff: Staff | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadedUserIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  const supabase = createClient();

  useEffect(() => {
    let active = true;

    // 1. Try to restore session from localStorage immediately on mount to prevent layout unmount/flashing
    if (typeof window !== 'undefined') {
      try {
        const cachedStaff = localStorage.getItem('mvsa_staff');
        const cachedUser = localStorage.getItem('mvsa_user');
        if (cachedStaff && cachedUser) {
          const parsedStaff = JSON.parse(cachedStaff);
          const parsedUser = JSON.parse(cachedUser);
          setStaff(parsedStaff);
          setUser(parsedUser);
          loadedUserIdRef.current = parsedUser.id;
          setIsLoading(false);
          console.log('AuthProvider: restored cached session for user', parsedUser.id);
        }
      } catch (e) {
        console.error('Error reading cached auth:', e);
      }
    }

    async function handleSession(session: any) {
      console.log('handleSession called. User ID:', session?.user?.id, 'isFetching:', isFetchingRef.current, 'loadedUserId:', loadedUserIdRef.current);
      if (!session?.user) {
        console.log('handleSession: no user session');
        if (active) {
          setUser(null);
          setStaff(null);
          loadedUserIdRef.current = null;
          if (typeof window !== 'undefined') {
            localStorage.removeItem('mvsa_staff');
            localStorage.removeItem('mvsa_user');
          }
          setIsLoading(false);
        }
        return;
      }

      // If we have already successfully loaded this user, just set user and ensure loading is false
      if (loadedUserIdRef.current === session.user.id) {
        console.log('handleSession: user already loaded, skipping fetch');
        if (active) {
          setUser(session.user);
          setIsLoading(false);
        }
        return;
      }

      // If we are currently fetching for this user, do not run another concurrent query
      if (isFetchingRef.current) {
        console.log('handleSession: concurrent fetch blocked');
        return;
      }

      isFetchingRef.current = true;
      if (active) {
        setUser(session.user);
        // Only set isLoading to true if we don't have a matching cached user, to prevent loading flicker
        if (loadedUserIdRef.current !== session.user.id) {
          setIsLoading(true);
        }
      }

      try {
        console.log('handleSession: starting staff fetch from DB...');
        const { data: staffData, error } = await supabase
          .from('staff')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        console.log('handleSession: DB fetch complete. data:', !!staffData, 'error:', error?.message || null);
        if (error) {
          console.error('Error fetching staff record:', error);
        }
        
        if (active) {
          if (staffData) {
            setStaff(staffData as Staff);
            loadedUserIdRef.current = session.user.id;
            if (typeof window !== 'undefined') {
              localStorage.setItem('mvsa_staff', JSON.stringify(staffData));
              localStorage.setItem('mvsa_user', JSON.stringify(session.user));
            }
          } else {
            setStaff(null);
            loadedUserIdRef.current = null;
            if (typeof window !== 'undefined') {
              localStorage.removeItem('mvsa_staff');
              localStorage.removeItem('mvsa_user');
            }
          }
        }
      } catch (err) {
        console.error('Unexpected error during session hydration:', err);
      } finally {
        isFetchingRef.current = false;
        console.log('handleSession finished. active:', active);
        if (active) {
          setIsLoading(false);
        }
      }
    }

    // Verify session explicitly on mount to handle cases where Supabase hasn't initialized yet
    async function verifySession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;

      if (!session?.user) {
        // No active session! Clear cache and redirect to login
        setUser(null);
        setStaff(null);
        loadedUserIdRef.current = null;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('mvsa_staff');
          localStorage.removeItem('mvsa_user');
        }
        setIsLoading(false);
      } else {
        // Active session exists!
        if (loadedUserIdRef.current !== session.user.id) {
          await handleSession(session);
        } else {
          setUser(session.user);
          setIsLoading(false);
        }
      }
    }

    verifySession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      console.log('Auth state change event:', event);
      if (active) {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setStaff(null);
          loadedUserIdRef.current = null;
          if (typeof window !== 'undefined') {
            localStorage.removeItem('mvsa_staff');
            localStorage.removeItem('mvsa_user');
          }
          setIsLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' && session?.user) {
          if (loadedUserIdRef.current !== session.user.id) {
            await handleSession(session);
          } else {
            setUser(session.user);
            setIsLoading(false);
          }
        }
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mvsa_staff');
      localStorage.removeItem('mvsa_user');
    }
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, staff, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
