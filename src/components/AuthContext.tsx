'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

type Staff = {
  id: string;
  name: string;
  role: 'super_admin' | 'admin' | 'instructor';
  email: string;
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
  const supabase = createClient();

  useEffect(() => {
    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        const { data: staffData } = await supabase
          .from('staff')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (staffData) {
          setStaff(staffData as Staff);
        }
      }
      setIsLoading(false);
    }

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const { data: staffData } = await supabase
          .from('staff')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (staffData) setStaff(staffData as Staff);
      } else {
        setUser(null);
        setStaff(null);
      }
      setIsLoading(true);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
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
