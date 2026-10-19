'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  ShieldCheck,
  Star,
  Users,
  Activity,
  Bed,
  Ambulance,
  MessageSquare,
  Share2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Send,
  UserCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Business, Review, Staff } from '@/types/database';
import { VerificationBadge } from '@/components/VerificationBadge';

export default function FacilityDetailPage() {
  const params = useParams();
  const facilityId = params?.id as string;

  const [facility, setFacility] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [commentInput, setCommentInput] = useState('');
  const [reviewerNameInput, setReviewerNameInput] = useState('');
  const [isAnonymousInput, setIsAnonymousInput] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Contact / Inquiry Form State
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquirySubject, setInquirySubject] = useState('General Consultation Inquiry');
  const [inquiryBody, setInquiryBody] = useState('');
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState<string | null>(null);
  const [inquiryError, setInquiryError] = useState<string | null>(null);

  // Fetch Facility Details & Related Data
  useEffect(() => {
    if (!facilityId) return;

    async function loadFacilityData() {
      setLoading(true);
      try {
        // 1. Fetch Facility Record
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select(`
            *,
            category:categories(*),
            healthcare_facility_details(*)
          `)
          .eq('id', facilityId)
          .single();

        if (businessError) throw businessError;
        setFacility(businessData);

        // 2. Fetch Reviews for this facility
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('*')
          .eq('business_id', facilityId)
          .order('created_at', { ascending: false });

        setReviews(reviewsData || []);

        // 3. Fetch Affiliated Staff
        const { data: staffData } = await supabase
          .from('affiliated_staff')
          .select('*')
          .eq('business_id', facilityId);

        setStaffList(staffData || []);
      } catch (err) {
        console.error('Error fetching facility data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadFacilityData();
  }, [facilityId]);

  // Handle Review Submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError(null);
    setReviewSuccess(null);

    if (!commentInput.trim()) {
      setReviewError('Please write your review feedback.');
      return;
    }

    setSubmittingReview(true);
    try {
      // Get current user if logged in
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || null;

      const reviewerDisplayName = isAnonymousInput
        ? 'Anonymous Liberian'
        : reviewerNameInput.trim() || authData.user?.user_metadata?.full_name || 'Verified Patient';

      const { data: newReview, error: reviewErr } = await supabase
        .from('reviews')
        .insert({
          business_id: facilityId,
          user_id: userId,
          rating: ratingInput,
          comment: commentInput.trim(),
          is_anonymous: isAnonymousInput,
          reviewer_name_display: reviewerDisplayName,
          is_published: true,
        })
        .select()
        .single();

      if (reviewErr) throw reviewErr;

      // Update local reviews list
      const updatedList = [newReview, ...reviews];
      setReviews(updatedList);

      // Recalculate average rating
      const avg =
        updatedList.reduce((acc, r) => acc + Number(r.rating), 0) /
        updatedList.length;

      // Update business rating in database
      await supabase
        .from('businesses')
        .update({
          average_rating: Number(avg.toFixed(1)),
          review_count: updatedList.length,
        })
        .eq('id', facilityId);

      if (facility) {
        setFacility({
          ...facility,
          average_rating: Number(avg.toFixed(1)),
          review_count: updatedList.length,
        });
      }

      setReviewSuccess('Thank you! Your verified review has been published.');
      setTimeout(() => {
        setReviewModalOpen(false);
        setCommentInput('');
        setReviewerNameInput('');
        setReviewSuccess(null);
      }, 1500);
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Handle Inquiry / Direct Message Submission
  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInquiryError(null);
    setInquirySuccess(null);

    if (!inquiryName.trim() || !inquiryBody.trim()) {
      setInquiryError('Please provide your name and inquiry message.');
      return;
    }

    setSubmittingInquiry(true);
    try {
      const { data: authData } = await supabase.auth.getUser();

      const { error: msgErr } = await supabase.from('messages').insert({
        business_id: facilityId,
        sender_id: authData.user?.id || null,
        sender_name: inquiryName.trim(),
        sender_email: inquiryEmail.trim() || null,
        sender_phone: inquiryPhone.trim() || null,
        subject: inquirySubject,
        body: inquiryBody.trim(),
        is_read: false,
      });

      if (msgErr) throw msgErr;

      setInquirySuccess('Your message has been dispatched directly to the facility management.');
      setInquiryBody('');
      setInquiryPhone('');
      setInquiryEmail('');
    } catch (err: any) {
      setInquiryError(err.message || 'Failed to send inquiry.');
    } finally {
      setSubmittingInquiry(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center py-24 text-gray-500 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#163B65]" />
        <p className="text-sm font-medium">Loading facility profile...</p>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center py-24 text-center px-4">
        <h2 className="text-xl font-bold text-gray-800">Healthcare Facility Not Found</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-sm">
          The requested healthcare facility does not exist or has been relocated.
        </p>
        <Link
          href="/search"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-[#163B65] text-white text-xs font-bold rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </Link>
      </div>
    );
  }

  const details = Array.isArray(facility.healthcare_facility_details)
    ? facility.healthcare_facility_details[0]
    : facility.healthcare_facility_details;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* Top Breadcrumb Header */}
      <div className="bg-white border-b border-gray-100 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#163B65] hover:text-secondary transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Health Directory</span>
          </Link>
          <span className="text-xs text-gray-400">
            {facility.county || 'Liberia'} &bull; {facility.category?.name || 'Healthcare'}
          </span>
        </div>
      </div>

      {/* Facility Hero Card */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-3">
              <div className="flex wrap items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  {facility.category?.name || 'Healthcare Facility'}
                </span>
                <VerificationBadge status={facility.verification_status} />
                {details?.emergency_services && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full">
                    <Activity className="w-3.5 h-3.5 text-rose-600" />
                    24/7 Emergency Care
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#163B65] tracking-tight">
                {facility.name}
              </h1>

              {/* Location & Rating row */}
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>
                    {facility.address ? `${facility.address}, ` : ''}
                    {facility.town ? `${facility.town}, ` : ''}
                    <strong className="text-gray-800">{facility.county || 'Liberia'}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-gray-900">
                    {facility.average_rating ? Number(facility.average_rating).toFixed(1) : 'No reviews'}
                  </span>
                  <span className="text-gray-400">
                    ({facility.review_count || 0} verified {facility.review_count === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 shrink-0 pt-2 lg:pt-0">
              {facility.phone && (
                <a
                  href={`tel:${facility.phone}`}
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-secondary hover:bg-emerald-600 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-md transition min-h-12 cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call {facility.phone}</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setReviewModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-3.5 bg-white border border-gray-300 hover:border-[#163B65] text-[#163B65] font-bold text-sm rounded-xl shadow-2xs transition min-h-12 cursor-pointer"
              >
                <Star className="w-4 h-4 text-amber-500" />
                <span>Write a Review</span>
              </button>

              {facility.website_url && (
                <a
                  href={facility.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 p-3.5 bg-gray-50 border border-gray-200 text-gray-700 hover:text-[#163B65] rounded-xl transition min-h-12"
                  title="Visit website"
                >
                  <Globe className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (8 cols): Facility Stats, Staff, Reviews */}
        <div className="lg:col-span-8 space-y-8">
          {/* Key Facility Highlights Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-2xs">
            <h2 className="text-base font-bold text-[#163B65] mb-5">Facility Details &amp; Capabilities</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
                <span className="text-xs text-gray-500 font-medium block">Bed Capacity</span>
                <span className="text-lg font-black text-[#163B65] mt-1 flex items-center gap-1.5">
                  <Bed className="w-4 h-4 text-gray-400" />
                  {details?.bed_count ? `${details.bed_count} Beds` : 'Outpatient Only'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
                <span className="text-xs text-gray-500 font-medium block">Ambulance</span>
                <span className="text-lg font-black text-[#163B65] mt-1 flex items-center gap-1.5">
                  <Ambulance className="w-4 h-4 text-gray-400" />
                  {details?.ambulance_available ? 'Available' : 'None'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
                <span className="text-xs text-gray-500 font-medium block">Care Level</span>
                <span className="text-xs font-bold text-gray-800 mt-2 block capitalize">
                  {details?.facility_level?.replace('_', ' ') || 'Community Facility'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
                <span className="text-xs text-gray-500 font-medium block">Operating Hours</span>
                <span className="text-xs font-bold text-gray-800 mt-2 block">
                  {typeof details?.opening_hours === 'string'
                    ? details.opening_hours
                    : 'Standard Hours'}
                </span>
              </div>
            </div>
          </div>

          {/* Affiliated Staff Section */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-2xs">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#163B65]" />
                <h2 className="text-base font-bold text-[#163B65]">Affiliated Healthcare Professionals</h2>
              </div>
              <span className="text-xs font-semibold text-gray-400">
                {staffList.length} Registered
              </span>
            </div>

            {staffList.length === 0 ? (
              <p className="text-xs text-gray-500 italic bg-gray-50 p-4 rounded-xl border border-gray-100">
                No individual doctors or healthcare specialists have linked to this facility yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {staffList.map((staff) => (
                  <div
                    key={staff.id}
                    className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 flex items-start gap-3.5"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#163B65]/10 text-[#163B65] flex items-center justify-center font-bold text-sm shrink-0">
                      {staff.full_name?.charAt(0) || 'D'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-gray-900">{staff.full_name}</h4>
                        {staff.is_verified && (
                          <span title="Verified License">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {staff.specialty || staff.cadre || 'Medical Practitioner'}
                      </p>
                      {staff.license_number && (
                        <span className="inline-block text-[10px] text-gray-400 mt-1">
                          License: {staff.license_number}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Patient Reviews & Rolling Average Rating */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-[#163B65]">Verified Patient Reviews</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Calculated using a 24-month rolling average to ensure current, relevant patient care quality.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalOpen(true)}
                className="px-4 py-2 bg-[#163B65] text-white text-xs font-bold rounded-xl hover:bg-[#112d4e] transition shrink-0 cursor-pointer"
              >
                + Leave a Review
              </button>
            </div>

            {reviews.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
                <Star className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No patient reviews yet</p>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                  Be the first to share your experience with {facility.name} to help other patients in Liberia.
                </p>
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-secondary text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition cursor-pointer"
                >
                  Write First Review
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-5 rounded-2xl border border-gray-100 bg-[#FBFDFB] space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < rev.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-gray-900">
                          {rev.is_anonymous ? 'Anonymous Liberian' : rev.reviewer_name_display || 'Verified Patient'}
                        </span>
                        {rev.is_anonymous && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            Anonymous
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                      {rev.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Direct Inquiry & Location Card */}
        <div className="lg:col-span-4 space-y-6">
          {/* Send Inquiry Form Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-2xs">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
              <MessageSquare className="w-5 h-5 text-[#163B65]" />
              <h3 className="text-base font-bold text-[#163B65]">Contact Facility</h3>
            </div>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Have a question about services, tests, or appointment availability? Send a direct inquiry to management.
            </p>

            {inquiryError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{inquiryError}</span>
              </div>
            )}

            {inquirySuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{inquirySuccess}</span>
              </div>
            )}

            <form onSubmit={handleInquirySubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  value={inquiryName}
                  onChange={(e) => setInquiryName(e.target.value)}
                  placeholder="e.g. Marie Barclay"
                  className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={inquiryPhone}
                  onChange={(e) => setInquiryPhone(e.target.value)}
                  placeholder="+231 77 123 4567"
                  className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Subject</label>
                <select
                  value={inquirySubject}
                  onChange={(e) => setInquirySubject(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] text-gray-800 cursor-pointer"
                >
                  <option value="General Consultation Inquiry">General Consultation Inquiry</option>
                  <option value="Lab & Diagnostic Tests">Lab &amp; Diagnostic Tests</option>
                  <option value="Prescription & Pharmacy">Prescription &amp; Pharmacy</option>
                  <option value="Emergency Readiness">Emergency Readiness</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Your Message *</label>
                <textarea
                  required
                  rows={4}
                  value={inquiryBody}
                  onChange={(e) => setInquiryBody(e.target.value)}
                  placeholder="Describe your inquiry..."
                  className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] text-gray-800 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingInquiry}
                className="w-full py-2.5 bg-[#163B65] hover:bg-[#112d4e] active:scale-[0.99] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 min-h-11"
              >
                {submittingInquiry ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Message to Facility</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Location & Directions Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#163B65] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              County &amp; Dispatch Area
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Located in <strong className="text-gray-900">{facility.county} County</strong>
              {facility.town ? `, within ${facility.town}` : ''}.
            </p>
            {facility.address && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-700">
                <span className="font-semibold block text-gray-900 mb-0.5">Street Address:</span>
                {facility.address}
              </div>
            )}
            <div className="pt-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${facility.name}, ${facility.county}, Liberia`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-gray-200 text-xs font-bold text-[#163B65] hover:bg-gray-50 transition"
              >
                Open in Maps / Get Directions &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Write a Review Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-lg font-bold text-[#163B65]">Write a Patient Review</h3>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {reviewError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            {reviewSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{reviewSuccess}</span>
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              {/* Star Rating Picker */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Overall Rating *</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRatingInput(star)}
                      className="p-1 cursor-pointer focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          (hoverRating || ratingInput) >= star
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-200'
                        } transition`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-gray-600 ml-2">
                    {ratingInput} out of 5 stars
                  </span>
                </div>
              </div>

              {/* Reviewer Name */}
              {!isAnonymousInput && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={reviewerNameInput}
                    onChange={(e) => setReviewerNameInput(e.target.value)}
                    placeholder="e.g. Korpo Johnson"
                    className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] text-gray-800"
                  />
                </div>
              )}

              {/* Anonymous Checkbox */}
              <label className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isAnonymousInput}
                  onChange={(e) => setIsAnonymousInput(e.target.checked)}
                  className="w-4 h-4 rounded text-[#163B65] focus:ring-[#163B65]"
                />
                <span>Submit anonymously (displays as &ldquo;Anonymous Liberian&rdquo;)</span>
              </label>

              {/* Review Feedback */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Your Experience / Feedback *</label>
                <textarea
                  required
                  rows={4}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Share details of staff attentiveness, wait times, facility cleanliness, and quality of medical care..."
                  className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] text-gray-800 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2.5 bg-[#163B65] text-white text-xs font-bold rounded-xl hover:bg-[#112d4e] transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  {submittingReview ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Posting...</span>
                    </>
                  ) : (
                    <span>Publish Review</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
