'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setLoading(true);

    try {
      const redirectUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/reset-password`
          : 'http://localhost:3000/auth/reset-password';

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        throw error;
      }

      setIsSubmitted(true);
    } catch (err: unknown) {
      console.error('Password reset request error:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to send password reset email. Please verify your email address.'
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
        {isSubmitted ? (
          /* Success Screen */
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Check your email
              </h1>
              <p className="text-sm text-gray-600 leading-relaxed">
                We sent a password reset link to:
                <br />
                <strong className="text-gray-900 font-semibold">{email}</strong>
              </p>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed bg-gray-50 p-3.5 rounded-xl border border-gray-100">
              Click the link in the email to set a new password. If you don&apos;t see the email, check your spam or junk folder.
            </p>

            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="w-full h-11 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition cursor-pointer"
              >
                Try another email
              </button>

              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#163B65] hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to sign in</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Form Screen */
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-[#000000] tracking-tight">
                Forgot password?
              </h1>
              <p className="text-sm text-black/70 mt-2 leading-relaxed">
                No worries! Enter your registered email address and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#000000] mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="w-full h-11 pl-10 pr-4 bg-white border border-[#D5DDE5] rounded-lg text-sm text-[#000000] placeholder-gray-400 focus:outline-none focus:border-[#163B65] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#163B65] text-white text-base font-bold rounded-lg hover:bg-[#0f2845] transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending reset link...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Reset Link</span>
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#163B65] hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to sign in</span>
              </Link>
            </div>
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
