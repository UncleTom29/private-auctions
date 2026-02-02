'use client';

// AuctionSkeleton Component
export function AuctionSkeleton() {
  return (
    <div className="auction-card animate-pulse">
      <div className="aspect-auction skeleton rounded-t-2xl" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-6 w-3/4 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-5/6 rounded" />
        <div className="flex gap-4">
          <div className="skeleton h-4 w-20 rounded" />
          <div className="skeleton h-4 w-20 rounded" />
        </div>
        <div className="skeleton h-16 w-full rounded-lg" />
      </div>
    </div>
  );
}