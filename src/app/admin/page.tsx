'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Star,
  Search,
  Filter,
  Eye,
  Trash2,
  Loader2,
  MapPin,
  ExternalLink,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Business, Review } from '@/types/database';
import { VerificationBadge } from '@/components/VerificationBadge';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState<'verifications' | 'directory' | 'reviews'>('verifications');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCounty, setFilterCounty] = useState('all');

  // Action status message
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch businesses
      const { data: bData } = await supabase
        .from('businesses')
        .select(`
          *,
          category:categories(*)
        `)
        .order('created_at', { ascending: false });

      setBusinesses(bData || []);

      // 2. Fetch reviews
      const { data: rData } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      setReviews(rData || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Update facility verification status
  const handleUpdateStatus = async (
    businessId: string,
    newStatus: 'verified' | 'rejected' | 'pending' | 'unverified'
  ) => {
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          verification_status: newStatus,
          is_published: newStatus === 'verified' || newStatus === 'pending',
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
              }
            : b
        )
      );

      setActionMessage(
        `Facility marked as ${newStatus.toUpperCase()} successfully.`
      );
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: any) {
      alert(`Error updating verification status: ${err.message}`);
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
    } catch (err: any) {
      alert(`Error deleting review: ${err.message}`);
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

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadAdminData}
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

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
            <span className="text-xs text-gray-500 font-semibold block">Total Facilities</span>
            <span className="text-2xl font-black text-[#163B65] mt-1 block">{totalCount}</span>
            <span className="text-[11px] text-gray-400">Imported across 15 counties</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
            <span className="text-xs text-gray-500 font-semibold block">Verified Facilities</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-600">{verifiedCount}</span>
              <span className="text-xs font-bold text-gray-400">
                ({totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0}%)
              </span>
            </div>
            <span className="text-[11px] text-gray-400">Active badge displayed</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
            <span className="text-xs text-gray-500 font-semibold block">Pending Approval</span>
            <span className="text-2xl font-black text-amber-500 mt-1 block">{pendingCount}</span>
            <span className="text-[11px] text-amber-600 font-medium">Requires admin review</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
            <span className="text-xs text-gray-500 font-semibold block">Patient Reviews</span>
            <span className="text-2xl font-black text-[#163B65] mt-1 block">{reviews.length}</span>
            <span className="text-[11px] text-gray-400">Total community ratings</span>
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
                      <th className="py-3 px-3">Facility Name</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">County / Town</th>
                      <th className="py-3 px-3">Phone</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingList.map((fac) => (
                      <tr key={fac.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-3.5 px-3">
                          <Link
                            href={`/facility/${fac.id}`}
                            target="_blank"
                            className="font-bold text-gray-900 hover:text-[#163B65] flex items-center gap-1.5"
                          >
                            <span>{fac.name}</span>
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                          </Link>
                          {fac.address && <p className="text-[11px] text-gray-400 truncate max-w-xs">{fac.address}</p>}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700">
                            {fac.category?.name || 'Healthcare'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-gray-600">
                          {fac.town ? `${fac.town}, ` : ''}{fac.county}
                        </td>
                        <td className="py-3.5 px-3 text-gray-600 font-mono">
                          {fac.phone || 'N/A'}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(fac.id, 'verified')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition flex items-center gap-1 shadow-2xs cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verify</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(fac.id, 'rejected')}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 transition flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
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

              {/* Search Filter */}
              <div className="flex items-center gap-2">
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
                        <Link
                          href={`/facility/${fac.id}`}
                          target="_blank"
                          className="font-bold text-gray-900 hover:text-[#163B65] flex items-center gap-1.5"
                        >
                          <span>{fac.name}</span>
                          <ExternalLink className="w-3 h-3 text-gray-400" />
                        </Link>
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
                {reviews.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-2xl border border-gray-100 bg-[#FBFDFB] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
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
                        <span className="text-xs font-bold text-gray-900">
                          {r.is_anonymous ? 'Anonymous Liberian' : r.reviewer_name_display || 'Verified Patient'}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700">{r.comment}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteReview(r.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
