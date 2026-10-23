'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  XCircle,
  Star,
  Search,
  Eye,
  Trash2,
  Loader2,
  ExternalLink,
  RefreshCw,
  Users,
  LogOut,
  Clock,
  Check,
  X,
  MapPin,
  Phone,
  Mail,
  Globe,
  Stethoscope,
  FileText,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Business, Review } from '@/types/database';
import { VerificationBadge } from '@/components/VerificationBadge';

function AdminSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16 animate-pulse">
      {/* Top Admin Bar Skeleton */}
      <header className="bg-[#163B65] text-white py-6 px-4 sm:px-6 lg:px-8 border-b border-[#0f2845]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2.5">
            <div className="h-5 w-48 bg-white/20 rounded-full" />
            <div className="h-8 w-80 max-w-full bg-white/20 rounded-lg" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-32 bg-white/20 rounded-xl" />
            <div className="h-9 w-36 bg-white/20 rounded-xl" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-8">
        {/* Metric Cards Skeleton */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
              <div className="h-3 w-24 bg-gray-200 rounded" />
              <div className="h-8 w-16 bg-gray-300 rounded" />
              <div className="h-2.5 w-32 bg-gray-100 rounded" />
            </div>
          ))}
        </section>

        {/* Navigation Tabs & Search Skeleton */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-10 w-36 bg-gray-200 rounded-xl" />
            <div className="h-10 w-36 bg-gray-200 rounded-xl" />
            <div className="h-10 w-36 bg-gray-200 rounded-xl" />
          </div>
          <div className="h-10 w-64 max-w-full bg-gray-200 rounded-xl" />
        </section>

        {/* Content Card / Table Skeleton */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-2xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-5 w-52 bg-gray-300 rounded" />
              <div className="h-3.5 w-80 max-w-full bg-gray-200 rounded" />
            </div>
            <div className="h-8 w-28 bg-gray-200 rounded-lg" />
          </div>

          <div className="divide-y divide-gray-100">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-gray-200 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-44 bg-gray-300 rounded" />
                      <div className="h-4 w-20 bg-gray-200 rounded-full" />
                    </div>
                    <div className="h-3.5 w-64 max-w-full bg-gray-200 rounded" />
                    <div className="h-3 w-40 bg-gray-100 rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <div className="h-8 w-20 bg-gray-200 rounded-xl" />
                  <div className="h-8 w-20 bg-gray-200 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function formatSubmissionDate(dateStr?: string) {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateStr?: string) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 60) return `${Math.max(1, diffMinutes)}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'verifications' | 'directory' | 'reviews'>('verifications');

  // Admin session state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminProfile, setAdminProfile] = useState<{ role?: string; full_name?: string } | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCounty, setFilterCounty] = useState('all');

  // Action status message
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Business Details Dialog State
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedBusiness(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function verifyAndLoad() {
      try {
        // 0. Verify active session
        const { data: authData, error: authError } = await supabase.auth.getUser();
        const user = authData?.user;

        if (authError || !user) {
          router.replace(
            '/auth/login?redirect=/admin&toast=admin_required&message=Please+sign+in+as+an+admin+to+access+the+Admin+Console'
          );
          return;
        }

        // 1. Verify admin role in profiles table
        const { data: prof, error: profError } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .maybeSingle();

        const hasAdminRole =
          prof?.role === 'admin' || user.user_metadata?.role === 'admin';

        if (profError || !hasAdminRole) {
          router.replace(
            '/auth/login?redirect=/admin&toast=admin_required&message=Access+denied.+Administrator+privileges+are+required.'
          );
          return;
        }

        if (!isActive) return;
        setCurrentUser(user);
        setIsAdmin(true);
        setAdminProfile(prof || null);

        // 2. Fetch businesses with clinical specifications and owner profile
        const { data: bData } = await supabase
          .from('businesses')
          .select(`
            *,
            category:categories(*),
            healthcare_facility_details(*),
            owner:profiles!businesses_owner_id_fkey(*)
          `)
          .order('created_at', { ascending: false });

        if (!isActive) return;
        setBusinesses(bData || []);

        // 3. Fetch reviews with joined profiles and target business
        const { data: rData } = await supabase
          .from('reviews')
          .select(`
            *,
            profiles (
              full_name,
              avatar_url
            ),
            businesses (
              id,
              name
            )
          `)
          .order('created_at', { ascending: false });

        if (!isActive) return;
        setReviews((rData as Review[]) || []);

        // 4. Fetch total users count (designer's metric)
        const { count: uCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (!isActive) return;
        if (typeof uCount === 'number') {
          setTotalUsers(uCount);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error verifying admin authorization:', err);
        router.replace(
          '/auth/login?redirect=/admin&toast=admin_required&message=Please+sign+in+as+an+admin+to+access+the+Admin+Console'
        );
      }
    }

    void verifyAndLoad();

    return () => {
      isActive = false;
    };
  }, [router, refreshKey]);

  // Update facility verification status
  const handleUpdateStatus = async (
    businessId: string,
    newStatus: 'verified' | 'rejected' | 'pending' | 'unverified'
  ) => {
    setIsUpdatingStatus(true);
    try {
      const recordStatus = newStatus === 'verified' ? 'published' : newStatus === 'rejected' ? 'rejected' : 'pending';
      const { error } = await supabase
        .from('businesses')
        .update({
          verification_status: newStatus,
          is_published: newStatus === 'verified' || newStatus === 'pending',
          record_status: recordStatus,
        })
        .eq('id', businessId);

      if (error) throw error;

      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === businessId
            ? {
                ...b,
                verification_status: newStatus,
                is_published: newStatus === 'verified' || newStatus === 'pending',
                record_status: recordStatus,
              }
            : b
        )
      );

      // Keep active dialog in sync if viewing this business
      setSelectedBusiness((prev) =>
        prev && prev.id === businessId
          ? {
              ...prev,
              verification_status: newStatus,
              is_published: newStatus === 'verified' || newStatus === 'pending',
              record_status: recordStatus,
            }
          : prev
      );

      setActionMessage(
        `Facility marked as ${newStatus.toUpperCase()} successfully.`
      );
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update';
      alert(`Error updating verification status: ${msg}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Moderate / Delete Review
  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to remove this patient review?')) return;
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setActionMessage('Review removed from directory.');
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete';
      alert(`Error deleting review: ${msg}`);
    }
  };

  // Sign out admin session
  const handleSignOut = async () => {
    if (!confirm('Are you sure you want to sign out from the Admin Console?')) return;
    try {
      await supabase.auth.signOut();
      router.replace(
        '/auth/login?toast=logged_out&message=You+have+been+signed+out+successfully.'
      );
    } catch (err) {
      console.error('Error signing out:', err);
      router.replace('/auth/login');
    }
  };

  // Metrics
  const totalCount = businesses.length;
  const verifiedCount = businesses.filter((b) => b.verification_status === 'verified').length;
  const pendingCount = businesses.filter((b) => b.verification_status === 'pending').length;

  const filteredBusinesses = businesses.filter((b) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = b.name.toLowerCase().includes(q);
      const matchCounty = b.county?.toLowerCase().includes(q) ?? false;
      const matchTown = b.town?.toLowerCase().includes(q) ?? false;
      if (!matchName && !matchCounty && !matchTown) return false;
    }
    if (filterCounty !== 'all') {
      if (b.county?.toLowerCase() !== filterCounty.toLowerCase()) return false;
    }
    return true;
  });

  const pendingList = businesses.filter((b) => b.verification_status === 'pending');

  if (loading || !isAdmin) {
    return <AdminSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* Top Admin Bar */}
      <div className="bg-[#163B65] text-white py-6 px-4 sm:px-6 lg:px-8 border-b border-[#0f2845]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Administrative Console
              </span>
              <span className="text-xs text-blue-200">
                Minzo Africa &bull; Liberia
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
              National Health Directory Moderation
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-semibold rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Admin: {adminProfile?.full_name || currentUser?.email}</span>
            </span>

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setRefreshKey((k) => k + 1);
              }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-[#163B65] text-xs font-bold rounded-xl transition hover:bg-gray-100"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View Public Site</span>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 text-xs font-bold rounded-xl transition cursor-pointer"
              title="Sign Out of Admin Console"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Action notification banner */}
        {actionMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Overview Stats Cards - Enhanced with Designer's metrics & icon badges */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1: Total Facilities */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 font-semibold block">Total Businesses</span>
              <span className="text-2xl font-black text-[#163B65] mt-1 block">{totalCount}</span>
              <span className="text-[11px] text-gray-400">
                {verifiedCount} verified ({totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0}%)
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#DBEAFE] text-[#1D4ED8] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Total Registered Users (Figma Card 2) */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 font-semibold block">Total Users</span>
              <span className="text-2xl font-black text-[#163B65] mt-1 block">
                {totalUsers !== null ? totalUsers.toLocaleString() : '—'}
              </span>
              <span className="text-[11px] text-gray-400">Registered platform profiles</span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#DBEAFE] text-[#1D4ED8] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Pending Approval (Figma Card 3) */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 font-semibold block">Pending Approval</span>
              <span className="text-2xl font-black text-amber-500 mt-1 block">{pendingCount}</span>
              <span className="text-[11px] text-amber-600 font-medium">Requires admin review</span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Patient Reviews */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 font-semibold block">Patient Reviews</span>
              <span className="text-2xl font-black text-[#163B65] mt-1 block">{reviews.length}</span>
              <span className="text-[11px] text-gray-400">Total community ratings</span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 mb-6 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('verifications')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'verifications'
                ? 'bg-[#163B65] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 bg-white border border-gray-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verification Queue</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'directory'
                ? 'bg-[#163B65] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 bg-white border border-gray-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>All Facilities ({businesses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'reviews'
                ? 'bg-[#163B65] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 bg-white border border-gray-200'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Review Moderation ({reviews.length})</span>
          </button>
        </div>

        {/* Tab 1: Verification Queue */}
        {activeTab === 'verifications' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-[#163B65]">Facilities Pending Verification</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Approve registered clinics and hospitals to grant them the verified green checkmark badge.
                </p>
              </div>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                {pendingList.length} Pending
              </span>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#163B65]" />
              </div>
            ) : pendingList.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">Verification queue is completely clear!</p>
                <p className="text-xs text-gray-400 mt-1">All registered healthcare facilities have been reviewed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-3">Business</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Location</th>
                      <th className="py-3 px-3">Submitted</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingList.map((fac) => (
                      <tr key={fac.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setSelectedBusiness(fac)}
                              className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-[#163B65] font-black flex items-center justify-center shrink-0 text-xs hover:bg-blue-100 transition cursor-pointer"
                              title="Click to view details"
                            >
                              {fac.name.charAt(0).toUpperCase()}
                            </button>
                            <div className="text-left">
                              <button
                                type="button"
                                onClick={() => setSelectedBusiness(fac)}
                                className="font-bold text-gray-900 hover:text-[#163B65] hover:underline flex items-center gap-1.5 text-left cursor-pointer group"
                                title="Click to view all facility details"
                              >
                                <span className="group-hover:text-blue-700 transition">{fac.name}</span>
                                <FileText className="w-3.5 h-3.5 text-blue-500 opacity-80 group-hover:opacity-100 shrink-0" />
                              </button>
                              {fac.address && <p className="text-[11px] text-gray-400 truncate max-w-xs">{fac.address}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700">
                            {fac.category?.name || 'Healthcare'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-gray-600">
                          {fac.town ? `${fac.town}, ` : ''}{fac.county}
                        </td>
                        <td className="py-3.5 px-3 text-gray-500 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {formatSubmissionDate(fac.created_at)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(fac.id, 'verified')}
                              className="px-3.5 py-1.5 bg-[#4AB057] hover:bg-[#3ea04a] text-white font-semibold rounded-lg transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              title="Approve and mark as verified"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(fac.id, 'rejected')}
                              className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-[#DC2626] font-semibold rounded-lg border border-[#DC2626] transition flex items-center gap-1.5 cursor-pointer"
                              title="Reject listing"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: All Facilities Directory */}
        {activeTab === 'directory' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-[#163B65]">Liberia Facilities Directory</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Manage all {businesses.length} facilities across the 15 Liberian counties.
                </p>
              </div>

              {/* Search & County Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search name, town..."
                    className="pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65]"
                  />
                </div>
                <select
                  value={filterCounty}
                  onChange={(e) => setFilterCounty(e.target.value)}
                  className="py-1.5 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] text-gray-700"
                >
                  <option value="all">All Counties</option>
                  {Array.from(new Set(businesses.map((b) => b.county).filter((c): c is string => Boolean(c)))).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3">Facility Name</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">County</th>
                    <th className="py-3 px-3">Verification</th>
                    <th className="py-3 px-3 text-right">Toggle Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBusinesses.slice(0, 50).map((fac) => (
                    <tr key={fac.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setSelectedBusiness(fac)}
                            className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 font-bold flex items-center justify-center shrink-0 text-xs hover:bg-gray-200 transition cursor-pointer"
                            title="Click to view details"
                          >
                            {fac.name.charAt(0).toUpperCase()}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBusiness(fac)}
                            className="font-bold text-gray-900 hover:text-[#163B65] hover:underline flex items-center gap-1.5 text-left cursor-pointer group"
                            title="Click to view all facility details"
                          >
                            <span className="group-hover:text-blue-700 transition">{fac.name}</span>
                            <FileText className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transition shrink-0" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-gray-600">{fac.category?.name || 'Healthcare'}</span>
                      </td>
                      <td className="py-3.5 px-3 text-gray-600">
                        {fac.county}
                      </td>
                      <td className="py-3.5 px-3">
                        <VerificationBadge status={fac.verification_status} />
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {fac.verification_status === 'verified' ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(fac.id, 'unverified')}
                            className="px-2.5 py-1 text-[11px] font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer"
                          >
                            Unverify
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(fac.id, 'verified')}
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 cursor-pointer"
                          >
                            Mark Verified
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredBusinesses.length > 50 && (
                <div className="py-3 text-center text-xs text-gray-400">
                  Showing first 50 of {filteredBusinesses.length} facilities. Use search to find specific facilities.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Review Moderation */}
        {activeTab === 'reviews' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-[#163B65]">Patient Review Moderation</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Review and moderate patient reviews to maintain platform integrity.
                </p>
              </div>
              <span className="text-xs text-gray-500">{reviews.length} Total Reviews</span>
            </div>

            {reviews.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Star className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No patient reviews submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => {
                  const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
                  const targetBusiness = Array.isArray(r.businesses) ? r.businesses[0] : r.businesses;
                  const reviewerName = r.is_anonymous
                    ? 'Anonymous Patient'
                    : (profile?.full_name || r.reviewer_name_display || 'Verified Patient');

                  return (
                    <div
                      key={r.id}
                      className="p-4 rounded-2xl border border-gray-100 bg-[#FBFDFB] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          {profile?.avatar_url && !r.is_anonymous ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={profile.avatar_url}
                              alt={reviewerName}
                              className="w-5 h-5 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-[#163B65] text-[10px] font-black flex items-center justify-center shrink-0">
                              {reviewerName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-xs font-bold text-gray-900">
                            {reviewerName}
                          </span>
                          {targetBusiness?.name && (
                            <Link
                              href={`/facility/${targetBusiness.id}`}
                              className="text-[11px] font-semibold text-[#163B65] hover:underline flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md"
                            >
                              <span>For: {targetBusiness.name}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          )}
                          <span className="text-[11px] text-gray-400">
                            {formatRelativeTime(r.created_at) ? `(${formatRelativeTime(r.created_at)})` : new Date(r.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700">{r.comment}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteReview(r.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#DC2626] bg-white hover:bg-rose-50 rounded-lg border border-[#DC2626] transition cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Business Details Modal Dialog */}
      {selectedBusiness && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setSelectedBusiness(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dialog Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 bg-[#F8FAFC] flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#163B65] text-white font-black flex items-center justify-center text-lg sm:text-xl shrink-0 shadow-xs">
                  {selectedBusiness.name.charAt(0).toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                      {selectedBusiness.category?.name || 'Healthcare Facility'}
                    </span>
                    <VerificationBadge status={selectedBusiness.verification_status} />
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        selectedBusiness.is_published
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {selectedBusiness.is_published ? 'Published' : 'Unpublished'}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                    {selectedBusiness.name}
                  </h2>
                  <p className="text-[11px] text-gray-500 font-mono">
                    Slug: /{selectedBusiness.slug}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBusiness(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition cursor-pointer shrink-0"
                title="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dialog Scrollable Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
              {/* Section 1: Location & Contact */}
              <div className="bg-gray-50/70 p-4.5 rounded-2xl border border-gray-100 space-y-3">
                <h3 className="font-bold text-[#163B65] text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Location & Contact Details</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 block font-medium">County & Town</span>
                    <span className="font-bold text-gray-800">
                      {selectedBusiness.town ? `${selectedBusiness.town}, ` : ''}
                      {selectedBusiness.county || 'County not specified'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 block font-medium">Physical Street Address</span>
                    <span className="font-bold text-gray-800">
                      {selectedBusiness.address || 'No street address provided'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 block font-medium">Official Phone</span>
                    {selectedBusiness.phone ? (
                      <a
                        href={`tel:${selectedBusiness.phone}`}
                        className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{selectedBusiness.phone}</span>
                      </a>
                    ) : (
                      <span className="text-gray-400 font-medium">None provided</span>
                    )}
                  </div>

                  <div>
                    <span className="text-gray-400 block font-medium">Public Email</span>
                    {selectedBusiness.public_email ? (
                      <a
                        href={`mailto:${selectedBusiness.public_email}`}
                        className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Mail className="w-3 h-3" />
                        <span>{selectedBusiness.public_email}</span>
                      </a>
                    ) : (
                      <span className="text-gray-400 font-medium">None provided</span>
                    )}
                  </div>

                  {selectedBusiness.website_url && (
                    <div className="sm:col-span-2">
                      <span className="text-gray-400 block font-medium">Website</span>
                      <a
                        href={
                          selectedBusiness.website_url.startsWith('http')
                            ? selectedBusiness.website_url
                            : `https://${selectedBusiness.website_url}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Globe className="w-3 h-3" />
                        <span>{selectedBusiness.website_url}</span>
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                      </a>
                    </div>
                  )}

                  {selectedBusiness.latitude !== null &&
                    selectedBusiness.latitude !== undefined &&
                    selectedBusiness.longitude !== null &&
                    selectedBusiness.longitude !== undefined && (
                      <div className="sm:col-span-2 bg-white p-2.5 rounded-xl border border-gray-100 flex items-center justify-between">
                        <div>
                          <span className="text-gray-400 block font-medium text-[11px]">GPS Coordinates</span>
                          <span className="font-mono text-gray-700 font-semibold text-xs">
                            {selectedBusiness.latitude.toFixed(5)}, {selectedBusiness.longitude.toFixed(5)}
                          </span>
                        </div>
                        <a
                          href={`https://maps.google.com/?q=${selectedBusiness.latitude},${selectedBusiness.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                        >
                          View on Google Maps &rarr;
                        </a>
                      </div>
                    )}
                </div>
              </div>

              {/* Section 2: Healthcare Specifications */}
              {(() => {
                const details = Array.isArray(selectedBusiness.healthcare_facility_details)
                  ? selectedBusiness.healthcare_facility_details[0]
                  : selectedBusiness.healthcare_facility_details;

                return (
                  <div className="bg-gray-50/70 p-4.5 rounded-2xl border border-gray-100 space-y-3">
                    <h3 className="font-bold text-[#163B65] text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Healthcare Facility Specifications</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-400 block font-medium">Facility Level / Type</span>
                        <span className="font-bold text-gray-800">
                          {details?.facility_type || selectedBusiness.category?.name || 'Healthcare Facility'}
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-400 block font-medium">Registration / License #</span>
                        <span className="font-mono font-bold text-gray-800">
                          {details?.registration_number || 'Not registered / Pending license'}
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-400 block font-medium">Opening Hours</span>
                        <span className="font-bold text-gray-800">
                          {details?.opening_hours_raw ||
                            (typeof details?.opening_hours === 'string'
                              ? details?.opening_hours
                              : 'Standard clinic hours')}
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-400 block font-medium">Emergency Services</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[11px] ${
                            details?.emergency_services
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {details?.emergency_services
                            ? '24/7 Emergency Care'
                            : 'Standard Routine Hours'}
                        </span>
                      </div>

                      {details?.services && details.services.length > 0 && (
                        <div className="sm:col-span-2 space-y-1.5 pt-1">
                          <span className="text-gray-400 block font-medium">Medical Services Provided</span>
                          <div className="flex flex-wrap gap-1.5">
                            {details.services.map((svc, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-800 text-[11px] font-semibold shadow-2xs"
                              >
                                {svc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {details?.additional_notes && (
                        <div className="sm:col-span-2 pt-1">
                          <span className="text-gray-400 block font-medium">Additional Facility Notes</span>
                          <p className="p-3 bg-white rounded-xl border border-gray-100 text-gray-700 text-xs italic">
                            &quot;{details.additional_notes}&quot;
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Section 3: Ownership & Registration Audit */}
              <div className="bg-gray-50/70 p-4.5 rounded-2xl border border-gray-100 space-y-3">
                <h3 className="font-bold text-[#163B65] text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ownership & Registration Audit</span>
                </h3>

                {(() => {
                  const owner = Array.isArray(selectedBusiness.owner)
                    ? selectedBusiness.owner[0]
                    : selectedBusiness.owner;

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-400 block font-medium">Registered Owner</span>
                        <span className="font-bold text-gray-800">
                          {owner?.full_name || 'Self / System Administrator'}
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-400 block font-medium">Owner Phone</span>
                        <span className="font-mono text-gray-700">
                          {owner?.phone || 'Not available'}
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-400 block font-medium">Data Source</span>
                        <span className="font-semibold text-gray-700 capitalize">
                          {selectedBusiness.source.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-400 block font-medium">Submission Date</span>
                        <span className="font-mono text-gray-700">
                          {formatSubmissionDate(selectedBusiness.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Dialog Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-[#F8FAFC] flex flex-col sm:flex-row items-center justify-between gap-3">
              <Link
                href={`/facility/${selectedBusiness.id}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#163B65] hover:bg-white rounded-xl transition border border-gray-200"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Public Facility Profile</span>
              </Link>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {selectedBusiness.verification_status !== 'verified' && (
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleUpdateStatus(selectedBusiness.id, 'verified')}
                    className="px-4 py-2 bg-[#4AB057] hover:bg-[#3ea04a] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingStatus ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Approve & Verify</span>
                  </button>
                )}

                {selectedBusiness.verification_status !== 'rejected' && (
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleUpdateStatus(selectedBusiness.id, 'rejected')}
                    className="px-4 py-2 bg-white hover:bg-rose-50 text-[#DC2626] border border-[#DC2626] text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingStatus ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                    <span>Reject Facility</span>
                  </button>
                )}

                {selectedBusiness.verification_status === 'verified' && (
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleUpdateStatus(selectedBusiness.id, 'unverified')}
                    className="px-3.5 py-2 text-xs font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-100 rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Unverify
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedBusiness(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
