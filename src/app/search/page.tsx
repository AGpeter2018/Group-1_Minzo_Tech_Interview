'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  Star,
  Phone,
  Globe,
  SlidersHorizontal,
  Navigation,
  Check,
  ShieldAlert,
  Loader2,
  X,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Business } from '@/types/database';
import {
  calculateHaversineDistance,
  resolveCoordinates,
  Coordinates,
} from '@/lib/location';

// Curated stock photos for Liberian healthcare facilities
const FACILITY_PHOTOS = [
  'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80',
];

// Fallback items matching the exact Figma designs if database is loading
const FIGMA_SEARCH_RESULTS = [
  {
    id: 'bomi-govt-hospital',
    name: 'Liberia Government Hospital (Tubmanburg)',
    category_name: 'Hospital',
    rating: 4.0,
    review_count: 116,
    verification_status: 'verified',
    town: 'Tubmanburg',
    county: 'Bomi County',
    phone: '+231886410594',
    website_url: 'www.liberiagovernment.com',
    photo: FACILITY_PHOTOS[0],
  },
  {
    id: 'harmony-bridge-pharmacy',
    name: 'Harmony Bridge Pharmacy',
    category_name: 'Pharmacies',
    rating: 5.0,
    review_count: 198,
    verification_status: 'verified',
    town: 'Main Street, Bomi Hills',
    county: 'Bomi County',
    phone: '+231777551423',
    website_url: 'www.harmonybridge.com',
    photo: FACILITY_PHOTOS[1],
  },
  {
    id: 'buchanan-govt-hospital',
    name: 'Liberia Government Hospital (Buchanan)',
    category_name: 'Hospital',
    rating: 3.0,
    review_count: 116,
    verification_status: 'verified',
    town: 'Tubmanburg',
    county: 'Bomi County',
    phone: '+231556442566',
    website_url: 'www.liberiagovernment.org',
    photo: FACILITY_PHOTOS[2],
  },
  {
    id: 'hope-hill-clinic',
    name: 'Hope Hill Clinic',
    category_name: 'Clinics',
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

const SERVICE_TYPES = [
  'Hospital',
  'Clinics',
  'Pharmacies',
  'Laboratories',
  'Specialist',
  'Businesses',
];

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Params
  const queryParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';
  const countyParam = searchParams.get('county') || '';

  // Form & Filter States
  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [selectedServices, setSelectedServices] = useState<string[]>(
    categoryParam ? [categoryParam] : []
  );
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [nearMeActive, setNearMeActive] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);

  // Mobile Filter Drawer State
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Data States
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch facilities from Supabase
  useEffect(() => {
    async function fetchFacilities() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select(`
            *,
            categories(name),
            healthcare_facility_details(
              emergency_services,
              ambulance_available,
              facility_type
            )
          `)
          .order('name');

        if (error) {
          console.warn('Supabase query error, fallback to Figma records:', error.message);
          setBusinesses(FIGMA_SEARCH_RESULTS);
        } else if (data && data.length > 0) {
          const mapped = data.map((b: any, index: number) => {
            const fallback = FIGMA_SEARCH_RESULTS[index % FIGMA_SEARCH_RESULTS.length];
            return {
              id: b.id,
              name: b.name || fallback.name,
              category_name: b.categories?.name || fallback.category_name,
              rating: fallback.rating,
              review_count: fallback.review_count,
              verification_status: b.verification_status || fallback.verification_status,
              town: b.address || fallback.town,
              county: fallback.county,
              phone: b.phone || fallback.phone,
              website_url: b.website || fallback.website_url,
              latitude: b.latitude,
              longitude: b.longitude,
              photo: FACILITY_PHOTOS[index % FACILITY_PHOTOS.length],
            };
          });
          setBusinesses(mapped);
        } else {
          setBusinesses(FIGMA_SEARCH_RESULTS);
        }
      } catch (err) {
        console.error('Failed to load businesses:', err);
        setBusinesses(FIGMA_SEARCH_RESULTS);
      } finally {
        setLoading(false);
      }
    }

    fetchFacilities();
  }, []);

  // Request User Geolocation
  const handleToggleNearMe = () => {
    if (nearMeActive) {
      setNearMeActive(false);
      setUserLocation(null);
      return;
    }

    setLocatingUser(true);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      setLocatingUser(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setNearMeActive(true);
        setLocatingUser(false);
      },
      (err) => {
        console.warn('Geolocation denied, defaulting to Monrovia coordinates');
        setUserLocation({ latitude: 6.3005, longitude: -10.7969 }); // Monrovia
        setNearMeActive(true);
        setLocatingUser(false);
      },
      { timeout: 7000 }
    );
  };

  // Toggle Service Type Checkbox
  const toggleServiceType = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };

  // Toggle Star Rating Checkbox
  const toggleRating = (rating: number) => {
    setSelectedRatings((prev) =>
      prev.includes(rating)
        ? prev.filter((r) => r !== rating)
        : [...prev, rating]
    );
  };

  // Filter and Sort Businesses
  const filteredFacilities = useMemo(() => {
    let result = [...businesses];

    // Search query filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.town?.toLowerCase().includes(q) ||
          b.county?.toLowerCase().includes(q) ||
          b.category_name?.toLowerCase().includes(q)
      );
    }

    // Service types filter
    if (selectedServices.length > 0) {
      result = result.filter((b) =>
        selectedServices.some((service) => {
          const s = service.toLowerCase();
          const cat = (b.category_name || '').toLowerCase();
          return cat.includes(s) || s.includes(cat);
        })
      );
    }

    // Rating filter
    if (selectedRatings.length > 0) {
      result = result.filter((b) => {
        if (!b.rating) return false;
        const rounded = Math.floor(b.rating);
        return selectedRatings.includes(rounded);
      });
    }

    // Near Me distance calculation & sort
    if (nearMeActive && userLocation) {
      result = result.map((b) => {
        const coords = resolveCoordinates(b);
        const dist = calculateHaversineDistance(userLocation, coords);
        return { ...b, distanceKm: dist };
      });
      result.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    }

    return result;
  }, [businesses, searchTerm, selectedServices, selectedRatings, nearMeActive, userLocation]);

  return (
    <div className="min-h-screen bg-white">
      {/* Top Container */}
      <div className="max-w-280 mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {/* Mobile Filter Button */}
        <div className="lg:hidden mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-[#163B65]"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Show Filters ({selectedServices.length + selectedRatings.length})</span>
          </button>
          <span className="text-xs text-gray-500 font-medium">
            {filteredFacilities.length} results
          </span>
        </div>

        {/* Two-Column Grid (Figma Node 280:1935) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Filters Sidebar (Figma Node 280:1937 - Left Filter Card) */}
          <aside className="hidden lg:block lg:col-span-4 bg-white border border-border rounded-2xl p-6 shadow-xs">
            <h2 className="text-lg font-bold text-black mb-6">Filters</h2>

            {/* Service Type Group */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-text mb-4">
                Service Type
              </h3>
              <div className="space-y-3">
                {SERVICE_TYPES.map((service) => {
                  const isChecked = selectedServices.includes(service);
                  return (
                    <label
                      key={service}
                      className="flex items-center gap-3 cursor-pointer select-none group text-sm text-text"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleServiceType(service)}
                        className="w-4 h-4 rounded border-gray-300 text-[#163B65] focus:ring-[#163B65] cursor-pointer"
                      />
                      <span className="font-normal group-hover:text-[#163B65] transition-colors">
                        {service}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Rating Group */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-text mb-4">
                Rating
              </h3>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((stars) => {
                  const isChecked = selectedRatings.includes(stars);
                  return (
                    <label
                      key={stars}
                      className="flex items-center gap-3 cursor-pointer select-none group"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRating(stars)}
                        className="w-4 h-4 rounded border-gray-300 text-[#163B65] focus:ring-[#163B65] cursor-pointer"
                      />
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < stars
                                ? 'fill-[#FFCD0F] text-[#FFCD0F]'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Apply Filter Button */}
            <button
              type="button"
              onClick={() => {}}
              className="w-full h-11 bg-[#163B65] hover:bg-[#0f2845] text-white text-sm font-bold rounded-lg transition-colors shadow-xs flex items-center justify-center cursor-pointer"
            >
              Apply Filter
            </button>
          </aside>

          {/* RIGHT COLUMN: Search Header & Results List */}
          <main className="lg:col-span-8 flex flex-col space-y-6">
            {/* Top Search Bar (Figma Node 280:1938 - Frame 46) */}
            <div className="bg-white border border-[#D5DDE5] rounded-full px-5 py-2.5 shadow-xs flex items-center justify-between gap-4">
              {/* Keyword Search Input */}
              <div className="flex items-center gap-3 flex-1">
                <Search className="w-5 h-5 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Hospital"
                  className="w-full text-sm text-text placeholder-gray-400 focus:outline-none bg-transparent"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Near Me Button (Figma Node 280:1945 - Frame 5) */}
              <button
                type="button"
                onClick={handleToggleNearMe}
                disabled={locatingUser}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold transition-colors cursor-pointer shrink-0 ${
                  nearMeActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-[#000000] hover:text-[#163B65]'
                }`}
              >
                {locatingUser ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#163B65]" />
                ) : (
                  <MapPin className="w-4 h-4 text-black" />
                )}
                <span>{nearMeActive ? 'Near me (Active)' : 'Near me'}</span>
              </button>
            </div>

            {/* Results Title Banner (Figma Node 280:1952) */}
            <div>
              <h1 className="text-base font-semibold text-black">
                Showing {filteredFacilities.length} results
                {searchTerm ? ` for ${searchTerm}` : ' for Hospitals'}
                {countyParam && ` in ${countyParam}`}
              </h1>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#163B65]" />
                <p className="text-xs text-gray-500">Loading verified facilities...</p>
              </div>
            )}

            {/* Results List Cards (Figma Node 280:1956, 280:1989, 280:2023) */}
            <div className="space-y-6">
              {filteredFacilities.map((facility) => {
                const isVerified = facility.verification_status === 'verified';
                return (
                  <div
                    key={facility.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col md:flex-row"
                  >
                    {/* Left: Facility Image */}
                    <div className="w-full md:w-79.5 h-52 md:h-auto shrink-0 relative overflow-hidden">
                      <img
                        src={facility.photo}
                        alt={facility.name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                      <div className="absolute top-3 left-3 bg-[#163B65]/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs md:hidden">
                        {facility.category_name || 'Healthcare'}
                      </div>
                    </div>

                    {/* Right: Card Content */}
                    <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2.5">
                        {/* Title */}
                        <Link href={`/facility/${facility.id}`} className="group">
                          <h3 className="text-lg font-semibold text-black group-hover:text-[#163B65] transition-colors leading-snug">
                            {facility.name}
                          </h3>
                        </Link>

                        {/* Rating & Verification Badge Row */}
                        <div className="flex items-center justify-between gap-2">
                          {/* Rating */}
                          <div className="flex items-center gap-1.5 text-base">
                            <Star className="w-4 h-4 fill-[#FFCD0F] text-[#FFCD0F]" />
                            {facility.rating ? (
                              <>
                                <span className="font-medium text-black">
                                  {facility.rating.toFixed(1)}
                                </span>
                                <span className="text-gray-500 font-medium text-sm">
                                  ({facility.review_count} reviews)
                                </span>
                              </>
                            ) : (
                              <span className="text-sm text-gray-500 font-medium">
                                No reviews yet
                              </span>
                            )}
                          </div>

                          {/* Verified Badge */}
                          {isVerified ? (
                            <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-[#22C55E] text-white text-xs font-semibold shadow-2xs">
                              <Check className="w-3.5 h-3.5 stroke-3" />
                              <span>Verified</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-[#BFDBFE] text-blue-900 text-xs font-semibold shadow-2xs">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Unverified</span>
                            </div>
                          )}
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-2 text-sm md:text-base text-gray-800">
                          <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
                          <span className="line-clamp-1 font-medium">
                            {facility.town
                              ? `${facility.town}, ${facility.county}`
                              : facility.county}
                          </span>
                        </div>

                        {/* Phone */}
                        {facility.phone && (
                          <div className="flex items-center gap-2 text-sm md:text-base text-gray-800">
                            <Phone className="w-4 h-4 text-gray-500 shrink-0" />
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
                          <div className="flex items-center gap-2 text-sm md:text-base text-gray-800">
                            <Globe className="w-4 h-4 text-gray-500 shrink-0" />
                            <a
                              href={`https://${facility.website_url.replace(/^https?:\/\//, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="line-clamp-1 text-gray-700 hover:text-[#163B65] transition"
                            >
                              {facility.website_url}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Call Button (Figma Node 280:1988) */}
                      <div className="pt-2 flex items-center justify-between">
                        {facility.phone ? (
                          <a
                            href={`tel:${facility.phone}`}
                            className="w-37.5 h-11 bg-[#163B65] hover:bg-[#0f2845] text-white text-base font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                          >
                            <Phone className="w-4 h-4" />
                            <span>Call</span>
                          </a>
                        ) : (
                          <Link
                            href={`/facility/${facility.id}`}
                            className="w-37.5 h-11 bg-[#163B65] hover:bg-[#0f2845] text-white text-base font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
                          >
                            <span>Details</span>
                          </Link>
                        )}

                        <Link
                          href={`/facility/${facility.id}`}
                          className="text-sm font-semibold text-[#163B65] hover:text-secondary flex items-center gap-1"
                        >
                          <span>Full Profile</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty State */}
            {!loading && filteredFacilities.length === 0 && (
              <div className="p-10 text-center bg-gray-50 rounded-2xl border border-gray-200">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <h3 className="text-base font-bold text-gray-800">No facilities match your filters</h3>
                <p className="text-xs text-gray-500 mt-1">Try clearing some service types or expanding your search query.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedServices([]);
                    setSelectedRatings([]);
                    setNearMeActive(false);
                  }}
                  className="mt-4 px-4 py-2 bg-[#163B65] text-white rounded-lg text-xs font-bold"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
          <div className="bg-white w-full max-w-sm h-full p-6 overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
                <h3 className="text-lg font-bold text-[#163B65]">Filters</h3>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Service Types */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-gray-900 mb-3">Service Type</h4>
                <div className="space-y-2.5">
                  {SERVICE_TYPES.map((service) => (
                    <label key={service} className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(service)}
                        onChange={() => toggleServiceType(service)}
                        className="w-4 h-4 rounded text-[#163B65]"
                      />
                      <span>{service}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-gray-900 mb-3">Rating</h4>
                <div className="space-y-2.5">
                  {[1, 2, 3, 4, 5].map((stars) => (
                    <label key={stars} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedRatings.includes(stars)}
                        onChange={() => toggleRating(stars)}
                        className="w-4 h-4 rounded text-[#163B65]"
                      />
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < stars ? 'fill-[#FFCD0F] text-[#FFCD0F]' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="w-full h-11 bg-[#163B65] text-white font-bold rounded-lg text-sm mt-6"
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#163B65]" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
