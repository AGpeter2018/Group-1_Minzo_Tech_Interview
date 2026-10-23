"use client";

import Link from "next/link";
import Image from "next/image";

export default function BusinessOnboardingSuccessPage() {
  return (
    <div className="min-h-screen bg-white text-[#212934] font-sans">
      <div className="mx-auto max-w-[1024px] px-6 py-10 sm:px-10 lg:px-20">
        {/* Header Logo */}
        <div className="mb-6">
          <Link href="/" aria-label="Minzo home">
            <Image
              src="/images/minzoLogo.png"
              alt="Minzo logo"
              width={50}
              height={50}
              priority
              className="h-[50px] w-[50px] object-contain"
            />
          </Link>
        </div>

        {/* Centered Success Card matching Figma node 280:1818 */}
        <div className="flex flex-col items-center justify-center text-center pt-2 pb-16">
          {/* Success Graphic */}
          <div className="mb-8 flex items-center justify-center">
            <Image
              src="/images/business-submitted.png"
              alt="Business submitted"
              width={260}
              height={260}
              priority
              className="h-auto w-[220px] sm:w-[260px] object-contain"
            />
          </div>

          {/* Title in Figma Green #4AB057 */}
          <h1 className="text-[28px] sm:text-[32px] font-medium leading-[39px] text-[#4AB057]">
            Business submitted!
          </h1>

          {/* Description */}
          <p className="mt-3 max-w-[522px] text-[16px] sm:text-[18px] font-medium leading-[26px] text-black/60">
            Your business is awaiting admin verification, you can complete your
            dashboard while we review your submission
          </p>

          {/* Action Buttons */}
          <div className="mt-10 flex w-full max-w-[400px] flex-col gap-4">
            {/* Primary: Go to Dashboard */}
            <Link
              href="/dashboard"
              className="flex h-[44px] w-full items-center justify-center rounded-lg bg-[#4AB057] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3d9648] focus:outline-none focus:ring-2 focus:ring-[#4AB057] focus:ring-offset-2"
            >
              Go to Dashboard
            </Link>

            {/* Secondary: Home */}
            <Link
              href="/"
              className="flex h-[44px] w-full items-center justify-center rounded-lg border border-[#4AB057] px-6 text-sm font-semibold text-[#4AB057] transition hover:bg-[#4AB057]/5 focus:outline-none focus:ring-2 focus:ring-[#4AB057] focus:ring-offset-2"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

