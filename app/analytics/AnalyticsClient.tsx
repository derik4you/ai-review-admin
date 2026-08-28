'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart3, RefreshCw, TrendingUp, Users, ArrowRight,
  ExternalLink, Sparkles, AlertTriangle, CheckCircle2,
  Calendar, Layers, Filter, Search, ArrowUpRight, Zap,
  Check, Globe, Star, PieChart, Info, Shield, HelpCircle,
  Eye, Store,
} from 'lucide-react';
import type { AggregatedAnalyticsResult } from '@/lib/analyticsDb';

type DateRange = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'all';

const DATE_RANGES: { id: DateRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '90d', label: '90 Days' },
  { id: 'all', label: 'All Time' },
];

export default function AnalyticsClient() {
  const [data, setData] = useState<AggregatedAnalyticsResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [activeRange, setActiveRange] = useState<DateRange>('7d');

  // Client-Side Range Cache Map
  const rangeCacheRef = useRef<Map<string, AggregatedAnalyticsResult>>(new Map());

  // Business Performance Filter & Search
  const [bizSearch, setBizSearch] = useState<string>('');
  const [bizCategoryFilter, setBizCategoryFilter] = useState<string>('ALL');

  const fetchAnalytics = async (range: DateRange, force = false) => {
    // 1. Check client cache first
    if (!force && rangeCacheRef.current.has(range)) {
      setData(rangeCacheRef.current.get(range)!);
      setLoading(false);
      return;
    }

    if (!data) setLoading(true);
    else setIsRefreshing(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/analytics?range=${range}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.analytics);
        rangeCacheRef.current.set(range, json.analytics);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Failed to load platform analytics');
      }
    } catch {
      setError('Network error while loading analytics data.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(activeRange);
  }, [activeRange]);

  const filteredBusinesses = useMemo(() => {
    if (!data?.businesses) return [];
    let list = [...data.businesses];

    if (bizCategoryFilter !== 'ALL') {
      list = list.filter(
        (b) =>
          b.normalizedCategory === bizCategoryFilter ||
          b.category.toLowerCase() === bizCategoryFilter.toLowerCase()
      );
    }

    if (bizSearch.trim()) {
      const q = bizSearch.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.slug.toLowerCase().includes(q) ||
          (b.city && b.city.toLowerCase().includes(q))
      );
    }

    return list;
  }, [data?.businesses, bizCategoryFilter, bizSearch]);

  const overview = data?.overview;
  const funnel = data?.funnel;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#202124] flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-[#1a73e8]" />
            <span>Platform Analytics &amp; Customer Funnel</span>
          </h1>
          <p className="text-xs text-[#5f6368] mt-0.5">
            Real platform telemetries, funnel conversion rates, daily trends, and store leaderboards.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Date Range Picker */}
          <div className="flex bg-[#f1f3f4] p-0.5 rounded-xl border border-[#dadce0] overflow-x-auto text-xs font-semibold">
            {DATE_RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveRange(r.id)}
                className={`py-1 px-2.5 rounded-lg transition-all whitespace-nowrap ${
                  activeRange === r.id
                    ? 'bg-white text-[#1a73e8] shadow-xs font-bold'
                    : 'text-[#5f6368] hover:text-[#202124]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchAnalytics(activeRange, true)}
            disabled={loading || isRefreshing}
            className="p-2 rounded-xl bg-white border border-[#dadce0] hover:bg-[#f1f3f4] text-[#5f6368] transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#1a73e8] ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#fce8e6] border border-[#fad2cf] text-[#ea4335] text-xs font-semibold flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-2xl border border-[#dadce0] animate-pulse"></div>
          ))
        ) : (
          <>
            <div className="p-4 rounded-2xl border border-[#dadce0] bg-white space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Total Scans</p>
              <p className="text-2xl font-black text-[#202124]">{overview?.totalScans || 0}</p>
              <p className="text-[10px] text-[#5f6368]">{overview?.nfcScans || 0} NFC / {overview?.qrScans || 0} QR</p>
            </div>
            <div className="p-4 rounded-2xl border border-[#dadce0] bg-white space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Review Starts</p>
              <p className="text-2xl font-black text-[#9b51e0]">{overview?.reviewStarts || 0}</p>
              <p className="text-[10px] text-[#5f6368]">Flow initialized</p>
            </div>
            <div className="p-4 rounded-2xl border border-[#dadce0] bg-white space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Drafts Generated</p>
              <p className="text-2xl font-black text-[#1a73e8]">{overview?.reviewsGenerated || 0}</p>
              <p className="text-[10px] text-[#5f6368]">AI completions</p>
            </div>
            <div className="p-4 rounded-2xl border border-[#dadce0] bg-white space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Reviews Copied</p>
              <p className="text-2xl font-black text-[#e37400]">{overview?.reviewsCopied || 0}</p>
              <p className="text-[10px] text-[#5f6368]">Clipboard events</p>
            </div>
            <div className="p-4 rounded-2xl border border-[#dadce0] bg-white space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Google Redirects</p>
              <p className="text-2xl font-black text-[#137333]">{overview?.googleRedirects || 0}</p>
              <p className="text-[10px] text-[#137333]">5-star conversions</p>
            </div>
            <div className="p-4 rounded-2xl border border-[#dadce0] bg-white space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Conversion Rate</p>
              <p className="text-2xl font-black text-[#202124]">
                {funnel?.overallConversionRate !== null && funnel?.overallConversionRate !== undefined
                  ? `${funnel.overallConversionRate}%`
                  : '—'}
              </p>
              <p className="text-[10px] text-[#5f6368]">Scans to Google</p>
            </div>
          </>
        )}
      </div>

      {/* Customer Funnel Visualization */}
      <div className="p-6 rounded-2xl border border-[#dadce0] bg-white space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#202124] flex items-center space-x-2">
            <Zap className="w-4 h-4 text-[#1a73e8]" />
            <span>End-to-End Customer Conversion Funnel</span>
          </h3>
          <span className="text-xs text-[#5f6368] font-mono">{data?.rangeLabel}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#e8f0fe] border border-[#d2e3fc] space-y-1">
            <span className="text-xs font-bold text-[#1a73e8]">1. NFC / QR Scan</span>
            <p className="text-2xl font-black text-[#202124]">{funnel?.scans || 0}</p>
            <p className="text-[11px] text-[#5f6368]">Initial Tap / Scan</p>
          </div>

          <div className="p-4 rounded-xl bg-[#f3e8ff] border border-[#e9d5ff] space-y-1">
            <span className="text-xs font-bold text-[#9b51e0]">2. Review Started</span>
            <p className="text-2xl font-black text-[#202124]">{funnel?.reviewStarts || 0}</p>
            <p className="text-[11px] text-[#9b51e0]">
              {funnel?.scanToStartRate !== null ? `${funnel?.scanToStartRate}% step conversion` : '—'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#e6f4ea] border border-[#ceead6] space-y-1">
            <span className="text-xs font-bold text-[#137333]">3. Review Generated</span>
            <p className="text-2xl font-black text-[#202124]">{funnel?.reviewsGenerated || 0}</p>
            <p className="text-[11px] text-[#137333]">
              {funnel?.startToGenerateRate !== null ? `${funnel?.startToGenerateRate}% step conversion` : '—'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#e6f4ea] border border-[#ceead6] space-y-1">
            <span className="text-xs font-bold text-[#137333]">4. Google Redirect</span>
            <p className="text-2xl font-black text-[#202124]">{funnel?.googleClicks || 0}</p>
            <p className="text-[11px] text-[#137333]">
              {funnel?.copyToGoogleRate !== null ? `${funnel?.copyToGoogleRate}% click-through` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Store Leaderboard Table */}
      <div className="rounded-2xl border border-[#dadce0] bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#dadce0] flex flex-col sm:flex-row gap-3 items-center justify-between">
          <h3 className="text-sm font-bold text-[#202124] flex items-center space-x-2">
            <Store className="w-4 h-4 text-[#1a73e8]" />
            <span>Store Performance Leaderboard</span>
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#5f6368] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search stores..."
              value={bizSearch}
              onChange={(e) => setBizSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#f8f9fa] border border-[#dadce0] focus:border-[#1a73e8] text-xs outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f8f9fa] border-b border-[#dadce0] text-[11px] font-bold text-[#5f6368] uppercase tracking-wider">
                <th className="py-3 px-4">Store</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Scans</th>
                <th className="py-3 px-4 text-center">Drafts</th>
                <th className="py-3 px-4 text-center">Google Redirects</th>
                <th className="py-3 px-4 text-right">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]">
              {filteredBusinesses.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-[#202124]">
                    <Link href={`/businesses/${b.id}`} className="hover:text-[#1a73e8]">
                      {b.name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-[#5f6368]">{b.category}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold">{b.scans}</td>
                  <td className="py-3 px-4 text-center font-mono">{b.reviewsGenerated}</td>
                  <td className="py-3 px-4 text-center font-mono text-[#137333] font-bold">{b.googleClicks}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    {b.conversionRate !== null ? `${b.conversionRate}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
