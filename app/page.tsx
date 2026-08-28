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
  Check,
  MapPin,
  User,
  Clock,
  ChevronRight,
} from 'lucide-react';

interface MetricsData {
  totalBusinesses: number;
  totalFeedbacks: number;
  unresolvedFeedbacks: number;
  totalAnalytics: number;
  googleBoosts: number;
}

interface PendingBusiness {
  id: string;
  loginId: string;
  name: string;
  category: string;
  city: string | null;
  createdAt: string;
}

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [pendingStores, setPendingStores] = useState<PendingBusiness[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvedMsg, setApprovedMsg] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [resMetrics, resBusinesses] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch('/api/admin/businesses?status=PENDING&limit=10'),
      ]);

      if (resMetrics.ok) {
        const data = await resMetrics.json();
        setMetrics(data);
      }
      if (resBusinesses.ok) {
        const data = await resBusinesses.json();
        setPendingStores(data.businesses || []);
      }
    } catch (e) {
      console.error('Failed to fetch dashboard data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleQuickApprove = async (biz: PendingBusiness) => {
    setApprovingId(biz.id);
    try {
      const res = await fetch(`/api/admin/businesses/${biz.id}/approve`, {
        method: 'POST',
      });
      if (res.ok) {
        setApprovedMsg(`Approved & Activated "${biz.name}"!`);
        setTimeout(() => setApprovedMsg(null), 3500);
        setPendingStores((prev) => prev.filter((s) => s.id !== biz.id));
        if (metrics) {
          setMetrics({ ...metrics, totalBusinesses: metrics.totalBusinesses });
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to approve store');
      }
    } catch {
      alert('Error approving store');
    } finally {
      setApprovingId(null);
    }
  };

  const m = metrics || {
    totalBusinesses: 0,
    totalFeedbacks: 0,
    unresolvedFeedbacks: 0,
    totalAnalytics: 0,
    googleBoosts: 0,
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-8">
      
      {/* Top Banner Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#dadce0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1a73e8] via-[#9333ea] to-[#ea4335] flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-[#202124]">
              AI Review System Admin Panel
            </h1>
          </div>
          <p className="text-xs text-[#5f6368]">
            Central command center for business management, AI prompts, and customer sentiment.
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={isLoading}
          className="self-start sm:self-auto py-2 px-3.5 rounded-xl border border-[#dadce0] hover:bg-[#f8f9fa] text-xs font-bold text-[#202124] flex items-center space-x-1.5 shadow-2xs transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#1a73e8] ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Success Notification */}
      {approvedMsg && (
        <div className="p-3.5 rounded-xl bg-[#e6f4ea] border border-[#ceead6] text-[#137333] text-xs flex items-center space-x-2 font-bold shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{approvedMsg}</span>
        </div>
      )}

      {/* ══════════ MOBILE 1-CLICK PENDING STORE ACCEPTANCE BANNER ══════════ */}
      {pendingStores.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#fffdf7] border-2 border-[#fbbc04] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-[#b06000]">
              <Clock className="w-4 h-4" />
              <h2 className="text-sm font-black uppercase tracking-wide">
                Pending Store Setup Requests ({pendingStores.length})
              </h2>
            </div>
            <Link
              href="/businesses?status=PENDING"
              className="text-xs font-bold text-[#1a73e8] hover:underline flex items-center space-x-0.5"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <p className="text-xs text-[#5f6368]">
            Tap <span className="font-bold text-[#137333]">Accept &amp; Activate</span> to immediately enable AI profiles and generate QR stand routes for these new stores:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {pendingStores.map((biz) => (
              <div
                key={biz.id}
                className="p-3.5 rounded-xl bg-white border border-[#fed680] flex flex-col justify-between gap-3 shadow-2xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-sm text-[#202124] truncate">
                      {biz.name}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
                      Pending
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[11px] text-[#5f6368]">
                    <span className="font-mono text-[#1a73e8] font-semibold">@{biz.loginId}</span>
                    <span>•</span>
                    <span className="font-medium text-[#3c4043]">{biz.category}</span>
                    {biz.city && (
                      <>
                        <span>•</span>
                        <span>{biz.city}</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleQuickApprove(biz)}
                  disabled={approvingId === biz.id}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#137333] hover:bg-[#0d5924] text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{approvingId === biz.id ? 'Activating Store…' : 'Accept & Activate Store'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ KPI METRICS (2X2 GRID ON MOBILE, 4-COL ON DESKTOP) ══════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Registered Stores */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[#dadce0] space-y-1.5 sm:space-y-2 bg-white shadow-xs">
          <div className="flex items-center justify-between text-[#5f6368]">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Registered Stores</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
              <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#202124] font-mono">{m.totalBusinesses}</p>
          <p className="text-[10px] sm:text-[11px] text-[#137333] font-semibold">
            Active businesses
          </p>
        </div>

        {/* KPI 2: Google Review Redirects */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[#dadce0] space-y-1.5 sm:space-y-2 bg-white shadow-xs">
          <div className="flex items-center justify-between text-[#5f6368]">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Google Redirects</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-[#e6f4ea] text-[#137333]">
              <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#202124] font-mono">{m.googleBoosts}</p>
          <p className="text-[10px] sm:text-[11px] text-[#137333] font-semibold truncate">
            Routed to Google Maps
          </p>
        </div>

        {/* KPI 3: Private Complaints Intercepted */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[#dadce0] space-y-1.5 sm:space-y-2 bg-white shadow-xs">
          <div className="flex items-center justify-between text-[#5f6368]">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Private Complaints</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-[#fce8e6] text-[#ea4335]">
              <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#202124] font-mono">{m.totalFeedbacks}</p>
          <p className="text-[10px] sm:text-[11px] text-[#ea4335] font-semibold truncate">
            {m.unresolvedFeedbacks} unresolved issues
          </p>
        </div>

        {/* KPI 4: Customer Sessions */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[#dadce0] space-y-1.5 sm:space-y-2 bg-white shadow-xs">
          <div className="flex items-center justify-between text-[#5f6368]">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Funnel Sessions</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-[#f3e8ff] text-[#9b51e0]">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#202124] font-mono">
            {m.totalAnalytics || (m.googleBoosts + m.totalFeedbacks)}
          </p>
          <p className="text-[10px] sm:text-[11px] text-[#5f6368] font-semibold truncate">
            Total interactions
          </p>
        </div>
      </div>

      {/* ══════════ NAVIGATION MODULES GRID ══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Module 1: Store Profiles & Lifecycle */}
        <Link
          href="/businesses"
          className="p-4 sm:p-5 rounded-2xl border border-[#dadce0] hover:border-[#1a73e8] transition-all space-y-3 bg-white shadow-xs group flex flex-col justify-between"
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
          className="p-4 sm:p-5 rounded-2xl border border-[#dadce0] hover:border-[#e37400] transition-all space-y-3 bg-white shadow-xs group flex flex-col justify-between"
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
          className="p-4 sm:p-5 rounded-2xl border border-[#dadce0] hover:border-[#1a73e8] transition-all space-y-3 bg-white shadow-xs group flex flex-col justify-between"
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
          className="p-4 sm:p-5 rounded-2xl border border-[#dadce0] hover:border-[#9b51e0] transition-all space-y-3 bg-white shadow-xs group flex flex-col justify-between"
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
              Master AI switches, anti-cliché blacklist, review length rules, and prompt versioning with rollback.
            </p>
          </div>
          <div className="pt-3 border-t border-[#f1f3f4] text-xs font-semibold text-[#9b51e0]">
            <span>Manage AI Engine &rarr;</span>
          </div>
        </Link>

        {/* Module 5: Customer Complaints */}
        <Link
          href="/feedbacks"
          className="p-4 sm:p-5 rounded-2xl border border-[#dadce0] hover:border-[#ea4335] transition-all space-y-3 bg-white shadow-xs group flex flex-col justify-between"
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
