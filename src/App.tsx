/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CRMDashboard } from './components/CRMDashboard';
import { CustomerMobileApp } from './components/CustomerMobileApp';
import { WebsiteForm } from './components/WebsiteForm';
import { Database, Laptop, Smartphone, Globe } from 'lucide-react';

export default function App() {
  const [activePane, setActivePane] = useState<'all' | 'crm' | 'customer' | 'website'>('all');

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-150 flex flex-col font-sans select-none antialiased">
      
      {/* 1. MASTER WORKSPACE MAIN HEADER */}
      <nav className="bg-slate-950 px-6 py-2 flex flex-col md:flex-row items-center justify-between border-b border-slate-900 shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-serif text-base sm:text-lg font-bold tracking-wider text-slate-50 leading-tight">
              Nirmaan Avakh Developers
            </h1>
            <p className="text-[10px] uppercase font-mono tracking-widest text-[#D29E2E] mt-0.5 font-bold">
              Integrated Enterprise CRM & client Mobile Hub
            </p>
          </div>
        </div>

        {/* Workspace Views controller */}
        <div className="flex gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs text-slate-300">
          <button
            onClick={() => setActivePane('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all transition-colors cursor-pointer ${
              activePane === 'all' ? 'bg-[#0f2942] text-[#D29E2E] shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            🧩 Show All Panels
          </button>
          <button
            onClick={() => setActivePane('crm')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all transition-colors cursor-pointer ${
              activePane === 'crm' ? 'bg-[#0f2942] text-[#D29E2E] shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            📋 CRM Dashboard
          </button>
          <button
            onClick={() => setActivePane('customer')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all transition-colors cursor-pointer ${
              activePane === 'customer' ? 'bg-[#0f2942] text-[#D29E2E] shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            📱 Customer Mobile App
          </button>
          <button
            onClick={() => setActivePane('website')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all transition-colors cursor-pointer ${
              activePane === 'website' ? 'bg-[#0f2942] text-[#D29E2E] shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            🌐 Public Website Gateway
          </button>
        </div>

        {/* Cloud database synchronized security notification badge */}
        <div className="flex items-center gap-1.5 bg-[#D29E2E]/10 border border-[#D29E2E]/25 text-[#D29E2E] font-bold py-1 px-3 rounded text-[10px] uppercase font-mono shadow-sm">
          <Database className="w-4 h-4" />
          <span>Unified production Database</span>
        </div>
      </nav>

      {/* 2. THE THREE-PANEL COMPREHENSIVE PRODUCTION GRID ENVIRONMENT */}
      <main className="grow overflow-hidden grid grid-cols-1 xl:grid-cols-12 gap-6 p-6 relative">
        
        {/* PANEL A: WWW.NIRMAANAVAKHDEVELOPERS.COM WEB REGISTRATION GATEWAY */}
        {(activePane === 'all' || activePane === 'website') && (
          <div className={`${
            activePane === 'website' ? 'xl:col-span-12' : 'xl:col-span-3'
          } flex flex-col overflow-hidden h-full`}>
            <WebsiteForm />
          </div>
        )}

        {/* PANEL B: ENTERPRISE COHESIVE EXECUTIVE CRM DASHBOARD */}
        {(activePane === 'all' || activePane === 'crm') && (
          <div className={`${
            activePane === 'crm'
              ? 'xl:col-span-12'
              : activePane === 'all'
                ? 'xl:col-span-7'
                : 'hidden'
          } bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col h-full`}>
            <CRMDashboard />
          </div>
        )}

        {/* PANEL C: CUSTOMER SMARTPHONE APPLICATION PORTAL */}
        {(activePane === 'all' || activePane === 'customer') && (
          <div className={`${
            activePane === 'customer'
              ? 'xl:col-span-12'
              : activePane === 'all'
                ? 'xl:col-span-2'
                : 'hidden'
          } flex flex-col justify-between overflow-hidden h-full`}>
            <CustomerMobileApp />
          </div>
        )}

      </main>

      {/* 3. COHESIVE SYSTEM FOOTER */}
      <footer className="bg-slate-950 px-6 py-4.5 border-t border-slate-900 shrink-0 text-slate-500 text-xs flex flex-col md:flex-row justify-between items-center gap-3 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#D29E2E] rounded-full"></span>
          <span>Nirmaan Avakh Developers Systems Hub © 2026</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] text-slate-450 text-slate-400">
          <span className="font-extrabold text-slate-500">REALTIME ENTERPRISE SPECIFICATION DEPLOYED:</span>
          <span>⚡ Supabase Authentication</span>
          <span>⚡ PostgreSQL Trigger Pipeline</span>
          <span>⚡ React 19 Engine</span>
          <span>⚡ Tailwind v4 CSS</span>
        </div>
      </footer>

    </div>
  );
}
