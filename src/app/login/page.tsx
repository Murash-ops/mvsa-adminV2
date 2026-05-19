'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Shield, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      // Force refresh to trigger middleware check
      router.refresh();
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Invalid login credentials');
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center p-4">
      {/* Background Accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-forest/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-gold/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="bg-white rounded-3xl shadow-xl shadow-forest/5 border border-border-color overflow-hidden">
          {/* Header */}
          <div className="bg-forest p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            <div className="relative z-10">
              <div className="w-16 h-16 bg-gold/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gold/30">
                <Shield className="w-8 h-8 text-gold" />
              </div>
              <h1 className="text-3xl font-bold font-display tracking-tight text-white italic mb-2">MVSA ADMIN</h1>
              <p className="text-white/60 text-sm font-medium">Secure Access Portal</p>
            </div>
          </div>

          {/* Form */}
          <div className="p-10">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="flex items-start gap-3 p-4 bg-error/10 border border-error/20 rounded-2xl text-error text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-charcoal-light uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-surface border border-border-color rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold transition-all"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-charcoal-light uppercase tracking-widest ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-surface border border-border-color rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-forest hover:bg-forest-dark text-white rounded-2xl font-bold tracking-wide transition-all shadow-lg shadow-forest/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    AUTHENTICATING...
                  </>
                ) : (
                  'SIGN IN TO DASHBOARD'
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-border-color text-center">
              <p className="text-muted text-xs font-medium">
                Mountain View Sports Arena © 2026<br/>
                Unauthorized access is strictly prohibited.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
