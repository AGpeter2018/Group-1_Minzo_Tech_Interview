'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, MapPin, Heart, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get('redirect');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter a valid email address');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Please enter your phone number');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // 1. Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: 'user',
          },
        },
      });

      if (error) {
        throw error;
      }

      // Check if user already exists
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setErrorMessage('An account with this email address already exists. Please log in.');
        return;
      }

      // 2. Insert or update in public.profiles table if session is active
      if (data.user) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: 'user',
          });
        } catch (profileErr) {
          console.warn('Profile creation handled by database trigger or delayed until login:', profileErr);
        }
      }

      if (data.session) {
        setSuccessMessage('Account created successfully! Welcome to Minzo Africa.');
        setTimeout(() => {
          router.push(redirectedFrom || '/home');
        }, 1200);
      } else {
        setSuccessMessage('Account created! Please check your email inbox to verify your email address, then sign in.');
        setTimeout(() => {
          const target = redirectedFrom
            ? `/auth/login?redirect=${encodeURIComponent(redirectedFrom)}`
            : '/auth/login';
          router.push(target);
        }, 2800);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between">
      {/* Main Container */}
      <div className="w-full max-w-270 mx-auto px-6 py-8 md:py-12 flex-1 flex flex-col justify-center">
        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-8 md:mb-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/favicon.ico"
              alt="Minzo Logo"
              className="w-10 h-10 rounded-lg object-contain shadow-xs"
            />
            <span className="font-extrabold text-xl text-[#163B65] tracking-tight">
              MINZO <span className="text-secondary">AFRICA</span>
            </span>
          </Link>

          {/* Already have account? Login */}
          <div className="flex items-center gap-2 text-sm md:text-base">
            <span className="text-text font-medium">Already have account?</span>
            <Link
              href={
                redirectedFrom
                  ? `/auth/login?redirect=${encodeURIComponent(redirectedFrom)}`
                  : '/auth/login'
              }
              className="text-[#163B65] font-semibold hover:underline"
            >
              Login
            </Link>
          </div>
        </div>

        {/* Content Section - 2 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Left Column: Value Prop */}
          <div className="space-y-6">
            <h1 className="text-3xl md:text-5xl font-extrabold text-[#163B65] leading-tight">
              Empowering Health Choices Across Liberia
            </h1>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed">
              Join thousands of Liberians discovering verified hospitals, comparing medical services, rating clinics, and accessing trusted community healthcare.
            </p>

            {/* Feature Checklist */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-secondary shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Access 250+ verified hospitals & clinics in all 15 counties
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-secondary shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-secondary shrink-0" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Find nearest emergency care with turn-by-turn directions
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-secondary shrink-0">
                  <Heart className="w-3.5 h-3.5 text-secondary shrink-0" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Write honest reviews and help your community find quality care
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Register Form Card */}
          <div className="bg-white p-8 md:p-10 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create an account</h2>
            <p className="text-xs text-gray-500 mb-6">
              Sign up to discover and review healthcare facilities across Liberia
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Marie Kollie"
                  className="w-full px-4 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] focus:bg-white transition text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] focus:bg-white transition text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+231 77 000 0000"
                  className="w-full px-4 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] focus:bg-white transition text-gray-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-4 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] focus:bg-white transition text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-4 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] focus:bg-white transition text-gray-800"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-6 bg-[#163B65] hover:bg-[#112d4e] active:scale-[0.99] text-white font-bold rounded-xl transition shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 min-h-11 text-sm cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>

            {/* Switch to Business Registration */}
            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500">
                Are you a healthcare facility owner or manager?{' '}
                <Link
                  href="/auth/business"
                  className="font-semibold text-[#163B65] hover:text-secondary underline ml-1"
                >
                  Register Your Facility
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#163B65]" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
