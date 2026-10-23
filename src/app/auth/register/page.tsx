'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, MapPin, Heart, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const router = useRouter();

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
          router.push('/home');
        }, 1200);
      } else {
        setSuccessMessage('Account created! Please check your email inbox to verify your email address, then sign in.');
        setTimeout(() => {
          router.push('/auth/login');
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
              href="/auth/login"
              className="text-[#163B65] font-semibold hover:underline"
            >
              Login
            </Link>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Left Column: Value Props & Illustration */}
          <div className="flex flex-col space-y-8">
            <h1 className="text-2xl sm:text-[28px] font-medium text-[#000000] tracking-tight leading-snug max-w-md">
              Find trusted health care professionals near you
            </h1>

            {/* Feature Pills */}
            <div className="space-y-6">
              {/* Feature 1 */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#E8EEF5] flex items-center justify-center text-[#22C55E] shrink-0 shadow-xs">
                  <Check className="w-6 h-6 stroke-3" />
                </div>
                <span className="text-base font-medium text-[#000000]">
                  Verified Professionals
                </span>
              </div>

              {/* Feature 2 */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#E8EEF5] flex items-center justify-center text-[#22C55E] shrink-0 shadow-xs">
                  <MapPin className="w-6 h-6 fill-[#22C55E]/20" />
                </div>
                <span className="text-base font-medium text-[#000000]">
                  Easy to find
                </span>
              </div>

              {/* Feature 3 */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#E8EEF5] flex items-center justify-center text-[#22C55E] shrink-0 shadow-xs">
                  <Heart className="w-6 h-6 fill-[#22C55E]" />
                </div>
                <span className="text-base font-medium text-[#000000]">
                  Better health decision
                </span>
              </div>
            </div>

            {/* Illustration: Person sitting on sofa with mobile phone */}
            <div className="relative pt-6 max-w-sm hidden md:block">
              <div className="w-full bg-[#F5F2EB] border-radius: 20px; p-6 flex items-center justify-center border border-[#E8E2D5]">
                <svg
                  viewBox="0 0 320 220"
                  className="w-full h-auto max-h-47.5"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Window in background */}
                  <rect x="20" y="20" width="60" height="90" rx="4" fill="#CDE1EE" stroke="#486581" strokeWidth="3" />
                  <line x1="50" y1="20" x2="50" y2="110" stroke="#486581" strokeWidth="2" />
                  <line x1="20" y1="65" x2="80" y2="65" stroke="#486581" strokeWidth="2" />

                  {/* Floor */}
                  <line x1="10" y1="190" x2="310" y2="190" stroke="#D3C7B6" strokeWidth="3" />

                  {/* Modern Sofa */}
                  <rect x="60" y="115" width="160" height="65" rx="10" fill="#243B53" />
                  <rect x="50" y="130" width="20" height="50" rx="6" fill="#334E68" />
                  <rect x="210" y="130" width="20" height="50" rx="6" fill="#334E68" />
                  <rect x="75" y="180" width="10" height="12" fill="#102A43" />
                  <rect x="195" y="180" width="10" height="12" fill="#102A43" />

                  {/* Person Sitting */}
                  <circle cx="130" cy="85" r="14" fill="#F0C29F" />
                  <path d="M120 78 C120 72 140 70 142 78 C144 85 130 92 120 85 Z" fill="#2D3748" />
                  {/* Shirt */}
                  <path d="M112 102 C115 95 145 95 148 102 L145 140 L115 140 Z" fill="#627D98" />
                  {/* Trousers */}
                  <path d="M115 140 L165 145 L175 180 L160 182 L150 155 L135 180 L120 180 Z" fill="#D9BA9B" />
                  {/* Shoes */}
                  <rect x="165" y="180" width="20" height="7" rx="3" fill="#102A43" />
                  <rect x="115" y="180" width="15" height="7" rx="3" fill="#102A43" />
                  {/* Arms & Phone */}
                  <path d="M125 105 L145 125 L140 130 Z" fill="#F0C29F" />
                  <rect x="142" y="118" width="10" height="16" rx="2" fill="#121313" />

                  {/* Plant Table */}
                  <rect x="245" y="145" width="40" height="6" rx="2" fill="#D3C7B6" />
                  <line x1="250" y1="151" x2="250" y2="190" stroke="#826E58" strokeWidth="2" />
                  <line x1="280" y1="151" x2="280" y2="190" stroke="#826E58" strokeWidth="2" />
                  {/* Plant Pot & Leaves */}
                  <path d="M255 145 L275 145 L272 128 L258 128 Z" fill="#486581" />
                  <path d="M265 128 Q260 105 250 100 Q265 112 265 128" fill="#4AB057" />
                  <path d="M265 128 Q265 100 270 95 Q272 110 265 128" fill="#38A169" />
                  <path d="M265 128 Q275 108 285 105 Q275 115 265 128" fill="#4AB057" />
                </svg>
              </div>
            </div>
          </div>

          {/* Right Column: Sign Up Form */}
          <div className="bg-white max-w-md w-full">
            <div className="mb-6">
              <h2 className="text-2xl font-medium text-[#000000]">
                Create a public account
              </h2>
              <p className="text-sm md:text-base text-black/70 font-medium mt-1">
                Get started in few steps. It&apos;s quick and easy
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Banner */}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700 animate-in fade-in">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-normal text-[#212934] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g John Doe"
                  className="w-full h-11 px-3.5 bg-white border border-[#D5DDE5] rounded-lg text-sm text-[#212934] placeholder-gray-400 focus:outline-none focus:border-[#163B65] focus:ring-1 focus:ring-[#163B65]"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-normal text-[#212934] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g John1@gmail.com"
                  className="w-full h-11 px-3.5 bg-white border border-[#D5DDE5] rounded-lg text-sm text-[#212934] placeholder-gray-400 focus:outline-none focus:border-[#163B65] focus:ring-1 focus:ring-[#163B65]"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-normal text-[#212934] mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g +231780835562"
                  className="w-full h-11 px-3.5 bg-white border border-[#D5DDE5] rounded-lg text-sm text-[#212934] placeholder-gray-400 focus:outline-none focus:border-[#163B65] focus:ring-1 focus:ring-[#163B65]"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-normal text-[#212934] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="e.g .........."
                  className="w-full h-11 px-3.5 bg-white border border-[#D5DDE5] rounded-lg text-sm text-[#212934] placeholder-gray-400 focus:outline-none focus:border-[#163B65] focus:ring-1 focus:ring-[#163B65]"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-normal text-[#212934] mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="e.g .........."
                  className="w-full h-11 px-3.5 bg-white border border-[#D5DDE5] rounded-lg text-sm text-[#212934] placeholder-gray-400 focus:outline-none focus:border-[#163B65] focus:ring-1 focus:ring-[#163B65]"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#163B65] text-white text-base md:text-lg font-bold rounded-lg hover:bg-[#0f2845] transition-colors flex items-center justify-center shadow-xs cursor-pointer disabled:opacity-70"
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
                  href="/signUp/business"
                  className="font-semibold text-[#163B65] hover:text-secondary underline ml-1"
                >
                  Register Your Business
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
