'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Star, CheckCircle2, Clock, RefreshCw, User, Phone } from 'lucide-react';

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
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) setFeedbacks(data);

      if (businesses.length === 0) {
        const bRes = await fetch('/api/admin/businesses');
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
        await fetchGlobalFeedbacks();
      }
    } catch (e) {
      console.error('Failed to toggle status:', e);
    } finally {
      setUpdatingId(null);
    }
  };

  const unresolvedCount = feedbacks.filter((f) => f.status === 'UNRESOLVED').length;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="google-app-card p-6 border border-[#dadce0] space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#dadce0] pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-[#202124] flex items-center space-x-2">
              <MessageSquare className="w-6 h-6 text-[#ea4335]" />
              <span>Global Complaints Feed</span>
            </h2>
            <p className="text-xs text-[#5f6368] mt-1">
              Live network stream of all 1–3 star private customer complaints across ALL onboarded stores.
            </p>
          </div>

          <button
            onClick={fetchGlobalFeedbacks}
            className="p-2.5 rounded-full bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#202124] border border-[#dadce0]"
            title="Refresh Feed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs text-[#5f6368] font-semibold whitespace-nowrap">Filter Store:</span>
            <select
              value={selectedBusinessId}
              onChange={(e) => setSelectedBusinessId(e.target.value)}
              className="bg-[#f8f9fa] border border-[#dadce0] text-xs text-[#1a73e8] font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#1a73e8]"
            >
              <option value="ALL">🏢 All Stores Network-wide</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={() => setSelectedStatus('ALL')}
              className={`py-1.5 px-3 rounded-full text-xs font-semibold border ${
                selectedStatus === 'ALL'
                  ? 'bg-[#fce8e6] border-[#fad2cf] text-[#ea4335]'
                  : 'bg-[#f8f9fa] border-[#dadce0] text-[#5f6368]'
              }`}
            >
              All Complaints ({feedbacks.length})
            </button>
            <button
              onClick={() => setSelectedStatus('UNRESOLVED')}
              className={`py-1.5 px-3 rounded-full text-xs font-semibold border ${
                selectedStatus === 'UNRESOLVED'
                  ? 'bg-[#fce8e6] border-[#fad2cf] text-[#c5221f]'
                  : 'bg-[#f8f9fa] border-[#dadce0] text-[#5f6368]'
              }`}
            >
              Unresolved ({unresolvedCount})
            </button>
            <button
              onClick={() => setSelectedStatus('RESOLVED')}
              className={`py-1.5 px-3 rounded-full text-xs font-semibold border ${
                selectedStatus === 'RESOLVED'
                  ? 'bg-[#e6f4ea] border-[#ceead6] text-[#137333]'
                  : 'bg-[#f8f9fa] border-[#dadce0] text-[#5f6368]'
              }`}
            >
              Resolved
            </button>
          </div>
        </div>
      </div>

      {/* Feed List */}
      {isLoading ? (
        <div className="p-12 text-center space-y-2">
          <RefreshCw className="w-8 h-8 text-[#ea4335] animate-spin mx-auto" />
          <p className="text-xs text-[#5f6368]">Loading global feedback stream...</p>
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="google-app-card p-12 border border-[#dadce0] text-center space-y-2">
          <CheckCircle2 className="w-12 h-12 text-[#137333] mx-auto" />
          <h3 className="text-base font-bold text-[#202124]">No Complaints Found</h3>
          <p className="text-xs text-[#5f6368]">All customer feedback in this filter has been resolved or none exists.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedbacks.map((f) => {
            const isResolved = f.status === 'RESOLVED';
            const isUpdating = updatingId === f.id;

            return (
              <div
                key={f.id}
                className={`google-app-card p-6 border transition-all space-y-4 ${
                  isResolved ? 'opacity-60 bg-[#f8f9fa]' : 'bg-white'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#dadce0] pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[#fef7e0] border border-[#feefc3] text-[#b06000] font-bold text-xs">
                      <span>{f.rating}</span>
                      <Star className="w-3.5 h-3.5 fill-[#b06000]" />
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[#202124] flex items-center space-x-2">
                        <span>{f.business?.name || 'Store'}</span>
                        <span className="text-[10px] text-[#5f6368] font-mono">/biz/{f.business?.slug}</span>
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-[11px] text-[#5f6368] flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(f.createdAt).toLocaleString()}</span>
                    </span>

                    <button
                      onClick={() => toggleStatus(f)}
                      disabled={isUpdating}
                      className={`py-1.5 px-3 rounded-full border text-xs font-bold transition-all flex items-center space-x-1.5 ${
                        isResolved
                          ? 'bg-[#f1f3f4] border-[#dadce0] text-[#5f6368]'
                          : 'bg-[#e6f4ea] border-[#ceead6] text-[#137333] hover:bg-[#ceead6]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isResolved ? 'Resolved' : 'Mark Resolved'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#f8f9fa] border border-[#dadce0] space-y-2">
                  <p className="text-xs text-[#202124] leading-relaxed italic">
                    "{f.message}"
                  </p>

                  {(f.customerName || f.customerContact) && (
                    <div className="pt-2 border-t border-[#dadce0] flex flex-wrap items-center gap-3 text-[11px] text-[#5f6368]">
                      {f.customerName && (
                        <span className="flex items-center space-x-1">
                          <User className="w-3 h-3 text-[#1a73e8]" />
                          <span>{f.customerName}</span>
                        </span>
                      )}
                      {f.customerContact && (
                        <span className="flex items-center space-x-1 font-mono text-[#202124]">
                          <Phone className="w-3 h-3 text-[#137333]" />
                          <span>{f.customerContact}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
