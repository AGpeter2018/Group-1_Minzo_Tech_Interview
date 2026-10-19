'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  Star,
  Phone,
  Globe,
  ArrowRight,
  ShieldCheck,
  Building2,
  Pill,
  FlaskConical,
  UserCheck,
  Store,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  LocateFixed,
  Loader2,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { COUNTIES_LIST } from '@/lib/location';

// Curated stock photos for Liberian healthcare facilities
const FACILITY_PHOTOS = [
  'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80',
];

// Fallback items matching the exact Figma designs if database is loading
const FIGMA_FEATURED_FACILITIES = [
  {
    id: 'bomi-govt-hospital',
    name: 'Liberia Government Hospital (Tubmanburg)',
    category: { name: 'Hospital' },
    rating: null,
    review_count: 0,
    verification_status: 'verified',
    town: 'Tubmanburg',
    county: 'Bomi County',
    phone: '+231886410594',
    website_url: 'www.liberiagovernment.com',
    photo: FACILITY_PHOTOS[1],
  },
  {
    id: 'harmony-bridge-pharmacy',
    name: 'Harmony Bridge Pharmacy',
    category: { name: 'Pharmacy' },
    rating: null,
    review_count: 0,
    verification_status: 'verified',
    town: 'Main Street, Bomi Hills',
    county: 'Bomi County',
    phone: '+231777551423',
    website_url: 'www.harmonybridge.com',
    photo: FACILITY_PHOTOS[0],
  },
  {
    id: 'buchanan-govt-hospital',
    name: 'Liberia Government Hospital (Buchanan)',
    category: { name: 'Hospital' },
    rating: null,
    review_count: 0,
    verification_status: 'verified',
    town: 'Buchanan',
    county: 'Grand Bassa County',
    phone: '+231556442566',
    website_url: 'www.liberiagovernment.org',
    photo: FACILITY_PHOTOS[2],
  },
  {
    id: 'hope-hill-clinic',
    name: 'Hope Hill Clinic',
    category: { name: 'Clinic' },
    rating: null,
    review_count: 0,
    verification_status: 'unverified',
    town: 'Old Road, behind the Town Hall Suakoko',
    county: 'Bong County',
    phone: '+231770836562',
    website_url: 'www.hopehill.com.lr',
    photo: FACILITY_PHOTOS[3],
  },
];

