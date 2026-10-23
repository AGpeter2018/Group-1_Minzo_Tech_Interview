'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Eye,
  Heart,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Star,
  CheckCircle2,
  Globe,
  Loader2,
  X,
  Check,
  Trash2,
  ExternalLink,
  Building2,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface BusinessReview {
  rating?: number | null;
}

interface BusinessRecord {
  id: string;
  name: string;
  town?: string | null;
  county?: string | null;
  phone?: string | null;
  website_url?: string | null;
  verification_status?: string | null;
  category?: { name: string } | null;
  reviews?: BusinessReview[] | null;
}

interface FollowRecord {
  business_id: string;
  businesses: BusinessRecord | null;
}

interface FollowedFacility {
  id: string;
  name: string;
  categoryName?: string;
  rating: number | null;
  review_count: number;
  verification_status: string;
  town?: string | null;
  county?: string | null;
  phone?: string | null;
  website_url?: string | null;
  photo?: string | null;
}

interface UserReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  is_anonymous: boolean;
  status: string;
  created_at: string;
  businesses: {
    id: string;
    name: string;
    town?: string | null;
    county?: string | null;
    verification_status?: string | null;
    category?: { name: string } | null;
  } | null;
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-white text-black py-8 px-4 sm:px-6 animate-pulse">
      <div className="max-w-216 mx-auto w-full space-y-9">
        <div className="w-8 h-8 bg-gray-200 rounded-lg" />

        {/* Stats Skeleton */}
        <div className="flex items-center justify-center gap-8 sm:gap-16 flex-wrap">
          <div className="w-43.25 h-20 rounded-lg border border-gray-200 bg-gray-50" />
          <div className="w-43.25 h-20 rounded-lg border border-gray-200 bg-gray-50" />
        </div>

        {/* Hero Skeleton */}
        <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6">
          <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-gray-200 shrink-0" />
          <div className="space-y-3 flex-1 w-full text-center md:text-left">
            <div className="h-8 w-48 bg-gray-200 rounded-md mx-auto md:mx-0" />
            <div className="h-4 w-36 bg-gray-200 rounded mx-auto md:mx-0" />
            <div className="h-4 w-40 bg-gray-200 rounded mx-auto md:mx-0" />
            <div className="h-4 w-44 bg-gray-200 rounded mx-auto md:mx-0" />
            <div className="h-4 w-32 bg-gray-200 rounded mx-auto md:mx-0" />
          </div>
        </div>

        {/* List Skeleton */}
        <div className="space-y-4 pt-4">
          <div className="h-6 w-48 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-50 border border-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function UserProfilePage() {
  const router = useRouter();

  // Loading & Auth State
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);

  // Live Profile Details
  const [profileName, setProfileName] = useState('');
  const [profileLocation, setProfileLocation] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [memberSince, setMemberSince] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Live Metrics & Lists
  const [reviewsCount, setReviewsCount] = useState(0);
  const [followedBusinesses, setFollowedBusinesses] = useState<FollowedFacility[]>([]);
  const [userReviews, setUserReviews] = useState<UserReviewItem[]>([]);
  const [activeTab, setActiveTab] = useState<'following' | 'reviews'>('following');

  // Edit Profile Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadUserProfile() {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.replace('/auth/login?redirect=/profile');
          return;
        }

        const currentUser = session.user;
        if (!isActive) return;
        setUser(currentUser);

        // 1. Fetch User Profile from Supabase profiles table
        const { data: profData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (!isActive) return;

        const resolvedName =
          profData?.full_name ||
          currentUser.user_metadata?.full_name ||
          currentUser.email?.split('@')[0] ||
          'Verified User';

        const resolvedPhone =
          profData?.phone || currentUser.user_metadata?.phone || '';

        const resolvedLocation =
          (currentUser.user_metadata?.location as string) || '';

        const resolvedAvatar =
          profData?.avatar_url || currentUser.user_metadata?.avatar_url || '';

        setProfileName(resolvedName);
        setProfilePhone(resolvedPhone);
        setProfileLocation(resolvedLocation);
        setAvatarUrl(resolvedAvatar);
        setProfileEmail(currentUser.email || '');

        // Format Member Since date from real account creation timestamp
        const accountCreated = currentUser.created_at || profData?.created_at;
        if (accountCreated) {
          const d = new Date(accountCreated);
          const month = d.toLocaleString('en-US', { month: 'short' });
          const year = d.getFullYear();
          setMemberSince(`Member since ${month}, ${year}`);
        } else {
          setMemberSince('Member of Minzo Africa');
        }

        // 2. Fetch live reviews count and list for this user
        const { data: revList, count: userRevCount } = await supabase
          .from('reviews')
          .select(
            `
            id,
            rating,
            comment,
            is_anonymous,
            status,
            created_at,
            businesses (
              id,
              name,
              town,
              county,
              verification_status,
              category:categories(name)
            )
          `,
            { count: 'exact' }
          )
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (!isActive) return;

        const liveReviewsCount = typeof userRevCount === 'number' ? userRevCount : (revList?.length || 0);
        setReviewsCount(liveReviewsCount);
        setUserReviews((revList as unknown as UserReviewItem[]) || []);

        // 3. Fetch live followed facilities from Supabase follows table
        const { data: followRecords } = await supabase
          .from('follows')
          .select(
            `
            business_id,
            businesses (
              id,
              name,
              town,
              county,
              phone,
              website_url,
              verification_status,
              category:categories(name),
              reviews (
                rating
              )
            )
          `
          )
          .eq('user_id', currentUser.id);

        if (!isActive) return;

        if (followRecords && followRecords.length > 0) {
          const typedRecords = followRecords as unknown as FollowRecord[];
          const mappedFollows: FollowedFacility[] = typedRecords
            .filter((f): f is FollowRecord & { businesses: BusinessRecord } => Boolean(f.businesses))
            .map((f) => {
              const b = f.businesses;
              const revs = b.reviews || [];
              const revCount = revs.length;
              const avgRating =
                revCount > 0
                  ? Number(
                      (
                        revs.reduce((sum: number, r) => sum + (r.rating || 0), 0) /
                        revCount
                      ).toFixed(1)
                    )
                  : null;

              return {
                id: b.id,
                name: b.name,
                categoryName: b.category?.name || 'Healthcare',
                rating: avgRating,
                review_count: revCount,
                verification_status: b.verification_status || 'unverified',
                town: b.town || null,
                county: b.county || null,
                phone: b.phone || null,
                website_url: b.website_url || null,
                photo: null,
              };
            });

          setFollowedBusinesses(mappedFollows);
        } else {
          setFollowedBusinesses([]);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadUserProfile();

    return () => {
      isActive = false;
    };
  }, [router]);

  // Handle Unfollow
  const handleUnfollow = async (facilityId: string) => {
    // Optimistic UI update
    const updated = followedBusinesses.filter((f) => f.id !== facilityId);
    setFollowedBusinesses(updated);

    // Update localStorage sync if present
    const remainingIds = updated.map((f) => f.id);
    try {
      localStorage.setItem('minzo_followed_facilities', JSON.stringify(remainingIds));
    } catch {
      // ignore
    }

    // Delete from Supabase follows table
    if (user) {
      await supabase
        .from('follows')
        .delete()
        .eq('user_id', user.id)
        .eq('business_id', facilityId);
    }
  };

  // Handle Delete Review
  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', user?.id || '');

      if (error) throw error;

      setUserReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setReviewsCount((prev) => Math.max(0, prev - 1));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete review';
      alert(msg);
    }
  };

  // Open Edit Profile
  const handleOpenEditModal = () => {
    setEditName(profileName);
    setEditPhone(profilePhone);
    setEditLocation(profileLocation);
    setEditAvatar(avatarUrl);
    setIsEditModalOpen(true);
    setSaveSuccess(false);
  };

  // Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);

    try {
      // 1. Update public.profiles table
      const { error: profError } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: editName.trim(),
        phone: editPhone.trim() || null,
        avatar_url: editAvatar.trim() || null,
        updated_at: new Date().toISOString(),
      });

      if (profError) {
        console.warn('Profile table update notice:', profError);
      }

      // 2. Update user metadata for location & profile
      await supabase.auth.updateUser({
        data: {
          full_name: editName.trim(),
          phone: editPhone.trim() || null,
          location: editLocation.trim() || null,
          avatar_url: editAvatar.trim() || null,
        },
      });

      setProfileName(editName.trim());
      setProfilePhone(editPhone.trim());
      setProfileLocation(editLocation.trim());
      setAvatarUrl(editAvatar.trim());
      setSaveSuccess(true);

      setTimeout(() => {
        setIsEditModalOpen(false);
        setSaveSuccess(false);
      }, 1000);
    } catch (err) {
      console.error('Failed to save profile:', err);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="min-h-screen bg-white text-black py-8 px-4 sm:px-6">
      <div className="max-w-216 mx-auto w-full space-y-9">
        {/* =========================================================================
            1. TOP BACK ARROW
        ========================================================================= */}
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-base font-semibold text-black hover:text-[#163B65] transition-colors cursor-pointer group"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 transition-transform group-hover:-translate-x-1" />
            <span className="sr-only">Back</span>
          </button>
        </div>

        {/* =========================================================================
            2. METRIC SUMMARY STAT CARDS (Interactive & Live)
        ========================================================================= */}
        <div className="flex items-center justify-center gap-6 sm:gap-12 flex-wrap">
          {/* Card 1: Reviews */}
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`w-43.25 h-20 rounded-xl border-[1.5px] p-2 flex items-center justify-between px-3.5 transition cursor-pointer shadow-xs ${
              activeTab === 'reviews'
                ? 'border-[#163B65] bg-blue-50/50 ring-2 ring-blue-500/20'
                : 'border-gray-200 bg-white hover:border-[#163B65]/40'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
              <Eye className="w-5 h-5 stroke-[2.2]" />
            </div>

            <div className="flex-1 text-center">
              <span className="block text-sm font-semibold text-[#163B65] leading-tight">
                Reviews
              </span>
              <span className="block text-2xl font-black text-[#163B65] leading-tight mt-0.5">
                {reviewsCount}
              </span>
            </div>
          </button>

          {/* Card 2: Following */}
          <button
            type="button"
            onClick={() => setActiveTab('following')}
            className={`w-43.25 h-20 rounded-xl border-[1.5px] p-2 flex items-center justify-between px-3.5 transition cursor-pointer shadow-xs ${
              activeTab === 'following'
                ? 'border-[#163B65] bg-blue-50/50 ring-2 ring-blue-500/20'
                : 'border-gray-200 bg-white hover:border-[#163B65]/40'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
              <Heart className="w-5 h-5 stroke-[2.2] fill-rose-500/20" />
            </div>

            <div className="flex-1 text-center">
              <span className="block text-sm font-semibold text-[#163B65] leading-tight">
                Following
              </span>
              <span className="block text-2xl font-black text-[#163B65] leading-tight mt-0.5">
                {followedBusinesses.length}
              </span>
            </div>
          </button>
        </div>

        {/* =========================================================================
            3. USER PROFILE HERO CARD
        ========================================================================= */}
        <section className="bg-[#163B65]/5 rounded-2xl p-6 sm:p-8 border border-gray-100 relative">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
            {/* User Portrait Avatar */}
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden shrink-0 shadow-md ring-4 ring-white bg-[#163B65] flex items-center justify-center text-white">
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarUrl}
                  alt={profileName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-5xl font-black uppercase tracking-wider">
                  {profileName.charAt(0) || 'U'}
                </span>
              )}
            </div>

            {/* User Details */}
            <div className="flex-1 space-y-3 w-full text-center md:text-left">
              {/* Full Name */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-snug">
                {profileName || 'Minzo Member'}
              </h1>

              {/* Location */}
              <div className="flex items-center justify-center md:justify-start gap-2.5 text-sm sm:text-base font-medium text-gray-700">
                <MapPin className="w-4 h-4 text-[#163B65] shrink-0" />
                <span>{profileLocation || 'Liberia'}</span>
              </div>

              {/* Phone */}
              <div className="flex items-center justify-center md:justify-start gap-2.5 text-sm sm:text-base font-medium text-gray-700">
                <Phone className="w-4 h-4 text-[#163B65] shrink-0" />
                {profilePhone ? (
                  <a href={`tel:${profilePhone}`} className="hover:text-[#163B65] transition">
                    {profilePhone}
                  </a>
                ) : (
                  <span className="text-gray-400 font-normal">No phone number provided</span>
                )}
              </div>

              {/* Email */}
              <div className="flex items-center justify-center md:justify-start gap-2.5 text-sm sm:text-base font-medium text-gray-700">
                <Mail className="w-4 h-4 text-[#163B65] shrink-0" />
                <a href={`mailto:${profileEmail}`} className="hover:text-[#163B65] transition">
                  {profileEmail}
                </a>
              </div>

              {/* Member Since */}
              <div className="flex items-center justify-center md:justify-start gap-2.5 text-sm sm:text-base font-medium text-gray-500">
                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{memberSince}</span>
              </div>
            </div>

            {/* Edit Profile Action Button */}
            <div className="w-full sm:w-auto flex justify-center md:justify-end self-center md:self-end mt-4 md:mt-0">
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="w-36 h-10.5 border border-[#163B65] text-[#163B65] bg-white font-bold text-sm rounded-xl hover:bg-blue-50 transition cursor-pointer flex items-center justify-center shadow-2xs"
              >
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================================
            4. TABS: FOLLOWED BUSINESSES & MY REVIEWS
        ========================================================================= */}
        <section className="space-y-6 pt-2">
          {/* Tabs bar */}
          <div className="flex items-center gap-6 border-b border-gray-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('following')}
              className={`pb-2.5 px-1 text-base sm:text-lg font-bold transition flex items-center gap-2 cursor-pointer border-b-2 -mb-2.5 ${
                activeTab === 'following'
                  ? 'border-[#163B65] text-[#163B65]'
                  : 'border-transparent text-gray-400 hover:text-gray-800'
              }`}
            >
              <Heart className={`w-4 h-4 ${activeTab === 'following' ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>Followed Businesses</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-black">
                {followedBusinesses.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`pb-2.5 px-1 text-base sm:text-lg font-bold transition flex items-center gap-2 cursor-pointer border-b-2 -mb-2.5 ${
                activeTab === 'reviews'
                  ? 'border-[#163B65] text-[#163B65]'
                  : 'border-transparent text-gray-400 hover:text-gray-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>My Reviews</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-black">
                {reviewsCount}
              </span>
            </button>
          </div>

          {/* TAB 1: FOLLOWED BUSINESSES */}
          {activeTab === 'following' && (
            <div>
              {followedBusinesses.length > 0 ? (
                <div className="space-y-4">
                  {followedBusinesses.map((facility) => {
                    const isVerified = facility.verification_status === 'verified';

                    return (
                      <div
                        key={facility.id}
                        className="bg-white rounded-2xl shadow-xs border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between overflow-hidden transition hover:shadow-md p-4 sm:p-5 gap-4"
                      >
                        {/* Facility Details */}
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-[#163B65] font-black flex items-center justify-center shrink-0 text-xl shadow-2xs">
                            {facility.name.charAt(0).toUpperCase()}
                          </div>

                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={`/facility/${facility.id}`}
                                className="text-base sm:text-lg font-bold text-gray-900 hover:text-[#163B65] transition line-clamp-1"
                              >
                                {facility.name}
                              </Link>
                              {isVerified && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Verified</span>
                                </span>
                              )}
                              {facility.categoryName && (
                                <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">
                                  {facility.categoryName}
                                </span>
                              )}
                            </div>

                            {/* Rating */}
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              {facility.rating ? (
                                <>
                                  <span className="font-bold text-gray-900">{facility.rating.toFixed(1)}</span>
                                  <span>({facility.review_count} {facility.review_count === 1 ? 'review' : 'reviews'})</span>
                                </>
                              ) : (
                                <span className="text-gray-400">No ratings yet</span>
                              )}
                            </div>

                            {/* Location */}
                            {(facility.town || facility.county) && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span>
                                  {facility.town ? `${facility.town}, ` : ''}
                                  {facility.county || 'Liberia'}
                                </span>
                              </div>
                            )}

                            {/* Phone & Website */}
                            <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap pt-0.5">
                              {facility.phone && (
                                <a
                                  href={`tel:${facility.phone}`}
                                  className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>{facility.phone}</span>
                                </a>
                              )}
                              {facility.website_url && (
                                <a
                                  href={facility.website_url.startsWith('http') ? facility.website_url : `https://${facility.website_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                                >
                                  <Globe className="w-3 h-3" />
                                  <span>Website</span>
                                  <ExternalLink className="w-2.5 h-2.5 text-gray-400" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Unfollow Button */}
                        <div className="sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUnfollow(facility.id)}
                            className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 font-semibold text-xs rounded-xl hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 transition flex items-center justify-center cursor-pointer shadow-2xs"
                          >
                            <span>Unfollow</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Empty State */
                <div className="rounded-2xl border border-dashed border-gray-300 p-10 sm:p-14 text-center space-y-4 bg-gray-50/60">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#163B65] flex items-center justify-center mx-auto shadow-2xs">
                    <Heart className="w-7 h-7 text-[#163B65]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">No followed businesses yet</h3>
                    <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
                      Explore healthcare clinics, hospitals, and pharmacies across Liberia and follow them for quick
                      access directly from your profile.
                    </p>
                  </div>
                  <Link
                    href="/home"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#163B65] text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-[#0f2845] transition shadow-xs"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Browse Health Facilities</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY REVIEWS */}
          {activeTab === 'reviews' && (
            <div>
              {userReviews.length > 0 ? (
                <div className="space-y-3">
                  {userReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {rev.businesses ? (
                            <Link
                              href={`/facility/${rev.businesses.id}`}
                              className="text-sm sm:text-base font-bold text-[#163B65] hover:underline flex items-center gap-1.5"
                            >
                              <span>{rev.businesses.name}</span>
                              <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                            </Link>
                          ) : (
                            <span className="text-sm font-bold text-gray-700">Healthcare Facility</span>
                          )}

                          {rev.businesses?.category?.name && (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">
                              {rev.businesses.category.name}
                            </span>
                          )}

                          {rev.is_anonymous && (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                              Anonymous
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-gray-400">
                          <span>
                            {new Date(rev.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(rev.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete this review"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Stars & Comment */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        {rev.comment && (
                          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                            {rev.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Empty Reviews */
                <div className="rounded-2xl border border-dashed border-gray-300 p-10 sm:p-14 text-center space-y-4 bg-gray-50/60">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
                    <Star className="w-7 h-7 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">No reviews submitted yet</h3>
                    <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
                      Share your experience with clinics and hospitals across Liberia to help the community make
                      informed healthcare choices.
                    </p>
                  </div>
                  <Link
                    href="/home"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#163B65] text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-[#0f2845] transition shadow-xs"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Find Facilities to Review</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* =========================================================================
          EDIT PROFILE MODAL
      ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-[#163B65]">Edit Profile</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveSuccess ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-3" />
                </div>
                <h4 className="text-base font-bold text-gray-900">Profile Updated!</h4>
                <p className="text-xs text-gray-500">Your profile details have been saved.</p>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#163B65]"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#163B65]"
                    placeholder="+231..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Location (Town / County)
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#163B65]"
                    placeholder="e.g. Buchanan, Grand Bassa"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Avatar Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={editAvatar}
                    onChange={(e) => setEditAvatar(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#163B65]"
                    placeholder="https://..."
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2 bg-[#163B65] text-white text-sm font-bold rounded-lg hover:bg-[#0f2845] transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
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
