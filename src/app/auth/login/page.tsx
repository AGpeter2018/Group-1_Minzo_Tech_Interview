'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldAlert,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AppRole } from '@/types/database';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get('redirect') || '/home';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [toastData, setToastData] = useState<{ message: string; type: 'admin' | 'success' } | null>(() => {
    const toastParam = searchParams.get('toast');
    const msgParam = searchParams.get('message');
    if (toastParam === 'password_updated') {
      return {
        message: msgParam || 'Your password has been reset successfully! Please sign in with your new password.',
        type: 'success',
      };
    }
    if (redirectedFrom === '/auth/business') {
      return {
        message: 'Please sign in to register and manage a healthcare facility on Minzo.',
        type: 'admin',
      };
    }
    if (toastParam === 'admin_required' || msgParam) {
      return {
        message: msgParam || 'Please sign in with an administrator account to access the Admin Console.',
        type: 'admin',
      };
    }
    return null;
  });

  // Auto-dismiss floating toast after 7 seconds
  useEffect(() => {
    if (!toastData) return;
    const timer = setTimeout(() => {
      setToastData(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [toastData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      setSuccessMessage('Login successful! Redirecting...');

      // Check role to route appropriately
      if (data.user) {
        let role = 'user';
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .maybeSingle();

          if (profile?.role) {
            role = profile.role;
          } else {
            // Auto-provision profile row if not existing
            const userMeta = data.user.user_metadata || {};
            const assignedRole: AppRole =
              userMeta.role === 'admin'
                ? 'admin'
                : userMeta.role === 'business_owner' || userMeta.role === 'business'
                ? 'business_owner'
                : 'user';

            await supabase.from('profiles').upsert({
              id: data.user.id,
              full_name: userMeta.full_name || email.split('@')[0],
              phone: userMeta.phone || null,
              role: assignedRole,
            });
            role = assignedRole;
          }
        } catch (profileErr) {
          console.warn('Profile lookup fallback:', profileErr);
          const metaRole = data.user.user_metadata?.role;
          if (metaRole) {
            role = metaRole;
          }
        }

        setTimeout(() => {
          if (redirectedFrom && (!redirectedFrom.startsWith('/admin') || role === 'admin')) {
            router.push(redirectedFrom);
            return;
          }
          if (role === 'admin') {
            router.push('/admin');
          } else if (role === 'business' || role === 'business_owner') {
            router.push('/dashboard');
          } else {
            router.push('/home');
          }
        }, 800);
      } else {
        router.push(redirectedFrom);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address in the field above to reset your password.');
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;
      setSuccessMessage('Password reset link sent! Please check your email.');
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to send password reset link. Please check the email.'
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between relative">
      {/* Floating Toast Notification for Admin / Auth alerts */}
      {toastData && (
        <aside
          role="alert"
          aria-live="assertive"
          className={`fixed top-5 right-5 z-50 max-w-sm sm:max-w-md bg-white border rounded-2xl shadow-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-4 fade-in duration-300 ${
            toastData.type === 'success' ? 'border-emerald-300' : 'border-amber-300'
          }`}
        >
          <div
            className={`p-2 rounded-xl shrink-0 ${
              toastData.type === 'success'
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-amber-50 text-amber-600'
            }`}
          >
            {toastData.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 pr-1">
            <h4 className="text-sm font-bold text-gray-900 mb-0.5">
              {toastData.type === 'success' ? 'Password Reset' : 'Admin Access Required'}
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">{toastData.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastData(null)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition cursor-pointer"
            aria-label="Dismiss toast"
          >
            <X className="w-4 h-4" />
          </button>
        </aside>
      )}

      {/* Top Bar with Brand Logo (Matching Figma node 280:1782) */}
      <header className="w-full px-6 md:px-20 pt-8 md:pt-10">
        <Link href="/" className="inline-flex items-center gap-3 group focus:outline-none">
          <img
            src="/favicon.ico"
            alt="Minzo Africa"
            className="w-12 h-12 object-contain rounded-lg shadow-xs transition-transform group-hover:scale-105"
          />
        </Link>
      </header>

      {/* Center Authentication Container */}
      <main className="w-full max-w-105 mx-auto px-4 py-8 flex-1 flex flex-col justify-center">
        {/* Title & Subtitle */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-medium text-[#000000] tracking-tight">
            Welcome Back
          </h1>
          <p className="text-base font-medium text-black/70 mt-1.5">
            Sign into your account
          </p>
        </div>

        {/* Feedback Alerts */}
        {toastData && (
          <div
            className={`mb-5 p-3.5 border rounded-xl flex items-start gap-2.5 text-xs animate-in fade-in ${
              toastData.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {toastData.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            )}
            <div className="flex-1">
              <span className="font-bold block mb-0.5">
                {toastData.type === 'success' ? 'Password Reset Successful' : 'Admin Login Required'}
              </span>
              <span>{toastData.message}</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-700 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3.5 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2.5 text-xs text-green-700 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email Address */}
          <div>
            <label className="block text-xs font-normal text-[#212934] mb-1 font-['Nunito',sans-serif]">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g info@hopehill.com.lr.."
              className="w-full h-11 px-3.5 bg-white border border-[#D5DDE5] rounded-lg text-sm text-[#212934] placeholder-[#94A3B8] focus:outline-none focus:border-[#163B65] focus:ring-1 focus:ring-[#163B65] transition"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-normal text-[#212934] mb-1 font-['Nunito',sans-serif]">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Type here..."
                className="w-full h-11 px-3.5 pr-10 bg-white border border-[#D5DDE5] rounded-lg text-sm text-[#212934] placeholder-[#94A3B8] focus:outline-none focus:border-[#163B65] focus:ring-1 focus:ring-[#163B65] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Forgot Password Right Aligned */}
            <div className="flex justify-end mt-2">
              <Link
                href="/auth/forgot-password"
                className="text-sm font-medium text-text hover:text-[#163B65] hover:underline transition-colors focus:outline-none"
              >
                Forgot Password?
              </Link>
            </div>
          </div>

          {/* Continue Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#163B65] text-white text-lg font-bold rounded-lg hover:bg-[#0f2845] transition-colors flex items-center justify-center shadow-xs cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-base font-medium">Verifying...</span>
                </div>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </form>

        {/* Don't have an account? SignUp */}
        <div className="mt-8 text-center text-base">
          <span className="font-medium text-[#000000]">Don’t have an account? </span>
          <Link
            href={
              redirectedFrom && redirectedFrom !== '/home'
                ? `/auth/register?redirect=${encodeURIComponent(redirectedFrom)}`
                : '/auth/register'
            }
            className="font-medium text-[#163B65] hover:underline"
          >
            SignUp
          </Link>
        </div>

        {/* Business account prompt */}
        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            Healthcare facility manager or administrator?{' '}
            <Link
              href="/auth/business"
              className="font-semibold text-[#163B65] hover:underline ml-0.5"
            >
              Register your facility
            </Link>
          </p>
        </div>
      </main>

      {/* Simple footer padding */}
      <footer className="w-full py-6 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Minzo Africa. Monrovia, Liberia.
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#163B65]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
