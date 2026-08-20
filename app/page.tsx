'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Store, Building2, MessageSquare, Star, ShieldAlert, ArrowUpRight, CheckCircle2, Zap, RefreshCw } from 'lucide-react';

interface MetricsData {
  totalBusinesses: number;
  totalFeedbacks: number;
  unresolvedFeedbacks: number;
  totalAnalytics: number;
  googleBoosts: number;
  recentAnalytics: any[];
}

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/metrics');
      const data = await res.json();
      setMetrics(data);
    } catch (e) {
      console.error('Failed to fetch admin metrics:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className="p-12 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[#1a73e8] animate-spin mx-auto" />
        <p className="text-xs text-[#5f6368]">Loading network telemetry...</p>
      </div>
    );
  }

  const m = metrics || {
    totalBusinesses: 0,
    totalFeedbacks: 0,
    unresolvedFeedbacks: 0,
    totalAnalytics: 0,
    googleBoosts: 0,
    recentAnalytics: [],
  };

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="google-app-card p-6 border border-[#dadce0] bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-[#202124] flex items-center space-x-2">
            <span>Admin Control Center</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#e6f4ea] text-[#137333] border border-[#ceead6] font-semibold">
              Cloud Firestore Live
            </span>
          </h2>
          <p className="text-xs text-[#5f6368]">
            Master dashboard for registered stores, customer review flows, and intercepted complaints.
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          className="py-2 px-4 rounded-full bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#202124] text-xs font-semibold flex items-center space-x-2 border border-[#dadce0] transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4 text-[#1a73e8]" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Stores */}
        <div className="google-app-card p-5 border border-[#dadce0] space-y-2 bg-white shadow-xs">
          <div className="flex items-center justify-between text-[#5f6368]">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Stores</span>
            <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-[#202124] font-mono">{m.totalBusinesses}</p>
          <p className="text-[11px] text-[#5f6368]">Total onboarded business profiles</p>
        </div>

        {/* KPI 2: Total 5-Star Google Boosts */}
        <div className="google-app-card p-5 border border-[#dadce0] space-y-2 bg-white shadow-xs">
          <div className="flex items-center justify-between text-[#5f6368]">
            <span className="text-xs font-semibold uppercase tracking-wider">5-Star Google Boosts</span>
            <div className="p-2 rounded-xl bg-[#e6f4ea] text-[#137333]">
              <Star className="w-4 h-4 fill-[#137333]" />
            </div>
          </div>
          <p className="text-3xl font-black text-[#202124] font-mono">{m.googleBoosts}</p>
          <p className="text-[11px] text-[#137333]">High-rating reviews redirected to Google</p>
        </div>

        {/* KPI 3: Complaints Intercepted */}
        <div className="google-app-card p-5 border border-[#dadce0] space-y-2 bg-white shadow-xs">
          <div className="flex items-center justify-between text-[#5f6368]">
            <span className="text-xs font-semibold uppercase tracking-wider">Private Complaints</span>
            <div className="p-2 rounded-xl bg-[#fef7e0] text-[#b06000]">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-[#202124] font-mono">{m.totalFeedbacks}</p>
          <p className="text-[11px] text-[#b06000]">
            {m.unresolvedFeedbacks} unresolved issues
          </p>
        </div>

        {/* KPI 4: Total Customer Interactions */}
        <div className="google-app-card p-5 border border-[#dadce0] space-y-2 bg-white shadow-xs">
          <div className="flex items-center justify-between text-[#5f6368]">
            <span className="text-xs font-semibold uppercase tracking-wider">Customer Sessions</span>
            <div className="p-2 rounded-xl bg-[#f3e8ff] text-[#9b51e0]">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-[#202124] font-mono">
            {m.totalAnalytics || (m.googleBoosts + m.totalFeedbacks)}
          </p>
          <p className="text-[11px] text-[#5f6368]">
            Total customer review funnel sessions
          </p>
        </div>
      </div>

      {/* Navigation Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module 1: Business Manager & Cloudflare Links */}
        <Link
          href="/businesses"
          className="google-app-card p-6 border border-[#dadce0] hover:border-[#1a73e8] transition-all space-y-4 group flex flex-col justify-between bg-white shadow-xs rounded-2xl"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center text-[#1a73e8] group-hover:scale-105 transition-transform">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#202124] group-hover:text-[#1a73e8] transition-colors flex items-center justify-between">
                <span>Store Profiles &amp; Cloudflare Links</span>
                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-[#5f6368] mt-1">
                Onboard new stores, configure Target Google Maps Review URLs, and copy Cloudflare destination links in 1 click.
              </p>
            </div>
          </div>
          <div className="pt-3 border-t border-[#dadce0] flex items-center justify-between text-xs font-semibold text-[#1a73e8]">
            <span>Manage Store Profiles</span>
            <span className="font-mono">{m.totalBusinesses} Registered</span>
          </div>
        </Link>

        {/* Module 2: Private Complaints Inbox */}
        <Link
          href="/feedbacks"
          className="google-app-card p-6 border border-[#dadce0] hover:border-[#ea4335] transition-all space-y-4 group flex flex-col justify-between bg-white shadow-xs rounded-2xl"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#fce8e6] border border-[#fad2cf] flex items-center justify-center text-[#ea4335] group-hover:scale-105 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#202124] group-hover:text-[#ea4335] transition-colors flex items-center justify-between">
                <span>Private Complaints Inbox</span>
                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-[#5f6368] mt-1">
                View 1-3 star intercepted reviews, customer phone numbers, and mark complaints as resolved.
              </p>
            </div>
          </div>
          <div className="pt-3 border-t border-[#dadce0] flex items-center justify-between text-xs font-semibold text-[#ea4335]">
            <span>View Inbox</span>
            <span className="font-mono">{m.unresolvedFeedbacks} Pending</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
