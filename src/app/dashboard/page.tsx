'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Phone,
  Mail,
  Star,
  Users,
  MessageSquare,
  ShieldCheck,
  Activity,
  Plus,
  Loader2,
  CheckCircle2,
  LogOut,
  ExternalLink,
  Eye,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Business, Message, Review, Staff } from '@/types/database';
import { VerificationBadge } from '@/components/VerificationBadge';

export default function BusinessDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [facility, setFacility] = useState<Business | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);

  const [activeTab, setActiveTab] = useState<'messages' | 'reviews' | 'staff' | 'settings'>('messages');

  // Staff Modal State
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffSpecialty, setStaffSpecialty] = useState('');
  const [staffCadre, setStaffCadre] = useState('Medical Doctor (MD)');
  const [staffLicense, setStaffLicense] = useState('');
  const [savingStaff, setSavingStaff] = useState(false);

  // Facility Quick Edit State
  const [editPhone, setEditPhone] = useState('');
  const [editHours, setEditHours] = useState('');
  const [editEmergency, setEditEmergency] = useState(false);
  const [editAmbulance, setEditAmbulance] = useState(false);
  const [savingFacility, setSavingFacility] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        // 1. Get logged in user
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        setCurrentUser(user);

        let userFacility: Business | null = null;

        if (user) {
          // Find facility owned by this user
          const { data: bData } = await supabase
            .from('businesses')
            .select(`
              *,
              category:categories(*),
              healthcare_facility_details(*)
            `)
            .eq('owner_id', user.id)
            .limit(1)
            .maybeSingle();

          userFacility = bData;
        }

        // If no user or user has no facility, load sample facility for demo purposes
        if (!userFacility) {
          const { data: sampleData } = await supabase
            .from('businesses')
            .select(`
              *,
              category:categories(*),
              healthcare_facility_details(*)
            `)
            .limit(1)
            .single();

          userFacility = sampleData;
        }

        setFacility(userFacility);

        if (userFacility) {
          // Preload edit states
          setEditPhone(userFacility.phone || '');
          const details = Array.isArray(userFacility.healthcare_facility_details)
            ? userFacility.healthcare_facility_details[0]
            : userFacility.healthcare_facility_details;
          if (details) {
            setEditHours(typeof details.opening_hours === 'string' ? details.opening_hours : '');
            setEditEmergency(!!details.emergency_services);
            setEditAmbulance(!!details.ambulance_available);
          }

          // 2. Fetch Messages/Inquiries with joined sender profile
          const { data: msgData } = await supabase
            .from('messages')
            .select(`
              *,
              profiles (
                full_name,
                phone,
                avatar_url
              )
            `)
            .eq('business_id', userFacility.id)
            .order('created_at', { ascending: false });
          setMessages(msgData || []);

          // 3. Fetch Reviews with joined profiles
          const { data: revData } = await supabase
            .from('reviews')
            .select(`
              *,
              profiles (
                full_name,
                avatar_url
              )
            `)
            .eq('business_id', userFacility.id)
            .order('created_at', { ascending: false });
          setReviews(revData || []);

          // 4. Fetch Staff from public.staff
          const { data: staffData } = await supabase
            .from('staff')
            .select('*')
            .eq('business_id', userFacility.id)
            .order('created_at', { ascending: false });
          setStaffList(staffData || []);
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // Mark message as read
  const handleMarkAsRead = async (msgId: string) => {
    try {
      await supabase.from('messages').update({ is_read: true }).eq('id', msgId);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, is_read: true } : m))
      );
    } catch (err) {
      console.error('Error updating message status:', err);
    }
  };

  // Add medical staff
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility || !staffName.trim()) return;

    setSavingStaff(true);
    try {
      const { data: newStaff, error } = await supabase
        .from('staff')
        .insert({
          business_id: facility.id,
          full_name: staffName.trim(),
          profession: staffSpecialty.trim() || staffCadre,
          county: facility.county || null,
          town: facility.town || null,
          source: 'business_registration',
          is_published: true,
        })
        .select()
        .single();

      if (error) throw error;

      if (newStaff) {
        setStaffList([newStaff, ...staffList]);
      }

      setStaffModalOpen(false);
      setStaffName('');
      setStaffSpecialty('');
      setStaffLicense('');
    } catch (err) {
      console.error('Error adding staff:', err);
    } finally {
      setSavingStaff(false);
    }
  };

  // Save facility info updates
  const handleSaveFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility) return;

    setSavingFacility(true);
    setSaveSuccess(null);
    try {
      // 1. Update businesses table phone
      await supabase
        .from('businesses')
        .update({ phone: editPhone.trim() })
        .eq('id', facility.id);

      // 2. Update healthcare_facility_details (matching live schema columns)
      const details = Array.isArray(facility.healthcare_facility_details)
        ? facility.healthcare_facility_details[0]
        : facility.healthcare_facility_details;
      if (details) {
        await supabase
          .from('healthcare_facility_details')
          .update({
            opening_hours_raw: editHours.trim(),
            emergency_services: editEmergency,
          })
          .eq('business_id', facility.id);
      }

      setSaveSuccess('Facility settings updated successfully!');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating facility:', err);
    } finally {
      setSavingFacility(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center py-24 text-gray-500 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#163B65]" />
        <p className="text-sm font-medium">Loading facility management dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* Top Header */}
      <div className="bg-[#163B65] text-white py-6 px-4 sm:px-6 lg:px-8 border-b border-[#0f2845]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider bg-white/10 text-emerald-300 px-2.5 py-0.5 rounded-full">
                Facility Portal
              </span>
              <span className="text-xs text-blue-200">
                {currentUser?.email || 'Logged in Administrator'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
              {facility?.name || 'Healthcare Facility Management'}
            </h1>
            <p className="text-blue-100/70 text-xs mt-0.5">
              {facility?.town ? `${facility.town}, ` : ''}{facility?.county || 'Liberia'} &bull; Category: {facility?.category?.name || 'Hospital/Clinic'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {facility && (
              <Link
                href={`/facility/${facility.id}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition"
              >
                <Eye className="w-4 h-4" />
                <span>View Public Profile</span>
                <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-70" />
              </Link>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Verification Status Banner */}
        {facility && (
          <div className={`p-4 rounded-2xl mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
            facility.verification_status === 'verified'
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/90 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center gap-3">
              <ShieldCheck className={`w-6 h-6 shrink-0 ${
                facility.verification_status === 'verified' ? 'text-emerald-600' : 'text-amber-600'
              }`} />
              <div>
                <h3 className="text-xs sm:text-sm font-bold">
                  Status: {facility.verification_status === 'verified' ? 'Verified Healthcare Provider' : 'Verification Under Review'}
                </h3>
                <p className="text-xs opacity-80 mt-0.5">
                  {facility.verification_status === 'verified'
                    ? 'Your facility displays the official green Minzo Verified badge in search results.'
                    : 'Our verification team is reviewing your facility accreditation credentials. Profile is currently visible.'}
                </p>
              </div>
            </div>
            <VerificationBadge status={facility.verification_status} />
          </div>
        )}

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
            <span className="text-xs text-gray-500 font-semibold block">Total Inquiries</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-[#163B65]">{messages.length}</span>
              <span className="text-xs text-emerald-600 font-bold">
                ({messages.filter((m) => !m.is_read).length} unread)
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
            <span className="text-xs text-gray-500 font-semibold block">Patient Reviews</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-[#163B65]">{reviews.length}</span>
              <span className="text-xs text-gray-400">Published</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
            <span className="text-xs text-gray-500 font-semibold block">Average Rating</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-[#163B65] flex items-center gap-1">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                {facility?.average_rating ? Number(facility.average_rating).toFixed(1) : '5.0'}
              </span>
              <span className="text-xs text-gray-400">/ 5.0</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
            <span className="text-xs text-gray-500 font-semibold block">Affiliated Staff</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-[#163B65]">{staffList.length}</span>
              <span className="text-xs text-emerald-600 font-bold">Specialists</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 mb-6 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'messages'
                ? 'bg-[#163B65] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 bg-white border border-gray-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Patient Inquiries</span>
            {messages.filter((m) => !m.is_read).length > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-black">
                {messages.filter((m) => !m.is_read).length}
              </span>
            )}
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
            <span>Community Reviews ({reviews.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'staff'
                ? 'bg-[#163B65] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 bg-white border border-gray-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Affiliated Staff ({staffList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-[#163B65] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 bg-white border border-gray-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Facility Settings</span>
          </button>
        </div>

        {/* Tab 1: Messages / Inquiries */}
        {activeTab === 'messages' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-[#163B65]">Patient Messages &amp; Direct Inquiries</h2>
              <span className="text-xs text-gray-500">{messages.length} Total Messages</span>
            </div>

            {messages.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-semibold text-gray-700">No patient inquiries yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  Inquiries submitted via your public profile page will appear here instantly.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const profile = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles;
                  const senderName = profile?.full_name || msg.sender_name || 'Patient Inquiry';
                  const senderPhone = profile?.phone || msg.sender_phone;
                  const senderEmail = msg.sender_email;
                  const messageBody = msg.message || msg.body;

                  return (
                    <div
                      key={msg.id}
                      className={`p-5 rounded-2xl border transition ${
                        msg.is_read
                          ? 'bg-gray-50/50 border-gray-100'
                          : 'bg-emerald-50/30 border-emerald-200 shadow-2xs'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900">{senderName}</span>
                          {!msg.is_read && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white">
                              NEW
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-[#163B65] mb-1">
                        Subject: {msg.subject || 'Direct Consultation Inquiry'}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed mb-4">
                        {messageBody}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100/80 text-xs">
                        <div className="flex items-center gap-4 text-gray-600">
                          {senderPhone && (
                            <a
                              href={`tel:${senderPhone}`}
                              className="inline-flex items-center gap-1.5 font-bold text-secondary hover:underline"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Call {senderPhone}</span>
                            </a>
                          )}
                          {senderEmail && (
                            <a
                              href={`mailto:${senderEmail}`}
                              className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>{senderEmail}</span>
                            </a>
                          )}
                        </div>

                        {!msg.is_read && (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(msg.id)}
                            className="px-3 py-1 bg-white border border-gray-300 hover:border-gray-400 rounded-lg text-xs font-semibold text-gray-700 cursor-pointer"
                          >
                            Mark as Read
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Reviews */}
        {activeTab === 'reviews' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-[#163B65]">Patient Reviews &amp; Feedback</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Reviews are public and impact your 24-month rolling facility score.
                </p>
              </div>
              <span className="text-xs text-gray-500">{reviews.length} Reviews</span>
            </div>

            {reviews.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Star className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-semibold text-gray-700">No reviews published yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => {
                  const profile = Array.isArray(rev.profiles) ? rev.profiles[0] : rev.profiles;
                  const authorName = rev.is_anonymous
                    ? 'Anonymous Patient'
                    : (profile?.full_name || rev.reviewer_name_display || 'Verified Patient');

                  return (
                    <div key={rev.id} className="p-5 rounded-2xl border border-gray-100 bg-[#FBFDFB] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-bold text-gray-900">
                            {authorName}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(rev.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">{rev.comment}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Staff */}
        {activeTab === 'staff' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-2xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-[#163B65]">Affiliated Healthcare Team</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Display doctors, nurses, and specialists practising at your facility.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStaffModalOpen(true)}
                className="px-4 py-2 bg-[#163B65] text-white text-xs font-bold rounded-xl hover:bg-[#112d4e] transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medical Staff</span>
              </button>
            </div>

            {staffList.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-semibold text-gray-700">No medical professionals listed</p>
                <p className="text-xs text-gray-500 mt-1">
                  Click &ldquo;Add Medical Staff&rdquo; above to showcase your facility&apos;s healthcare team.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {staffList.map((st) => (
                  <div key={st.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#163B65]/10 text-[#163B65] flex items-center justify-center font-bold text-sm shrink-0">
                      {st.full_name?.charAt(0) || 'D'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{st.full_name}</h4>
                      <p className="text-xs text-gray-500">{st.profession || st.specialty || st.cadre || 'Healthcare Professional'}</p>
                      {st.license_number && (
                        <span className="text-[10px] text-gray-400 block mt-1">
                          License: {st.license_number}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Settings */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-2xs max-w-2xl">
            <h2 className="text-base font-bold text-[#163B65] mb-1">Facility Contact &amp; Readiness Settings</h2>
            <p className="text-xs text-gray-400 mb-6">
              Update direct phone lines, operating hours, and 24/7 emergency dispatch flags.
            </p>

            {saveSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveFacility} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Public Contact Phone (Tap-to-Call) *
                </label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Operating Hours
                </label>
                <input
                  type="text"
                  value={editHours}
                  onChange={(e) => setEditHours(e.target.value)}
                  placeholder="e.g. 24/7 or Mon-Sat 8:00 AM - 8:00 PM"
                  className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] text-gray-800"
                />
              </div>

              <div className="pt-2 space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editEmergency}
                    onChange={(e) => setEditEmergency(e.target.checked)}
                    className="w-4 h-4 rounded text-[#163B65]"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-800 block">24/7 Emergency Care Available</span>
                    <span className="text-[11px] text-gray-500">Displays red emergency badge on directory listing</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editAmbulance}
                    onChange={(e) => setEditAmbulance(e.target.checked)}
                    className="w-4 h-4 rounded text-[#163B65]"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-800 block">Ambulance Service</span>
                    <span className="text-[11px] text-gray-500">Dispatches medical emergency transport</span>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={savingFacility}
                className="w-full mt-4 py-3 bg-[#163B65] hover:bg-[#112d4e] active:scale-[0.99] text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {savingFacility ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <span>Save Facility Updates</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {staffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-base font-bold text-[#163B65]">Add Healthcare Specialist</h3>
              <button
                type="button"
                onClick={() => setStaffModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Doctor / Staff Name *</label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="e.g. Dr. Arthur S. Flomo"
                  className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Cadre / Title</label>
                <select
                  value={staffCadre}
                  onChange={(e) => setStaffCadre(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] text-gray-800 cursor-pointer"
                >
                  <option value="Medical Doctor (MD)">Medical Doctor (MD)</option>
                  <option value="Surgeon">Surgeon</option>
                  <option value="Physician Assistant (PA)">Physician Assistant (PA)</option>
                  <option value="Registered Nurse (RN)">Registered Nurse (RN)</option>
                  <option value="Pharmacist">Pharmacist</option>
                  <option value="Lab Technologist">Lab Technologist</option>
                  <option value="Midwife">Midwife</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Specialty</label>
                <input
                  type="text"
                  value={staffSpecialty}
                  onChange={(e) => setStaffSpecialty(e.target.value)}
                  placeholder="e.g. Pediatrics, Cardiology, Obstetrics"
                  className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Liberia Medical License Number (Optional)
                </label>
                <input
                  type="text"
                  value={staffLicense}
                  onChange={(e) => setStaffLicense(e.target.value)}
                  placeholder="e.g. LMDC-2024-8841"
                  className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#163B65] text-gray-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setStaffModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStaff}
                  className="px-5 py-2.5 bg-[#163B65] text-white text-xs font-bold rounded-xl hover:bg-[#112d4e] transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  {savingStaff ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Add Staff Member</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
