'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Health Facilities', href: '/search' },
    { label: 'Add Business', href: '/auth/business' },
    { label: 'Write a Review', href: '/search?action=review' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#FFFFFF] border-b border-[#E5E7EB] h-[80px]">
      <div className="max-w-[1200px] mx-auto h-full px-4 sm:px-6 lg:px-12 flex items-center justify-between">
        {/* Brand Area */}
        <Link href="/" className="flex items-center gap-2.5 focus:outline-none">
          <div className="w-[42px] h-[42px] rounded-lg bg-[#163B65] flex items-center justify-center text-white font-black text-xl shadow-xs">
            M
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-[19px] tracking-tight text-[#163B65] leading-tight">
              MINZO <span className="text-[#4AB057]">AFRICA</span>
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
                    ? 'text-[#121313] font-semibold border-b-2 border-[#163B65] pb-0.5'
                    : 'text-[#121313] hover:text-[#163B65]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Account Actions - Desktop */}
        <div className="hidden md:flex items-center gap-5">
          <div className="w-[1px] h-[32px] bg-[#E4EFF8]" />
          <Link
            href="/auth/login"
            className="text-[13px] font-medium text-[#121313] hover:text-[#163B65] transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center h-[38px] px-6 bg-[#163B65] text-white text-[14px] font-semibold rounded-[12px] hover:bg-[#0f2845] transition-colors shadow-xs"
          >
            Sign Up
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden w-[44px] h-[44px] flex items-center justify-center rounded-md text-[#163B65] hover:bg-[#F3F5F7] focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FFFFFF] border-b border-[#E5E7EB] px-4 pt-3 pb-6 space-y-3 shadow-lg animate-in slide-in-from-top-2">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center h-[48px] px-3 rounded-md text-[14px] font-medium ${
                  pathname === link.href
                    ? 'bg-[#E8EEF5] text-[#163B65] font-bold'
                    : 'text-[#121313] hover:bg-[#F3F5F7]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-[#E5E7EB] flex flex-col gap-2">
            <Link
              href="/auth/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center h-[44px] rounded-md border border-[#E5E7EB] text-[14px] font-medium text-[#121313]"
            >
              Log in
            </Link>
            <Link
              href="/auth/register"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center h-[44px] rounded-[12px] bg-[#163B65] text-[14px] font-semibold text-white"
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
