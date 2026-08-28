'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Tags, Search, Plus, CheckCircle2, XCircle, Edit, RefreshCw,
  Sparkles, ShieldAlert, Check, X, AlertTriangle, Layers, BookOpen, Ban,
} from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
  normalizedCategory: string;
  displayName: string;
  description: string;
  active: boolean;
  businessCount: number;
  aiContext: string;
  defaultReviewTags?: string[];
  vocabulary?: string[];
  wordsToAvoid?: string[];
}

export default function CategoriesClient() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');

  const fetchCategories = async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/categories');
      if (!res.ok) throw new Error('Failed to load categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching category taxonomy');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategories(true);
  }, []);

  // Optimistic Toggle Category Status
  const handleToggleActive = async (cat: CategoryItem) => {
    const previousState = cat.active;
    const nextState = !previousState;

    // 1. Optimistic UI update
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, active: nextState } : c))
    );

    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextState }),
      });
      if (!res.ok) {
        throw new Error('Failed to update category status');
      }
    } catch (e: any) {
      // 2. Rollback on failure
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, active: previousState } : c))
      );
      alert(`Error updating category: ${e.message}`);
    }
  };

  // Filtered List
  const filteredCategories = useMemo(() => {
    let list = categories;
    if (activeFilter === 'ACTIVE') list = list.filter((c) => c.active);
    if (activeFilter === 'DISABLED') list = list.filter((c) => !c.active);

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (c) =>
          (c.displayName || '').toLowerCase().includes(q) ||
          (c.normalizedCategory || '').toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [categories, activeFilter, searchTerm]);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl border border-[#dadce0] shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-[#fef7e0] text-[#e37400]">
              <Tags className="w-5 h-5" />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-[#202124]">
              Category Intelligence
            </h1>
          </div>
          <p className="text-xs text-[#5f6368]">
            Manage 12 normalized business taxonomies, default dynamic review tags, and AI vocabulary.
          </p>
        </div>

        <button
          onClick={() => fetchCategories(false)}
          disabled={isLoading || isRefreshing}
          className="py-2 px-3.5 rounded-xl bg-white border border-[#dadce0] hover:bg-[#f8f9fa] text-xs font-bold text-[#202124] flex items-center space-x-1.5 transition-colors self-start sm:self-auto disabled:opacity-50 shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#e37400] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="p-3 sm:p-4 rounded-2xl border border-[#dadce0] bg-white flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#5f6368] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#f8f9fa] border border-[#dadce0] focus:border-[#e37400] focus:bg-white text-xs outline-none transition-all"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto text-xs overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'ACTIVE', 'DISABLED'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`py-2 px-3.5 rounded-xl font-bold whitespace-nowrap transition-colors flex-shrink-0 ${
                activeFilter === filter
                  ? 'bg-[#e37400] text-white shadow-xs'
                  : 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-white rounded-2xl border border-[#dadce0]"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredCategories.map((cat) => {
            const tags = Array.isArray(cat.defaultReviewTags) ? cat.defaultReviewTags : [];
            return (
              <div
                key={cat.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all bg-white shadow-xs space-y-3 flex flex-col justify-between ${
                  cat.active ? 'border-[#dadce0]' : 'border-dashed border-[#dadce0] opacity-60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-[#202124] truncate">{cat.displayName || cat.name}</span>
                    <button
                      onClick={() => handleToggleActive(cat)}
                      className={`py-0.5 px-2.5 rounded-full text-[10px] font-bold border transition-colors flex-shrink-0 ${
                        cat.active
                          ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6] hover:bg-[#ceead6]'
                          : 'bg-[#fce8e6] text-[#ea4335] border-[#fad2cf] hover:bg-[#fad2cf]'
                      }`}
                    >
                      {cat.active ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                  <p className="text-xs text-[#5f6368] line-clamp-2 leading-relaxed">{cat.description || 'Category taxonomy configuration.'}</p>
                </div>

                {/* Tags Preview */}
                <div className="space-y-1.5 pt-2 border-t border-[#f1f3f4]">
                  <p className="text-[10px] font-bold text-[#5f6368] uppercase">Default Dynamic Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {tags.length > 0 ? (
                      <>
                        {tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-[#fef7e0] text-[#b06000] text-[10px] font-semibold">
                            {tag}
                          </span>
                        ))}
                        {tags.length > 3 && (
                          <span className="text-[10px] text-[#5f6368] self-center">+{tags.length - 3} more</span>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No default tags</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
