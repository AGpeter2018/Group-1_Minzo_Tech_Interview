import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface VerificationBadgeProps {
  status: 'verified' | 'unverified' | 'pending' | 'rejected' | string;
  size?: 'sm' | 'md';
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const isVerified = status === 'verified';

  if (isVerified) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-full border transition-all ${
          size === 'sm'
            ? 'px-2 py-0.5 text-[11px] h-5.5'
            : 'px-2.5 py-0.5 text-xs h-6 desktop:h-[26px]'
        } bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#2E7D32]" />
        <span>Verified</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full border transition-all ${
        size === 'sm'
          ? 'px-2 py-0.5 text-[11px] h-5.5'
          : 'px-2.5 py-0.5 text-xs h-6 desktop:h-[26px]'
      } bg-[#F5F5F5] text-[#616161] border-[#E0E0E0]`}
    >
      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#757575]" />
      <span>{status === 'pending' ? 'Pending' : 'Unverified'}</span>
    </span>
  );
};
