'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, QrCode, Building2, MessageSquare, Star, ShieldAlert, ArrowUpRight, CheckCircle2, Zap, RefreshCw } from 'lucide-react';

interface MetricsData {
  totalBusinesses: number;
  totalStands: number;
  assignedStands: number;
  unassignedStands: number;
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
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
        <p className="text-xs text-slate-500">Loading master network metrics...</p>
      </div>
    );
  }

  const m = metrics || {
    totalBusinesses: 0,
    totalStands: 100,
    assignedStands: 0,
    unassignedStands: 100,
    totalFeedbacks: 0,
    unresolvedFeedbacks: 0,
    totalAnalytics: 0,
    googleBoosts: 0,
    recentAnalytics: [],
  };

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="google-app-card p-6 border border-[#dadce0] bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-[#202124] flex items-center space-x-2">
            <span>Admin Network Control Center</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#e6f4ea] text-[#137333] border border-[#ceead6] font-semibold">
              Firebase & Live DB Active
            </span>
          </h2>
          <p className="text-xs text-[#5f6368]">
            Real-time telemetry across all 100 physical QR stands, registered stores, and review flows.
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          className="py-2 px-4 rounded-xl bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#202124] text-xs font-semibold flex items-center space-x-2 border border-[#dadce0] transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4 text-[#1a73e8]" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Scans Across Network */}
        <div className="google-app-card p-5 border border-[#dadce0] space-y-2">
          <div className="flex items-center justify-between text-[#5f6368]">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Stand Scans</span>
            <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-[#202124] font-mono">{m.totalAnalytics}</p>
          <p className="text-[11px] text-[#5f6368]">All customer QR scans across network</p>
        </div>

        {/* KPI 2: Total 5-Star Google Boosts */}
        <div className="google-app-card p-5 border border-[#dadce0] space-y-2">
          <div className="flex items-center justify-between text-[#5f6368]">
            <span className="text-xs font-semibold uppercase tracking-wider">5★ Google Boosts</span>
            <div className="p-2 rounded-xl bg-[#e6f4ea] text-[#137333]">
              <Star className="w-4 h-4 fill-[#137333]" />
            </div>
          </div>
          <p className="text-3xl font-black text-[#202124] font-mono">{m.googleBoosts}</p>
          <p className="text-[11px] text-[#137333]">4-5 Star AI reviews redirected to Google</p>
        </div>

        {/* KPI 3: Complaints Intercepted */}
        <div className="google-app-card p-5 border border-[#dadce0] space-y-2">
          <div className="flex items-center justify-between text-[#5f6368]">
            <span className="text-xs font-semibold uppercase tracking-wider">Complaints Intercepted</span>
            <div className="p-2 rounded-xl bg-[#fef7e0] text-[#b06000]">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-[#202124] font-mono">{m.totalFeedbacks}</p>
          <p className="text-[11px] text-[#b06000]">
            {m.unresolvedFeedbacks} unresolved private notes
          </p>
        </div>

        {/* KPI 4: Stand Allocation Ratio */}
        <div className="google-app-card p-5 border border-[#dadce0] space-y-2">
          <div className="flex items-center justify-between text-[#5f6368]">
            <span className="text-xs font-semibold uppercase tracking-wider">Stand Allocation</span>
            <div className="p-2 rounded-xl bg-[#f3e8ff] text-[#9b51e0]">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-[#202124] font-mono">
            {m.assignedStands} <span className="text-sm font-normal text-[#5f6368]">/ {m.totalStands}</span>
          </p>
          <p className="text-[11px] text-[#5f6368]">
            {m.unassignedStands} physical stands ready to deploy
          </p>
        </div>
      </div>

      {/* Fast Navigation Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Module 1: Stand Inventory Mapper */}
        <Link
          href="/stands"
          className="google-app-card p-6 border border-[#dadce0] hover:border-[#9b51e0] transition-all space-y-4 group flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#f3e8ff] border border-[#e9d5ff] flex items-center justify-center text-[#9b51e0] group-hover:scale-105 transition-transform">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#202124] group-hover:text-[#9b51e0] transition-colors flex items-center justify-between">
                <span>Stand Inventory Mapper</span>
                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-[#5f6368] mt-1">
                Visual matrix of physical QR stands. Bind or unbind stands to stores in 1 click.
              </p>
            </div>
          </div>
          <div className="pt-3 border-t border-[#dadce0] flex items-center justify-between text-xs font-semibold text-[#9b51e0]">
            <span>Manage Stands</span>
            <span className="font-mono">{m.assignedStands} Active</span>
          </div>
        </Link>

        {/* Module 2: Business Manager */}
        <Link
          href="/businesses"
          className="google-app-card p-6 border border-[#dadce0] hover:border-[#1a73e8] transition-all space-y-4 group flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center text-[#1a73e8] group-hover:scale-105 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#202124] group-hover:text-[#1a73e8] transition-colors flex items-center justify-between">
                <span>Store Profiles Manager</span>
                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-[#5f6368] mt-1">
                Onboard new stores, set Google Place IDs, auto-generate slugs, and provision credentials.
              </p>
            </div>
          </div>
          <div className="pt-3 border-t border-[#dadce0] flex items-center justify-between text-xs font-semibold text-[#1a73e8]">
            <span>Onboard & Configure</span>
            <span className="font-mono">{m.totalBusinesses} Stores</span>
          </div>
        </Link>

        {/* Module 3: Global Feedback Feed */}
        <Link
          href="/feedbacks"
          className="google-app-card p-6 border border-[#dadce0] hover:border-[#ea4335] transition-all space-y-4 group flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#fce8e6] border border-[#fad2cf] flex items-center justify-center text-[#ea4335] group-hover:scale-105 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#202124] group-hover:text-[#ea4335] transition-colors flex items-center justify-between">
                <span>Global Complaints Stream</span>
                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-[#5f6368] mt-1">
                Monitor private complaints across all shops in real time to ensure owner resolution.
              </p>
            </div>
          </div>
          <div className="pt-3 border-t border-[#dadce0] flex items-center justify-between text-xs font-semibold text-[#ea4335]">
            <span>View All Complaints</span>
            <span className="font-mono">{m.unresolvedFeedbacks} Unresolved</span>
          </div>
        </Link>
      </div>

      {/* Recent Activity Stream */}
      {m.recentAnalytics && m.recentAnalytics.length > 0 && (
        <div className="google-app-card p-6 border border-[#dadce0] space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#202124] flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-[#1a73e8]" />
            <span>Recent Network Activity Stream</span>
          </h3>

          <div className="space-y-2">
            {m.recentAnalytics.map((log: any) => (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-[#f8f9fa] border border-[#dadce0] flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-[#34a853] animate-pulse" />
                  <span className="font-bold text-[#202124]">{log.business?.name || 'Store'}</span>
                  <span className="text-[#5f6368] font-mono">({log.type})</span>
                </div>
                <span className="text-[#5f6368] text-[11px]">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
