'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Globe,
  Clock,
  Star,
  CheckCircle2,
  AlertCircle,
  Building2,
  Stethoscope,
  Pill,
  FlaskConical,
  Baby,
  Siren,
  Loader2,
  X,
  User,
  ExternalLink,
} from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getCountyCoordinates } from '@/lib/location';

interface ReviewDisplay {
  id: string;
  name: string;
  rating: number;
  timeAgo: string;
  comment: string;
  avatar: string | null;
}

interface FacilityDisplay {
  id: string;
  name: string;
  category: { name: string };
  town: string;
  county: string;
  phone: string;
  website_url: string;
  verification_status: string;
  average_rating: number | null;
  review_count: number;
  photo: string;
  description: string;
  opening_hours: string;
}

interface DbReviewRow {
  id: string;
  rating?: number | null;
  comment?: string | null;
  is_anonymous?: boolean | null;
  created_at?: string;
  profiles?:
    | { full_name?: string | null; avatar_url?: string | null }
    | { full_name?: string | null; avatar_url?: string | null }[]
    | null;
}

// Helper to format relative time for database review timestamps
function formatRelativeTime(dateString?: string) {
  if (!dateString) return 'Recently';
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffWeeks > 0) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMins > 0) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  return 'Just now';
}

// Fallback layout metadata matching Figma node 342:1000 (ratings strictly null until loaded from DB)
const FIGMA_DEFAULT_FACILITY: FacilityDisplay = {
  id: 'bomi-govt-hospital',
  name: 'Liberia Government Hospital (Tubmanburg)',
  category: { name: 'Hospital' },
  town: 'Tubmanburg',
  county: 'Bomi County',
  phone: '+231886410594',
  website_url: 'www.liberiagovernment.com',
  verification_status: 'verified',
  average_rating: null,
  review_count: 0,
  photo: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
  description:
    'A government Hospital with the best equipment and expert doctors and practitioners always available to serve your health needs.',
  opening_hours: '7:00Am - 9:00PM',
};

