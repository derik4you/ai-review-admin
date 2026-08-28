'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Store, Search, Filter, CheckCircle2, XCircle, AlertTriangle,
  Clock, Archive, RefreshCw, ChevronLeft, ChevronRight,
  Sparkles, ExternalLink, ShieldAlert, Check, Ban, RotateCcw,
  SlidersHorizontal, MapPin, Eye,
} from 'lucide-react';

interface BusinessSummary {
  id: string;
  loginId: string;
  name: string;
  slug: string;
  category: string;
  city: string | null;
  location: string | null;
  googleReviewUrl: string;
  reviewTagsCount: number;
  hasAiProfile: boolean;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED' | 'ARCHIVED';
  customerFlowEnabled: boolean;
  adminNotes: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  suspendedReason: string | null;
  createdAt: string;
}

interface StatusCounts {
  all: number;
  pending: number;
  active: number;
  suspended: number;
  rejected: number;
  archived: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function BusinessListClient() {
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [counts, setCounts] = useState<StatusCounts>({ all: 0, pending: 0, active: 0, suspended: 0, rejected: 0, archived: 0 });
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 25, total: 0, totalPages: 1, hasMore: false });
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetchingBackground, setIsFetchingBackground] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeStatus, setActiveStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);

  // Modals
  const [rejectModalBiz, setRejectModalBiz] = useState<BusinessSummary | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [suspendModalBiz, setSuspendModalBiz] = useState<BusinessSummary | null>(null);
  const [suspendReason, setSuspendReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // AbortController ref for race condition cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchBusinesses = useCallback(async (isInitial = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsFetchingBackground(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      if (activeStatus !== 'ALL') params.set('status', activeStatus);
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);
      params.set('page', page.toString());
      params.set('limit', '25');

      const res = await fetch(`/api/admin/businesses?${params.toString()}`, {
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error('Failed to fetch businesses');
      }

      const data = await res.json();
      setBusinesses(data.businesses || []);
      if (data.counts) setCounts(data.counts);
      if (data.pagination) setPagination(data.pagination);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Error loading businesses');
      }
    } finally {
      setIsLoading(false);
      setIsFetchingBackground(false);
    }
  }, [activeStatus, categoryFilter, debouncedSearch, page]);

  useEffect(() => {
    fetchBusinesses(businesses.length === 0);
  }, [fetchBusinesses]);

  // Actions
  const handleApprove = async (biz: BusinessSummary) => {
    setActionLoading(biz.id);
    try {
      const res = await fetch(`/api/admin/businesses/${biz.id}/approve`, { method: 'POST' });
      if (res.ok) {
        // Optimistic UI update
        setBusinesses(prev => prev.map(b => b.id === biz.id ? { ...b, status: 'ACTIVE' } : b));
        setCounts(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1), active: prev.active + 1 }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModalBiz) return;
    setActionLoading(rejectModalBiz.id);
    try {
      const res = await fetch(`/api/admin/businesses/${rejectModalBiz.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) {
        setBusinesses(prev => prev.map(b => b.id === rejectModalBiz.id ? { ...b, status: 'REJECTED', rejectedReason: rejectReason } : b));
        setRejectModalBiz(null);
        setRejectReason('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async () => {
    if (!suspendModalBiz) return;
    setActionLoading(suspendModalBiz.id);
    try {
      const res = await fetch(`/api/admin/businesses/${suspendModalBiz.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: suspendReason }),
      });
      if (res.ok) {
        setBusinesses(prev => prev.map(b => b.id === suspendModalBiz.id ? { ...b, status: 'SUSPENDED', suspendedReason: suspendReason } : b));
        setSuspendModalBiz(null);
        setSuspendReason('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (biz: BusinessSummary) => {
    setActionLoading(biz.id);
    try {
      const res = await fetch(`/api/admin/businesses/${biz.id}/reactivate`, { method: 'POST' });
      if (res.ok) {
        setBusinesses(prev => prev.map(b => b.id === biz.id ? { ...b, status: 'ACTIVE' } : b));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const tabs = [
    { id: 'ALL', label: 'All Stores', count: counts.all },
    { id: 'PENDING', label: 'Pending Review', count: counts.pending, color: 'text-[#e37400]' },
    { id: 'ACTIVE', label: 'Active', count: counts.active, color: 'text-[#137333]' },
    { id: 'SUSPENDED', label: 'Suspended', count: counts.suspended, color: 'text-[#ea4335]' },
    { id: 'REJECTED', label: 'Rejected', count: counts.rejected, color: 'text-[#5f6368]' },
    { id: 'ARCHIVED', label: 'Archived', count: counts.archived, color: 'text-[#5f6368]' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#202124] flex items-center space-x-2">
            <Store className="w-5 h-5 text-[#1a73e8]" />
            <span>Store Management</span>
          </h1>
          <p className="text-xs text-[#5f6368] mt-0.5">
            Monitor onboarded businesses, approve pending registrations, manage AI profiles, and edit Google Review URLs.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchBusinesses()}
            disabled={isLoading || isFetchingBackground}
            className="py-1.5 px-3 rounded-xl bg-white border border-[#dadce0] hover:bg-[#f1f3f4] text-xs font-semibold text-[#202124] flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#1a73e8] ${isFetchingBackground ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-[#dadce0] overflow-x-auto pb-px">
        {tabs.map((t) => {
          const isActive = activeStatus === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setActiveStatus(t.id); setPage(1); }}
              className={`py-2.5 px-4 text-xs font-bold whitespace-nowrap transition-all border-b-2 flex items-center space-x-2 ${
                isActive
                  ? 'border-[#1a73e8] text-[#1a73e8] bg-[#e8f0fe]/40 rounded-t-lg'
                  : 'border-transparent text-[#5f6368] hover:text-[#202124] hover:bg-slate-50 rounded-t-lg'
              }`}
            >
              <span>{t.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isActive ? 'bg-[#1a73e8] text-white' : 'bg-[#f1f3f4] text-[#5f6368]'
              }`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters & Search */}
      <div className="p-4 rounded-2xl border border-[#dadce0] bg-white flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#5f6368] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search stores, city, login ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#f8f9fa] border border-[#dadce0] focus:border-[#1a73e8] focus:bg-white text-xs outline-none transition-all"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end text-xs text-[#5f6368]">
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <span className="font-mono font-bold text-[#202124]">({pagination.total} Total Stores)</span>
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-2xl border border-[#dadce0] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f8f9fa] border-b border-[#dadce0] text-[11px] font-bold text-[#5f6368] uppercase tracking-wider">
                <th className="py-3 px-4">Store Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">AI Profile</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]">
              {isLoading ? (
                // Skeletons
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 w-36 bg-slate-200 rounded-md"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-24 bg-slate-200 rounded-md"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-20 bg-slate-200 rounded-md"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-16 bg-slate-200 rounded-md"></div></td>
                    <td className="py-4 px-4"><div className="h-5 w-20 bg-slate-200 rounded-full"></div></td>
                    <td className="py-4 px-4 text-right"><div className="h-7 w-24 bg-slate-200 rounded-lg ml-auto"></div></td>
                  </tr>
                ))
              ) : businesses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#5f6368]">
                    <Store className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold">No businesses match the selected filters.</p>
                  </td>
                </tr>
              ) : (
                businesses.map((biz) => {
                  return (
                    <tr key={biz.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <Link href={`/businesses/${biz.id}`} className="font-bold text-[#202124] hover:text-[#1a73e8] flex items-center space-x-1.5">
                          <span>{biz.name}</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </Link>
                        <p className="text-[10px] text-[#5f6368] font-mono">ID: {biz.loginId || biz.slug}</p>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-[#5f6368]">
                        <span className="px-2 py-0.5 rounded-md bg-[#f1f3f4] text-[#202124] font-medium text-[11px]">
                          {biz.category}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 text-[#5f6368]">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{biz.city || biz.location || '—'}</span>
                        </div>
                      </td>

                      {/* AI Profile */}
                      <td className="py-3.5 px-4">
                        {biz.hasAiProfile ? (
                          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-[#137333] bg-[#e6f4ea] px-2 py-0.5 rounded-full border border-[#ceead6]">
                            <Sparkles className="w-3 h-3 text-[#137333]" />
                            <span>Configured</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-[#b06000] bg-[#fef7e0] px-2 py-0.5 rounded-full border border-[#feefc3]">
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          biz.status === 'ACTIVE'
                            ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]'
                            : biz.status === 'PENDING'
                            ? 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]'
                            : biz.status === 'SUSPENDED'
                            ? 'bg-[#fce8e6] text-[#ea4335] border-[#fad2cf]'
                            : 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]'
                        }`}>
                          {biz.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/businesses/${biz.id}`}
                            className="p-1.5 rounded-lg border border-[#dadce0] hover:bg-[#e8f0fe] hover:border-[#1a73e8] text-[#1a73e8] transition-colors"
                            title="View Business Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          {biz.status === 'PENDING' && (
                            <button
                              onClick={() => handleApprove(biz)}
                              disabled={actionLoading === biz.id}
                              className="px-2.5 py-1 rounded-lg bg-[#137333] hover:bg-[#0d5924] text-white font-bold text-[11px] flex items-center space-x-1 disabled:opacity-50"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                          )}

                          {biz.status === 'ACTIVE' && (
                            <button
                              onClick={() => setSuspendModalBiz(biz)}
                              className="p-1.5 rounded-lg border border-[#dadce0] hover:bg-[#fce8e6] hover:border-[#ea4335] text-[#ea4335] transition-colors"
                              title="Suspend Business"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {biz.status === 'SUSPENDED' && (
                            <button
                              onClick={() => handleReactivate(biz)}
                              disabled={actionLoading === biz.id}
                              className="px-2.5 py-1 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold text-[11px] flex items-center space-x-1 disabled:opacity-50"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reactivate</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-[#dadce0] bg-[#f8f9fa] flex items-center justify-between text-xs">
            <span className="text-[#5f6368]">
              Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </span>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="py-1 px-2.5 rounded-lg border border-[#dadce0] bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center space-x-1 font-semibold text-[#202124]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span className="px-3 py-1 rounded-lg bg-white border border-[#dadce0] font-mono font-bold">
                {page} / {pagination.totalPages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages || isLoading}
                className="py-1 px-2.5 rounded-lg border border-[#dadce0] bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center space-x-1 font-semibold text-[#202124]"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Suspend Modal */}
      {suspendModalBiz && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#dadce0] p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 text-[#ea4335]">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-bold text-base">Suspend Business Access</h3>
            </div>
            <p className="text-xs text-[#5f6368]">
              Are you sure you want to suspend <span className="font-bold text-[#202124]">{suspendModalBiz.name}</span>? Customers will see a maintenance notice.
            </p>
            <input
              type="text"
              placeholder="Reason for suspension..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[#dadce0] text-xs outline-none focus:border-[#ea4335]"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setSuspendModalBiz(null)}
                className="py-1.5 px-3 rounded-lg border border-[#dadce0] text-xs font-semibold text-[#5f6368]"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={actionLoading === suspendModalBiz.id}
                className="py-1.5 px-4 rounded-lg bg-[#ea4335] text-white text-xs font-bold hover:bg-[#d93025] disabled:opacity-50"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
