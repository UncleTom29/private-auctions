/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useWallet } from '@/app/lib/privy/wallet-context';
import { AuctionCard } from '@/app/components/auction/AuctionCard';
import { Plus, TrendingUp, Package, Clock, Award } from 'lucide-react';

type TabType = 'active-bids' | 'won' | 'created' | 'past';

export default function DashboardPage() {
  const { publicKey, balance } = useWallet();
  const [activeTab, setActiveTab] = useState<TabType>('active-bids');

  const { data: stats } = useQuery({
    queryKey: ['user-stats', publicKey?.toBase58()],
    queryFn: async () => {
      const response = await fetch('/api/users/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: !!publicKey,
  });

  const { data: auctions, isLoading } = useQuery({
    queryKey: ['user-auctions', activeTab, publicKey?.toBase58()],
    queryFn: async () => {
      const response = await fetch(`/api/auctions/user?type=${activeTab}`);
      if (!response.ok) throw new Error('Failed to fetch auctions');
      return response.json();
    },
    enabled: !!publicKey,
  });

  const tabs = [
    { id: 'active-bids' as TabType, label: 'Active Bids', icon: Clock },
    { id: 'won' as TabType, label: 'Won', icon: Award },
    { id: 'created' as TabType, label: 'My Auctions', icon: Package },
    { id: 'past' as TabType, label: 'Past Activity', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background-primary pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold gradient-text mb-6">Dashboard</h1>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card">
              <div className="text-sm text-text-muted mb-2">Wallet Balance</div>
              <div className="text-3xl font-bold text-text-primary">
                {balance !== null ? `${balance.toFixed(4)} SOL` : '---'}
              </div>
            </div>

            <div className="card">
              <div className="text-sm text-text-muted mb-2">Active Bids</div>
              <div className="text-3xl font-bold text-primary-400">
                {stats?.activeBids || 0}
              </div>
            </div>

            <div className="card">
              <div className="text-sm text-text-muted mb-2">Auctions Won</div>
              <div className="text-3xl font-bold text-accent-cyan">
                {stats?.auctionsWon || 0}
              </div>
            </div>

            <div className="card">
              <div className="text-sm text-text-muted mb-2">Reputation Score</div>
              <div className="text-3xl font-bold text-status-success">
                {stats?.reputationScore || 500}/1000
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 flex gap-4">
          <Link
            href="/create"
            className="btn-primary px-6 py-3"
          >
            <Plus className="w-5 h-5" />
            Create Auction
          </Link>

          <Link
            href="/marketplace"
            className="btn-secondary px-6 py-3"
          >
            Browse Marketplace
          </Link>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-2 overflow-x-auto scrollbar-hide border-b border-white/10">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`tab ${activeTab === id ? 'tab-active' : ''}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-96 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && auctions && auctions.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-background-tertiary flex items-center justify-center">
              {activeTab === 'active-bids' && <Clock className="w-12 h-12 text-text-muted" />}
              {activeTab === 'won' && <Award className="w-12 h-12 text-text-muted" />}
              {activeTab === 'created' && <Package className="w-12 h-12 text-text-muted" />}
              {activeTab === 'past' && <TrendingUp className="w-12 h-12 text-text-muted" />}
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-2">
              {activeTab === 'active-bids' && 'No Active Bids'}
              {activeTab === 'won' && 'No Won Auctions'}
              {activeTab === 'created' && 'No Created Auctions'}
              {activeTab === 'past' && 'No Past Activity'}
            </h3>
            <p className="text-text-secondary mb-6">
              {activeTab === 'active-bids' && 'Browse the marketplace to place your first bid'}
              {activeTab === 'won' && 'Win your first auction to see it here'}
              {activeTab === 'created' && 'Create your first auction to get started'}
              {activeTab === 'past' && 'Your past activity will appear here'}
            </p>
            {activeTab === 'created' && (
              <Link href="/create" className="btn-primary inline-flex">
                <Plus className="w-5 h-5" />
                Create Auction
              </Link>
            )}
          </div>
        )}

        {!isLoading && auctions && auctions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((auction: any) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
