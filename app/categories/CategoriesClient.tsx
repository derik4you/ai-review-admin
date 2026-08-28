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
  defaultReviewTags: string[];
  vocabulary: string[];
  wordsToAvoid: string[];
}

export default function CategoriesClient() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');

  // Edit Modal State
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

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
          c.displayName.toLowerCase().includes(q) ||
          c.normalizedCategory.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [categories, activeFilter, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#202124] flex items-center space-x-2">
            <Tags className="w-5 h-5 text-[#e37400]" />
            <span>Category Intelligence</span>
          </h1>
          <p className="text-xs text-[#5f6368] mt-0.5">
            Manage 12 normalized business taxonomies, default dynamic review tags, AI vocabulary, and negative filters.
          </p>
        </div>

        <button
          onClick={() => fetchCategories(false)}
          disabled={isLoading || isRefreshing}
          className="py-1.5 px-3 rounded-xl bg-white border border-[#dadce0] hover:bg-[#f1f3f4] text-xs font-semibold text-[#202124] flex items-center space-x-1.5 transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#e37400] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Taxonomy</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="p-4 rounded-2xl border border-[#dadce0] bg-white flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#5f6368] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#f8f9fa] border border-[#dadce0] focus:border-[#e37400] focus:bg-white text-xs outline-none transition-all"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto text-xs">
          {(['ALL', 'ACTIVE', 'DISABLED'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`py-1.5 px-3 rounded-xl font-bold transition-colors ${
                activeFilter === filter
                  ? 'bg-[#e37400] text-white'
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-white rounded-2xl border border-[#dadce0]"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className={`p-5 rounded-2xl border transition-all bg-white shadow-xs space-y-3 flex flex-col justify-between ${
                cat.active ? 'border-[#dadce0]' : 'border-dashed border-[#dadce0] opacity-60'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#202124]">{cat.displayName}</span>
                  <button
                    onClick={() => handleToggleActive(cat)}
                    className={`py-0.5 px-2 rounded-full text-[10px] font-bold border transition-colors ${
                      cat.active
                        ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6] hover:bg-[#ceead6]'
                        : 'bg-[#fce8e6] text-[#ea4335] border-[#fad2cf] hover:bg-[#fad2cf]'
                    }`}
                  >
                    {cat.active ? 'Active' : 'Disabled'}
                  </button>
                </div>
                <p className="text-xs text-[#5f6368] line-clamp-2">{cat.description}</p>
              </div>

              {/* Tags Preview */}
              <div className="space-y-1.5 pt-2 border-t border-[#f1f3f4]">
                <p className="text-[10px] font-bold text-[#5f6368] uppercase">Default Dynamic Tags</p>
                <div className="flex flex-wrap gap-1">
                  {cat.defaultReviewTags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-[#fef7e0] text-[#b06000] text-[10px] font-semibold">
                      {tag}
                    </span>
                  ))}
                  {cat.defaultReviewTags.length > 3 && (
                    <span className="text-[10px] text-[#5f6368] self-center">+{cat.defaultReviewTags.length - 3} more</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
