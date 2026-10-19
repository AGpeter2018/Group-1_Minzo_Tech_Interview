import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#FFFFFF] border-t border-[#E5E7EB] mt-auto">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <img
                src="/favicon.ico"
                alt="Minzo Africa"
                className="w-8 h-8 rounded-lg object-contain shadow-xs"
              />
              <span className="font-extrabold text-lg text-[#163B65] tracking-tight">
                MINZO <span className="text-[#4AB057]">AFRICA</span>
              </span>
            </div>
            <p className="text-sm text-[#616161] max-w-sm leading-relaxed">
              Liberia&apos;s verified healthcare directory and public reviews platform. Connecting citizens with certified hospitals, clinics, and pharmacies across all 15 counties.
            </p>
            <p className="text-xs text-[#9E9E9E]">
              Monrovia, Republic of Liberia • Serving Liberians First
            </p>
          </div>

          {/* Directory Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#163B65]">
              Healthcare Services
            </h4>
            <ul className="space-y-1.5 text-sm text-[#616161]">
              <li>
                <Link href="/search?category=Hospital" className="hover:text-[#163B65]">
                  Hospitals in Liberia
                </Link>
              </li>
              <li>
                <Link href="/search?category=Clinic" className="hover:text-[#163B65]">
                  Outpatient Clinics
                </Link>
              </li>
              <li>
                <Link href="/search?category=Pharmacy" className="hover:text-[#163B65]">
                  Pharmacies & Chemists
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-[#163B65]">
                  All 15 Counties
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Access */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#163B65]">
              Portals
            </h4>
            <ul className="space-y-1.5 text-sm text-[#616161]">
              <li>
                <Link href="/auth/business" className="hover:text-[#163B65]">
                  Register Your Facility
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#163B65]">
                  Business Dashboard
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-[#163B65]">
                  Admin Console
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-[#163B65]">
                  Public User Login
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-between text-xs text-[#9E9E9E] gap-2">
          <span>
            © {new Date().getFullYear()} Minzo Africa. All rights reserved.
          </span>
          <span className="text-[11px] text-[#757575]">
            Built for Liberia Healthcare Directory & Reviews MVP
          </span>
        </div>
      </div>
    </footer>
  );
};
