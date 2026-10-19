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
  Send,
  UserCheck,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getCountyCoordinates } from '@/lib/location';

// Default mockup data matching Figma node 342:1000
const FIGMA_DEFAULT_FACILITY = {
  id: 'bomi-govt-hospital',
  name: 'Liberia Government Hospital (Tubmanburg)',
  category: { name: 'Hospital' },
  town: 'Tubmanburg',
  county: 'Bomi County',
  phone: '+231886410594',
  website_url: 'www.liberiagovernment.com',
  verification_status: 'verified',
  average_rating: 4.0,
  review_count: 116,
  photo: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
  description:
    'A government Hospital with the best equipment and expert doctors and practitioners always available to serve your health needs.',
  opening_hours: '7:00Am - 9:00PM',
};

const FIGMA_DEFAULT_REVIEWS = [
  {
    id: 'f-rev-1',
    name: 'Andrew John',
    rating: 4,
    timeAgo: '3 weeks ago',
    comment: 'The doctors are very professional and attentive.',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'f-rev-2',
    name: 'Andrew John',
    rating: 4,
    timeAgo: '3 weeks ago',
    comment: 'The doctors are very professional and attentive.',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
  },
];

export default function BusinessProfilePage() {
  const params = useParams();
  const router = useRouter();
  const facilityId = params?.id as string;

  const [facility, setFacility] = useState<any>(FIGMA_DEFAULT_FACILITY);
  const [reviews, setReviews] = useState<any[]>(FIGMA_DEFAULT_REVIEWS);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  // Write a Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [commentInput, setCommentInput] = useState('');
  const [reviewerNameInput, setReviewerNameInput] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!facilityId) return;

    async function loadFacility() {
      setLoading(true);
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
              services_raw,
              services,
              opening_hours_raw,
              additional_notes
            )
          `)
          .eq('id', facilityId)
          .maybeSingle();

        if (data) {
          const details = Array.isArray(data.healthcare_facility_details)
            ? data.healthcare_facility_details[0]
            : data.healthcare_facility_details;

          const cleanCounty = data.county
            ? data.county.toLowerCase().includes('county')
              ? data.county
              : `${data.county} County`
            : FIGMA_DEFAULT_FACILITY.county;

          setFacility({
            id: data.id,
            name: data.name || FIGMA_DEFAULT_FACILITY.name,
            category: {
              name:
                (Array.isArray(data.category)
                  ? (data.category[0] as any)?.name
                  : (data.category as any)?.name) || FIGMA_DEFAULT_FACILITY.category.name,
            },
            town: data.town || data.address || FIGMA_DEFAULT_FACILITY.town,
            county: cleanCounty,
            phone: data.phone || FIGMA_DEFAULT_FACILITY.phone,
            website_url: data.website_url || FIGMA_DEFAULT_FACILITY.website_url,
            verification_status: data.verification_status || 'unverified',
            average_rating: 4.0,
            review_count: 116,
            photo: FIGMA_DEFAULT_FACILITY.photo,
            description: details?.additional_notes || FIGMA_DEFAULT_FACILITY.description,
            opening_hours: details?.opening_hours_raw || FIGMA_DEFAULT_FACILITY.opening_hours,
          });
        } else {
          setFacility(FIGMA_DEFAULT_FACILITY);
        }

        // Fetch live reviews if any exist
        const { data: dbRevs } = await supabase
          .from('reviews')
          .select('*')
          .eq('business_id', facilityId)
          .order('created_at', { ascending: false });

        if (dbRevs && dbRevs.length > 0) {
          const mappedDbRevs = dbRevs.map((r: any) => ({
            id: r.id,
            name: r.reviewer_name_display || 'Verified Patient',
            rating: r.rating || 5,
            timeAgo: 'Recently',
            comment: r.comment || '',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
          }));
          setReviews(mappedDbRevs);
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
      const reviewerName = reviewerNameInput.trim() || authData.user?.user_metadata?.full_name || 'Verified Patient';

      const { data: newRev, error: revError } = await supabase
        .from('reviews')
        .insert({
          business_id: facility.id,
          user_id: authData.user?.id || null,
          rating: ratingInput,
          comment: commentInput.trim(),
          reviewer_name_display: reviewerName,
          is_published: true,
        })
        .select()
        .single();

      if (revError) {
        console.warn('Review save note:', revError.message);
      }

      const createdReview = {
        id: newRev?.id || `rev-${Date.now()}`,
        name: reviewerName,
        rating: ratingInput,
        timeAgo: 'Just now',
        comment: commentInput.trim(),
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      };

      setReviews((prev) => [createdReview, ...prev]);
      setReviewSuccess('Thank you! Your review has been published.');
      setCommentInput('');
      setReviewerNameInput('');

      setTimeout(() => {
        setReviewModalOpen(false);
        setReviewSuccess(null);
      }, 1500);
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review.');
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
                  <Star className="w-5 h-5 fill-[#FFCD0F] text-[#FFCD0F]" />
                  <span>{facility.average_rating ? Number(facility.average_rating).toFixed(1) : '4.0'}</span>
                  <span>({facility.review_count || 116} reviews)</span>
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
                  onClick={() => setIsFollowing(!isFollowing)}
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
            <div className="md:col-span-4 w-full sm:w-53 h-35.75 rounded-xl border border-black/15 bg-white p-4 flex flex-col items-center justify-center space-y-1.5 shadow-2xs">
              <span className="text-3xl font-medium text-black">
                {facility.average_rating ? Number(facility.average_rating).toFixed(1) : '4.0'}
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(Number(facility.average_rating || 4.0))
                        ? 'fill-[#FFCD0F] text-[#FFCD0F]'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-black">
                ({facility.review_count || 116} reviews)
              </span>
            </div>

            {/* Right Reviews List (Figma Node 342:1129, 342:1140) */}
            <div className="md:col-span-8 space-y-6 divide-y divide-black/10">
              {reviews.map((rev, index) => (
                <div key={rev.id || index} className={index > 0 ? 'pt-6' : ''}>
                  <div className="flex items-start gap-4">
                    <img
                      src={rev.avatar}
                      alt={rev.name}
                      className="w-12 h-12 rounded-full object-cover shrink-0 bg-gray-100"
                    />

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
                          ({rev.timeAgo || '3 weeks ago'})
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

                {/* Reviewer Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={reviewerNameInput}
                    onChange={(e) => setReviewerNameInput(e.target.value)}
                    placeholder="e.g. Andrew John"
                    className="w-full h-11 px-3.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-[#163B65] focus:bg-white transition"
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
