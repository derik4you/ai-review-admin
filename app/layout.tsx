'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './globals.css';
import {
  Store,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  LogOut,
  Menu,
  X,
  Tags,
  BarChart3,
  Sliders,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const pathname = usePathname();

  // Desktop defaults to open, mobile starts closed
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }
  }, []);

  const isLoginPage = pathname?.startsWith('/login');

  const navItems = [
    { label: 'Overview Dashboard', href: '/', icon: LayoutDashboard, color: 'text-[#1a73e8]', activeBg: 'bg-[#e8f0fe] text-[#1a73e8]' },
    { label: 'Store Management', href: '/businesses', icon: Store, color: 'text-[#137333]', activeBg: 'bg-[#e6f4ea] text-[#137333]' },
    { label: 'Category Intelligence', href: '/categories', icon: Tags, color: 'text-[#e37400]', activeBg: 'bg-[#fef7e0] text-[#b06000]' },
    { label: 'Platform Analytics', href: '/analytics', icon: BarChart3, color: 'text-[#1a73e8]', activeBg: 'bg-[#e8f0fe] text-[#1a73e8]' },
    { label: 'AI Control Center', href: '/ai-control', icon: Sliders, color: 'text-[#9333ea]', activeBg: 'bg-[#f3e8ff] text-[#9333ea]' },
    { label: 'Customer Complaints', href: '/feedbacks', icon: MessageSquare, color: 'text-[#ea4335]', activeBg: 'bg-[#fce8e6] text-[#ea4335]' },
  ];

  if (isLoginPage) {
    return (
      <html lang="en">
        <body className="bg-[#f8f9fa] text-[#202124] antialiased">
          {children}
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className="bg-[#f8f9fa] text-[#202124] antialiased">
        <div className="min-h-screen bg-[#f8f9fa] text-[#202124] flex flex-col">
          
          {/* Top Header Navigation Bar (Minimalist) */}
          <header className="bg-white border-b border-[#dadce0] sticky top-0 z-40 shadow-xs">
            <div className="w-full px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-xl hover:bg-[#f1f3f4] text-[#5f6368] transition-colors focus:outline-none"
                  title="Toggle Navigation Menu"
                  aria-label="Toggle Navigation Menu"
                >
                  {sidebarOpen ? <X className="w-5 h-5 text-[#202124]" /> : <Menu className="w-5 h-5 text-[#202124]" />}
                </button>

                <Link href="/" className="flex items-center space-x-2 group">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1a73e8] via-[#9333ea] to-[#ea4335] flex items-center justify-center text-white font-bold shadow-xs transition-transform group-hover:scale-105 flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-extrabold text-base text-[#202124] tracking-tight leading-tight">
                      ReviewEasy <span className="text-[#1a73e8]">Admin</span>
                    </span>
                    <span className="text-[10px] text-[#5f6368] font-semibold tracking-tight hidden sm:block">
                      Platform Control Console
                    </span>
                  </div>
                </Link>
              </div>

              {/* Right Action */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <span className="hidden sm:inline-flex text-[11px] px-2.5 py-0.5 rounded-full bg-[#e8f0fe] text-[#1a73e8] font-bold border border-[#d2e3fc]">
                  Super Admin
                </span>

                <Link
                  href="/api/auth/logout"
                  className="py-1.5 px-3 rounded-xl border border-[#dadce0] hover:bg-[#f1f3f4] text-xs font-semibold flex items-center space-x-1.5 text-[#5f6368] transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline sm:inline">Sign Out</span>
                </Link>
              </div>
            </div>
          </header>

          {/* Main Layout Body */}
          <div className="flex-1 flex w-full relative">
            
            {/* Mobile Backdrop */}
            {sidebarOpen && (
              <div
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden backdrop-blur-xs transition-opacity"
              />
            )}

            {/* Minimalist Left Navigation Drawer (Clean & No Clutter) */}
            <aside
              className={`bg-white border-r border-[#dadce0] transition-all duration-300 ease-in-out flex flex-col justify-between z-40 fixed lg:sticky top-[53px] h-[calc(100vh-53px)] ${
                sidebarOpen ? 'w-72 translate-x-0 shadow-2xl lg:shadow-none' : '-translate-x-full lg:translate-x-0 lg:w-16'
              }`}
            >
              <div className="p-3.5 space-y-4 overflow-y-auto">
                <div className="space-y-1">
                  <div className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#5f6368] ${!sidebarOpen && 'hidden lg:hidden'}`}>
                    Menu
                  </div>

                  {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                            setSidebarOpen(false);
                          }
                        }}
                        className={`flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-150 group text-xs font-semibold ${
                          isActive
                            ? `${item.activeBg} font-bold shadow-xs`
                            : 'text-[#5f6368] hover:bg-[#f8f9fa] hover:text-[#202124]'
                        }`}
                        title={item.label}
                      >
                        <div className="flex items-center space-x-3 truncate">
                          <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? '' : item.color}`} />
                          <span className={`truncate tracking-tight ${!sidebarOpen && 'hidden lg:hidden'}`}>
                            {item.label}
                          </span>
                        </div>

                        {sidebarOpen && isActive && (
                          <div className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Minimal Drawer Footer */}
              <div className="p-3 border-t border-[#dadce0] bg-[#f8f9fa]">
                <div className={`flex items-center space-x-3 p-2.5 rounded-xl bg-white border border-[#dadce0] ${!sidebarOpen && 'justify-center'}`}>
                  <div className="w-8 h-8 rounded-full bg-[#e8f0fe] text-[#1a73e8] font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-2xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  {sidebarOpen && (
                    <div className="space-y-0.5 truncate">
                      <p className="text-xs font-bold text-[#202124] truncate">Super Admin</p>
                      <p className="text-[10px] text-[#137333] font-bold font-mono truncate">prathameshpvadde2004</p>
                    </div>
                  )}
                </div>
              </div>
            </aside>

            {/* Main Content Body */}
            <main className="flex-1 min-w-0 p-3.5 sm:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
