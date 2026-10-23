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
  Calendar,
  User as UserIcon,
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

export interface SystemUser {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: 'user' | 'business_owner' | 'admin';
  email_verified: boolean;
  businesses_count: number;
  reviews_count: number;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'verifications' | 'directory' | 'users' | 'reviews'>('verifications');

  // System Users Directory state
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [usersSearchTerm, setUsersSearchTerm] = useState('');
  const [usersFilterRole, setUsersFilterRole] = useState('all');
  const [updatingUserRole, setUpdatingUserRole] = useState<string | null>(null);

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
  const [dialogTab, setDialogTab] = useState<'overview' | 'documents'>('overview');
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

        // 2. Fetch businesses with clinical specifications, owner profile, photos & documents
        const { data: bData } = await supabase
          .from('businesses')
          .select(`
            *,
            category:categories(*),
            healthcare_facility_details(*),
            owner:profiles!businesses_owner_id_fkey(*),
            business_photos(*),
            business_documents(*)
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

        // 4. Fetch system users directory live
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (token) {
          try {
            const uRes = await fetch('/api/admin/users', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (uRes.ok) {
              const uJson = await uRes.json();
              if (uJson.success && Array.isArray(uJson.data)) {
                if (!isActive) return;
                setSystemUsers(uJson.data);
                setTotalUsers(uJson.data.length);
              }
            }
          } catch (uErr) {
            console.warn('Users directory fetch notice:', uErr);
          }
        }

        if (totalUsers === null) {
          const { count: uCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

          if (!isActive) return;
          if (typeof uCount === 'number') {
            setTotalUsers(uCount);
          }
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

  // Change user role
  const handleUpdateUserRole = async (
    userId: string,
    newRole: 'user' | 'business_owner' | 'admin'
  ) => {
    setUpdatingUserRole(userId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update user role');

      setSystemUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setActionMessage(`User role successfully changed to ${newRole.toUpperCase()}.`);
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating user role';
      alert(msg);
    } finally {
      setUpdatingUserRole(null);
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

  const filteredUsers = systemUsers.filter((u) => {
    if (usersSearchTerm.trim()) {
      const q = usersSearchTerm.toLowerCase();
      const matchName = u.full_name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchPhone = u.phone?.toLowerCase().includes(q) ?? false;
      if (!matchName && !matchEmail && !matchPhone) return false;
    }
    if (usersFilterRole !== 'all') {
      if (u.role !== usersFilterRole) return false;
    }
    return true;
  });

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

        {/* Overview Stats Cards - Clickable to quickly jump to tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1: Total Facilities */}
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`p-5 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
              activeTab === 'directory'
                ? 'bg-blue-50/50 border-[#163B65] shadow-xs'
                : 'bg-white border-gray-100 hover:border-gray-300 shadow-2xs'
            }`}
          >
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
          </button>

          {/* Card 2: Total Registered Users (Figma Card 2) */}
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`p-5 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
              activeTab === 'users'
                ? 'bg-blue-50/50 border-[#163B65] shadow-xs'
                : 'bg-white border-gray-100 hover:border-gray-300 shadow-2xs'
            }`}
          >
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
          </button>

          {/* Card 3: Pending Approval (Figma Card 3) */}
          <button
            type="button"
            onClick={() => setActiveTab('verifications')}
            className={`p-5 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
              activeTab === 'verifications'
                ? 'bg-amber-50/50 border-amber-500 shadow-xs'
                : 'bg-white border-gray-100 hover:border-gray-300 shadow-2xs'
            }`}
          >
            <div>
              <span className="text-xs text-gray-500 font-semibold block">Pending Approval</span>
              <span className="text-2xl font-black text-amber-500 mt-1 block">{pendingCount}</span>
              <span className="text-[11px] text-amber-600 font-medium">Requires admin review</span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </button>

          {/* Card 4: Patient Reviews */}
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`p-5 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
              activeTab === 'reviews'
                ? 'bg-purple-50/50 border-purple-500 shadow-xs'
                : 'bg-white border-gray-100 hover:border-gray-300 shadow-2xs'
            }`}
          >
            <div>
              <span className="text-xs text-gray-500 font-semibold block">Patient Reviews</span>
              <span className="text-2xl font-black text-[#163B65] mt-1 block">{reviews.length}</span>
              <span className="text-[11px] text-gray-400">Total community ratings</span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5" />
            </div>
          </button>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 mb-6 pb-1 flex-wrap">
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
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-[#163B65] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 bg-white border border-gray-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users Directory ({systemUsers.length})</span>
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
                              onClick={() => {
                                setSelectedBusiness(fac);
                                setDialogTab('overview');
                              }}
                              className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-[#163B65] font-black flex items-center justify-center shrink-0 text-xs hover:bg-blue-100 transition cursor-pointer"
                              title="Click to view details"
                            >
                              {fac.name.charAt(0).toUpperCase()}
                            </button>
                            <div className="text-left">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedBusiness(fac);
                                  setDialogTab('overview');
                                }}
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
                            onClick={() => {
                              setSelectedBusiness(fac);
                              setDialogTab('overview');
                            }}
                            className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 font-bold flex items-center justify-center shrink-0 text-xs hover:bg-gray-200 transition cursor-pointer"
                            title="Click to view details"
                          >
                            {fac.name.charAt(0).toUpperCase()}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBusiness(fac);
                              setDialogTab('overview');
                            }}
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

        {/* Tab 3: System Users Directory */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-[#163B65]">System Users Directory</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Manage all {systemUsers.length} registered accounts across the platform (patients, owners, and administrators).
                </p>
              </div>

              {/* Search & Role Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={usersSearchTerm}
                    onChange={(e) => setUsersSearchTerm(e.target.value)}
                    placeholder="Search name, email, phone..."
                    className="pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] text-gray-800"
                  />
                </div>
                <select
                  value={usersFilterRole}
                  onChange={(e) => setUsersFilterRole(e.target.value)}
                  className="py-1.5 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] text-gray-700 font-semibold"
                >
                  <option value="all">All Roles ({systemUsers.length})</option>
                  <option value="user">
                    General Users ({systemUsers.filter((u) => u.role === 'user').length})
                  </option>
                  <option value="business_owner">
                    Business Owners ({systemUsers.filter((u) => u.role === 'business_owner').length})
                  </option>
                  <option value="admin">
                    Administrators ({systemUsers.filter((u) => u.role === 'admin').length})
                  </option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#163B65]" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No users match your filter criteria.</p>
                <p className="text-xs text-gray-400 mt-1">Try clearing your search term or selecting &quot;All Roles&quot;.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-3">User</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Phone</th>
                      <th className="py-3 px-3">Activity</th>
                      <th className="py-3 px-3">Joined</th>
                      <th className="py-3 px-3">Last Active</th>
                      <th className="py-3 px-3 text-right">Role Management</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((u) => {
                      const isCurrentUser = u.id === currentUser?.id;
                      const isUpdating = updatingUserRole === u.id;

                      return (
                        <tr key={u.id} className="hover:bg-gray-50/50 transition">
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-3">
                              {u.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={u.avatar_url}
                                  alt={u.full_name}
                                  className="w-9 h-9 rounded-xl object-cover shrink-0 border border-gray-100 shadow-2xs"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#163B65] font-black flex items-center justify-center shrink-0 text-xs shadow-2xs">
                                  {u.full_name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-gray-900">{u.full_name}</span>
                                  {isCurrentUser && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 text-blue-800 font-bold">
                                      You
                                    </span>
                                  )}
                                  {u.email_verified && (
                                    <span title="Email confirmed">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-gray-400 block font-mono">
                                  {u.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                <ShieldCheck className="w-3 h-3 text-purple-600" />
                                <span>Administrator</span>
                              </span>
                            ) : u.role === 'business_owner' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <Building2 className="w-3 h-3 text-blue-600" />
                                <span>Business Owner</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
                                <span>General User</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-gray-600 font-mono">
                            {u.phone || 'N/A'}
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="space-y-0.5">
                              {u.businesses_count > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded mr-1">
                                  <Building2 className="w-3 h-3" />
                                  <span>
                                    {u.businesses_count} {u.businesses_count === 1 ? 'facility' : 'facilities'}
                                  </span>
                                </span>
                              )}
                              {u.reviews_count > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  <span>
                                    {u.reviews_count} {u.reviews_count === 1 ? 'review' : 'reviews'}
                                  </span>
                                </span>
                              )}
                              {u.businesses_count === 0 && u.reviews_count === 0 && (
                                <span className="text-[11px] text-gray-400">Standard Member</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-3 text-gray-600 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              {new Date(u.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-gray-500 whitespace-nowrap text-[11px]">
                            {u.last_sign_in_at ? formatRelativeTime(u.last_sign_in_at) : 'Never signed in'}
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isUpdating ? (
                                <Loader2 className="w-4 h-4 animate-spin text-[#163B65]" />
                              ) : (
                                <select
                                  value={u.role}
                                  disabled={isCurrentUser}
                                  onChange={(e) =>
                                    handleUpdateUserRole(
                                      u.id,
                                      e.target.value as 'user' | 'business_owner' | 'admin'
                                    )
                                  }
                                  className="text-[11px] font-semibold bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-gray-700 hover:border-gray-400 focus:outline-none focus:border-[#163B65] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={
                                    isCurrentUser
                                      ? 'Cannot modify your own administrator role'
                                      : 'Change user role'
                                  }
                                >
                                  <option value="user">User</option>
                                  <option value="business_owner">Business Owner</option>
                                  <option value="admin">Admin</option>
                                </select>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Review Moderation */}
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

      {/* Business Details Modal Dialog (Matching Figma Node 511:1172) */}
      {selectedBusiness && (() => {
        const details = Array.isArray(selectedBusiness.healthcare_facility_details)
          ? selectedBusiness.healthcare_facility_details[0]
          : selectedBusiness.healthcare_facility_details;

        const owner = Array.isArray(selectedBusiness.owner)
          ? selectedBusiness.owner[0]
          : selectedBusiness.owner;

        const photoUrl =
          selectedBusiness.business_photos?.[0]?.storage_path ||
          'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80';

        const documents = selectedBusiness.business_documents || [];

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
            onClick={() => setSelectedBusiness(null)}
          >
            <div
              className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Frame 140: Dialog Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <h2 className="text-xl sm:text-2xl font-bold text-[#121313]">
                  Business Details
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedBusiness(null)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                  title="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Modal Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
                {/* Frame 151 / 105: Facility Banner Card */}
                <div className="bg-white rounded-2xl border border-gray-200/80 p-3 sm:p-4 flex flex-col sm:flex-row gap-4 sm:gap-5 items-start sm:items-center shadow-2xs">
                  {/* Facility Image */}
                  <div className="w-full sm:w-72 h-44 shrink-0 rounded-xl overflow-hidden bg-gray-100 relative border border-gray-100">
                    <img
                      src={photoUrl}
                      alt={selectedBusiness.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <VerificationBadge status={selectedBusiness.verification_status} />
                    </div>
                  </div>

                  {/* Facility Quick Information (Frame 152) */}
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg sm:text-xl font-bold text-[#121313] leading-snug">
                        {selectedBusiness.name}
                      </h3>
                      {/* Category Pill (Frame 153) */}
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#BFDBFE] text-[#163B65]">
                        {selectedBusiness.category?.name || details?.facility_type || 'Clinic'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs sm:text-sm text-gray-600">
                      {/* Location (Frame 154) */}
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="truncate">
                          {selectedBusiness.town ? `${selectedBusiness.town}, ` : ''}
                          {selectedBusiness.county || 'Liberia'}
                        </span>
                      </div>

                      {/* Phone (Frame 155) */}
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                        {selectedBusiness.phone ? (
                          <a
                            href={`tel:${selectedBusiness.phone}`}
                            className="text-gray-700 hover:text-blue-600 font-medium"
                          >
                            {selectedBusiness.phone}
                          </a>
                        ) : (
                          <span className="text-gray-400">Not provided</span>
                        )}
                      </div>

                      {/* Website (Frame 156) */}
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                        {selectedBusiness.website_url ? (
                          <a
                            href={
                              selectedBusiness.website_url.startsWith('http')
                                ? selectedBusiness.website_url
                                : `https://${selectedBusiness.website_url}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#1D4ED8] hover:underline font-medium truncate max-w-xs"
                          >
                            {selectedBusiness.website_url}
                          </a>
                        ) : (
                          <span className="text-gray-400">Not provided</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Frame 148: Tab Navigation */}
                <div className="flex items-center gap-8 border-b border-gray-200 px-1">
                  <button
                    type="button"
                    onClick={() => setDialogTab('overview')}
                    className={`pb-3 text-sm sm:text-base transition cursor-pointer ${
                      dialogTab === 'overview'
                        ? 'text-[#1D4ED8] font-bold border-b-2 border-[#1D4ED8]'
                        : 'text-gray-500 hover:text-gray-800 font-semibold border-b-2 border-transparent'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => setDialogTab('documents')}
                    className={`pb-3 text-sm sm:text-base transition cursor-pointer flex items-center gap-1.5 ${
                      dialogTab === 'documents'
                        ? 'text-[#1D4ED8] font-bold border-b-2 border-[#1D4ED8]'
                        : 'text-gray-500 hover:text-gray-800 font-semibold border-b-2 border-transparent'
                    }`}
                  >
                    <span>Documents</span>
                    {documents.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold">
                        {documents.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Frame 106: Main Tab Content */}
                {dialogTab === 'overview' ? (
                  <div className="border border-black/15 rounded-2xl p-5 sm:p-6 bg-white space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Left Column (Frame 145): Business & Owner Info */}
                      <div className="lg:col-span-8 space-y-6">
                        {/* Section 1: Business Information */}
                        <div className="space-y-3.5">
                          <h4 className="text-base sm:text-lg font-bold text-[#121313]">
                            Business Information
                          </h4>

                          <div className="divide-y divide-gray-100 text-xs sm:text-sm">
                            <div className="py-2.5 flex items-center justify-between gap-4">
                              <span className="text-gray-500 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                                <span>Business Name</span>
                              </span>
                              <span className="font-semibold text-gray-900 text-right">
                                {selectedBusiness.name}
                              </span>
                            </div>

                            <div className="py-2.5 flex items-center justify-between gap-4">
                              <span className="text-gray-500 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                                <span>Business Address</span>
                              </span>
                              <span className="font-semibold text-gray-900 text-right">
                                {selectedBusiness.address ||
                                  `${selectedBusiness.town ? `${selectedBusiness.town}, ` : ''}${selectedBusiness.county || 'Liberia'}`}
                              </span>
                            </div>

                            <div className="py-2.5 flex items-center justify-between gap-4">
                              <span className="text-gray-500 flex items-center gap-2">
                                <Stethoscope className="w-4 h-4 text-gray-400 shrink-0" />
                                <span>Category</span>
                              </span>
                              <span className="font-semibold text-gray-900 text-right">
                                {selectedBusiness.category?.name || details?.facility_type || 'Healthcare Facility'}
                              </span>
                            </div>

                            <div className="py-2.5 flex items-center justify-between gap-4">
                              <span className="text-gray-500 flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                                <span>Phone Number</span>
                              </span>
                              <span className="font-semibold text-gray-900 text-right">
                                {selectedBusiness.phone ? (
                                  <a href={`tel:${selectedBusiness.phone}`} className="hover:text-blue-600 font-medium">
                                    {selectedBusiness.phone}
                                  </a>
                                ) : (
                                  <span className="text-gray-400">Not provided</span>
                                )}
                              </span>
                            </div>

                            <div className="py-2.5 flex items-center justify-between gap-4">
                              <span className="text-gray-500 flex items-center gap-2">
                                <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                                <span>Website</span>
                              </span>
                              <span className="font-semibold text-right">
                                {selectedBusiness.website_url ? (
                                  <a
                                    href={
                                      selectedBusiness.website_url.startsWith('http')
                                        ? selectedBusiness.website_url
                                        : `https://${selectedBusiness.website_url}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#1D4ED8] hover:underline font-medium"
                                  >
                                    {selectedBusiness.website_url}
                                  </a>
                                ) : (
                                  <span className="text-gray-400">Not provided</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Business Owner Information */}
                        <div className="space-y-3.5 pt-2 border-t border-gray-100">
                          <h4 className="text-base sm:text-lg font-bold text-[#121313]">
                            Business Owner Information
                          </h4>

                          <div className="divide-y divide-gray-100 text-xs sm:text-sm">
                            <div className="py-2.5 flex items-center justify-between gap-4">
                              <span className="text-gray-500 flex items-center gap-2">
                                <UserIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                <span>Owner Name</span>
                              </span>
                              <span className="font-semibold text-gray-900 text-right">
                                {owner?.full_name || 'System / Government Administrator'}
                              </span>
                            </div>

                            <div className="py-2.5 flex items-center justify-between gap-4">
                              <span className="text-gray-500 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                                <span>Email Address</span>
                              </span>
                              <span className="font-semibold text-gray-900 text-right">
                                {owner?.email || selectedBusiness.public_email || 'None registered'}
                              </span>
                            </div>

                            <div className="py-2.5 flex items-center justify-between gap-4">
                              <span className="text-gray-500 flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                                <span>Phone Number</span>
                              </span>
                              <span className="font-semibold text-gray-900 text-right">
                                {owner?.phone || selectedBusiness.phone || 'None registered'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Healthcare Facility Specifications & Emergency Status */}
                        {details && (
                          <div className="space-y-3 pt-2 border-t border-gray-100">
                            <h4 className="text-xs uppercase tracking-wider font-bold text-[#163B65]">
                              Clinical & Operating Specifications
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                              <div>
                                <span className="text-gray-400 block font-medium">Facility Level / Type</span>
                                <span className="font-bold text-gray-800">
                                  {details.facility_type || selectedBusiness.category?.name || 'Healthcare Facility'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block font-medium">Registration / License #</span>
                                <span className="font-mono font-bold text-gray-800">
                                  {details.registration_number || 'Not registered / Pending'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block font-medium">Emergency Care</span>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[11px] mt-0.5 ${
                                    details.emergency_services
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {details.emergency_services ? '24/7 Emergency Care' : 'Standard Routine Hours'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block font-medium">Opening Hours</span>
                                <span className="font-bold text-gray-800">
                                  {details.opening_hours_raw || 'Standard clinic hours'}
                                </span>
                              </div>
                              {details.services && details.services.length > 0 && (
                                <div className="sm:col-span-2 space-y-1 pt-1">
                                  <span className="text-gray-400 block font-medium">Services Offered</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {details.services.map((svc, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700 text-[11px] font-medium"
                                      >
                                        {svc}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {selectedBusiness.latitude !== null &&
                                selectedBusiness.latitude !== undefined &&
                                selectedBusiness.longitude !== null &&
                                selectedBusiness.longitude !== undefined && (
                                  <div className="sm:col-span-2 pt-1 flex items-center justify-between">
                                    <span className="text-gray-400">
                                      GPS: {selectedBusiness.latitude.toFixed(4)}, {selectedBusiness.longitude.toFixed(4)}
                                    </span>
                                    <a
                                      href={`https://maps.google.com/?q=${selectedBusiness.latitude},${selectedBusiness.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline font-semibold"
                                    >
                                      View on Google Maps &rarr;
                                    </a>
                                  </div>
                                )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Column (Frame 69): Document Card */}
                      <div className="lg:col-span-4 flex flex-col">
                        <div className="bg-[#DBEAFE] rounded-2xl p-5 border border-blue-200/80 flex flex-col items-center text-center space-y-3.5 shadow-2xs">
                          <div className="w-16 h-16 rounded-2xl bg-white text-[#1D4ED8] shadow-xs flex items-center justify-center">
                            <FileText className="w-8 h-8" />
                          </div>

                          <div className="space-y-1">
                            <h5 className="font-bold text-gray-900 text-sm sm:text-base">
                              Registration Certificate
                            </h5>
                            <p className="text-xs text-[#163B65]/80">
                              Official Ministry of Health or legal operating registration
                            </p>
                          </div>

                          <div className="bg-white/90 rounded-xl px-3 py-2 w-full text-xs font-mono text-gray-700 border border-blue-100">
                            <span className="text-[10px] text-gray-400 block uppercase font-sans font-bold">
                              Registration / License No.
                            </span>
                            <span className="font-bold text-gray-900">
                              {details?.registration_number || 'LIB-MOH-PENDING'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setDialogTab('documents')}
                            className="w-full py-2 px-3.5 bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect Documentation</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Documents Tab View */
                  <div className="border border-black/15 rounded-2xl p-5 sm:p-6 bg-white space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base sm:text-lg font-bold text-[#121313]">
                        Accreditation & Legal Documentation
                      </h4>
                      <span className="text-xs text-gray-500 font-medium">
                        Verification status: <strong className="capitalize text-gray-800">{selectedBusiness.verification_status}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Document Card: Operating License */}
                      <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-blue-100 text-[#1D4ED8] flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <h5 className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                            Ministry of Health Operating Permit
                          </h5>
                          <p className="text-[11px] text-gray-500 font-mono truncate">
                            License #{details?.registration_number || 'Pending Assignment'}
                          </p>
                          <div className="pt-2 flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              selectedBusiness.verification_status === 'verified'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {selectedBusiness.verification_status === 'verified' ? 'Verified Permit' : 'Awaiting Approval'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Document Card: Business Profile Dossier */}
                      <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <h5 className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                            Facility Registration Record
                          </h5>
                          <p className="text-[11px] text-gray-500 font-mono truncate">
                            Submitted: {formatSubmissionDate(selectedBusiness.created_at)}
                          </p>
                          <div className="pt-2 flex items-center gap-2">
                            <Link
                              href={`/facility/${selectedBusiness.id}`}
                              target="_blank"
                              className="text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-1"
                            >
                              <span>Inspect Live Record</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Any supplemental documents */}
                    {documents.length > 0 ? (
                      <div className="space-y-2 pt-2">
                        <span className="text-xs font-bold text-gray-700 block">Uploaded Attachments</span>
                        <div className="space-y-2">
                          {documents.map((doc) => (
                            <div key={doc.id} className="p-3 rounded-lg border border-gray-200 bg-white flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <span className="font-semibold text-gray-800">{doc.document_type}</span>
                                <span className="text-gray-400 font-mono text-[11px]">({doc.storage_path})</span>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 capitalize">
                                {doc.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic pt-1">
                        No additional supplemental attachment files uploaded with this listing submission.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Frame 150: Action Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-[#F8FAFC] flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                <Link
                  href={`/facility/${selectedBusiness.id}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#163B65] hover:bg-white rounded-xl transition border border-gray-200"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Public Listing</span>
                </Link>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap">
                  {/* Reject Button (Frame 150 Designer Style: Red outline #B91C1C) */}
                  {selectedBusiness.verification_status !== 'rejected' && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleUpdateStatus(selectedBusiness.id, 'rejected')}
                      className="border-1.5 border-[#B91C1C] text-[#B91C1C] hover:bg-rose-50 font-bold rounded-lg px-8 py-2.5 text-base transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isUpdatingStatus ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      <span>Reject</span>
                    </button>
                  )}

                  {/* Approve Button (Frame 150 Designer Style: Green solid #15803D) */}
                  {selectedBusiness.verification_status !== 'verified' && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleUpdateStatus(selectedBusiness.id, 'verified')}
                      className="bg-[#15803D] hover:bg-[#166534] text-white font-bold rounded-lg px-8 py-2.5 text-base transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {isUpdatingStatus ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>Approve</span>
                    </button>
                  )}

                  {/* Unverify secondary button if already verified */}
                  {selectedBusiness.verification_status === 'verified' && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleUpdateStatus(selectedBusiness.id, 'unverified')}
                      className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-300 bg-white hover:bg-gray-100 rounded-lg transition cursor-pointer disabled:opacity-50"
                    >
                      Unverify
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedBusiness(null)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
