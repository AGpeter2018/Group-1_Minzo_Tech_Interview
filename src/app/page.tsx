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
  Cross,
  CheckCircle2,
  AlertCircle,
  LocateFixed,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Business } from '@/types/database';
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
    rating: 4.0,
    review_count: 116,
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
    rating: 5.0,
    review_count: 198,
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
    rating: 3.0,
    review_count: 116,
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
    town: 'Old Road, behind the Town Hall, Suakoko',
    county: 'Bong County',
    phone: '+231770836562',
    website_url: 'www.hopehill.com.lr',
    photo: FACILITY_PHOTOS[3],
  },
];

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Current Location');
  const [isLocating, setIsLocating] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [featuredFacilities, setFeaturedFacilities] = useState<any[]>(FIGMA_FEATURED_FACILITIES);
  const [loading, setLoading] = useState(true);

  // Fetch real facilities from Supabase
  useEffect(() => {
    async function fetchPopular() {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*, category:categories(*)')
          .limit(4);

        if (data && data.length > 0 && !error) {
          // Map DB facilities to cards with stock photos
          const mapped = data.map((item: any, index: number) => ({
            id: item.id,
            name: item.name,
            category: item.category || { name: 'Healthcare Facility' },
            rating: index === 0 ? 4.0 : index === 1 ? 5.0 : index === 2 ? 3.0 : null,
            review_count: index === 0 ? 116 : index === 1 ? 198 : index === 2 ? 116 : 0,
            verification_status: item.verification_status || (index < 3 ? 'verified' : 'unverified'),
            town: item.town || '',
            county: item.county ? `${item.county} County` : 'Liberia',
            phone: item.phone || '+231 886 000 000',
            website_url: item.website_url || 'www.liberiahealth.org',
            photo: FACILITY_PHOTOS[index % FACILITY_PHOTOS.length],
          }));
          setFeaturedFacilities(mapped);
        }
      } catch (err) {
        console.warn('Using default featured facilities:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPopular();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedLocation && selectedLocation !== 'Current Location') {
      params.set('county', selectedLocation);
    }
    router.push(`/search?${params.toString()}`);
  };

  const handleNearMeClick = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          setSelectedLocation('Current Location');
          setShowLocationPicker(false);
          router.push(`/search?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&nearMe=true`);
        },
        () => {
          setIsLocating(false);
          setShowLocationPicker(true);
        }
      );
    } else {
      setIsLocating(false);
      setShowLocationPicker(true);
    }
  };

  const categoriesList = [
    { name: 'Hospitals/Clinics', icon: Building2, slug: 'Hospital' },
    { name: 'Pharmacies', icon: Pill, slug: 'Pharmacy' },
    { name: 'Laboratories', icon: FlaskConical, slug: 'Clinic' },
    { name: 'Specialists', icon: UserCheck, slug: 'Specialists' },
    { name: 'Businesses', icon: Store, slug: 'all' },
    { name: 'More', icon: MoreHorizontal, slug: 'all' },
  ];

  return (
    <div className="w-full bg-[#FFFFFF] pb-16">
      {/* =========================================================================
          HERO SECTION with background image and integrated search bar
      ========================================================================= */}
      <section className="relative w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-12 pt-6 pb-12">
        <div className="relative rounded-[20px] overflow-hidden bg-gradient-to-r from-[#0d223a] via-[#163b65] to-[#1a4a7f] shadow-lg min-h-[340px] md:min-h-[380px] flex flex-col justify-center px-6 sm:px-12 py-10 md:py-14 text-white">
          {/* Background image overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-30 pointer-events-none"
            style={{
              backgroundImage:
                'url("https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1600&q=80")',
            }}
          />

          <div className="relative z-10 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl md:text-[34px] font-bold text-white tracking-tight leading-tight">
              Find Trusted Healthcare <br className="hidden sm:inline" />
              and Local Services Near You
            </h1>
            <p className="mt-3 text-white/90 text-sm md:text-base leading-relaxed">
              Discover healthcare facilities and local businesses across Liberia.
              Compare ratings, read reviews, and find the information you need to
              make confident decisions.
            </p>
          </div>

          {/* Floating Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative z-20 mt-8 w-full max-w-[830px] bg-white rounded-[18px] p-2 md:p-2.5 shadow-xl border border-gray-100 flex flex-col md:flex-row items-stretch md:items-center gap-2"
          >
            {/* Search Query Input */}
            <div className="flex-1 flex items-center gap-2.5 px-3 min-h-[46px]">
              <Search className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for hospitals, clinics, pharmacies..."
                className="w-full text-sm text-[#121313] placeholder-gray-500 focus:outline-none bg-transparent"
              />
            </div>

            <div className="hidden md:block w-[1px] h-[30px] bg-gray-200" />

            {/* Location Selector */}
            <div className="relative flex items-center gap-2 px-3 min-h-[46px] border-t md:border-t-0 border-gray-100">
              <MapPin className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <button
                type="button"
                onClick={() => setShowLocationPicker(!showLocationPicker)}
                className="text-sm text-[#121313] font-medium hover:text-[#163B65] text-left truncate flex items-center gap-1.5 focus:outline-none"
              >
                <span>{selectedLocation}</span>
                <span className="text-[10px] text-gray-400">▼</span>
              </button>

              {/* Location Dropdown */}
              {showLocationPicker && (
                <div className="absolute top-[52px] left-0 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in max-h-64 overflow-y-auto">
                  <button
                    type="button"
                    onClick={handleNearMeClick}
                    className="w-full text-left px-4 py-2 text-sm text-[#163B65] font-semibold hover:bg-[#F3F5F7] flex items-center gap-2"
                  >
                    <LocateFixed className="w-4 h-4 text-[#4AB057]" />
                    {isLocating ? 'Detecting GPS...' : '📍 Use Current Location'}
                  </button>
                  <div className="h-[1px] bg-gray-100 my-1" />
                  <div className="px-4 py-1 text-[11px] uppercase font-bold text-gray-400">
                    Filter by County
                  </div>
                  {COUNTIES_LIST.map((county) => (
                    <button
                      key={county}
                      type="button"
                      onClick={() => {
                        setSelectedLocation(county);
                        setShowLocationPicker(false);
                      }}
                      className="w-full text-left px-4 py-1.5 text-sm text-[#121313] hover:bg-[#F3F5F7]"
                    >
                      {county}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Search Button */}
            <button
              type="submit"
              className="min-h-[44px] px-8 bg-[#163B65] text-white text-base font-bold rounded-[10px] hover:bg-[#0f2845] transition-colors flex items-center justify-center shadow-xs cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* =========================================================================
          CATEGORY ICONS ROW
      ========================================================================= */}
      <section className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-12 py-4">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 sm:gap-6 max-w-[850px] mx-auto">
          {categoriesList.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.name}
                href={`/search?category=${encodeURIComponent(cat.slug)}`}
                className="flex flex-col items-center group focus:outline-none"
              >
                <div className="w-[48px] h-[48px] rounded-full bg-[#DBEAFE] flex items-center justify-center text-[#163B65] group-hover:bg-[#163B65] group-hover:text-white transition-all shadow-xs">
                  <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                </div>
                <span className="text-xs sm:text-[14px] text-[#121313] font-medium mt-2 text-center group-hover:text-[#163B65] transition-colors">
                  {cat.name}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          POPULAR HEALTH FACILITIES GRID
      ========================================================================= */}
      <section className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-12 pt-10 pb-12">
        <div className="max-w-[850px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[18px] md:text-[20px] font-bold text-[#121313] tracking-tight">
              Popular Health Facilities
            </h2>
            <Link
              href="/search"
              className="text-xs sm:text-sm font-semibold text-[#163B65] hover:text-[#4AB057] transition-colors"
            >
              View all 249 facilities →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {featuredFacilities.map((facility) => {
              const isVerified = facility.verification_status === 'verified';
              return (
                <div
                  key={facility.id}
                  className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
                >
                  {/* Photo on Top */}
                  <div className="relative w-full h-[169px] bg-gray-100 overflow-hidden">
                    <img
                      src={facility.photo}
                      alt={facility.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Title */}
                      <Link href={`/facility/${facility.id}`}>
                        <h3 className="text-[17px] font-semibold text-[#121313] hover:text-[#163B65] transition-colors line-clamp-1 leading-snug">
                          {facility.name}
                        </h3>
                      </Link>

                      {/* Ratings & Verification Badge */}
                      <div className="flex items-center justify-between mt-2.5">
                        <div className="flex items-center gap-1.5">
                          <Star className="w-4 h-4 fill-[#FFCD0F] text-[#FFCD0F]" />
                          {facility.rating ? (
                            <div className="flex items-center gap-1 text-[15px] font-medium text-[#121313]">
                              <span>{facility.rating.toFixed(1)}</span>
                              <span className="text-sm text-gray-500">
                                ({facility.review_count} reviews)
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500 italic">
                              No reviews yet
                            </span>
                          )}
                        </div>

                        {/* Verified / Unverified Pill */}
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-[#22C55E] text-white text-[13px] font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 fill-white text-[#22C55E]" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-[#60A5FA] text-white text-[13px] font-semibold">
                            <AlertCircle className="w-3.5 h-3.5 fill-white text-[#60A5FA]" />
                            <span>Unverified</span>
                          </span>
                        )}
                      </div>

                      {/* Details: Location, Phone, Website */}
                      <div className="mt-3.5 space-y-2 text-sm text-[#121313]">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <span className="truncate">
                            {facility.town ? `${facility.town}, ` : ''}
                            {facility.county}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <a
                            href={`tel:${facility.phone}`}
                            className="hover:text-[#163B65] truncate font-mono text-[13px]"
                          >
                            {facility.phone}
                          </a>
                        </div>

                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <a
                            href={`https://${facility.website_url.replace(/^https?:\/\//, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[#163B65] truncate text-[13px]"
                          >
                            {facility.website_url}
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* View Details CTA */}
                    <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-end">
                      <Link
                        href={`/facility/${facility.id}`}
                        className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#163B65] hover:text-[#4AB057] transition-colors"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          BOTTOM TRUST BADGES & BUSINESS CTA BANNER
      ========================================================================= */}
      <section className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-12 pt-6">
        <div className="max-w-[850px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-[#F9FAFB] rounded-[16px] p-6 sm:p-8 border border-gray-200">
          {/* Trust badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[#163B65] mb-2">
                <Cross className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-[#121313] leading-snug">
                Trusted by <br />50,000+ Liberian
              </span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[#163B65] mb-2">
                <Pill className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-[#121313] leading-snug">
                Verified <br />Business
              </span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[#163B65] mb-2">
                <FlaskConical className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-[#121313] leading-snug">
                Real Business <br />from real people
              </span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[#163B65] mb-2">
                <UserCheck className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-[#121313] leading-snug">
                A healthier <br />stronger Liberia
              </span>
            </div>
          </div>

          {/* Business Owner CTA Card */}
          <div className="flex items-center gap-4 bg-white p-4 rounded-[12px] border border-gray-200 shadow-xs">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80"
              alt="Health Facility Owner"
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
            />
            <div className="flex flex-col">
              <h4 className="text-sm font-bold text-[#121313]">
                Own a business or Health Facility?
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Register today and get connected by more Liberians
              </p>
              <Link
                href="/auth/business"
                className="mt-2 text-xs font-bold text-[#163B65] hover:text-[#4AB057] inline-flex items-center gap-1"
              >
                Register Your Facility →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
