'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Store, Search, Filter, CheckCircle2, XCircle, AlertTriangle,
  Clock, Archive, RefreshCw, ChevronLeft, ChevronRight,
  Sparkles, ExternalLink, ShieldAlert, Check, Ban, RotateCcw,
  SlidersHorizontal, MapPin, Eye, Building2, User
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
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

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
    fetchBusinesses(true);
  }, [fetchBusinesses]);

  // 1-Click Approve Action
  const handleApprove = async (biz: BusinessSummary) => {
    setActionLoading(biz.id);
    try {
      const res = await fetch(`/api/admin/businesses/${biz.id}/approve`, {
        method: 'POST',
      });
      if (res.ok) {
        setSuccessNotice(`Approved & Activated store "${biz.name}" successfully!`);
        setTimeout(() => setSuccessNotice(null), 4000);
        fetchBusinesses(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to approve business');
      }
    } catch {
      alert('Error approving business');
    } finally {
      setActionLoading(null);
    }
  };

  // Reject Action
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
        setRejectModalBiz(null);
        setRejectReason('');
        fetchBusinesses(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to reject business');
      }
    } catch {
      alert('Error rejecting business');
    } finally {
      setActionLoading(null);
    }
  };

  // Suspend Action
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
        setSuspendModalBiz(null);
        setSuspendReason('');
        fetchBusinesses(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to suspend business');
      }
    } catch {
      alert('Error suspending business');
    } finally {
      setActionLoading(null);
    }
  };

  // Reactivate Action
  const handleReactivate = async (biz: BusinessSummary) => {
    setActionLoading(biz.id);
    try {
      const res = await fetch(`/api/admin/businesses/${biz.id}/reactivate`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchBusinesses(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to reactivate business');
      }
    } catch {
      alert('Error reactivating business');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl border border-[#dadce0] shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
              <Store className="w-5 h-5" />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-[#202124]">
              Store Management
            </h1>
          </div>
          <p className="text-xs text-[#5f6368]">
            Review, approve new store setups, and manage active businesses on mobile &amp; desktop.
          </p>
        </div>

        <button
          onClick={() => fetchBusinesses(true)}
          disabled={isLoading || isFetchingBackground}
          className="self-start sm:self-auto py-2 px-3.5 rounded-xl border border-[#dadce0] hover:bg-[#f8f9fa] text-xs font-bold text-[#202124] flex items-center space-x-1.5 shadow-2xs transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#1a73e8] ${isLoading || isFetchingBackground ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Success Notification */}
      {successNotice && (
        <div className="p-3.5 rounded-xl bg-[#e6f4ea] border border-[#ceead6] text-[#137333] text-xs flex items-center space-x-2 font-bold shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Filter Tabs (Horizontal Scrollable on Mobile) */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1.5 no-scrollbar">
        {[
          { label: 'All Stores', value: 'ALL', count: counts.all },
          { label: 'Pending Setup', value: 'PENDING', count: counts.pending, highlight: true },
          { label: 'Active', value: 'ACTIVE', count: counts.active },
          { label: 'Suspended', value: 'SUSPENDED', count: counts.suspended },
          { label: 'Rejected', value: 'REJECTED', count: counts.rejected },
          { label: 'Archived', value: 'ARCHIVED', count: counts.archived },
        ].map((tab) => {
          const isSelected = activeStatus === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => {
                setActiveStatus(tab.value);
                setPage(1);
              }}
              className={`py-2 px-3 sm:px-4 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-2 flex-shrink-0 shadow-2xs ${
                isSelected
                  ? 'bg-[#1a73e8] text-white shadow-xs'
                  : tab.highlight && tab.count > 0
                  ? 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3] hover:bg-[#feefc3]'
                  : 'bg-white text-[#5f6368] border border-[#dadce0] hover:bg-[#f8f9fa] hover:text-[#202124]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                isSelected
                  ? 'bg-white/20 text-white'
                  : tab.highlight && tab.count > 0
                  ? 'bg-[#b06000] text-white'
                  : 'bg-[#f1f3f4] text-[#5f6368]'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Filter Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-[#dadce0] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-[#5f6368] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by store name, login ID, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#dadce0] text-xs outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/15"
          />
        </div>

        <div className="text-xs text-[#5f6368] font-medium self-end sm:self-center">
          Showing <span className="font-bold text-[#202124] font-mono">{businesses.length}</span> stores
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#dadce0] text-xs text-[#5f6368] flex flex-col items-center justify-center space-y-2">
          <RefreshCw className="w-5 h-5 text-[#1a73e8] animate-spin" />
          <span>Loading stores…</span>
        </div>
      ) : businesses.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#dadce0] text-xs text-[#5f6368] space-y-2">
          <Store className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="font-bold text-sm text-[#202124]">No stores found</p>
          <p className="text-xs">Try switching filters or search terms</p>
        </div>
      ) : (
        <>
          {/* ══════════ MOBILE CARDS VIEW (block md:hidden) ══════════ */}
          <div className="block md:hidden space-y-3">
            {businesses.map((biz) => {
              const isPending = biz.status === 'PENDING';
              return (
                <div
                  key={biz.id}
                  className={`p-4 rounded-2xl bg-white border shadow-xs space-y-3 transition-all ${
                    isPending ? 'border-[#fbbc04] bg-[#fffdf7]' : 'border-[#dadce0]'
                  }`}
                >
                  {/* Top Bar: Title & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <h3 className="font-bold text-sm text-[#202124] truncate">
                        {biz.name}
                      </h3>
                      <div className="flex items-center space-x-1.5 text-[11px] text-[#5f6368]">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="font-mono text-[#1a73e8] font-semibold truncate">@{biz.loginId}</span>
                      </div>
                    </div>

                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${
                      biz.status === 'ACTIVE'
                        ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]'
                        : biz.status === 'PENDING'
                        ? 'bg-[#fef7e0] text-[#b06000] border-[#feefc3] animate-pulse'
                        : biz.status === 'SUSPENDED'
                        ? 'bg-[#fce8e6] text-[#ea4335] border-[#fad2cf]'
                        : 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]'
                    }`}>
                      {biz.status}
                    </span>
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#f1f3f4] text-[#3c4043]">
                      {biz.category}
                    </span>
                    {(biz.city || biz.location) && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#f8f9fa] border border-[#dadce0] text-[#5f6368] flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{biz.city || biz.location}</span>
                      </span>
                    )}
                    {biz.hasAiProfile ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#e6f4ea] text-[#137333] border border-[#ceead6] flex items-center space-x-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>AI Ready</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#fef7e0] text-[#b06000]">
                        AI Pending
                      </span>
                    )}
                  </div>

                  {/* Mobile Actions: 1-Click Approve for PENDING stores */}
                  <div className="pt-2 border-t border-[#f1f3f4] flex items-center justify-between gap-2">
                    {isPending ? (
                      <div className="flex items-center space-x-2 w-full">
                        <button
                          onClick={() => handleApprove(biz)}
                          disabled={actionLoading === biz.id}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-[#137333] hover:bg-[#0d5924] text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all disabled:opacity-50"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>{actionLoading === biz.id ? 'Approving…' : 'Accept & Activate Store'}</span>
                        </button>

                        <button
                          onClick={() => setRejectModalBiz(biz)}
                          className="p-2.5 rounded-xl border border-[#dadce0] hover:bg-[#fce8e6] text-[#ea4335]"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <Link
                          href={`/businesses/${biz.id}`}
                          className="py-2 px-3 rounded-xl border border-[#dadce0] hover:bg-[#e8f0fe] text-xs font-bold text-[#1a73e8] flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Profile</span>
                        </Link>

                        {biz.status === 'ACTIVE' && (
                          <button
                            onClick={() => setSuspendModalBiz(biz)}
                            className="py-1.5 px-3 rounded-xl border border-[#dadce0] hover:bg-[#fce8e6] text-xs font-semibold text-[#ea4335] flex items-center space-x-1"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Suspend</span>
                          </button>
                        )}

                        {biz.status === 'SUSPENDED' && (
                          <button
                            onClick={() => handleReactivate(biz)}
                            disabled={actionLoading === biz.id}
                            className="py-1.5 px-3 rounded-xl bg-[#1a73e8] text-white text-xs font-bold flex items-center space-x-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reactivate</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ══════════ DESKTOP TABLE VIEW (hidden md:table) ══════════ */}
          <div className="hidden md:block bg-white rounded-2xl border border-[#dadce0] overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs text-[#202124]">
              <thead className="bg-[#f8f9fa] border-b border-[#dadce0] font-bold text-[#5f6368] uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Store Name &amp; ID</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">AI Profile</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f4]">
                {businesses.map((biz) => (
                  <tr key={biz.id} className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <Link href={`/businesses/${biz.id}`} className="font-bold text-[#202124] hover:text-[#1a73e8] text-xs">
                          {biz.name}
                        </Link>
                        <div className="text-[11px] font-mono text-[#5f6368]">
                          @{biz.loginId}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[#5f6368]">
                      <span className="px-2 py-0.5 rounded-md bg-[#f1f3f4] text-[#3c4043] font-medium">
                        {biz.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[#5f6368]">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{biz.city || biz.location || '-'}</span>
                      </div>
                    </td>

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
                            className="px-3 py-1.5 rounded-lg bg-[#137333] hover:bg-[#0d5924] text-white font-bold text-xs flex items-center space-x-1 shadow-2xs transition-all disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
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
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reactivate</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="p-3.5 sm:p-4 rounded-2xl border border-[#dadce0] bg-white flex items-center justify-between text-xs shadow-xs">
          <span className="text-[#5f6368]">
            Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
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

            <span className="px-2.5 py-1 rounded-lg bg-white border border-[#dadce0] font-mono font-bold">
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

      {/* Reject Modal */}
      {rejectModalBiz && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#dadce0] p-5 sm:p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 text-[#ea4335]">
              <XCircle className="w-5 h-5" />
              <h3 className="font-bold text-base">Reject Store Registration</h3>
            </div>
            <p className="text-xs text-[#5f6368]">
              Are you sure you want to reject <span className="font-bold text-[#202124]">{rejectModalBiz.name}</span>?
            </p>
            <input
              type="text"
              placeholder="Reason for rejection (optional)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[#dadce0] text-xs outline-none focus:border-[#ea4335]"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setRejectModalBiz(null)}
                className="py-1.5 px-3 rounded-lg border border-[#dadce0] text-xs font-semibold text-[#5f6368]"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === rejectModalBiz.id}
                className="py-1.5 px-4 rounded-lg bg-[#ea4335] text-white text-xs font-bold hover:bg-[#d93025] disabled:opacity-50"
              >
                Reject Store
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendModalBiz && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#dadce0] p-5 sm:p-6 max-w-md w-full space-y-4 shadow-xl">
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
