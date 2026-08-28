'use client';

import React, { useState } from 'react';
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
  Tags,
  BarChart3,
  Sliders,
  ShieldCheck,
} from 'lucide-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const pathname = usePathname();

  const isLoginPage = pathname?.startsWith('/login');

  const navItems = [
    { label: 'Overview Dashboard', href: '/', icon: LayoutDashboard, badge: null, color: 'text-[#1a73e8]' },
    { label: 'Store Management', href: '/businesses', icon: Store, badge: 'Stores', color: 'text-[#137333]' },
    { label: 'Category Intelligence', href: '/categories', icon: Tags, badge: 'Taxonomy', color: 'text-[#e37400]' },
    { label: 'Platform Analytics', href: '/analytics', icon: BarChart3, badge: 'Funnel', color: 'text-[#1a73e8]' },
    { label: 'AI Control Center', href: '/ai-control', icon: Sliders, badge: 'Prompts', color: 'text-[#9b51e0]' },
    { label: 'Customer Complaints', href: '/feedbacks', icon: MessageSquare, badge: 'Live', color: 'text-[#ea4335]' },
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
          {/* Top Header Navigation Bar */}
          <header className="bg-white border-b border-[#dadce0] sticky top-0 z-40 shadow-xs">
            <div className="w-full px-4 py-2.5 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-full hover:bg-[#f1f3f4] text-[#5f6368] transition-colors"
                  title="Toggle Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>

                <Link href="/" className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1a73e8] via-[#9b51e0] to-[#ea4335] flex items-center justify-center text-white font-bold shadow-xs">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-extrabold text-lg text-[#202124] font-sans tracking-tight">
                    AI Review System <span className="text-[#1a73e8]">Admin Panel</span>
                  </span>
                </Link>

                <span className="hidden sm:inline-flex text-xs px-2.5 py-0.5 rounded-full bg-[#e8f0fe] text-[#1a73e8] font-bold border border-[#d2e3fc]">
                  Admin Control Center
                </span>
              </div>

              {/* Right Action Icons */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Link
                  href="/api/auth/logout"
                  className="py-1.5 px-3 rounded-lg border border-[#dadce0] hover:bg-[#f1f3f4] text-xs font-semibold flex items-center space-x-1.5 text-[#5f6368] transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Link>
              </div>
            </div>
          </header>

          {/* Main Layout Body */}
          <div className="flex-1 flex w-full relative">
            {sidebarOpen && (
              <div
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-slate-900/30 z-20 md:hidden backdrop-blur-xs"
              />
            )}

            {/* Left Navigation Drawer */}
            <aside
              className={`bg-white border-r border-[#dadce0] transition-all duration-300 ease-in-out flex flex-col justify-between z-30 fixed md:sticky top-[53px] h-[calc(100vh-53px)] ${
                sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:w-16'
              }`}
            >
              <div className="p-3 space-y-6 overflow-y-auto">
                <div className="space-y-1">
                  <div className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#5f6368] ${!sidebarOpen && 'hidden md:hidden'}`}>
                    Control Modules
                  </div>

                  {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group text-xs font-medium ${
                          isActive
                            ? 'bg-[#e8f0fe] text-[#1a73e8] font-bold shadow-xs'
                            : 'text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#202124]'
                        }`}
                        title={item.label}
                      >
                        <div className="flex items-center space-x-3 truncate">
                          <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#1a73e8]' : item.color}`} />
                          <span className={`truncate ${!sidebarOpen && 'hidden md:hidden'}`}>{item.label}</span>
                        </div>

                        {sidebarOpen && item.badge && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            isActive ? 'bg-[#1a73e8] text-white border-[#1a73e8]' : 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Drawer Footer User Profile */}
              <div className="p-3 border-t border-[#dadce0] bg-[#f8f9fa]">
                <div className={`flex items-center space-x-3 p-2 rounded-xl bg-white border border-[#dadce0] ${!sidebarOpen && 'justify-center'}`}>
                  <div className="w-8 h-8 rounded-full bg-[#e8f0fe] text-[#1a73e8] font-bold flex items-center justify-center text-xs flex-shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  {sidebarOpen && (
                    <div className="space-y-0.5 truncate">
                      <p className="text-xs font-bold text-[#202124] truncate">Super Admin Console</p>
                      <p className="text-[10px] text-[#137333] font-bold font-mono">prathameshpvadde2004</p>
                    </div>
                  )}
                </div>
              </div>
            </aside>

            {/* Main Content Body */}
            <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
