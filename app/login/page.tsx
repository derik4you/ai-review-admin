'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Lock, Mail, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorMsg = searchParams.get('error');

  const [email, setEmail] = useState<string>('prathameshpvadde2004@gmail.com');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>(errorMsg || '');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userEmail = result.user.email;

      if (!userEmail) {
        throw new Error('Could not retrieve email from Google Account.');
      }

      const cleanEmail = userEmail.toLowerCase().trim();
      if (cleanEmail !== 'prathameshpvadde2004@gmail.com' && cleanEmail !== 'admin@yourdomain.com') {
        throw new Error(`Access Denied: (${userEmail}) is not authorized. Only Super Admin prathameshpvadde2004@gmail.com can log in.`);
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      console.error('Google Admin Sign-In error:', err);
      setErrorMessage(err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const cleanEmail = email.toLowerCase().trim();
      if (cleanEmail !== 'prathameshpvadde2004@gmail.com' && cleanEmail !== 'admin@yourdomain.com') {
        throw new Error(`Access Denied: (${email}) is not authorized. Only Super Admin prathameshpvadde2004@gmail.com can log in.`);
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Check your admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-[#1a73e8] via-[#9b51e0] to-[#ea4335] text-white shadow-md mb-2">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-[#202124] tracking-tight">
          ReviewEasy <span className="text-[#1a73e8]">Super Admin</span> Console
        </h1>
        <p className="text-xs text-[#5f6368]">
          Authorized Super Admin Login (<span className="font-bold text-[#1a73e8]">prathameshpvadde2004@gmail.com</span>)
        </p>
      </div>

      <div className="google-app-card p-6 border border-[#dadce0] bg-white space-y-4 shadow-xl rounded-2xl">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-[#fce8e6] text-[#c5221f] text-xs font-semibold flex items-center space-x-2 border border-[#fad2cf]">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl border border-[#dadce0] hover:bg-[#f8fafd] text-[#202124] text-xs font-bold flex items-center justify-center space-x-2.5 transition-all shadow-xs disabled:opacity-50"
        >
          <GoogleIcon />
          <span>{loading ? 'Authenticating Google Admin...' : 'Sign In with Google (Super Admin)'}</span>
        </button>

        <div className="relative flex items-center justify-center my-2">
          <div className="border-t border-[#dadce0] w-full" />
          <span className="bg-white px-3 text-[10px] text-[#5f6368] font-bold absolute uppercase tracking-wider">
            or email
          </span>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#202124]">Super Admin Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#5f6368] absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prathameshpvadde2004@gmail.com"
                className="w-full pl-9 pr-3 py-2 text-xs border border-[#dadce0] rounded-lg focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#202124]">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#5f6368] absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs border border-[#dadce0] rounded-lg focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium rounded-full text-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Verifying credentials...</span>
            ) : (
              <>
                <span>Sign In with Password</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-3 border-t border-[#dadce0] text-center">
          <p className="text-[11px] text-[#5f6368]">
            Authorized Admin Email: <code className="bg-[#f1f3f4] px-1.5 py-0.5 rounded text-[#202124] font-bold">prathameshpvadde2004@gmail.com</code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-center items-center p-4">
      <Suspense fallback={<div className="text-xs text-[#5f6368]">Loading Super Admin Login Portal...</div>}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