export default function BusinessProfilePage() {
  const params = useParams();
  const router = useRouter();
  const facilityId = params?.id as string;

  const [facility, setFacility] = useState<FacilityDisplay>(FIGMA_DEFAULT_FACILITY);
  const [reviews, setReviews] = useState<ReviewDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  // Write a Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [commentInput, setCommentInput] = useState('');
  const [reviewerNameInput, setReviewerNameInput] = useState('');
  const [isAnonymousInput, setIsAnonymousInput] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user || null;
      setCurrentUser(user);
      if (user?.user_metadata?.full_name) {
        setReviewerNameInput(user.user_metadata.full_name);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (user?.user_metadata?.full_name) {
        setReviewerNameInput(user.user_metadata.full_name);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!facilityId) return;

    async function loadFacility() {
      setLoading(true);
      try {
        const { data } = await supabase
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
              services_raw,
              services,
              opening_hours_raw,
              additional_notes
            )
          `)
          .eq('id', facilityId)
          .maybeSingle();

        // Fetch reviews solely from database
        const { data: dbRevs } = await supabase
          .from('reviews')
          .select(`
            *,
            profiles (
              full_name,
              avatar_url
            )
          `)
          .eq('business_id', facilityId)
          .order('created_at', { ascending: false });

        const mappedDbRevs: ReviewDisplay[] = ((dbRevs as DbReviewRow[] | null) || []).map((r) => {
          const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
          const authorName = r.is_anonymous
            ? 'Anonymous Patient'
            : (profile?.full_name || 'Verified Patient');

          return {
            id: r.id,
            name: authorName,
            rating: Number(r.rating) || 5,
            timeAgo: formatRelativeTime(r.created_at),
            comment: r.comment || '',
            avatar: r.is_anonymous ? null : (profile?.avatar_url || null),
          };
        });

        const revCount = mappedDbRevs.length;
        const avgRating =
          revCount > 0
            ? Number(
                (
                  mappedDbRevs.reduce((acc: number, r) => acc + (r.rating || 0), 0) /
                  revCount
                ).toFixed(1)
              )
            : null;

        setReviews(mappedDbRevs);

        if (data) {
          const details = Array.isArray(data.healthcare_facility_details)
            ? data.healthcare_facility_details[0]
            : data.healthcare_facility_details;

          const cleanCounty = data.county
            ? data.county.toLowerCase().includes('county')
              ? data.county
              : `${data.county} County`
            : FIGMA_DEFAULT_FACILITY.county;

          const cat = Array.isArray(data.category) ? data.category[0] : data.category;
          const categoryName = (cat as { name?: string } | null)?.name || FIGMA_DEFAULT_FACILITY.category.name;

          setFacility({
            id: data.id,
            name: data.name || FIGMA_DEFAULT_FACILITY.name,
            category: {
              name: categoryName,
            },
            town: data.town || data.address || FIGMA_DEFAULT_FACILITY.town,
            county: cleanCounty,
            phone: data.phone || FIGMA_DEFAULT_FACILITY.phone,
            website_url: data.website_url || FIGMA_DEFAULT_FACILITY.website_url,
            verification_status: data.verification_status || 'unverified',
            average_rating: avgRating,
            review_count: revCount,
            photo: FIGMA_DEFAULT_FACILITY.photo,
            description: details?.additional_notes || FIGMA_DEFAULT_FACILITY.description,
            opening_hours: details?.opening_hours_raw || FIGMA_DEFAULT_FACILITY.opening_hours,
          });
        } else {
          setFacility({
            ...FIGMA_DEFAULT_FACILITY,
            average_rating: avgRating,
            review_count: revCount,
          });
        }
        // Check if user is following this facility
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          const { data: followRecord } = await supabase
            .from('follows')
            .select('user_id')
            .eq('user_id', authData.user.id)
            .eq('business_id', facilityId)
            .maybeSingle();

          if (followRecord) {
            setIsFollowing(true);
          }
        }
      } catch (err) {
        console.warn('Failed to load facility data, using fallback:', err);
        setFacility(FIGMA_DEFAULT_FACILITY);
      } finally {
        setLoading(false);
      }
    }

    loadFacility();
  }, [facilityId]);

  // Handle Follow / Unfollow Toggle
  const handleToggleFollow = async () => {
    const nextState = !isFollowing;
    setIsFollowing(nextState);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        const stored: string[] = JSON.parse(
          localStorage.getItem('minzo_followed_facilities') || '[]'
        );
        if (nextState) {
          if (!stored.includes(facilityId)) stored.push(facilityId);
        } else {
          const idx = stored.indexOf(facilityId);
          if (idx !== -1) stored.splice(idx, 1);
        }
        localStorage.setItem('minzo_followed_facilities', JSON.stringify(stored));
        return;
      }

      if (nextState) {
        await supabase.from('follows').upsert({
          user_id: user.id,
          business_id: facilityId,
        });
      } else {
        await supabase
          .from('follows')
          .delete()
          .eq('user_id', user.id)
          .eq('business_id', facilityId);
      }
    } catch (err) {
      console.error('Error toggling facility follow status:', err);
    }
  };

  // Handle Review Submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError(null);
    setReviewSuccess(null);

    if (!commentInput.trim()) {
      setReviewError('Please write your review comment.');
      return;
    }

    setSubmittingReview(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        setReviewError('You must be signed in to submit a review. Please sign in or register.');
        setSubmittingReview(false);
        return;
      }

      const customName = reviewerNameInput.trim();

      // Get session access token for authenticated API request
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      // Submit through server API which auto-provisions profile if missing (prevents FK 23503)
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          business_id: facility.id,
          rating: ratingInput,
          comment: commentInput.trim(),
          is_anonymous: isAnonymousInput,
          reviewer_name: customName,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to submit review. Please try again.');
      }

      const newRev = json.data;
      const profile = Array.isArray(newRev?.profiles) ? newRev.profiles[0] : newRev?.profiles;
      const displayName = isAnonymousInput
        ? 'Anonymous Patient'
        : (customName || profile?.full_name || user.user_metadata?.full_name || 'Verified Patient');

      const createdReview = {
        id: newRev.id,
        name: displayName,
        rating: newRev.rating || ratingInput,
        timeAgo: 'Just now',
        comment: newRev.comment || commentInput.trim(),
        avatar: isAnonymousInput ? null : (profile?.avatar_url || null),
      };

      setReviews((prev) => {
        const updated = [createdReview, ...prev];
        const newCount = updated.length;
        const newAvg = Number(
          (updated.reduce((sum, r) => sum + (r.rating || 0), 0) / newCount).toFixed(1)
        );
        setFacility((prevFac) => ({
          ...prevFac,
          average_rating: newAvg,
          review_count: newCount,
        }));
        return updated;
      });

      setReviewSuccess('Thank you! Your review has been published.');
      setCommentInput('');

      setTimeout(() => {
        setReviewModalOpen(false);
        setReviewSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const isVerified = facility.verification_status === 'verified';
  const cleanCountyKey = facility.county?.replace(/ county/i, '').trim();
  const coords = getCountyCoordinates(cleanCountyKey || 'Bomi');

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center py-24 text-gray-500 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#163B65]" />
        <p className="text-sm font-medium">Loading facility profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black py-8 px-4 sm:px-6">
      <div className="max-w-216 mx-auto w-full space-y-9">
        {/* =========================================================================
            1. BACK TO SEARCH BUTTON (Figma Node 342:1002 - Frame 64)
        ========================================================================= */}
        <div>
          <button
            type="button"
            onClick={() => router.push('/search')}
            className="inline-flex items-center gap-2 text-base font-semibold text-black hover:text-[#163B65] transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span>Back to Search</span>
          </button>
        </div>

        {/* =========================================================================
            2. TOP FACILITY CARD & ABOUT (Figma Node 342:1006 - Frame 105)
        ========================================================================= */}
        <section className="bg-white rounded-xl border border-black/15 p-4 sm:p-5 shadow-xs">
          {/* Upper Row: Image + Details + Call Button (Figma Node 342:1007 - Frame 32) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
            {/* Image (Figma Node 342:1008) */}
            <div className="w-full sm:w-45 h-41.5 rounded-xl overflow-hidden shrink-0 bg-gray-100">
              <img
                src={facility.photo}
                alt={facility.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Middle Details (Figma Node 342:1010 - Frame 26) */}
            <div className="flex-1 space-y-2 w-full">
              {/* Title (Figma Node 342:1012) */}
              <h1 className="text-lg font-semibold text-black leading-snug">
                {facility.name}
              </h1>

              {/* Rating & Verified Badge (Figma Node 342:1013 - Frame 21) */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-base font-medium text-black">
                  <Star
                    className={`w-5 h-5 ${
                      facility.review_count > 0 && facility.average_rating
                        ? 'fill-[#FFCD0F] text-[#FFCD0F]'
                        : 'text-gray-300'
                    }`}
                  />
                  {facility.review_count > 0 && facility.average_rating ? (
                    <>
                      <span>{Number(facility.average_rating).toFixed(1)}</span>
                      <span className="text-gray-500 font-normal">
                        ({facility.review_count} {facility.review_count === 1 ? 'review' : 'reviews'})
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-500 font-normal">No reviews yet</span>
                  )}
                </div>

                {isVerified ? (
                  <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-[#22C55E] text-white text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4 fill-white text-[#22C55E]" />
                    <span>Verified</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-[#BFDBFE] text-blue-900 text-sm font-semibold">
                    <AlertCircle className="w-4 h-4" />
                    <span>Unverified</span>
                  </div>
                )}
              </div>

              {/* Location (Figma Node 342:1024 - Frame 22) */}
              <div className="flex items-center gap-2 text-base font-medium text-black">
                <MapPin className="w-5 h-5 text-gray-700 shrink-0" />
                <span className="truncate">
                  {facility.town ? `${facility.town}, ` : ''}
                  {facility.county}
                </span>
              </div>

              {/* Phone (Figma Node 342:1030 - Frame 23) */}
              <div className="flex items-center gap-2 text-base font-normal text-black">
                <Phone className="w-4 h-4 text-gray-700 shrink-0" />
                <a
                  href={`tel:${facility.phone}`}
                  className="hover:text-[#163B65] transition"
                >
                  {facility.phone}
                </a>
              </div>

              {/* Website (Figma Node 342:1034 - Frame 24) */}
              <div className="flex items-center gap-2 text-base font-medium text-black">
                <Globe className="w-5 h-5 text-gray-700 shrink-0" />
                <a
                  href={`https://${facility.website_url.replace(/^https?:\/\//, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#163B65] truncate transition"
                >
                  {facility.website_url}
                </a>
              </div>
            </div>

            {/* Right Call Button (Figma Node 342:1039) */}
            <div className="w-full sm:w-auto shrink-0 flex sm:self-center">
              <a
                href={`tel:${facility.phone}`}
                className="w-full sm:w-37.5 h-11 bg-[#163B65] hover:bg-[#0f2845] text-white text-base font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Call</span>
              </a>
            </div>
          </div>

          {/* Lower Section: About this Facility (Figma Node 342:1040 - Frame 104) */}
          <div className="mt-8 pt-6 border-t border-black/10 space-y-2">
            <h2 className="text-2xl font-semibold text-black tracking-tight">
              About this Facility
            </h2>
            <p className="text-base text-black/90 font-normal leading-relaxed">
              {facility.description}
            </p>
          </div>
        </section>

        {/* =========================================================================
            3. SERVICES (Figma Node 342:1043 - Frame 80)
        ========================================================================= */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-black text-center tracking-tight">
            Services
          </h2>

          <div className="bg-[#DBEAFE] rounded-xl px-4 sm:px-8 py-5 flex items-center justify-between gap-2 overflow-x-auto">
            {/* 1. General Medicine */}
            <div className="flex flex-col items-center min-w-25 text-center group">
              <div className="w-11 h-11 rounded-full bg-[#BFDBFE] group-hover:bg-[#163B65] group-hover:text-white flex items-center justify-center text-[#163B65] mb-2 transition shadow-2xs">
                <Stethoscope className="w-5 h-5" />
              </div>
              <span className="text-sm font-normal text-black leading-tight">
                General Medicine
              </span>
            </div>

            {/* 2. Pharmacy */}
            <div className="flex flex-col items-center min-w-25 text-center group">
              <div className="w-11 h-11 rounded-full bg-[#BFDBFE] group-hover:bg-[#163B65] group-hover:text-white flex items-center justify-center text-[#163B65] mb-2 transition shadow-2xs">
                <Pill className="w-5 h-5" />
              </div>
              <span className="text-sm font-normal text-black leading-tight">
                Pharmacy
              </span>
            </div>

            {/* 3. Laboratory */}
            <div className="flex flex-col items-center min-w-25 text-center group">
              <div className="w-11 h-11 rounded-full bg-[#BFDBFE] group-hover:bg-[#163B65] group-hover:text-white flex items-center justify-center text-[#163B65] mb-2 transition shadow-2xs">
                <FlaskConical className="w-5 h-5" />
              </div>
              <span className="text-sm font-normal text-black leading-tight">
                Laboratory
              </span>
            </div>

            {/* 4. Maternity Care */}
            <div className="flex flex-col items-center min-w-25 text-center group">
              <div className="w-11 h-11 rounded-full bg-[#BFDBFE] group-hover:bg-[#163B65] group-hover:text-white flex items-center justify-center text-[#163B65] mb-2 transition shadow-2xs">
                <Baby className="w-5 h-5" />
              </div>
              <span className="text-sm font-normal text-black leading-tight">
                Maternity Care
              </span>
            </div>

            {/* 5. Emergency */}
            <div className="flex flex-col items-center min-w-25 text-center group">
              <div className="w-11 h-11 rounded-full bg-[#BFDBFE] group-hover:bg-[#163B65] group-hover:text-white flex items-center justify-center text-[#163B65] mb-2 transition shadow-2xs">
                <Siren className="w-5 h-5" />
              </div>
              <span className="text-sm font-normal text-black leading-tight">
                Emergency
              </span>
            </div>
          </div>
        </section>

        {/* =========================================================================
            4. CONTACT INFORMATION & MAP (Figma Node 342:1077 - Frame 71)
        ========================================================================= */}
        <section className="bg-white rounded-xl border border-black/15 p-6 sm:p-8 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left Column: Contact Information (Figma Node 342:1078 - Frame 67) */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-black tracking-tight">
                Contact Information
              </h2>

              <div className="space-y-4 text-base font-medium text-black">
                {/* Location */}
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-700 shrink-0" />
                  <span>
                    {facility.town ? `${facility.town}, ` : ''}
                    {facility.county}
                  </span>
                </div>

                {/* Facility Category */}
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-gray-700 shrink-0" />
                  <span>{facility.category?.name || 'Hospital'}</span>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-3 font-normal">
                  <Phone className="w-5 h-5 text-gray-700 shrink-0" />
                  <a
                    href={`tel:${facility.phone}`}
                    className="hover:text-[#163B65] transition"
                  >
                    {facility.phone}
                  </a>
                </div>

                {/* Operating Hours */}
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-700 shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-[#22C55E] font-normal">Open</span>
                    <span className="font-normal">{facility.opening_hours}</span>
                  </div>
                </div>

                {/* Website */}
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-gray-700 shrink-0" />
                  <a
                    href={`https://${facility.website_url.replace(/^https?:\/\//, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#163B65] transition"
                  >
                    {facility.website_url}
                  </a>
                </div>
              </div>

              {/* Bottom Actions Row: Call & Follow (Figma Node 342:1114 - Frame 68) */}
              <div className="pt-2 flex items-center gap-4 flex-wrap">
                <a
                  href={`tel:${facility.phone}`}
                  className="w-37.5 h-11 bg-[#163B65] hover:bg-[#0f2845] text-white text-base font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call</span>
                </a>

                <button
                  type="button"
                  onClick={handleToggleFollow}
                  className={`w-37.5 h-11 text-base font-bold rounded-lg border-[1.5px] border-[#163B65] transition-colors flex items-center justify-center cursor-pointer ${
                    isFollowing
                      ? 'bg-[#163B65] text-white'
                      : 'bg-white text-[#163B65] hover:bg-blue-50'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            </div>

            {/* Right Column: Map Preview (Figma Node 342:1117 - Frame 69) */}
            <div className="w-full h-82.25 rounded-xl overflow-hidden border border-black/10 relative bg-gray-100 shadow-2xs">
              <iframe
                title="Facility Map Location"
                width="100%"
                height="100%"
                className="border-0 w-full h-full"
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.longitude - 0.04}%2C${coords.latitude - 0.03}%2C${coords.longitude + 0.04}%2C${coords.latitude + 0.03}&layer=mapnik&marker=${coords.latitude}%2C${coords.longitude}`}
              />

              {/* Map Footer Overlay with Open Link */}
              <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md shadow-xs text-xs font-semibold text-[#163B65] flex items-center gap-1 hover:bg-white transition">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${facility.name}, ${facility.town}, ${facility.county}, Liberia`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  <span>Open Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            5. REVIEWS (Figma Node 342:1123 - Frame 103)
        ========================================================================= */}
        <section className="bg-white rounded-xl border border-black/15 p-6 sm:p-8 shadow-xs space-y-6">
          {/* Header Row: Reviews title + Write a Review Button (Figma Node 342:1124 - Frame 102) */}
          <div className="flex items-center justify-between border-b border-black/10 pb-4">
            <h2 className="text-2xl font-semibold text-black tracking-tight">
              Reviews
            </h2>

            <button
              type="button"
              onClick={() => setReviewModalOpen(true)}
              className="h-11 px-5 border-[1.5px] border-[#163B65] text-[#163B65] hover:bg-blue-50 font-bold text-base rounded-lg transition-colors cursor-pointer"
            >
              Write a Review
            </button>
          </div>

          {/* Reviews Content Grid (Figma Node 342:1127 - Frame 101) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left Rating Card (Figma Node 342:1128 - Frame 82) */}
            <div className="md:col-span-4 w-full sm:w-53 rounded-xl border border-black/15 bg-white p-5 flex flex-col items-center justify-center space-y-2 shadow-2xs">
              <span className="text-3xl font-medium text-black">
                {facility.review_count > 0 && facility.average_rating
                  ? Number(facility.average_rating).toFixed(1)
                  : '0.0'}
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      facility.review_count > 0 &&
                      facility.average_rating &&
                      star <= Math.round(Number(facility.average_rating))
                        ? 'fill-[#FFCD0F] text-[#FFCD0F]'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-black">
                ({facility.review_count || 0} {facility.review_count === 1 ? 'review' : 'reviews'})
              </span>
            </div>

            {/* Right Reviews List */}
            <div className="md:col-span-8 space-y-6">
              {reviews.length > 0 ? (
                <div className="space-y-6 divide-y divide-black/10">
                  {reviews.map((rev, index) => (
                    <div key={rev.id || index} className={index > 0 ? 'pt-6' : ''}>
                      <div className="flex items-start gap-4">
                        {rev.avatar ? (
                          <img
                            src={rev.avatar}
                            alt={rev.name}
                            className="w-12 h-12 rounded-full object-cover shrink-0 bg-gray-100"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#163B65]/10 text-[#163B65] font-bold flex items-center justify-center shrink-0 uppercase text-sm">
                            {rev.name ? rev.name.charAt(0) : 'P'}
                          </div>
                        )}

                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold text-black">
                              {rev.name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-4 h-4 ${
                                    s <= rev.rating
                                      ? 'fill-[#FFCD0F] text-[#FFCD0F]'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500 font-medium">
                              ({rev.timeAgo || 'Recently'})
                            </span>
                          </div>

                          <p className="text-sm text-black/90 font-normal leading-relaxed">
                            {rev.comment}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center space-y-3 bg-gray-50/50">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-[#163B65] flex items-center justify-center mx-auto">
                    <Star className="w-6 h-6 text-[#163B65]" />
                  </div>
                  <h4 className="text-base font-semibold text-black">No reviews yet</h4>
                  <p className="text-sm text-gray-600 max-w-sm mx-auto">
                    Be the first to share your experience with {facility.name}.
                  </p>
                  <button
                    type="button"
                    onClick={() => setReviewModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#163B65] text-white text-sm font-semibold rounded-lg hover:bg-[#0f2845] transition cursor-pointer"
                  >
                    <span>Write the First Review</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* =========================================================================
          WRITE A REVIEW MODAL
      ========================================================================= */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#163B65]">Write a Review</h3>
                <p className="text-xs text-gray-500">{facility.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reviewSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{reviewSuccess}</span>
              </div>
            ) : !currentUser ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-[#163B65] mx-auto flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-gray-900">Sign in to leave a review</h4>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    Only verified community members can publish healthcare reviews to maintain authenticity and trust.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <Link
                    href={`/auth/login?redirect=/facility/${facility.id}`}
                    className="px-5 py-2.5 bg-[#163B65] hover:bg-[#0f2845] text-white text-sm font-bold rounded-lg transition"
                  >
                    Sign In
                  </Link>
                  <Link
                    href={`/auth/register?redirect=/facility/${facility.id}`}
                    className="px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                {reviewError && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{reviewError}</span>
                  </div>
                )}

                {/* Rating Stars Input */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Your Rating *
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingInput(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 focus:outline-none cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 transition-transform hover:scale-110 ${
                            star <= (hoverRating || ratingInput)
                              ? 'fill-[#FFCD0F] text-[#FFCD0F]'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-sm font-bold text-gray-700 ml-2">
                      {hoverRating || ratingInput} / 5
                    </span>
                  </div>
                </div>

                {/* Post Anonymously Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAnonymousInput}
                    onChange={(e) => setIsAnonymousInput(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#163B65] focus:ring-[#163B65]"
                  />
                  <span className="text-xs font-medium text-gray-700">
                    Post anonymously (your name will not be shown to the public)
                  </span>
                </label>

                {/* Reviewer Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Your Name {isAnonymousInput ? '(Hidden)' : ''}
                  </label>
                  <input
                    type="text"
                    disabled={isAnonymousInput}
                    value={isAnonymousInput ? 'Anonymous Patient' : reviewerNameInput}
                    onChange={(e) => setReviewerNameInput(e.target.value)}
                    placeholder="e.g. Andrew John"
                    className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-[#163B65] focus:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Review Comment */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Your Review *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Describe your care experience, wait times, staff friendliness..."
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-[#163B65] focus:bg-white transition"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewModalOpen(false)}
                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-6 py-2.5 bg-[#163B65] hover:bg-[#0f2845] text-white text-sm font-bold rounded-lg shadow-xs flex items-center gap-2 transition disabled:opacity-70 cursor-pointer"
                  >
                    {submittingReview ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Submit Review</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
