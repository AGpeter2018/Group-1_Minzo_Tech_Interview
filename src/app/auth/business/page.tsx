'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  MapPin,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Activity,
  UserCheck,
  Globe,
  Mail,
  Lock,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { LIBERIA_COUNTIES, getCountyCoordinates } from '@/lib/location';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

export default function BusinessRegisterPage() {
  const router = useRouter();

  // Authentication State
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Categories from Supabase
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Form State - Facility Details
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [county, setCounty] = useState('Montserrado');
  const [town, setTown] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [publicEmail, setPublicEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Healthcare specific details
  const [facilityLevel, setFacilityLevel] = useState('primary_clinic');
  const [emergencyServices, setEmergencyServices] = useState(false);
  const [ambulanceAvailable, setAmbulanceAvailable] = useState(false);
  const [bedCount, setBedCount] = useState<number | ''>('');
  const [openingHours, setOpeningHours] = useState('8:00 AM - 6:00 PM (Mon-Sat)');

  // Contact / Administrator Name
  const [ownerName, setOwnerName] = useState('');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Strict Authentication Guard & Data Pre-load
  useEffect(() => {
    let isMounted = true;

    async function checkAuthAndLoadData() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // If not logged in, immediately redirect to login with return redirect
        if (!session?.user) {
          router.replace('/auth/login?redirect=/auth/business');
          return;
        }

        if (!isMounted) return;
        const user = session.user;
        setCurrentUser(user);

        // Fetch user's profile to prefill name and phone
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (isMounted) {
          if (profile) {
            setUserProfile(profile);
            if (profile.full_name) setOwnerName(profile.full_name);
            if (profile.phone) setPhone(profile.phone);
          } else if (user.user_metadata?.full_name) {
            setOwnerName(user.user_metadata.full_name);
          }
          if (user.email) {
            setPublicEmail(user.email);
          }
        }

        // Fetch categories
        const { data: catData } = await supabase
          .from('categories')
          .select('id, name, slug')
          .order('name');

        if (isMounted) {
          if (catData && catData.length > 0) {
            setCategories(catData);
            setCategoryId(catData[0].id);
          } else {
            const fallback: CategoryItem[] = [
              { id: '1', name: 'Hospital', slug: 'hospital' },
              { id: '2', name: 'Clinic', slug: 'clinic' },
              { id: '3', name: 'Pharmacy', slug: 'pharmacy' },
              { id: '4', name: 'Diagnostic Lab', slug: 'diagnostic-lab' },
            ];
            setCategories(fallback);
            setCategoryId(fallback[0].id);
          }
          setAuthChecking(false);
        }
      } catch (err) {
        console.error('Auth verification error:', err);
        router.replace('/auth/login?redirect=/auth/business');
      }
    }

    checkAuthAndLoadData();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentUser) {
      setErrorMessage('You must be logged in to register a healthcare facility.');
      router.replace('/auth/login?redirect=/auth/business');
      return;
    }

    // Validation
    if (!name.trim()) {
      setErrorMessage('Please enter the official facility name');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Please provide an official contact phone number');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Upgrade user's profile role to 'business_owner' (or retain 'admin')
      const currentRole = userProfile?.role || currentUser.user_metadata?.role;
      const targetRole = currentRole === 'admin' ? 'admin' : 'business_owner';

      await supabase.from('profiles').upsert({
        id: currentUser.id,
        full_name: ownerName.trim() || userProfile?.full_name || currentUser.email?.split('@')[0],
        phone: phone.trim() || userProfile?.phone || null,
        role: targetRole,
      });

      // 2. Generate slug from facility name
      const slug =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '') +
        '-' +
        Math.random().toString(36).substring(2, 6);

      // Coordinates from county centroid
      const coords = getCountyCoordinates(county);

      // 3. Insert into businesses table linked to this authenticated user
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .insert({
          name: name.trim(),
          slug,
          category_id: categoryId || null,
          owner_id: currentUser.id,
          address: address.trim() || null,
          county,
          town: town.trim() || null,
          phone: phone.trim(),
          public_email: publicEmail.trim() || currentUser.email,
          website_url: websiteUrl.trim() || null,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          source: 'business_registration',
          verification_status: 'pending',
          record_status: 'pending',
          is_published: true,
        })
        .select()
        .single();

      if (businessError) throw businessError;

      // 4. Insert into healthcare_facility_details
      if (businessData?.id) {
        const { error: detailsError } = await supabase
          .from('healthcare_facility_details')
          .insert({
            business_id: businessData.id,
            facility_type: facilityLevel,
            emergency_services: emergencyServices,
            opening_hours_raw: openingHours,
          });

        if (detailsError) {
          console.warn('Facility details insertion notice:', detailsError.message);
        }
      }

      setSuccessMessage(
        'Facility registered successfully! Your listing has been linked to your account and submitted for verification.'
      );

      // Smooth handoff to the Business Owner Dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to submit registration. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Loading Screen while authenticating
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#DBEAFE] text-[#163B65] flex items-center justify-center mb-4 shadow-2xs">
            <Loader2 className="w-7 h-7 animate-spin text-[#163B65]" />
          </div>
          <h2 className="text-lg font-bold text-[#163B65]">Verifying Your Account</h2>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Healthcare facility registration is restricted to authenticated Minzo users. Checking your session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-gray-100 shadow-xs mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Minzo Verified Provider Network
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#163B65] tracking-tight">
                Register Your Healthcare Facility
              </h1>
              <p className="mt-2 text-sm text-gray-500 max-w-xl">
                Join 250+ hospitals, clinics, and pharmacies across Liberia. Enhance your community visibility, manage patient reviews, and build public trust.
              </p>
            </div>

            {/* Authenticated User Status Box */}
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100/80 shrink-0 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#163B65]">
                <UserCheck className="w-4 h-4 text-secondary" />
                <span>Authenticated User</span>
              </div>
              <span className="text-xs text-gray-700 font-medium truncate max-w-55 sm:max-w-60">
                {currentUser?.email}
              </span>
              <Link
                href="/dashboard"
                className="text-[11px] font-semibold text-[#163B65] hover:text-secondary hover:underline inline-flex items-center gap-1 mt-1"
              >
                Go to Business Dashboard &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-gray-100 shadow-sm">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Facility Basic Information */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                <Building2 className="w-5 h-5 text-[#163B65]" />
                <h2 className="text-base font-bold text-[#163B65]">1. Facility Information</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Official Facility Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Hope Community Health Center & Maternity"
                    className="w-full px-4 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] focus:bg-white transition text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Facility Category *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] focus:bg-white transition text-gray-800"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Facility Care Level
                  </label>
                  <select
                    value={facilityLevel}
                    onChange={(e) => setFacilityLevel(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] focus:bg-white transition text-gray-800"
                  >
                    <option value="primary_clinic">Primary Health Clinic</option>
                    <option value="secondary_hospital">Secondary / District Hospital</option>
                    <option value="tertiary_referral">Tertiary Referral Hospital</option>
                    <option value="specialized_center">Specialized Care Center</option>
                    <option value="retail_pharmacy">Retail Pharmacy & Dispensary</option>
                    <option value="diagnostic_lab">Diagnostic & Pathology Lab</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Location & Address */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                <MapPin className="w-5 h-5 text-[#163B65]" />
                <h2 className="text-base font-bold text-[#163B65]">2. Location & Physical Address</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    County (Liberia) *
                  </label>
                  <select
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] focus:bg-white transition text-gray-800"
                  >
                    {LIBERIA_COUNTIES.map((c: string) => (
                      <option key={c} value={c}>
                        {c} County
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Town / City *
                  </label>
                  <input
                    type="text"
                    value={town}
                    onChange={(e) => setTown(e.target.value)}
                    placeholder="e.g. Monrovia, Sinkor, Gbarnga, Kakata"
                    className="w-full px-4 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] focus:bg-white transition text-gray-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Street Address & Landmarks
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 15th Street, Tubman Boulevard, Near Catholic Hospital Junction"
                    className="w-full px-4 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] focus:bg-white transition text-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Healthcare Services & Availability */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                <Activity className="w-5 h-5 text-[#163B65]" />
                <h2 className="text-base font-bold text-[#163B65]">3. Services & Emergency Readiness</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Inpatient Bed Capacity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={bedCount}
                    onChange={(e) => setBedCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                    placeholder="e.g. 25"
                    className="w-full px-4 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] focus:bg-white transition text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Operating Hours
                  </label>
                  <input
                    type="text"
                    value={openingHours}
                    onChange={(e) => setOpeningHours(e.target.value)}
                    placeholder="e.g. 24/7 or Mon-Sat 8:00 AM - 8:00 PM"
                    className="w-full px-4 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] focus:bg-white transition text-gray-800"
                  />
                </div>

                <div className="sm:col-span-2 flex flex-col sm:flex-row gap-4 pt-2">
                  <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-200 bg-gray-50/60 cursor-pointer flex-1 hover:border-[#163B65]/40 transition">
                    <input
                      type="checkbox"
                      checked={emergencyServices}
                      onChange={(e) => setEmergencyServices(e.target.checked)}
                      className="w-4 h-4 rounded text-[#163B65] focus:ring-[#163B65]"
                    />
                    <div>
                      <span className="text-xs font-bold text-gray-800 block">24/7 Emergency Care</span>
                      <span className="text-[11px] text-gray-500">Facility has trauma or urgent care doctor on standby</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-200 bg-gray-50/60 cursor-pointer flex-1 hover:border-[#163B65]/40 transition">
                    <input
                      type="checkbox"
                      checked={ambulanceAvailable}
                      onChange={(e) => setAmbulanceAvailable(e.target.checked)}
                      className="w-4 h-4 rounded text-[#163B65] focus:ring-[#163B65]"
                    />
                    <div>
                      <span className="text-xs font-bold text-gray-800 block">Ambulance Service</span>
                      <span className="text-[11px] text-gray-500">Dispatches medical transport for emergencies</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Section 4: Public & Account Contact */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                <Phone className="w-5 h-5 text-[#163B65]" />
                <h2 className="text-base font-bold text-[#163B65]">4. Contact & Administrator Details</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Official Contact Phone *
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

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Public Email Address
                  </label>
                  <input
                    type="email"
                    value={publicEmail}
                    onChange={(e) => setPublicEmail(e.target.value)}
                    placeholder="contact@facility.org"
                    className="w-full px-4 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] focus:bg-white transition text-gray-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Website or Social Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-4 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] focus:bg-white transition text-gray-800"
                  />
                </div>

                <div className="sm:col-span-2 pt-2">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-[#163B65] shrink-0">
                        <Lock className="w-5 h-5 text-[#163B65]" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">
                          Connected Account: {currentUser?.email}
                        </span>
                        <span className="text-[11px] text-gray-500 block">
                          This facility will be linked to your verified account. No separate password needed.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Representative / Facility Administrator Name
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Dr. Arthur Flomo"
                    className="w-full px-4 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] focus:bg-white transition text-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* Terms notice */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-800 text-xs">
              <span className="font-bold">Verification Notice:</span> All registered healthcare facilities undergo verification by the Minzo Liberia administrative team. You will be able to manage your profile and upload facility credentials in the Dashboard while the &ldquo;Verified&rdquo; badge is processed.
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-6 bg-[#163B65] hover:bg-[#112d4e] active:scale-[0.99] text-white font-bold rounded-2xl transition shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 min-h-12 text-sm sm:text-base cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting Facility Registration...</span>
                </>
              ) : (
                <>
                  <span>Submit Facility for Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
