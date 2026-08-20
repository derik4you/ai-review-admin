'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Plus, Store, UserCheck, Star, MessageSquare, RefreshCw, X, Search } from 'lucide-react';

interface BusinessSummary {
  id: string;
  name: string;
  slug: string;
  category: string;
  googlePlaceId?: string | null;
  googleReviewUrl?: string | null;
  createdAt: string;
  ownerEmail?: string | null;
  loginId?: string;
  assignedStandsCount: number;
  totalGoogleBoosts?: number;
  totalPrivateFeedbacks?: number;
}

function TableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="py-4 px-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#f1f3f4]" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-32 bg-[#f1f3f4] rounded" />
            <div className="h-2.5 w-20 bg-[#f1f3f4] rounded" />
          </div>
        </div>
      </td>
      <td className="py-4 px-4"><div className="h-3 w-24 bg-[#f1f3f4] rounded" /></td>
      <td className="py-4 px-4"><div className="h-6 w-28 bg-[#f1f3f4] rounded-lg" /></td>
      <td className="py-4 px-4"><div className="h-5 w-20 bg-[#f1f3f4] rounded-full" /></td>
      <td className="py-4 px-4"><div className="h-5 w-14 bg-[#f1f3f4] rounded-full" /></td>
      <td className="py-4 px-4"><div className="h-5 w-14 bg-[#f1f3f4] rounded-full" /></td>
    </tr>
  );
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form state
  const [name, setName] = useState<string>('');
  const [loginId, setLoginId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [category, setCategory] = useState<string>('Restaurant');
  const [googleReviewUrl, setGoogleReviewUrl] = useState<string>('');
  const [keywords, setKeywords] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchBusinesses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/businesses', {
        cache: 'no-store',
        headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (Array.isArray(data)) setBusinesses(data);
    } catch (e) {
      console.error('Failed to fetch businesses:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          loginId,
          password,
          category,
          googleReviewUrl,
          keywords,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsModalOpen(false);
        setName('');
        setLoginId('');
        setPassword('');
        setCategory('Restaurant');
        setGoogleReviewUrl('');
        setKeywords('');
        await fetchBusinesses();
      } else {
        setErrorMsg(data.error || 'Failed to create business profile.');
      }
    } catch (e) {
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = businesses.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.loginId && b.loginId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="google-app-card p-6 border border-[#dadce0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-[#202124] flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-[#1a73e8]" />
            <span>Store Profiles &amp; Management</span>
          </h2>
          <p className="text-xs text-[#5f6368] mt-1">
            Manage registered stores, custom URL slugs, and active assigned QR stands.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="py-2.5 px-4 rounded-full btn-google-primary text-xs font-bold flex items-center space-x-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Business</span>
          </button>

          <button
            onClick={fetchBusinesses}
            disabled={isLoading}
            className="p-2.5 rounded-full bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#202124] border border-[#dadce0] transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Filter */}
      {businesses.length > 0 && (
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#5f6368] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by store name, slug, or login ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full google-search-bar pl-9 pr-3 py-2 text-xs"
          />
        </div>
      )}

      {/* Business Table */}
      <div className="google-app-card border border-[#dadce0] overflow-hidden shadow-xs bg-white rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8f9fa] text-[#5f6368] uppercase tracking-wider text-[10px] font-bold border-b border-[#dadce0]">
              <tr>
                <th className="py-3.5 px-4">Business Details</th>
                <th className="py-3.5 px-4">URL Slug</th>
                <th className="py-3.5 px-4">Store Login ID</th>
                <th className="py-3.5 px-4">Assigned Stands</th>
                <th className="py-3.5 px-4">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]">
              {isLoading ? (
                <>
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                </>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-[#5f6368]">
                    <Store className="w-10 h-10 text-[#9aa0a6] mx-auto mb-2" />
                    <p className="font-bold text-sm text-[#202124]">No stores found</p>
                    <p className="text-xs">Click &quot;Add New Business&quot; to onboard your first store.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="py-4 px-4 font-bold text-[#202124]">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center text-[#1a73e8]">
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[#202124] font-bold text-xs">{b.name}</p>
                          <span className="text-[10px] text-[#5f6368] font-mono">{b.category}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono text-[#1a73e8]">
                      /biz/{b.slug}
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#f1f3f4] border border-[#dadce0] text-[#202124] text-[11px] font-mono font-bold">
                        <UserCheck className="w-3 h-3 text-[#137333]" />
                        <span>{b.loginId || 'Self-Registered'}</span>
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono text-[#202124]">
                      <span className="px-2.5 py-1 rounded-full bg-[#f3e8ff] border border-[#e9d5ff] text-[#9b51e0] font-bold text-[11px]">
                        {b.assignedStandsCount} Stands
                      </span>
                    </td>

                    <td className="py-4 px-4 text-[#5f6368] text-[11px]">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE BUSINESS MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white border border-[#dadce0] space-y-5 shadow-xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed]"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-black text-[#202124] flex items-center space-x-2">
                <Store className="w-5 h-5 text-[#1a73e8]" />
                <span>Onboard New Store</span>
              </h3>
              <p className="text-xs text-[#5f6368] mt-0.5">
                Create a business profile and optional store owner login ID.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-[#fce8e6] border border-[#fad2cf] text-xs text-[#c5221f] font-bold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#202124] block mb-1">Store Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Cafe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#dadce0] rounded-xl focus:outline-none focus:border-[#1a73e8]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#202124] block mb-1">Store Login ID</label>
                  <input
                    type="text"
                    placeholder="e.g. royal_cafe"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#dadce0] rounded-xl font-mono focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#202124] block mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#dadce0] rounded-xl font-mono focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#202124] block mb-1">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Cafe, Restaurant, Salon"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#dadce0] rounded-xl focus:outline-none focus:border-[#1a73e8]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#202124] block mb-1">Target Google Maps Review URL</label>
                <input
                  type="url"
                  placeholder="https://search.google.com/local/writereview?..."
                  value={googleReviewUrl}
                  onChange={(e) => setGoogleReviewUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#dadce0] rounded-xl focus:outline-none focus:border-[#1a73e8]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#202124] block mb-1">Keywords (for AI reviews)</label>
                <input
                  type="text"
                  placeholder="e.g. fast service, great coffee, cozy vibe"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#dadce0] rounded-xl focus:outline-none focus:border-[#1a73e8]"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2 px-4 rounded-full border border-[#dadce0] text-xs font-bold text-[#5f6368] hover:bg-[#f1f3f4]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2 px-5 rounded-full btn-google-primary text-xs font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
