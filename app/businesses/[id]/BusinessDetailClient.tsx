'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Store, ArrowLeft, CheckCircle2, XCircle, AlertTriangle,
  Sparkles, RefreshCw, Star, MessageSquare, BarChart3,
  History, ShieldAlert, Check, Ban, RotateCcw, ExternalLink,
  Edit, Save, X, Globe, Instagram, MapPin, Sliders, Info, Clock,
} from 'lucide-react';

interface BusinessDetailProps {
  businessId: string;
}

export default function BusinessDetailClient({ businessId }: BusinessDetailProps) {
  const [business, setBusiness] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'ai' | 'tags' | 'analytics' | 'reviews' | 'audit' | 'settings'>('overview');

  // Tab Data Cache (Stores on-demand loaded tab records)
  const [reviewsData, setReviewsData] = useState<any[] | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [auditLogsData, setAuditLogsData] = useState<any[] | null>(null);
  const [tabLoading, setTabLoading] = useState<string | null>(null);

  // AI & Async Operation Loading States (Non-blocking)
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [tagsGenerating, setTagsGenerating] = useState<boolean>(false);
  const [statusActionLoading, setStatusActionLoading] = useState<boolean>(false);

  // Settings Edit Mode
  const [isEditingSettings, setIsEditingSettings] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // 1. Initial Fast Load (Overview Data)
  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}?tab=overview`);
      if (!res.ok) throw new Error('Failed to load business details');
      const data = await res.json();
      setBusiness(data.business);
      setEditFormData({
        name: data.business.name || '',
        category: data.business.category || '',
        city: data.business.city || '',
        location: data.business.location || '',
        description: data.business.description || '',
        services: data.business.services || '',
        website: data.business.website || '',
        instagram: data.business.instagram || '',
        googleReviewUrl: data.business.googleReviewUrl || '',
        customerFlowEnabled: data.business.customerFlowEnabled !== false,
      });
    } catch (err: any) {
      setError(err.message || 'Error loading business');
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // 2. On-Demand Lazy Tab Fetching
  const handleTabClick = async (tab: 'overview' | 'ai' | 'tags' | 'analytics' | 'reviews' | 'audit' | 'settings') => {
    setActiveTab(tab);

    if (tab === 'reviews' && reviewsData === null) {
      setTabLoading('reviews');
      try {
        const res = await fetch(`/api/admin/businesses/${businessId}?tab=reviews`);
        if (res.ok) {
          const data = await res.json();
          setReviewsData(data.business.reviews || []);
        }
      } catch (e) {
        console.error('Failed to load reviews:', e);
      } finally {
        setTabLoading(null);
      }
    } else if (tab === 'analytics' && analyticsData === null) {
      setTabLoading('analytics');
      try {
        const res = await fetch(`/api/admin/businesses/${businessId}?tab=analytics`);
        if (res.ok) {
          const data = await res.json();
          setAnalyticsData(data.business.analytics || null);
        }
      } catch (e) {
        console.error('Failed to load analytics:', e);
      } finally {
        setTabLoading(null);
      }
    } else if (tab === 'audit' && auditLogsData === null) {
      setTabLoading('audit');
      try {
        const res = await fetch(`/api/admin/businesses/${businessId}?tab=audit`);
        if (res.ok) {
          const data = await res.json();
          setAuditLogsData(data.business.auditLogs || []);
        }
      } catch (e) {
        console.error('Failed to load audit logs:', e);
      } finally {
        setTabLoading(null);
      }
    }
  };

  // AI Profile Non-blocking Generation
  const handleRegenerateAi = async () => {
    setAiGenerating(true);
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/regenerate-ai`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setBusiness((prev: any) => ({ ...prev, aiProfile: data.aiProfile }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiGenerating(false);
    }
  };

  // Dynamic Tags Non-blocking Generation
  const handleRegenerateTags = async () => {
    setTagsGenerating(true);
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/regenerate-tags`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setBusiness((prev: any) => ({ ...prev, reviewTags: data.reviewTags }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTagsGenerating(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      if (res.ok) {
        setBusiness((prev: any) => ({ ...prev, ...editFormData }));
        setIsEditingSettings(false);
        setSaveSuccess('Business settings updated successfully.');
        setTimeout(() => setSaveSuccess(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-lg"></div>
        <div className="h-32 bg-white rounded-2xl border border-slate-200"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-48 bg-white rounded-2xl border border-slate-200"></div>
          <div className="h-48 bg-white rounded-2xl border border-slate-200"></div>
          <div className="h-48 bg-white rounded-2xl border border-slate-200"></div>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto space-y-4">
        <AlertTriangle className="w-10 h-10 text-[#ea4335] mx-auto" />
        <h2 className="text-base font-bold text-[#202124]">Unable to Load Business</h2>
        <p className="text-xs text-[#5f6368]">{error || 'Store profile not found'}</p>
        <Link href="/businesses" className="inline-flex items-center space-x-1 py-2 px-4 rounded-xl bg-[#1a73e8] text-white text-xs font-bold">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Store List</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back Button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link href="/businesses" className="inline-flex items-center space-x-1 text-xs font-bold text-[#1a73e8] hover:underline mb-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Businesses</span>
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-black text-[#202124]">{business.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
              business.status === 'ACTIVE'
                ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]'
                : business.status === 'PENDING'
                ? 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]'
                : 'bg-[#fce8e6] text-[#ea4335] border-[#fad2cf]'
            }`}>
              {business.status}
            </span>
          </div>
          <p className="text-xs text-[#5f6368] font-mono">ID: {business.loginId || business.slug}</p>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex space-x-1 border-b border-[#dadce0] overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'ai', label: 'AI Intelligence' },
          { id: 'tags', label: 'Review Tags' },
          { id: 'analytics', label: 'Analytics' },
          { id: 'reviews', label: 'Review History' },
          { id: 'audit', label: 'Audit Log' },
          { id: 'settings', label: 'Settings' },
        ].map((t: any) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleTabClick(t.id)}
              className={`py-2.5 px-4 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
                isActive
                  ? 'border-[#1a73e8] text-[#1a73e8] bg-[#e8f0fe]/40 rounded-t-lg'
                  : 'border-transparent text-[#5f6368] hover:text-[#202124] hover:bg-slate-50 rounded-t-lg'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Core Store Metadata */}
          <div className="p-6 rounded-2xl border border-[#dadce0] bg-white space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-[#202124] flex items-center space-x-2">
              <Store className="w-4 h-4 text-[#1a73e8]" />
              <span>Store Information</span>
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[#5f6368] font-semibold">Category</p>
                <p className="text-[#202124] font-bold mt-0.5">{business.category}</p>
              </div>
              <div>
                <p className="text-[#5f6368] font-semibold">Location</p>
                <p className="text-[#202124] font-bold mt-0.5">{business.city || business.location || '—'}</p>
              </div>
              <div>
                <p className="text-[#5f6368] font-semibold">Created Date</p>
                <p className="text-[#202124] mt-0.5">{new Date(business.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-[#5f6368] font-semibold">Customer NFC Flow</p>
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  business.customerFlowEnabled ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fce8e6] text-[#ea4335]'
                }`}>
                  {business.customerFlowEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
            </div>
            {business.description && (
              <div className="pt-2 border-t border-[#f1f3f4] text-xs">
                <p className="text-[#5f6368] font-semibold">Description</p>
                <p className="text-[#202124] mt-0.5">{business.description}</p>
              </div>
            )}
          </div>

          {/* Card 2: Safe Owner Info & Health */}
          <div className="p-6 rounded-2xl border border-[#dadce0] bg-white space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-[#202124] flex items-center space-x-2">
              <Info className="w-4 h-4 text-[#137333]" />
              <span>Account &amp; Health Status</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#f8f9fa] border border-[#dadce0]">
                <div>
                  <p className="font-bold text-[#202124]">Health Level</p>
                  <p className="text-[#5f6368] text-[11px]">{business.health?.issues?.length || 0} issues detected</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  business.health?.status === 'HEALTHY' ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fef7e0] text-[#b06000]'
                }`}>
                  {business.health?.status || 'HEALTHY'}
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-[#5f6368] font-semibold">Google Review URL</p>
                {business.googleReviewUrl ? (
                  <a
                    href={business.googleReviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#1a73e8] hover:underline font-mono text-[11px] truncate block"
                  >
                    {business.googleReviewUrl}
                  </a>
                ) : (
                  <span className="text-[#ea4335] font-semibold text-[11px]">Not configured</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. AI INTELLIGENCE */}
      {activeTab === 'ai' && (
        <div className="p-6 rounded-2xl border border-[#dadce0] bg-white space-y-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-[#9b51e0]">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-base font-bold text-[#202124]">Business AI Profile</h3>
            </div>
            <button
              onClick={handleRegenerateAi}
              disabled={aiGenerating}
              className="py-1.5 px-3 rounded-xl bg-[#9b51e0] hover:bg-[#8338ec] text-white text-xs font-bold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${aiGenerating ? 'animate-spin' : ''}`} />
              <span>{aiGenerating ? 'Regenerating AI...' : 'Regenerate AI Profile'}</span>
            </button>
          </div>

          {business.aiProfile ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#f8f9fa] border border-[#dadce0] space-y-1">
                <p className="font-bold text-[#202124]">Business Personality</p>
                <p className="text-[#5f6368]">{business.aiProfile.businessPersonality || '—'}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#f8f9fa] border border-[#dadce0] space-y-1">
                <p className="font-bold text-[#202124]">Customer Type</p>
                <p className="text-[#5f6368]">{business.aiProfile.customerType || '—'}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#f8f9fa] border border-[#dadce0] space-y-1 md:col-span-2">
                <p className="font-bold text-[#202124]">Unique Selling Points</p>
                <p className="text-[#5f6368]">{business.aiProfile.uniqueSellingPoints || '—'}</p>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-[#f8f9fa] rounded-xl border border-dashed border-[#dadce0] text-xs text-[#5f6368]">
              No AI Profile generated yet. Click "Regenerate AI Profile" to create one automatically.
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 3. REVIEW TAGS */}
      {activeTab === 'tags' && (
        <div className="p-6 rounded-2xl border border-[#dadce0] bg-white space-y-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-[#e37400]">
              <Star className="w-5 h-5" />
              <h3 className="text-base font-bold text-[#202124]">Dynamic Customer Review Tags</h3>
            </div>
            <button
              onClick={handleRegenerateTags}
              disabled={tagsGenerating}
              className="py-1.5 px-3 rounded-xl bg-[#e37400] hover:bg-[#c26200] text-white text-xs font-bold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${tagsGenerating ? 'animate-spin' : ''}`} />
              <span>{tagsGenerating ? 'Generating Tags...' : 'Regenerate Dynamic Tags'}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {business.reviewTags && business.reviewTags.length > 0 ? (
              business.reviewTags.map((tag: string, i: number) => (
                <span key={i} className="py-1.5 px-3 rounded-full bg-[#fef7e0] text-[#b06000] border border-[#feefc3] text-xs font-bold">
                  {tag}
                </span>
              ))
            ) : (
              <p className="text-xs text-[#5f6368]">No custom tags configured yet.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. ANALYTICS (Lazy-Loaded) */}
      {activeTab === 'analytics' && (
        <div className="p-6 rounded-2xl border border-[#dadce0] bg-white space-y-6 shadow-xs">
          <h3 className="text-base font-bold text-[#202124] flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-[#1a73e8]" />
            <span>Store Customer Funnel Telemetry</span>
          </h3>

          {tabLoading === 'analytics' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-pulse">
              <div className="h-20 bg-slate-200 rounded-xl"></div>
              <div className="h-20 bg-slate-200 rounded-xl"></div>
              <div className="h-20 bg-slate-200 rounded-xl"></div>
              <div className="h-20 bg-slate-200 rounded-xl"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#e8f0fe] border border-[#d2e3fc]">
                <p className="text-[#1a73e8] font-bold">NFC Scans</p>
                <p className="text-2xl font-black text-[#202124] mt-1">{analyticsData?.totalScans || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#f3e8ff] border border-[#e9d5ff]">
                <p className="text-[#9b51e0] font-bold">Review Starts</p>
                <p className="text-2xl font-black text-[#202124] mt-1">{analyticsData?.reviewStarts || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#e6f4ea] border border-[#ceead6]">
                <p className="text-[#137333] font-bold">Reviews Drafted</p>
                <p className="text-2xl font-black text-[#202124] mt-1">{analyticsData?.reviewsGenerated || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#e6f4ea] border border-[#ceead6]">
                <p className="text-[#137333] font-bold">Google Redirects</p>
                <p className="text-2xl font-black text-[#202124] mt-1">{analyticsData?.googleRedirects || 0}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 5. REVIEWS (Lazy-Loaded) */}
      {activeTab === 'reviews' && (
        <div className="p-6 rounded-2xl border border-[#dadce0] bg-white space-y-4 shadow-xs">
          <h3 className="text-base font-bold text-[#202124] flex items-center space-x-2">
            <History className="w-5 h-5 text-[#1a73e8]" />
            <span>Recent AI Reviews</span>
          </h3>

          {tabLoading === 'reviews' ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-16 bg-slate-200 rounded-xl"></div>
              <div className="h-16 bg-slate-200 rounded-xl"></div>
            </div>
          ) : reviewsData && reviewsData.length > 0 ? (
            <div className="space-y-3">
              {reviewsData.map((rev: any) => (
                <div key={rev.id} className="p-4 rounded-xl border border-[#dadce0] bg-[#f8f9fa] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-[#f9ab00]">
                      {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-[#f9ab00]" />
                      ))}
                    </div>
                    <span className="text-[#5f6368] font-mono text-[10px]">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[#202124]">{rev.generatedReview}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#5f6368]">No review sessions recorded yet for this store.</p>
          )}
        </div>
      )}

      {/* TAB CONTENT: 6. AUDIT LOG (Lazy-Loaded) */}
      {activeTab === 'audit' && (
        <div className="p-6 rounded-2xl border border-[#dadce0] bg-white space-y-4 shadow-xs">
          <h3 className="text-base font-bold text-[#202124] flex items-center space-x-2">
            <Clock className="w-5 h-5 text-[#5f6368]" />
            <span>Store Modification Audit Log</span>
          </h3>

          {tabLoading === 'audit' ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-10 bg-slate-200 rounded-xl"></div>
              <div className="h-10 bg-slate-200 rounded-xl"></div>
            </div>
          ) : auditLogsData && auditLogsData.length > 0 ? (
            <div className="divide-y divide-[#dadce0] text-xs">
              {auditLogsData.map((log: any) => (
                <div key={log.id || log.logId} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#202124]">{log.action}</span>
                    <span className="text-[#5f6368] ml-2">by {log.adminId}</span>
                  </div>
                  <span className="text-[11px] text-[#5f6368] font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#5f6368]">No audit events logged yet for this business.</p>
          )}
        </div>
      )}

      {/* TAB CONTENT: 7. SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl border border-[#dadce0] bg-white space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#202124] flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-[#1a73e8]" />
              <span>Configure Store Settings</span>
            </h3>
            {saveSuccess && (
              <span className="text-xs font-bold text-[#137333] bg-[#e6f4ea] px-3 py-1 rounded-full border border-[#ceead6]">
                {saveSuccess}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-[#5f6368] block mb-1">Business Name</label>
              <input
                type="text"
                value={editFormData.name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[#dadce0] outline-none focus:border-[#1a73e8]"
              />
            </div>
            <div>
              <label className="font-semibold text-[#5f6368] block mb-1">Google Review URL</label>
              <input
                type="text"
                value={editFormData.googleReviewUrl || ''}
                onChange={(e) => setEditFormData({ ...editFormData, googleReviewUrl: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[#dadce0] outline-none focus:border-[#1a73e8]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#f1f3f4] flex justify-end">
            <button
              type="submit"
              className="py-2 px-5 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold text-xs shadow-xs"
            >
              Save Changes
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
