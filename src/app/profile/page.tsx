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
  reviews?: BusinessReview[] | null;
}

interface FollowRecord {
  business_id: string;
  businesses: BusinessRecord | null;
}

interface FollowedFacility {
  id: string;
  name: string;
  rating: number | null;
  review_count: number;
  verification_status: string;
  town: string;
  county: string;
  phone: string;
  website_url: string;
  photo: string;
}

// Default followed facilities matching Figma node 343:1703
const FIGMA_DEFAULT_FOLLOWS: FollowedFacility[] = [
  {
    id: 'bomi-govt-hospital',
    name: 'Liberia Government Hospital (Tubmanburg)',
    rating: 4.0,
    review_count: 116,
    verification_status: 'verified',
    town: 'Tubmanburg',
    county: 'Bomi County',
    phone: '+231886410594',
    website_url: 'www.liberiagovernment.com',
    photo: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'harmony-bridge-pharmacy',
    name: 'Harmony Bridge Pharmacy',
    rating: 5.0,
    review_count: 198,
    verification_status: 'verified',
    town: 'Main Street, Bomi Hills',
    county: 'Bomi County',
    phone: '+231777551423',
    website_url: 'www.harmonybridge.com',
    photo: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'buchanan-govt-hospital',
    name: 'Liberia Government Hospital (Buchanan)',
    rating: 3.0,
    review_count: 116,
    verification_status: 'verified',
    town: 'Tubmanburg',
    county: 'Bomi County',
    phone: '+231556442566',
    website_url: 'www.liberiagovernment.org',
    photo: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80',
  },
];

