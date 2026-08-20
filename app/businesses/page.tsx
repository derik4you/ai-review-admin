'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Plus, Store, UserCheck, Star, MessageSquare, ExternalLink, RefreshCw, X } from 'lucide-react';
import Link from 'next/link';

interface BusinessSummary {
  id: string;
  name: string;
  slug: string;
  category: string;
  googlePlaceId?: string | null;
  googleReviewUrl?: string | null;
  createdAt: string;
  ownerEmail: string;
  assignedStandsCount: number;
  totalGoogleBoosts: number;
  totalPrivateFeedbacks: number;
  unresolvedFeedbacksCount: number;
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form state
  const [name, setName] = useState<string>('');
  const [slug, setSlug] = useState<string>('');
  const [category, setCategory] = useState<string>('Restaurant');
  const [googlePlaceId, setGooglePlaceId] = useState<string>('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState<string>('');
  const [ownerEmail, setOwnerEmail] = useState<string>('');
  const [ownerPassword, setOwnerPassword] = useState<string>('Password123!');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchBusinesses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/businesses');
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
          slug: slug || undefined,
          category,
          googlePlaceId: googlePlaceId || undefined,
          googleReviewUrl: googleReviewUrl || undefined,
          ownerEmail: ownerEmail || undefined,
          ownerPassword: ownerPassword || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsModalOpen(false);
        setName('');
        setSlug('');
        setCategory('Restaurant');
        setGooglePlaceId('');
        setGoogleReviewUrl('');
        setOwnerEmail('');
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

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="google-app-card p-6 border border-[#dadce0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#202124] flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-[#1a73e8]" />
            <span>Store Profiles & Owner Credentials</span>
          </h2>
          <p className="text-xs text-[#5f6368] mt-1">
            Manage onboarded stores, Google Place IDs, auto-generated slugs, and stand counts.
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
            className="p-2.5 rounded-full bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#202124] border border-[#dadce0]"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Business Table */}
      <div className="google-app-card border border-[#dadce0] overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center space-y-2">
            <RefreshCw className="w-8 h-8 text-[#1a73e8] animate-spin mx-auto" />
            <p className="text-xs text-[#5f6368]">Loading onboarded businesses...</p>
          </div>
        ) : businesses.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Store className="w-12 h-12 text-[#5f6368] mx-auto" />
            <p className="text-xs text-[#5f6368]">No businesses onboarded yet.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="py-2 px-4 rounded-full btn-google-primary text-xs font-bold"
            >
              Onboard First Store
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8f9fa] text-[#5f6368] uppercase tracking-wider text-[10px] font-bold border-b border-[#dadce0]">
                <tr>
                  <th className="py-3.5 px-4">Business Details</th>
                  <th className="py-3.5 px-4">URL Slug</th>
                  <th className="py-3.5 px-4">Owner Email</th>
                  <th className="py-3.5 px-4">Stands</th>
                  <th className="py-3.5 px-4">5★ Google Boosts</th>
                  <th className="py-3.5 px-4">Private Complaints</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dadce0]">
                {businesses.map((b) => (
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
                      <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-[#f1f3f4] border border-[#dadce0] text-[#202124] text-[11px] font-mono">
                        <UserCheck className="w-3 h-3 text-[#137333]" />
                        <span>{b.ownerEmail}</span>
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono text-[#202124]">
                      <span className="px-2 py-0.5 rounded-full bg-[#f3e8ff] border border-[#e9d5ff] text-[#9b51e0] font-bold">
                        {b.assignedStandsCount} Stands
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-[#e6f4ea] border border-[#ceead6] text-[#137333] font-bold">
                        <Star className="w-3 h-3 fill-[#137333]" />
                        <span>{b.totalGoogleBoosts}</span>
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-[#fef7e0] border border-[#feefc3] text-[#b06000] font-bold">
                        <MessageSquare className="w-3 h-3" />
                        <span>{b.totalPrivateFeedbacks}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add New Business Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white border border-[#dadce0] space-y-4 shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-[#dadce0] pb-3">
              <h3 className="text-base font-bold text-[#202124] flex items-center space-x-2">
                <Store className="w-5 h-5 text-[#1a73e8]" />
                <span>Onboard New Business & Owner</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#5f6368] hover:bg-[#f1f3f4] p-1.5 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-[#fce8e6] border border-[#fad2cf] text-[#c5221f] text-xs rounded-xl font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#202124] mb-1 block">
                    Business Name <span className="text-[#ea4335]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bella Pizza"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                    }}
                    className="w-full google-input-field px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#202124] mb-1 block">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Restaurant, Gym, Cafe"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full google-input-field px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#202124] mb-1 block">URL Slug (/biz/[slug])</label>
                <input
                  type="text"
                  placeholder="e.g. bella-pizza"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full google-input-field px-3 py-2 text-xs font-mono text-[#1a73e8]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#202124] mb-1 block">Google Place ID (Optional)</label>
                <input
                  type="text"
                  placeholder="ChIJ..."
                  value={googlePlaceId}
                  onChange={(e) => setGooglePlaceId(e.target.value)}
                  className="w-full google-input-field px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#202124] mb-1 block">Google Direct Review Link (Optional)</label>
                <input
                  type="url"
                  placeholder="https://search.google.com/local/writereview?placeid=..."
                  value={googleReviewUrl}
                  onChange={(e) => setGoogleReviewUrl(e.target.value)}
                  className="w-full google-input-field px-3 py-2 text-xs font-mono"
                />
              </div>

              <div className="p-4 rounded-xl bg-[#f8f9fa] border border-[#dadce0] space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#137333] flex items-center space-x-1.5">
                  <UserCheck className="w-4 h-4" />
                  <span>Provision Owner Credentials</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#5f6368] block mb-1">Owner Email Address</label>
                    <input
                      type="email"
                      placeholder="owner@bellapizza.com"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      className="w-full google-input-field px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#5f6368] block mb-1">Default Password</label>
                    <input
                      type="text"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      className="w-full google-input-field px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2 px-4 rounded-full border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2 px-5 rounded-full btn-google-primary text-xs font-bold shadow-xs"
                >
                  {isSubmitting ? 'Onboarding...' : 'Onboard Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
