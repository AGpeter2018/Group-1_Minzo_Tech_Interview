'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Clock,
  Activity,
  Plus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LIBERIA_COUNTIES, getCountyCoordinates } from '@/lib/location';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

export default function BusinessRegisterPage() {
  const router = useRouter();

  // Categories from Supabase
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

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

  // Contact / Account details
  const [ownerName, setOwnerName] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadCategories() {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug')
          .order('name');
        if (data && data.length > 0) {
          setCategories(data);
          setCategoryId(data[0].id);
        } else {
          // Fallback defaults if table is empty
          const fallback = [
            { id: '1', name: 'Hospital', slug: 'hospital' },
            { id: '2', name: 'Clinic', slug: 'clinic' },
            { id: '3', name: 'Pharmacy', slug: 'pharmacy' },
            { id: '4', name: 'Diagnostic Lab', slug: 'diagnostic-lab' }
          ];
          setCategories(fallback);
          setCategoryId(fallback[0].id);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    }
    loadCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!name.trim()) {
      setErrorMessage('Please enter the facility name');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Please provide an official contact phone number');
      return;
    }
    if (!accountEmail.trim()) {
      setErrorMessage('Please provide an administrator account email');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Account password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Sign up the user profile as 'business'
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: accountEmail.trim(),
        password,
        options: {
          data: {
            full_name: ownerName.trim() || name.trim(),
            role: 'business',
            phone: phone.trim(),
          },
        },
      });

      if (authError) throw authError;

      const userId = authData.user?.id;

      if (userId) {
        // Upsert profile record
        await supabase.from('profiles').upsert({
          id: userId,
          full_name: ownerName.trim() || name.trim(),
          phone: phone.trim(),
          role: 'business',
        });
      }

      // Generate slug from name
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + '-' + Math.random().toString(36).substring(2, 6);

      // Coordinates from county centroid
      const coords = getCountyCoordinates(county);

      // 2. Insert into businesses table
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .insert({
          name: name.trim(),
          slug,
          category_id: categoryId || null,
          owner_id: userId || null,
          address: address.trim() || null,
          county,
          town: town.trim() || null,
          phone: phone.trim(),
          public_email: publicEmail.trim() || accountEmail.trim(),
          website_url: websiteUrl.trim() || null,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          source: 'business_registration',
          verification_status: 'pending',
          record_status: 'pending',
          is_published: true, // published so it shows up or pending admin review
        })
        .select()
        .single();

      if (businessError) {
        console.error('Error creating business record:', businessError);
      }

      // 3. Insert into healthcare_facility_details if business created
      if (businessData?.id) {
        await supabase.from('healthcare_facility_details').insert({
          business_id: businessData.id,
          facility_level: facilityLevel,
          emergency_services: emergencyServices,
          ambulance_available: ambulanceAvailable,
          bed_count: typeof bedCount === 'number' ? bedCount : null,
          opening_hours: openingHours,
        });
      }

      setSuccessMessage('Registration submitted successfully! Your facility listing is now submitted for verification.');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit registration. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-gray-100 shadow-xs mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Minzo Verified Provider Network
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#163B65] tracking-tight">
                Register Your Healthcare Facility
              </h1>
              <p className="mt-2 text-sm text-gray-500 max-w-xl">
                Join 249+ hospitals, clinics, and pharmacies across Liberia. Enhance your community visibility, manage patient inquiries, and build public trust.
              </p>
            </div>
            <Link
              href="/auth/login"
              className="text-xs font-semibold text-[#163B65] hover:underline shrink-0"
            >
              Already registered? Log in &rarr;
            </Link>
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
                    placeholder="e.g. Hope Community Health Center &amp; Maternity"
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
                    <option value="retail_pharmacy">Retail Pharmacy &amp; Dispensary</option>
                    <option value="diagnostic_lab">Diagnostic &amp; Pathology Lab</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Location & Address */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                <MapPin className="w-5 h-5 text-[#163B65]" />
                <h2 className="text-base font-bold text-[#163B65]">2. Location &amp; Physical Address</h2>
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
                    Street Address &amp; Landmarks
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
                <h2 className="text-base font-bold text-[#163B65]">3. Services &amp; Emergency Readiness</h2>
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
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer flex-1">
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

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer flex-1">
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
                <h2 className="text-base font-bold text-[#163B65]">4. Contact &amp; Management Account</h2>
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
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-3">
                    Facility Administrator Account Credentials
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Representative / Admin Name
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Dr. Arthur Flomo"
                    className="w-full px-4 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] focus:bg-white transition text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Account Login Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    placeholder="admin@facility.org"
                    className="w-full px-4 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] focus:bg-white transition text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-4 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] focus:bg-white transition text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Confirm Password *
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
            </div>

            {/* Terms notice */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-800 text-xs">
              <span className="font-bold">Verification Notice:</span> All registered healthcare facilities undergo verification by the Minzo Liberia administrative team. You will be able to manage your profile immediately while the &ldquo;Verified&rdquo; badge is processed.
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
                  <span>Submitting Registration...</span>
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
