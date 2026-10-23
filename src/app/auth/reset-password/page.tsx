'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [verifyingSession, setVerifyingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check if user arrived with a valid recovery session
  useEffect(() => {
    let mounted = true;

    async function checkRecoverySession() {
      try {
        // 1. Check existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session && mounted) {
          setHasValidSession(true);
          setVerifyingSession(false);
          return;
        }

        // 2. Listen for auth state change (Supabase sets session from URL hash)
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return;
            if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
              setHasValidSession(true);
              setVerifyingSession(false);
            }
          }
        );

        // Fallback timeout: wait up to 2 seconds for hash to process
        setTimeout(() => {
          if (mounted) {
            setVerifyingSession(false);
          }
        }, 2000);

        return () => {
          authListener?.subscription?.unsubscribe();
        };
      } catch (err) {
        console.error('Error verifying recovery session:', err);
        if (mounted) setVerifyingSession(false);
      }
    }

    checkRecoverySession();

    return () => {
      mounted = false;
    };
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      setSuccess(true);

      // Sign out from recovery session and redirect to login
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.push(
          '/auth/login?toast=password_updated&message=Your+password+has+been+successfully+updated.+Please+sign+in+with+your+new+password.'
        );
      }, 2500);
    } catch (err: unknown) {
      console.error('Password update error:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to update password. Your recovery link may have expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between">
      {/* Top Bar with Brand Logo */}
      <header className="w-full px-6 md:px-20 pt-8 md:pt-10">
        <Link href="/" className="inline-flex items-center gap-3 group focus:outline-none">
          <img
            src="/favicon.ico"
            alt="Minzo Africa"
            className="w-12 h-12 object-contain rounded-lg shadow-xs transition-transform group-hover:scale-105"
          />
        </Link>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-105 mx-auto px-4 py-8 flex-1 flex flex-col justify-center">
        {verifyingSession ? (
          /* Checking session loading state */
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center space-y-4">
            <Loader2 className="w-8 h-8 text-[#163B65] animate-spin mx-auto" />
            <p className="text-sm font-medium text-gray-600">
              Verifying your password reset link...
            </p>
          </div>
        ) : success ? (
          /* Success Screen */
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Password Updated!
              </h1>
              <p className="text-sm text-gray-600 leading-relaxed">
                Your new password has been securely saved.
              </p>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
              <span>Redirecting you to sign in...</span>
            </div>

            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 w-full h-11 bg-[#163B65] text-white text-sm font-bold rounded-lg hover:bg-[#0f2845] transition"
            >
              <span>Go to Sign In Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : !hasValidSession ? (
          /* Expired / Invalid link screen */
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center space-y-5 animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-gray-900">
                Invalid or Expired Link
              </h1>
              <p className="text-sm text-gray-600 leading-relaxed">
                This password reset link is invalid or has already expired. Security reset links can only be used once.
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <Link
                href="/auth/forgot-password"
                className="inline-flex items-center justify-center w-full h-11 bg-[#163B65] text-white text-sm font-bold rounded-lg hover:bg-[#0f2845] transition"
              >
                Request a New Reset Link
              </Link>
              <Link
                href="/auth/login"
                className="block text-xs font-semibold text-gray-500 hover:text-gray-800"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          /* Set New Password Form */
          <div className="space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#163B65] border border-blue-200 mb-3">
                <ShieldCheck className="w-4 h-4 text-[#163B65]" />
                Secure Password Reset
              </div>
              <h1 className="text-2xl font-bold text-[#000000] tracking-tight">
                Create New Password
              </h1>
              <p className="text-sm text-black/70 mt-1.5">
                Please choose a new, strong password for your account.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-5">
              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-[#000000] mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full h-11 pl-10 pr-11 bg-white border border-[#D5DDE5] rounded-lg text-sm text-[#000000] placeholder-gray-400 focus:outline-none focus:border-[#163B65] transition-colors"
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
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-sm font-medium text-[#000000] mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your new password"
                    className="w-full h-11 pl-10 pr-11 bg-white border border-[#D5DDE5] rounded-lg text-sm text-[#000000] placeholder-gray-400 focus:outline-none focus:border-[#163B65] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Match Status Helper */}
              {password && confirmPassword && (
                <div className="text-xs flex items-center gap-1.5">
                  {password === confirmPassword ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Passwords match
                    </span>
                  ) : (
                    <span className="text-red-500 font-medium">
                      Passwords do not match
                    </span>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || password.length < 6 || password !== confirmPassword}
                className="w-full h-11 bg-[#163B65] text-white text-base font-bold rounded-lg hover:bg-[#0f2845] transition-colors flex items-center justify-center shadow-xs cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating password...</span>
                  </div>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Minzo Africa. Monrovia, Liberia.
      </footer>
    </div>
  );
}