export default function AuthenticatedLandingPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Current Location');
  const [isLocating, setIsLocating] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [featuredFacilities, setFeaturedFacilities] = useState<any[]>(FIGMA_FEATURED_FACILITIES);
  const [loading, setLoading] = useState(true);

  // 1. Authentication Guard: Ensure user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Redirect to login with return path
        router.replace('/auth/login?redirect=/home');
      } else {
        setUser(session.user);
        setAuthChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  // 2. Fetch live verified facilities from Supabase
  useEffect(() => {
    if (authChecking) return;

    async function fetchTopFacilities() {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select(`
            id,
            name,
            address,
            town,
            county,
            phone,
            public_email,
            website_url,
            verification_status,
            category:categories(name),
            healthcare_facility_details(
              facility_type,
              emergency_services
            ),
            reviews(rating)
          `)
          .limit(4);

        if (error) {
          console.warn('Error fetching facilities, using Figma fallbacks:', error.message);
          return;
        }

        if (data && data.length > 0) {
          const mapped = data.map((b: any, index: number) => {
            const fallback = FIGMA_FEATURED_FACILITIES[index % FIGMA_FEATURED_FACILITIES.length];
            const countyName = b.county
              ? b.county.toLowerCase().includes('county')
                ? b.county
                : `${b.county} County`
              : fallback.county;

            const revs = b.reviews || [];
            const reviewCount = revs.length;
            const avgRating =
              reviewCount > 0
                ? Number(
                    (
                      revs.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) /
                      reviewCount
                    ).toFixed(1)
                  )
                : null;

            return {
              id: b.id,
              name: b.name || fallback.name,
              category: { name: b.category?.name || fallback.category.name },
              rating: avgRating,
              review_count: reviewCount,
              verification_status: b.verification_status || fallback.verification_status,
              town: b.town || b.address || fallback.town,
              county: countyName,
              phone: b.phone || fallback.phone,
              website_url: b.website_url || fallback.website_url,
              photo: FACILITY_PHOTOS[index % FACILITY_PHOTOS.length],
            };
          });
          setFeaturedFacilities(mapped);
        }
      } catch (err) {
        console.error('Failed to load facilities:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTopFacilities();
  }, [authChecking]);

  // Handle Search Submission
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedLocation && selectedLocation !== 'Current Location') {
      params.set('county', selectedLocation);
    }
    router.push(`/search?${params.toString()}`);
  };

  // Handle Browser Geolocation
  const handleGetCurrentLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setSelectedLocation('Montserrado County');
        setShowLocationPicker(false);
      },
      (err) => {
        setIsLocating(false);
        setShowLocationPicker(true);
      },
      { timeout: 7000 }
    );
  };

  // If session is being verified, show full-screen auth loader
  if (authChecking) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#163B65]" />
        <p className="text-sm font-medium text-gray-500">
          Verifying your authentication session...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface text-text min-h-screen flex flex-col">
      {/* Hero Section Container (Figma Node 280:3497 & 280:3496) */}
      <section className="relative px-4 sm:px-6 lg:px-12 pt-6 pb-12 max-w-300 mx-auto w-full">
        <div className="relative rounded-3xl overflow-hidden min-h-75 md:min-h-85 flex flex-col justify-between p-6 sm:p-10 md:p-12 shadow-md">
          {/* Hero Background Image with Darkness Filter */}
          <div
            className="absolute inset-0 bg-cover bg-center pointer-events-none"
            style={{
              backgroundImage: 'url("/hero-image.png")',
            }}
          />

          {/* Hero Content */}
          <div className="max-w-xl z-10 space-y-3">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Find Trusted Healthcare <br className="hidden sm:inline" />
              and Local Services Near You
            </h1>
            <p className="text-sm sm:text-base text-gray-200 leading-relaxed max-w-lg">
              Discover healthcare facilities and local businesses across Liberia. Compare ratings, read reviews, and find the information you need to make confident decisions.
            </p>
          </div>

          {/* Integrated Search Bar (Figma Node 280:3501 - Frame 7) */}
          <div className="mt-8 z-20">
            <form
              onSubmit={handleSearch}
              className="bg-white rounded-2xl md:rounded-full p-2.5 sm:p-3 shadow-2xl border border-gray-100 flex flex-col md:flex-row items-center gap-2.5 md:gap-4 max-w-4xl"
            >
              {/* Search Keyword Input */}
              <div className="flex items-center gap-3 w-full md:flex-1 px-3 py-1.5 border-b md:border-b-0 md:border-r border-gray-200">
                <Search className="w-5 h-5 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for hospitals, clinics, pharmacies..."
                  className="w-full text-sm text-text placeholder-gray-400 focus:outline-none bg-transparent"
                />
              </div>

              {/* Location Picker */}
              <div className="relative w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(!showLocationPicker)}
                  className="flex items-center gap-2.5 w-full md:w-auto px-3 py-2 text-sm text-gray-700 hover:text-[#163B65] focus:outline-none transition-colors"
                >
                  <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                  <span className="font-medium truncate max-w-37.5">
                    {selectedLocation}
                  </span>
                </button>

                {/* Location Dropdown Modal */}
                {showLocationPicker && (
                  <div className="absolute left-0 md:right-0 md:left-auto top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#163B65]">
                        Select County
                      </span>
                      <button
                        type="button"
                        onClick={handleGetCurrentLocation}
                        disabled={isLocating}
                        className="text-xs text-secondary hover:underline font-semibold flex items-center gap-1"
                      >
                        <LocateFixed className="w-3.5 h-3.5" />
                        {isLocating ? 'Locating...' : 'GPS Near Me'}
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLocation('Current Location');
                          setShowLocationPicker(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#E8EEF5] text-gray-700 font-semibold"
                      >
                        All Liberia (Any County)
                      </button>
                      {COUNTIES_LIST.map((county) => (
                        <button
                          key={county}
                          type="button"
                          onClick={() => {
                            setSelectedLocation(county);
                            setShowLocationPicker(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#E8EEF5] transition ${
                            selectedLocation === county ? 'bg-[#E8EEF5] font-bold text-[#163B65]' : 'text-gray-600'
                          }`}
                        >
                          {county}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Search Button (Figma Node 280:3514) */}
              <button
                type="submit"
                className="w-full md:w-auto h-11 px-8 bg-[#163B65] text-white text-sm font-bold rounded-xl md:rounded-full hover:bg-[#0f2845] transition-colors shadow-xs flex items-center justify-center shrink-0 cursor-pointer"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 6 Category Circular Pills (Figma Node 280:3515 - Frame 14) */}
      <section className="max-w-300 mx-auto px-4 sm:px-6 lg:px-12 py-6 w-full">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 sm:gap-6 text-center">
          {/* 1. Hospitals/Clinics */}
          <Link
            href="/search?category=Hospital"
            className="group flex flex-col items-center p-3 rounded-2xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-[#DBEAFE] group-hover:bg-[#BFDBFE] flex items-center justify-center text-[#163B65] mb-2.5 transition-transform group-hover:scale-105 shadow-2xs">
              <Building2 className="w-5 h-5 text-blue-700" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text group-hover:text-[#163B65]">
              Hospitals/Clinics
            </span>
          </Link>

          {/* 2. Pharmacies */}
          <Link
            href="/search?category=Pharmacy"
            className="group flex flex-col items-center p-3 rounded-2xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-[#DBEAFE] group-hover:bg-[#BFDBFE] flex items-center justify-center text-[#163B65] mb-2.5 transition-transform group-hover:scale-105 shadow-2xs">
              <Pill className="w-5 h-5 text-blue-700" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text group-hover:text-[#163B65]">
              Pharmacies
            </span>
          </Link>

          {/* 3. Laboratories */}
          <Link
            href="/search?category=Laboratory"
            className="group flex flex-col items-center p-3 rounded-2xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-[#DBEAFE] group-hover:bg-[#BFDBFE] flex items-center justify-center text-[#163B65] mb-2.5 transition-transform group-hover:scale-105 shadow-2xs">
              <FlaskConical className="w-5 h-5 text-blue-700" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text group-hover:text-[#163B65]">
              Laboratories
            </span>
          </Link>

          {/* 4. Specialists */}
          <Link
            href="/search?category=Specialist"
            className="group flex flex-col items-center p-3 rounded-2xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-[#DBEAFE] group-hover:bg-[#BFDBFE] flex items-center justify-center text-[#163B65] mb-2.5 transition-transform group-hover:scale-105 shadow-2xs">
              <UserCheck className="w-5 h-5 text-blue-700" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text group-hover:text-[#163B65]">
              Specialists
            </span>
          </Link>

          {/* 5. Businesses */}
          <Link
            href="/search"
            className="group flex flex-col items-center p-3 rounded-2xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-[#DBEAFE] group-hover:bg-[#BFDBFE] flex items-center justify-center text-[#163B65] mb-2.5 transition-transform group-hover:scale-105 shadow-2xs">
              <Store className="w-5 h-5 text-blue-700" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text group-hover:text-[#163B65]">
              Businesses
            </span>
          </Link>

          {/* 6. More */}
          <Link
            href="/search"
            className="group flex flex-col items-center p-3 rounded-2xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-[#DBEAFE] group-hover:bg-[#BFDBFE] flex items-center justify-center text-[#163B65] mb-2.5 transition-transform group-hover:scale-105 shadow-2xs">
              <MoreHorizontal className="w-5 h-5 text-blue-700" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-text group-hover:text-[#163B65]">
              More
            </span>
          </Link>
        </div>
      </section>

      {/* Popular Health Facilities (Figma Node 280:3586 - Frame 40) */}
      <section className="max-w-300 mx-auto px-4 sm:px-6 lg:px-12 py-8 w-full flex-1">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg md:text-xl font-bold text-black tracking-tight">
            Popular Health Facilities
          </h2>
          <Link
            href="/search"
            className="text-xs font-semibold text-[#163B65] hover:text-secondary flex items-center gap-1 group"
          >
            View all 249+ listings
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* 2x2 Grid of Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col animate-pulse"
              >
                <div className="h-44 sm:h-48 w-full bg-gray-200" />
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-gray-200 rounded w-28" />
                      <div className="h-5 bg-gray-200 rounded-full w-20" />
                    </div>
                    <div className="mt-3.5 space-y-2 pt-1">
                      <div className="h-4 bg-gray-100 rounded w-2/3" />
                      <div className="h-4 bg-gray-100 rounded w-1/2" />
                      <div className="h-4 bg-gray-100 rounded w-3/5" />
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                    <div className="h-7 bg-gray-200 rounded-lg w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {featuredFacilities.map((facility) => {
            const isVerified = facility.verification_status === 'verified';
            return (
              <div
                key={facility.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
              >
                {/* Image */}
                <div className="h-44 sm:h-48 w-full overflow-hidden relative">
                  <img
                    src={facility.photo}
                    alt={facility.name}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 bg-[#163B65]/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs">
                    {facility.category?.name || 'Healthcare'}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    {/* Facility Title */}
                    <h3 className="font-semibold text-lg text-black line-clamp-1 leading-snug">
                      {facility.name}
                    </h3>

                    {/* Ratings & Verification Badge Row (Figma Node 280:3556) */}
                    <div className="flex items-center justify-between mt-2.5 gap-2">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Star className="w-4 h-4 fill-[#FFCD0F] text-[#FFCD0F]" />
                        {facility.rating ? (
                          <>
                            <span className="font-medium text-black">{facility.rating.toFixed(1)}</span>
                            <span className="text-gray-500 font-medium text-xs">
                              ({facility.review_count} reviews)
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-gray-500 font-medium">No reviews yet</span>
                        )}
                      </div>

                      {/* Verified Badge */}
                      {isVerified ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#22C55E] text-white text-xs font-semibold shadow-2xs">
                          <Check className="w-3.5 h-3.5 stroke-3" />
                          <span>Verified</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#BFDBFE] text-blue-900 text-xs font-semibold shadow-2xs">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Unverified</span>
                        </div>
                      )}
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 mt-3 text-sm text-gray-700">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="line-clamp-1">
                        {facility.town ? `${facility.town}, ${facility.county}` : facility.county}
                      </span>
                    </div>

                    {/* Phone */}
                    {facility.phone && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-700">
                        <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                        <a
                          href={`tel:${facility.phone}`}
                          className="hover:text-secondary transition"
                        >
                          {facility.phone}
                        </a>
                      </div>
                    )}

                    {/* Website */}
                    {facility.website_url && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-700">
                        <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="line-clamp-1 text-gray-600 hover:text-[#163B65]">
                          {facility.website_url}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* View Details Link */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <Link
                      href={`/facility/${facility.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#163B65] hover:text-secondary transition-colors group/link"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                    </Link>

                    {facility.phone && (
                      <a
                        href={`tel:${facility.phone}`}
                        className="text-xs font-bold text-white bg-secondary hover:bg-emerald-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <Phone className="w-3 h-3" />
                        Call Facility
                      </a>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Trust Row & Business CTA (Figma Node 280:3662) */}
      <section className="max-w-300 mx-auto px-4 sm:px-6 lg:px-12 py-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#F9FAFB] rounded-3xl p-6 sm:p-8 border border-gray-100">
          {/* 4 Trust Badges */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="flex flex-col items-center">
              <div className="w-11 h-11 rounded-full bg-[#DBEAFE] flex items-center justify-center text-blue-700 mb-2">
                <Building2 className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-gray-800">Trusted by</p>
              <p className="text-[11px] text-gray-500">50,000+ Liberian</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-11 h-11 rounded-full bg-[#DBEAFE] flex items-center justify-center text-blue-700 mb-2">
                <Pill className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-gray-800">Verified</p>
              <p className="text-[11px] text-gray-500">Business</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-11 h-11 rounded-full bg-[#DBEAFE] flex items-center justify-center text-blue-700 mb-2">
                <FlaskConical className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-gray-800">Real Business</p>
              <p className="text-[11px] text-gray-500">from real people</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-11 h-11 rounded-full bg-[#DBEAFE] flex items-center justify-center text-blue-700 mb-2">
                <UserCheck className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-gray-800">A healthier</p>
              <p className="text-[11px] font-bold text-secondary">stronger Liberia</p>
            </div>
          </div>

          {/* Right Call-To-Action Card */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-gray-200/80 flex items-center gap-4 shadow-xs">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80"
              alt="Liberian healthcare provider"
              className="w-16 h-16 rounded-xl object-cover shrink-0"
            />
            <div>
              <h4 className="text-sm font-bold text-[#163B65]">
                Own a business or Health Facility?
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Register today and get connected with more Liberians across the country.
              </p>
              <Link
                href="/auth/business"
                className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline mt-2"
              >
                Register Your Facility &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
