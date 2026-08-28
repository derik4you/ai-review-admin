'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Star, CheckCircle2, Clock, RefreshCw, User, Phone, Search } from 'lucide-react';

interface FeedbackItem {
  id: string;
  businessId: string;
  business?: {
    id: string;
    name: string;
    slug: string;
  };
  rating: number;
  customerName?: string | null;
  customerContact?: string | null;
  message: string;
  status: string;
  createdAt: string;
}

interface BusinessOption {
  id: string;
  name: string;
}

function FeedbackCardSkeleton() {
  return (
    <div className="google-app-card p-5 border border-[#dadce0] rounded-2xl space-y-4 animate-pulse bg-white shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-[#f1f3f4]" />
          <div className="space-y-1">
            <div className="h-3.5 w-24 bg-[#f1f3f4] rounded" />
            <div className="h-2.5 w-16 bg-[#f1f3f4] rounded" />
          </div>
        </div>
        <div className="h-5 w-20 bg-[#f1f3f4] rounded-full" />
      </div>

      <div className="space-y-2">
        <div className="h-3 w-full bg-[#f1f3f4] rounded" />
        <div className="h-3 w-3/4 bg-[#f1f3f4] rounded" />
      </div>

      <div className="pt-3 border-t border-[#dadce0] flex items-center justify-between">
        <div className="h-3 w-28 bg-[#f1f3f4] rounded" />
        <div className="h-7 w-24 bg-[#f1f3f4] rounded-full" />
      </div>
    </div>
  );
}

export default function AdminFeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchGlobalFeedbacks = async () => {
    setIsLoading(true);
    try {
      const url = `/api/admin/feedbacks?businessId=${selectedBusinessId}&status=${selectedStatus}`;
      const res = await fetch(url, {
        cache: 'no-store',
        headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (Array.isArray(data)) setFeedbacks(data);

      if (businesses.length === 0) {
        const bRes = await fetch('/api/admin/businesses', {
          cache: 'no-store',
          headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
        });
        const bData = await bRes.json();
        if (Array.isArray(bData)) {
          setBusinesses(bData.map((b: any) => ({ id: b.id, name: b.name })));
        }
      }
    } catch (e) {
      console.error('Failed to fetch global feedbacks:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalFeedbacks();
  }, [selectedBusinessId, selectedStatus]);

  const toggleStatus = async (item: FeedbackItem) => {
    const nextStatus = item.status === 'RESOLVED' ? 'UNRESOLVED' : 'RESOLVED';
    setUpdatingId(item.id);

    try {
      const res = await fetch('/api/admin/feedbacks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackId: item.id,
          status: nextStatus,
        }),
      });

      if (res.ok) {
        setFeedbacks((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: nextStatus } : f))
        );
      }
    } catch (err) {
      console.error('Failed to toggle feedback status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const unresolvedCount = feedbacks.filter((f) => f.status === 'UNRESOLVED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="google-app-card p-6 border border-[#dadce0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-[#202124] flex items-center space-x-2">
            <MessageSquare className="w-6 h-6 text-[#ea4335]" />
            <span>Private Customer Complaints Inbox</span>
          </h2>
          <p className="text-xs text-[#5f6368] mt-1">
            Intercepted 1-3 star reviews stored privately. Currently{' '}
            <strong className="text-[#ea4335]">{unresolvedCount} unresolved issues</strong>.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchGlobalFeedbacks}
            disabled={isLoading}
            className="p-2.5 rounded-full bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#202124] border border-[#dadce0] transition-colors"
            title="Refresh Complaints"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedBusinessId}
          onChange={(e) => setSelectedBusinessId(e.target.value)}
          className="bg-white border border-[#dadce0] rounded-xl px-3 py-2 text-xs font-bold text-[#202124] focus:outline-none focus:border-[#1a73e8]"
        >
          <option value="ALL">All Stores ({businesses.length})</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setSelectedStatus('ALL')}
            className={`py-1.5 px-3 rounded-full text-xs font-bold border transition-colors ${
              selectedStatus === 'ALL'
                ? 'bg-[#1a73e8] text-white border-[#1a73e8]'
                : 'bg-white text-[#5f6368] border-[#dadce0] hover:bg-[#f1f3f4]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedStatus('UNRESOLVED')}
            className={`py-1.5 px-3 rounded-full text-xs font-bold border transition-colors ${
              selectedStatus === 'UNRESOLVED'
                ? 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]'
                : 'bg-white text-[#5f6368] border-[#dadce0] hover:bg-[#f1f3f4]'
            }`}
          >
            Unresolved
          </button>
          <button
            onClick={() => setSelectedStatus('RESOLVED')}
            className={`py-1.5 px-3 rounded-full text-xs font-bold border transition-colors ${
              selectedStatus === 'RESOLVED'
                ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]'
                : 'bg-white text-[#5f6368] border-[#dadce0] hover:bg-[#f1f3f4]'
            }`}
          >
            Resolved
          </button>
        </div>
      </div>

      {/* Feedback Feed */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeedbackCardSkeleton />
          <FeedbackCardSkeleton />
          <FeedbackCardSkeleton />
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#dadce0] rounded-2xl space-y-2 shadow-xs">
          <CheckCircle2 className="w-10 h-10 text-[#137333] mx-auto" />
          <h3 className="text-sm font-bold text-[#202124]">No private complaints found</h3>
          <p className="text-xs text-[#5f6368]">All stores have clean feedback records for this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {feedbacks.map((f) => {
            const isResolved = f.status === 'RESOLVED';
            const isUpdating = updatingId === f.id;

            return (
              <div
                key={f.id}
                className="google-app-card p-5 border border-[#dadce0] rounded-2xl flex flex-col justify-between space-y-4 bg-white shadow-xs hover:shadow-md transition-shadow relative"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#1a73e8] bg-[#e8f0fe] px-2.5 py-0.5 rounded-full border border-[#d2e3fc]">
                      {f.business?.name || 'Store'}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center space-x-1 ${
                        isResolved
                          ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]'
                          : 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]'
                      }`}
                    >
                      {isResolved ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      <span>{isResolved ? 'Resolved' : 'Pending Action'}</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < f.rating ? 'text-[#ea4335] fill-[#ea4335]' : 'text-[#dadce0]'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-bold text-[#ea4335] ml-1.5">{f.rating} / 5 Stars</span>
                  </div>

                  <p className="text-xs text-[#202124] leading-relaxed bg-[#f8f9fa] p-3 rounded-xl border border-[#dadce0] italic">
                    &quot;{f.message}&quot;
                  </p>

                  <div className="space-y-1 text-[11px] text-[#5f6368] pt-1">
                    <div className="flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-[#5f6368]" />
                      <span className="font-semibold">{f.customerName || 'Anonymous Customer'}</span>
                    </div>
                    {f.customerContact && (
                      <div className="flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#5f6368]" />
                        <span className="font-mono">{f.customerContact}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#dadce0] flex items-center justify-between text-[11px]">
                  <span className="text-[#9aa0a6]">
                    {new Date(f.createdAt).toLocaleDateString()}
                  </span>

                  <button
                    onClick={() => toggleStatus(f)}
                    disabled={isUpdating}
                    className={`px-3 py-1 rounded-full font-bold transition-colors text-xs ${
                      isResolved
                        ? 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed]'
                        : 'bg-[#137333] text-white hover:bg-[#0d5926]'
                    }`}
                  >
                    {isUpdating ? 'Updating...' : isResolved ? 'Reopen' : 'Mark Resolved'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
