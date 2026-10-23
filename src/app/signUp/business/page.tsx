"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function BusinessSignUpRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/auth/business");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#DBEAFE] text-[#163B65] flex items-center justify-center mb-4 shadow-2xs">
          <Loader2 className="w-7 h-7 animate-spin text-[#163B65]" />
        </div>
        <h2 className="text-base font-bold text-[#163B65]">Redirecting to Facility Registration...</h2>
        <p className="text-xs text-gray-500 mt-2">Connecting you to authenticated registration</p>
      </div>
    </div>
  );
}
