/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { Filter, ChevronDown } from 'lucide-react';

interface AuctionFiltersProps {
  filters: {
    category: string;
    productType: string;
    status: string;
    sortBy: string;
  };
  onChange: (filters: any) => void;
}

export function AuctionFilters({ filters, onChange }: AuctionFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const productTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'nft', label: 'NFTs' },
    { value: 'physical', label: 'Physical Goods' },
    { value: 'digital', label: 'Digital Products' },
    { value: 'service', label: 'Services' },
  ];

  const statuses = [
    { value: 'active', label: 'Active' },
    { value: 'revealing', label: 'Revealing' },
    { value: 'settled', label: 'Settled' },
    { value: 'all', label: 'All Statuses' },
  ];

  const sortOptions = [
    { value: 'ending-soon', label: 'Ending Soon' },
    { value: 'newest', label: 'Newest First' },
    { value: 'most-bids', label: 'Most Bids' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary w-full sm:w-auto"
      >
        <Filter className="w-4 h-4" />
        Filters
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 sm:left-auto sm:right-auto sm:w-96 bg-background-secondary border border-white/10 rounded-xl shadow-2xl z-50 p-6 space-y-4">
          {/* Product Type */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Product Type
            </label>
            <select
              value={filters.productType}
              onChange={(e) => onChange({ ...filters, productType: e.target.value })}
              className="w-full bg-background-tertiary border border-white/10 rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {productTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => onChange({ ...filters, status: e.target.value })}
              className="w-full bg-background-tertiary border border-white/10 rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => onChange({ ...filters, sortBy: e.target.value })}
              className="w-full bg-background-tertiary border border-white/10 rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                onChange({
                  category: 'all',
                  productType: 'all',
                  status: 'active',
                  sortBy: 'ending-soon',
                });
                setIsOpen(false);
              }}
              className="btn-ghost flex-1"
            >
              Reset
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="btn-primary flex-1"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
