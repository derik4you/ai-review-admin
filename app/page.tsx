'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Store,
  Tags,
  BarChart3,
  Sliders,
  MessageSquare,
  Star,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

interface MetricsData {
  totalBusinesses: number;
  totalFeedbacks: number;
  unresolvedFeedbacks: number;
  totalAnalytics: number;
  googleBoosts: number;
}

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.error('Failed to fetch admin metrics:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const m = metrics || {
    totalBusinesses: 0,
    totalFeedbacks: 0,
    unresolvedFeedbacks: 0,
    totalAnalytics: 0,
    googleBoosts: 0,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hero Welcome Banner */}
      <div className="p-6 rounded-2xl border border-[#dadce0] bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-[#1a73e8]" />
            <h1 className="text-xl font-black text-[#202124]">
              AI Review System Admin Panel
            </h1>
          </div>
          <p className="text-xs text-[#5f6368]">
            Central command center for business management, category intelligence, analytics funnel, AI review behavior, and customer feedback.
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          disabled={isLoading}
          className="py-2 px-4 rounded-xl bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#202124] text-xs font-semibold flex items-center space-x-2 border border-[#dadce0] transition-colors self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-[#1a73e8] ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* KPI 1: Active Stores */}
        <div className="p-5 rounded-2xl border border-[#dadce0] space-y-2 bg-white shadow-xs">
          <div className="flex items-center justify-between text-[#5f6368]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Registered Stores</span>
            <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#202124] font-mono">{m.totalBusinesses}</p>
          <p className="text-[11px] text-[#5f6368]">Active onboarded businesses</p>
        </div>

        {/* KPI 2: Google Review Boosts */}
        <div className="p-5 rounded-2xl border border-[#dadce0] space-y-2 bg-white shadow-xs">
          <div className="flex items-center justify-between text-[#5f6368]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Google Review Redirects</span>
            <div className="p-2 rounded-xl bg-[#e6f4ea] text-[#137333]">
              <Star className="w-4 h-4 fill-[#137333]" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#202124] font-mono">{m.googleBoosts}</p>
          <p className="text-[11px] text-[#137333]">Happy customers routed to Google Maps</p>
        </div>

        {/* KPI 3: Private Complaints Intercepted */}
        <div className="p-5 rounded-2xl border border-[#dadce0] space-y-2 bg-white shadow-xs">
          <div className="flex items-center justify-between text-[#5f6368]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Private Complaints</span>
            <div className="p-2 rounded-xl bg-[#fce8e6] text-[#ea4335]">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#202124] font-mono">{m.totalFeedbacks}</p>
          <p className="text-[11px] text-[#ea4335]">
            {m.unresolvedFeedbacks} unresolved issues
          </p>
        </div>

        {/* KPI 4: Customer Sessions */}
        <div className="p-5 rounded-2xl border border-[#dadce0] space-y-2 bg-white shadow-xs">
          <div className="flex items-center justify-between text-[#5f6368]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Review Funnel Sessions</span>
            <div className="p-2 rounded-xl bg-[#f3e8ff] text-[#9b51e0]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#202124] font-mono">
            {m.totalAnalytics || (m.googleBoosts + m.totalFeedbacks)}
          </p>
          <p className="text-[11px] text-[#5f6368]">
            Total customer interactions
          </p>
        </div>
      </div>

      {/* Navigation Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Module 1: Store Profiles & Lifecycle */}
        <Link
          href="/businesses"
          className="p-5 rounded-2xl border border-[#dadce0] hover:border-[#1a73e8] transition-all space-y-3 bg-white shadow-xs group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center text-[#1a73e8] group-hover:scale-105 transition-transform">
              <Store className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#202124] group-hover:text-[#1a73e8] flex items-center justify-between">
              <span>Store Management</span>
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-[#5f6368]">
              Review pending stores, approve registrations, manage AI profiles, and edit Google Review URLs.
            </p>
          </div>
          <div className="pt-3 border-t border-[#f1f3f4] text-xs font-semibold text-[#1a73e8] flex items-center justify-between">
            <span>Manage Stores</span>
            <span className="font-mono text-[#5f6368]">{m.totalBusinesses} Total</span>
          </div>
        </Link>

        {/* Module 2: Category Intelligence */}
        <Link
          href="/categories"
          className="p-5 rounded-2xl border border-[#dadce0] hover:border-[#e37400] transition-all space-y-3 bg-white shadow-xs group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#fef7e0] border border-[#feefc3] flex items-center justify-center text-[#e37400] group-hover:scale-105 transition-transform">
              <Tags className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#202124] group-hover:text-[#e37400] flex items-center justify-between">
              <span>Category Intelligence</span>
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-[#5f6368]">
              Manage 12 business verticals, core vocabularies, dynamic tags, and industry entity terms.
            </p>
          </div>
          <div className="pt-3 border-t border-[#f1f3f4] text-xs font-semibold text-[#e37400]">
            <span>Configure Taxonomies &rarr;</span>
          </div>
        </Link>

        {/* Module 3: Platform Analytics */}
        <Link
          href="/analytics"
          className="p-5 rounded-2xl border border-[#dadce0] hover:border-[#1a73e8] transition-all space-y-3 bg-white shadow-xs group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center text-[#1a73e8] group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#202124] group-hover:text-[#1a73e8] flex items-center justify-between">
              <span>Platform Analytics &amp; Funnel</span>
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-[#5f6368]">
              End-to-end customer funnel (Scans &rarr; Starts &rarr; Drafts &rarr; Google Clicks) and store benchmarks.
            </p>
          </div>
          <div className="pt-3 border-t border-[#f1f3f4] text-xs font-semibold text-[#1a73e8]">
            <span>View Funnel Analytics &rarr;</span>
          </div>
        </Link>

        {/* Module 4: AI Control Center */}
        <Link
          href="/ai-control"
          className="p-5 rounded-2xl border border-[#dadce0] hover:border-[#9b51e0] transition-all space-y-3 bg-white shadow-xs group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#f3e8ff] border border-[#e9d5ff] flex items-center justify-center text-[#9b51e0] group-hover:scale-105 transition-transform">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#202124] group-hover:text-[#9b51e0] flex items-center justify-between">
              <span>AI Control &amp; Prompt Versions</span>
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-[#5f6368]">
              Master AI switches, anti-clich&eacute; blacklist, review length rules, and prompt versioning with rollback.
            </p>
          </div>
          <div className="pt-3 border-t border-[#f1f3f4] text-xs font-semibold text-[#9b51e0]">
            <span>Manage AI Engine &rarr;</span>
          </div>
        </Link>

        {/* Module 5: Customer Complaints */}
        <Link
          href="/feedbacks"
          className="p-5 rounded-2xl border border-[#dadce0] hover:border-[#ea4335] transition-all space-y-3 bg-white shadow-xs group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#fce8e6] border border-[#fad2cf] flex items-center justify-center text-[#ea4335] group-hover:scale-105 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#202124] group-hover:text-[#ea4335] flex items-center justify-between">
              <span>Customer Complaints Inbox</span>
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-[#5f6368]">
              Intercepted 1-3 star negative customer feedback, contact details, and resolution workflow.
            </p>
          </div>
          <div className="pt-3 border-t border-[#f1f3f4] text-xs font-semibold text-[#ea4335] flex items-center justify-between">
            <span>View Inbox</span>
            <span className="font-mono">{m.unresolvedFeedbacks} Unresolved</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