export default function UserProfilePage() {
  const router = useRouter();

  // Loading & Auth State
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);

  // Profile Details
  const [profileName, setProfileName] = useState('John Doe');
  const [profileLocation, setProfileLocation] = useState('Buchanan, Grand Bassa');
  const [profilePhone, setProfilePhone] = useState('+231237942566');
  const [profileEmail, setProfileEmail] = useState('johndoe@gmail.com');
  const [memberSince, setMemberSince] = useState('Member since Oct, 2025');
  const [avatarUrl, setAvatarUrl] = useState(
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80'
  );

  // Dynamic Metrics
  const [reviewsCount, setReviewsCount] = useState(12);
  const [followedBusinesses, setFollowedBusinesses] = useState<FollowedFacility[]>(FIGMA_DEFAULT_FOLLOWS);

  // Edit Profile Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadUserProfile() {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          // If not authenticated, redirect to login
          router.replace('/auth/login?redirect=/profile');
          return;
        }

        const currentUser = session.user;
        setUser(currentUser);

        // Fetch User Profile from Supabase
        const { data: profData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (profData) {
          if (profData.full_name) setProfileName(profData.full_name);
          if (profData.phone) setProfilePhone(profData.phone);
          if (profData.avatar_url) setAvatarUrl(profData.avatar_url);
        } else if (currentUser.user_metadata?.full_name) {
          setProfileName(currentUser.user_metadata.full_name);
        }

        if (currentUser.email) {
          setProfileEmail(currentUser.email);
        }

        // Format Member Since date
        if (currentUser.created_at) {
          const date = new Date(currentUser.created_at);
          const month = date.toLocaleString('default', { month: 'short' });
          const year = date.getFullYear();
          setMemberSince(`Member since ${month}, ${year}`);
        }

        // Fetch reviews count for this user
        const { count: userRevCount } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUser.id);

        if (typeof userRevCount === 'number' && userRevCount > 0) {
          setReviewsCount(userRevCount);
        }

        // Fetch followed facilities from Supabase follows table
        const { data: followRecords } = await supabase
          .from('follows')
          .select(`
            business_id,
            businesses (
              id,
              name,
              town,
              county,
              phone,
              website_url,
              verification_status,
              reviews(rating)
            )
          `)
          .eq('user_id', currentUser.id);

        if (followRecords && followRecords.length > 0) {
          const typedRecords = followRecords as unknown as FollowRecord[];
          const mappedFollows: FollowedFacility[] = typedRecords
            .filter((f): f is FollowRecord & { businesses: BusinessRecord } => Boolean(f.businesses))
            .map((f, idx: number) => {
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
                rating: avgRating,
                review_count: revCount,
                verification_status: b.verification_status || 'verified',
                town: b.town || 'Tubmanburg',
                county: b.county ? `${b.county} County` : 'Bomi County',
                phone: b.phone || '+231886410594',
                website_url: b.website_url || 'www.liberiagovernment.com',
                photo: FIGMA_DEFAULT_FOLLOWS[idx % FIGMA_DEFAULT_FOLLOWS.length].photo,
              };
            });

          setFollowedBusinesses(mappedFollows);
        } else {
          // Check local storage for followed facility IDs or fallback to Figma design
          const localFollowsJson = localStorage.getItem('minzo_followed_facilities');
          if (localFollowsJson) {
            try {
              const storedIds = JSON.parse(localFollowsJson);
              if (Array.isArray(storedIds) && storedIds.length > 0) {
                // Filter FIGMA_DEFAULT_FOLLOWS or show stored
                const matched = FIGMA_DEFAULT_FOLLOWS.filter((f) =>
                  storedIds.includes(f.id)
                );
                if (matched.length > 0) {
                  setFollowedBusinesses(matched);
                }
              }
            } catch {
              // fallback remains default
            }
          }
        }
      } catch (err) {
        console.warn('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUserProfile();
  }, [router]);

  // Handle Unfollow
  const handleUnfollow = async (facilityId: string) => {
    // Optimistic UI update
    const updated = followedBusinesses.filter((f) => f.id !== facilityId);
    setFollowedBusinesses(updated);

    // Update localStorage
    const remainingIds = updated.map((f) => f.id);
    localStorage.setItem('minzo_followed_facilities', JSON.stringify(remainingIds));

    // Delete from Supabase if logged in
    if (user) {
      await supabase
        .from('follows')
        .delete()
        .eq('user_id', user.id)
        .eq('business_id', facilityId);
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
    setSavingProfile(true);

    try {
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          full_name: editName.trim(),
          phone: editPhone.trim(),
          avatar_url: editAvatar.trim(),
          updated_at: new Date().toISOString(),
        });
      }

      setProfileName(editName.trim());
      setProfilePhone(editPhone.trim());
      setProfileLocation(editLocation.trim());
      setAvatarUrl(editAvatar.trim());
      setSaveSuccess(true);

      setTimeout(() => {
        setIsEditModalOpen(false);
        setSaveSuccess(false);
      }, 1200);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center py-24 text-gray-500 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#163B65]" />
        <p className="text-sm font-medium">Loading user profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black py-8 px-4 sm:px-6">
      <div className="max-w-216 mx-auto w-full space-y-9">
        {/* =========================================================================
            1. TOP BACK ARROW (Figma Node 343:1705 - dashicons:arrow-left-alt2)
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
            2. METRIC SUMMARY STAT CARDS (Figma Node 343:1707 Frame 92 & 343:1716 Frame 93)
        ========================================================================= */}
        <div className="flex items-center justify-center gap-8 sm:gap-16 flex-wrap">
          {/* Card 1: Reviews (Frame 92) */}
          <div className="w-[173px] h-[80px] rounded-[14px] border-[0.2px] border-[#163B65] shadow-[0_2px_4px_rgba(0,0,0,0.15)] bg-white p-2 flex items-center justify-between px-3">
            {/* Eye Icon Circle (Frame 62) */}
            <div className="w-10 h-10 rounded-full bg-[#4AB057]/10 flex items-center justify-center text-[#4AB057] shrink-0">
              <Eye className="w-5 h-5 stroke-[2.2]" />
            </div>

            {/* Label & Number (Frame 63) */}
            <div className="flex-1 text-center">
              <span className="block text-base font-medium text-[#163B65] leading-tight">
                Reviews
              </span>
              <span className="block text-2xl font-semibold text-[#163B65] leading-tight mt-0.5">
                {reviewsCount}
              </span>
            </div>
          </div>

          {/* Card 2: Following (Frame 93) */}
          <div className="w-[173px] h-[80px] rounded-[14px] border-[0.2px] border-[#163B65] shadow-[0_2px_4px_rgba(0,0,0,0.15)] bg-white p-2 flex items-center justify-between px-3">
            {/* Heart Icon Circle (Frame 62) */}
            <div className="w-10 h-10 rounded-full bg-[#4AB057]/10 flex items-center justify-center text-[#4AB057] shrink-0">
              <Heart className="w-5 h-5 stroke-[2.2]" />
            </div>

            {/* Label & Number (Frame 63) */}
            <div className="flex-1 text-center">
              <span className="block text-base font-medium text-[#163B65] leading-tight">
                Following
              </span>
              <span className="block text-2xl font-semibold text-[#163B65] leading-tight mt-0.5">
                {followedBusinesses.length}
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. USER PROFILE HERO CARD (Figma Node 343:1723 - Frame 97)
        ========================================================================= */}
        <section className="bg-[#163B65]/5 rounded-[14px] p-6 sm:p-8 relative">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
            {/* User Portrait Avatar (Figma Node 343:1724 - Frame 92) */}
            <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden shrink-0 shadow-sm ring-4 ring-white bg-gray-100 flex items-center justify-center">
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarUrl}
                  alt={profileName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#163B65] text-white text-5xl font-bold flex items-center justify-center uppercase">
                  {profileName.charAt(0)}
                </div>
              )}
            </div>

            {/* User Details (Figma Node 343:1728 - Frame 26) */}
            <div className="flex-1 space-y-3.5 w-full text-center md:text-left">
              {/* Full Name */}
              <h1 className="text-3xl font-semibold text-black tracking-tight leading-snug">
                {profileName}
              </h1>

              {/* Location */}
              <div className="flex items-center justify-center md:justify-start gap-2.5 text-base font-medium text-black">
                <MapPin className="w-5 h-5 text-black shrink-0" />
                <span>{profileLocation}</span>
              </div>

              {/* Phone */}
              <div className="flex items-center justify-center md:justify-start gap-2.5 text-base font-medium text-black">
                <Phone className="w-4 h-4 text-black shrink-0" />
                <a href={`tel:${profilePhone}`} className="hover:text-[#163B65] transition">
                  {profilePhone}
                </a>
              </div>

              {/* Email */}
              <div className="flex items-center justify-center md:justify-start gap-2.5 text-base font-medium text-black">
                <Mail className="w-5 h-5 text-black shrink-0" />
                <a href={`mailto:${profileEmail}`} className="hover:text-[#163B65] transition">
                  {profileEmail}
                </a>
              </div>

              {/* Member Since */}
              <div className="flex items-center justify-center md:justify-start gap-2.5 text-base font-medium text-black">
                <Calendar className="w-5 h-5 text-black shrink-0" />
                <span>{memberSince}</span>
              </div>
            </div>

            {/* Edit Profile Action Button (Figma Node 343:1753) */}
            <div className="w-full sm:w-auto flex justify-center md:justify-end self-center md:self-end mt-4 md:mt-0">
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="w-37.5 h-11 border-[1.5px] border-[#163B65] text-[#163B65] font-bold text-base rounded-lg hover:bg-blue-50 transition cursor-pointer flex items-center justify-center shadow-xs"
              >
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================================
            4. FOLLOWED BUSINESS SECTION (Figma Node 343:1754 & Frame 39)
        ========================================================================= */}
        <section className="space-y-6 pt-2">
          {/* Section Header */}
          <h2 className="text-3xl font-semibold text-black tracking-tight">
            Followed Business
          </h2>

          {/* Cards List (Figma Frame 38) */}
          {followedBusinesses.length > 0 ? (
            <div className="space-y-6">
              {followedBusinesses.map((facility) => {
                const isVerified = facility.verification_status === 'verified';

                return (
                  <div
                    key={facility.id}
                    className="bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.15)] border border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between overflow-hidden transition hover:shadow-md"
                  >
                    {/* Facility Image (Figma Frame 28 - Node 343:1758) */}
                    <div className="w-full sm:w-[343px] h-[188px] shrink-0 bg-gray-100 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={facility.photo}
                        alt={facility.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Facility Details (Figma Node 343:1760 - Frame 26) */}
                    <div className="p-4 sm:p-5 flex-1 space-y-2.5">
                      {/* Facility Title */}
                      <Link
                        href={`/facility/${facility.id}`}
                        className="text-lg font-semibold text-black hover:text-[#163B65] transition line-clamp-1"
                      >
                        {facility.name}
                      </Link>

                      {/* Rating & Verified Pill (Figma Node 343:1763 - Frame 21) */}
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5 text-base font-medium text-black">
                          <Star className="w-5 h-5 fill-[#FFCD0F] text-[#FFCD0F]" />
                          {facility.rating ? (
                            <>
                              <span>{facility.rating.toFixed(1)}</span>
                              <span className="text-black font-medium">
                                ({facility.review_count} reviews)
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-gray-500 font-normal">
                              No reviews yet
                            </span>
                          )}
                        </div>

                        {/* Verified Badge (Figma Node 343:1769 - Frame 20) */}
                        {isVerified && (
                          <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-[#22C55E] text-white text-sm font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 fill-white text-[#22C55E]" />
                            <span>Verified</span>
                          </div>
                        )}
                      </div>

                      {/* Location (Figma Node 343:1774 - Frame 22) */}
                      <div className="flex items-center gap-2 text-base font-medium text-black">
                        <MapPin className="w-5 h-5 text-black shrink-0" />
                        <span className="truncate">
                          {facility.town ? `${facility.town}, ` : ''}
                          {facility.county}
                        </span>
                      </div>

                      {/* Phone (Figma Node 343:1780 - Frame 23) */}
                      <div className="flex items-center gap-2 text-base font-normal text-black">
                        <Phone className="w-4 h-4 text-black shrink-0" />
                        <a
                          href={`tel:${facility.phone}`}
                          className="hover:text-[#163B65] transition"
                        >
                          {facility.phone}
                        </a>
                      </div>

                      {/* Website (Figma Node 343:1784 - Frame 24) */}
                      <div className="flex items-center gap-2 text-base font-medium text-black">
                        <Globe className="w-5 h-5 text-black shrink-0" />
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

                    {/* Unfollow Button (Figma Node 343:1789) */}
                    <div className="p-4 sm:p-5 flex sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUnfollow(facility.id)}
                        className="w-full sm:w-37.5 h-11 border-[1.5px] border-[#163B65] text-[#163B65] font-bold text-base rounded-lg hover:bg-red-50 hover:border-red-600 hover:text-red-600 transition flex items-center justify-center cursor-pointer shadow-xs"
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
            <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center space-y-4 bg-gray-50/50">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-[#163B65] flex items-center justify-center mx-auto">
                <Heart className="w-7 h-7 text-[#163B65]" />
              </div>
              <h3 className="text-xl font-bold text-black">No followed businesses yet</h3>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Explore health facilities and pharmacies across Liberia and follow them for quick
                access directly from your profile.
              </p>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#163B65] text-white text-sm font-semibold rounded-lg hover:bg-[#0f2845] transition shadow-xs"
              >
                <span>Browse Health Facilities</span>
              </Link>
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
                    Avatar Image URL
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
