'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, Bell, User, LogOut, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const pathname = usePathname();
  const router = useRouter();

  // Listen to Supabase auth state dynamically
  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (profile?.role) {
          setUserRole(profile.role);
        }
      }
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (profile?.role) {
          setUserRole(profile.role);
        }
      } else {
        setUserRole('user');
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
    router.push('/auth/login');
  };

  const navLinks = [
    { label: 'Home', href: user ? '/home' : '/' },
    { label: 'Health Facilities', href: '/search' },
    { label: 'Add Business', href: '/auth/business' },
    { label: 'Write a Review', href: '/search?action=review' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border h-20">
      <div className="max-w-300 mx-auto h-full px-4 sm:px-6 lg:px-12 flex items-center justify-between">
        {/* Brand Area */}
        <Link href={user ? '/home' : '/'} className="flex items-center gap-2.5 focus:outline-none">
          <img
            src="/favicon.ico"
            alt="Minzo Africa"
            className="w-10.5 h-10.5 rounded-lg object-contain shadow-xs"
          />
          <div className="flex flex-col">
            <span className="font-extrabold text-[19px] tracking-tight text-[#163B65] leading-tight">
              MINZO <span className="text-secondary">AFRICA</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#616161] -mt-0.5">
              Liberia Healthcare
            </span>
          </div>
        </Link>

        {/* Center Navigation Links - Desktop */}
        <nav className="hidden md:flex items-center gap-7 lg:gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`text-[14px] font-medium transition-colors ${
                  isActive
                    ? 'text-text font-semibold border-b-2 border-[#163B65] pb-0.5'
                    : 'text-text hover:text-[#163B65]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Account Actions - Desktop */}
        <div className="hidden md:flex items-center gap-5">
          {user ? (
            /* Signed-in Navigation (Figma Node 280:3495 - Frame 13) */
            <div className="flex items-center gap-3 relative">
              {/* Notification Bell Button with Red Dot */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="w-11 h-11 rounded-full bg-[#D9D9D9]/25 hover:bg-[#D9D9D9]/40 flex items-center justify-center transition-colors relative cursor-pointer text-text"
                  aria-label="View notifications"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#DC2626] rounded-full ring-2 ring-white" />
                </button>

                {/* Notifications Dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#163B65]">
                        Notifications
                      </span>
                      <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Live
                      </span>
                    </div>
                    <div className="mt-3 space-y-2.5">
                      <div className="p-2.5 bg-blue-50/50 rounded-xl text-xs text-gray-700">
                        <p className="font-semibold text-[#163B65]">Welcome to Minzo Africa!</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Discover 249+ certified facilities across Liberia.
                        </p>
                      </div>
                      <div className="p-2.5 bg-gray-50 rounded-xl text-xs text-gray-700 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-gray-800">Verified Providers</p>
                          <p className="text-[11px] text-gray-500">
                            Emergency numbers and county centroids are updated.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Avatar Button */}
              <Link
                href={userRole === 'admin' ? '/admin' : '/dashboard'}
                className="w-11 h-11 rounded-full bg-[#D9D9D9]/25 hover:bg-[#D9D9D9]/40 flex items-center justify-center transition-colors cursor-pointer text-text"
                title={user.email ? `Logged in as ${user.email}` : 'My Account'}
              >
                <User className="w-5 h-5" />
              </Link>

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={handleSignOut}
                className="w-11 h-11 rounded-full bg-[#D9D9D9]/25 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer text-text"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            /* Logged-out Navigation (Figma Node 280:3494) */
            <>
              <div className="w-px h-8 bg-[#E4EFF8]" />
              <Link
                href="/auth/login"
                className="text-[13px] font-medium text-text hover:text-[#163B65] transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center h-9.5 px-6 bg-[#163B65] text-white text-[14px] font-semibold rounded-xl hover:bg-[#0f2845] transition-colors shadow-xs"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden w-11 h-11 flex items-center justify-center rounded-md text-[#163B65] hover:bg-bg focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface border-b border-border px-4 pt-3 pb-6 space-y-3 shadow-lg animate-in slide-in-from-top-2">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center h-12 px-3 rounded-md text-[14px] font-medium ${
                  pathname === link.href
                    ? 'bg-[#E8EEF5] text-[#163B65] font-bold'
                    : 'text-text hover:bg-bg'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-border flex flex-col gap-2">
            {user ? (
              <div className="space-y-2">
                <Link
                  href={userRole === 'admin' ? '/admin' : '/dashboard'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 h-11 px-4 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-[#163B65]"
                >
                  <User className="w-4 h-4" />
                  <span>My Account ({user.email})</span>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-red-50 text-red-700 text-sm font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center h-11 rounded-md border border-border text-[14px] font-medium text-text"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center h-11 rounded-xl bg-[#163B65] text-[14px] font-semibold text-white"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
