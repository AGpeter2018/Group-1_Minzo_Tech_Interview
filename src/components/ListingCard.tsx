import React from 'react';
import Link from 'next/link';
import { Phone, MapPin, ArrowRight, Star } from 'lucide-react';
import { VerificationBadge } from './VerificationBadge';
import { Business } from '@/types/database';

interface ListingCardProps {
  business: Business;
  distanceKm?: number;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  business,
  distanceKm,
}) => {
  const hasReviews = business.review_count && business.review_count > 0;
  const ratingValue = business.average_rating ? Number(business.average_rating).toFixed(1) : null;

  return (
    <article className="bg-[#FFFFFF] rounded-[10px] border border-[#E5E7EB] p-4 md:p-5 lg:p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group">
      <div>
        {/* Top Header: Category & Verification Badge */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <span className="text-[11px] uppercase tracking-wider font-bold text-[#616161] bg-[#F3F5F7] px-2 py-0.5 rounded-sm">
            {business.category?.name || 'Healthcare Facility'}
          </span>
          <VerificationBadge status={business.verification_status} />
        </div>

        {/* Business Name */}
        <Link href={`/facility/${business.id}`}>
          <h3 className="text-[18px] md:text-[20px] font-bold text-[#163B65] group-hover:text-[#4AB057] transition-colors line-clamp-1 leading-snug">
            {business.name}
          </h3>
        </Link>

        {/* Location & Distance */}
        <div className="flex items-center gap-1.5 text-sm text-[#616161] mt-1.5">
          <MapPin className="w-4 h-4 text-[#757575] flex-shrink-0" />
          <span className="truncate">
            {business.town ? `${business.town}, ` : ''}{business.county || 'Liberia'}
          </span>
          {distanceKm !== undefined && (
            <span className="ml-1 font-semibold text-[#4AB057] text-xs bg-[#E8F5E9] px-2 py-0.5 rounded-full flex-shrink-0">
              {distanceKm} km away
            </span>
          )}
        </div>

        {/* Address snippet if available */}
        {business.address && (
          <p className="text-xs text-[#757575] mt-1 line-clamp-1">
            {business.address}
          </p>
        )}

        {/* Review & Rating Display */}
        <div className="flex items-center gap-2 mt-3">
          {hasReviews && ratingValue ? (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#B76E00] bg-[#FFF8E1] px-2 py-0.5 rounded border border-[#FFE082]">
                <Star className="w-3.5 h-3.5 fill-[#FFB300] text-[#FFB300]" />
                {ratingValue}
              </span>
              <span className="text-xs text-[#757575]">
                ({business.review_count} {business.review_count === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          ) : (
            <span className="text-xs text-[#9E9E9E] italic">
              No recent reviews
            </span>
          )}
        </div>
      </div>

      {/* Footer Actions: Tap-to-call & Profile link */}
      <div className="mt-5 pt-3 border-t border-[#F3F5F7] flex items-center justify-between gap-2">
        {business.phone ? (
          <a
            href={`tel:${business.phone}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#163B65] hover:text-[#4AB057] min-h-[44px] px-2 rounded-md hover:bg-[#F3F5F7] transition-colors"
            title="Call facility directly"
          >
            <Phone className="w-3.5 h-3.5 text-[#4AB057]" />
            <span className="underline">{business.phone}</span>
          </a>
        ) : (
          <span className="text-xs text-[#9E9E9E] italic">No phone listed</span>
        )}

        <Link
          href={`/facility/${business.id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#163B65] hover:text-[#4AB057] transition-colors py-2"
        >
          <span>View Profile</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </article>
  );
};
