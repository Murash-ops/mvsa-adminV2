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
    <main className="min-h-screen bg-transparent flex items-center justify-center p-4 relative overflow-hidden animate-entrance">
      {/* Background Accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-forest-light/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="bg-card rounded-3xl shadow-pitch border border-white/5 overflow-hidden">
          {/* Header */}
          <div className="bg-forest-dark/45 p-10 text-center relative overflow-hidden border-b border-white/5">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02]" />
            <div className="relative z-10">
              <div className="w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gold/20">
                <Shield className="w-8 h-8 text-gold" />
              </div>
              <h1 className="text-3xl font-extrabold font-display tracking-tight text-white italic mb-2">MVSA ADMIN</h1>
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
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-2xl focus:outline-none focus:ring-4 focus:ring-gold/5 focus:border-gold/30 transition-all font-medium"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-2xl focus:outline-none focus:ring-4 focus:ring-gold/5 focus:border-gold/30 transition-all font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-gold to-gold-muted hover:from-gold hover:to-gold/90 text-forest rounded-2xl font-extrabold tracking-wide transition-all shadow-gold-md hover:shadow-gold-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 spring-bounce"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-forest" />
                    AUTHENTICATING...
                  </>
                ) : (
                  'SIGN IN TO DASHBOARD'
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-white/5 text-center">
              <p className="text-white/30 text-[11px] font-medium leading-relaxed">
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
