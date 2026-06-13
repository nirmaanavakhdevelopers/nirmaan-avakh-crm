/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../data/mockDatabase';
import { Logo } from './Logo';
import {
  Project,
  Plot,
  Lead,
  Customer,
  PaymentSummary,
  Installment,
  LegalDocument,
  LeadStatus,
  LeadSource
} from '../types';
import {
  Search,
  Plus,
  Users,
  Building,
  CreditCard,
  FileCheck,
  Activity,
  PlusCircle,
  Filter,
  Trash2,
  Lock,
  Database,
  RefreshCw,
  Copy,
  Terminal,
  ActivitySquare,
  ShieldCheck,
  Check,
  Clock,
  TrendingUp,
  AlertCircle,
  DollarSign,
  MapPin,
  Calendar,
  Briefcase,
  User,
  ExternalLink,
  ChevronRight,
  LogOut,
  Sliders,
  AlertTriangle,
  Smartphone,
  Info
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { DEPLOYMENT_SQL, supabase } from '../data/supabaseClient';

export const CRMDashboard: React.FC = () => {
  // Subscription states
  const [projects, setProjects] = useState<Project[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [legalDocs, setLegalDocs] = useState<LegalDocument[]>([]);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'analytics' | 'leads' | 'inventory' | 'payments' | 'legal'>('analytics');

  // Search/Filter states
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all');
  const [plotSearch, setPlotSearch] = useState('');
  const [plotStatusFilter, setPlotStatusFilter] = useState<'all' | 'available' | 'reserved' | 'sold'>('all');

  // New plot database addition state
  const [newPlotProjId, setNewPlotProjId] = useState('proj_assam_valley');
  const [newPlotNumber, setNewPlotNumber] = useState('');
  const [newPlotSize, setNewPlotSize] = useState(3.5);

  // Walk-In Lead Manual Creation state
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [manualLeadName, setManualLeadName] = useState('');
  const [manualLeadPhone, setManualLeadPhone] = useState('');
  const [manualLeadEmail, setManualLeadEmail] = useState('');

  // --- ROLE AUTHENTICATION STATES ---
  type CRMUserRole = 'super_admin' | 'admin' | 'sales_executive' | 'customer';
  const [activeRole, setActiveRole] = useState<CRMUserRole>('super_admin');
  
  // Selected simulation customer when activeRole is 'customer'
  const [selectedCustomerId, setSelectedCustomerId] = useState('cust_gitartha');

  // Support & Site Inspection States
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [siteVisits, setSiteVisits] = useState<any[]>([]);
  const [hubTab, setHubTab] = useState<'tickets' | 'visits'>('tickets');

  // --- SUPABASE DYNAMIC CONFIGURATION STATE ---
  const [showDbConsole, setShowDbConsole] = useState(false);
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(db.supabaseUrl || '');
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(db.supabaseAnonKey || '');
  const [syncMessage, setSyncMessage] = useState({ text: '', type: 'info' });
  const [sqlCopied, setSqlCopied] = useState(false);

  // Load datasets on mount and subscribe to DB
  useEffect(() => {
    refreshAllData();
    const unsubscribe = db.subscribe(() => {
      refreshAllData();
    });
    return unsubscribe;
  }, []);

  const refreshAllData = async () => {
    setProjects([...db.projects]);
    setPlots([...db.plots]);
    setLeads([...db.leads]);
    setCustomers([...db.customers]);
    setPayments([...db.payments]);
    setInstallments([...db.installments]);
    setLegalDocs([...db.legalDocuments]);
    setSyncLogs([...db.syncLogs]);
    setSupportTickets(db.supportTickets ? [...db.supportTickets] : []);
    
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('site_visits')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          const mapped = data.map((v: any) => {
            if (v.feedback && v.feedback.trim().startsWith('{')) {
              try {
                const meta = JSON.parse(v.feedback);
                return {
                  ...v,
                  project_name: v.project_name || meta.project_name,
                  customer_full_name: v.customer_full_name || meta.customer_full_name,
                  customer_phone_number: v.customer_phone_number || meta.customer_phone_number,
                  customer_email: v.customer_email || meta.customer_email,
                  visit_time: v.visit_time || meta.visit_time,
                  created_at: v.created_at || meta.created_at
                };
              } catch (e) {
                // ignore
              }
            }
            return v;
          });
          setSiteVisits(mapped);
          db.siteVisits = mapped;
          return;
        }
      } catch (err) {
        console.error("Live Supabase fetch error inside CRM dashboard:", err);
      }
    }
    setSiteVisits(db.siteVisits ? [...db.siteVisits] : []);
  };

  const handleUpdateTicketStatus = (ticketId: string, newStatus: 'open' | 'in-progress' | 'resolved') => {
    const t = db.supportTickets.find(ticket => ticket.id === ticketId);
    if (t) {
      t.status = newStatus;
      db.createAuditLog(
        getActiveUserMetadata().id,
        getActiveUserMetadata().name,
        'TICKET_STATUS_UPDATE',
        'support_tickets',
        null,
        { id: ticketId, status: newStatus }
      );
      db.save();
      db.safeSupabaseWrite('support_tickets', t, 'update');
    }
  };

  const handleUpdateSiteVisitStatus = async (visitId: string, newStatus: 'scheduled' | 'confirmed' | 'completed' | 'cancelled') => {
    const v = db.siteVisits.find(sv => sv.id === visitId);
    if (v) {
      v.status = newStatus;
      db.save();
      
      try {
        if (supabase) {
          const { error } = await supabase
            .from('site_visits')
            .update({ status: newStatus })
            .eq('id', visitId);
          if (error) {
            console.error("Failed to update status on Supabase:", error);
          }
        } else {
          db.safeSupabaseWrite('site_visits', v, 'update');
        }
      } catch (err) {
        console.error("Database status sync failure:", err);
      }
      
      // Sync local CRM state views immediately
      refreshAllData();
    }
  };

  // Helper to map current active Role to names
  const getActiveUserMetadata = () => {
    switch (activeRole) {
      case 'super_admin':
        return { id: 'usr_super_admin', name: 'Abhinav Avakh Sharma', designation: 'Super Admin / Director', code: 'S-ADM' };
      case 'admin':
        return { id: 'usr_admin', name: 'Anupam Saikia', designation: 'Corporate Administrator', code: 'ADM' };
      case 'sales_executive':
        return { id: 'usr_sales_exec', name: 'Rupali Das', designation: 'Senior Sales Executive', code: 'SALES' };
      case 'customer':
        const cust = db.customers.find(c => c.id === selectedCustomerId);
        return { id: cust?.id || 'usr_customer', name: cust?.full_name || 'Gitartha Baruah', designation: 'Township Customer Node', code: 'CLIENT' };
    }
  };

  const activeUser = getActiveUserMetadata();

  // --- SUPABASE OPERATIONS ---
  const handleVerifyAndLinkSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncMessage({ text: 'Connecting & testing queries...', type: 'info' });
    
    const result = await db.updateSupabaseCredentials(supabaseUrlInput, supabaseKeyInput);
    if (result.success) {
      setSyncMessage({ text: result.message, type: 'success' });
      setTimeout(() => setSyncMessage({ text: '', type: 'info' }), 5000);
    } else {
      setSyncMessage({ text: result.message, type: 'error' });
    }
  };

  const handleSqlCopy = () => {
    navigator.clipboard.writeText(DEPLOYMENT_SQL);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2500);
  };

  // --- ROLE AND SECURITY ACTIONS CHECKER ---
  const checkPermission = (allowedRoles: CRMUserRole[], actionName: string): boolean => {
    if (allowedRoles.includes(activeRole)) return true;
    
    alert(`🔐 SECURITY BARRIER: Action "${actionName}" is not permitted for role: ${activeRole.replace('_', ' ').toUpperCase()}.\n\nPlease select "Super Admin" or "Admin" in the Deployed Session Bar above to override.`);
    return false;
  };

  // --- CRUD ACTIONS ACTIONS HANDLERS ---
  const handleCreateManualLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkPermission(['super_admin', 'admin', 'sales_executive'], 'Create Manual Lead')) return;

    if (!manualLeadName || !manualLeadPhone) {
      alert('Walk-In Lead creation requires client name and phone number.');
      return;
    }
    db.captureWebLead({
      full_name: manualLeadName,
      phone: manualLeadPhone,
      email: manualLeadEmail || `${manualLeadName.toLowerCase().replace(/\s+/g, '')}@nirmaanavakh.com`,
      source: 'walk-in'
    });
    setShowLeadModal(false);
    setManualLeadName('');
    setManualLeadPhone('');
    setManualLeadEmail('');
  };

  const handleAddPlot = () => {
    if (!checkPermission(['super_admin', 'admin'], 'Township Catalog Expansion / Add Plot')) return;
    if (!newPlotNumber) return alert('Plot alphanumeric label is required.');
    
    db.addPlotToProject(newPlotProjId, newPlotNumber, newPlotSize);
    setNewPlotNumber('');
    setNewPlotSize(3.5);
  };

  const handleAssignPlotCustomer = (plotId: string, status: 'available' | 'reserved' | 'sold', customerId: string | null) => {
    if (!checkPermission(['super_admin', 'admin'], 'Execute Property Booking Registry')) return;
    db.updatePlotStatus(plotId, status, customerId, activeUser.id, activeUser.name);
  };

  const handleAdminRecordPayment = (instId: string) => {
    if (!checkPermission(['super_admin', 'admin'], 'Record & Approve Ledger Collections')) return;
    db.recordInvoicePayment(instId, null, activeUser.id, activeUser.name);
  };

  const handleUpdateLegalDocumentMilestone = (docId: string, stg: any, fileUrl: string) => {
    if (!checkPermission(['super_admin', 'admin'], 'Sign-off Legal Escrow Milestone')) return;
    db.updateLegalMilestone(docId, stg, fileUrl, activeUser.id, activeUser.name);
  };

  // Match raw database LeadStatus code to the official 6 Lead Pipeline stages
  const getPipelineLabel = (rawStatus: LeadStatus) => {
    switch (rawStatus) {
      case 'new': return 'New Lead';
      case 'contacted': return 'Contacted';
      case 'site_visit': return 'Site Visit Scheduled';
      case 'negotiation': return 'Negotiation';
      case 'won': return 'Booked';
      case 'lost': return 'Closed';
      default: return 'New Lead';
    }
  };

  // Convert Lecha to Square Feet (Assam units: 1 Lecha = 144 Sq Ft)
  const lechaToSqFt = (lecha: number) => {
    return Math.round(lecha * 144);
  };

  // Helper to lookup project details
  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'Nirmaan Premium Township';
  };

  // --- ANALYTICS GENERAL FORMULAS ---
  const getCorporateStats = () => {
    const totalProjects = projects.length;
    const totalAvailablePlots = plots.filter(p => p.status === 'available').length;
    const totalSoldPlots = plots.filter(p => p.status === 'sold').length;
    const activeLeads = leads.filter(l => l.status !== 'won' && l.status !== 'lost').length;
    const pendingPayments = installments.filter(i => i.status !== 'paid').length;
    
    // Calculate construction milestones as plots with some progress
    const legalCasesInProgress = plots.filter(p => {
      if (p.status !== 'sold' && p.status !== 'reserved') return false;
      const plotDocs = legalDocs.filter(d => d.plot_id === p.id);
      return plotDocs.some(d => d.status !== 'completed');
    }).length;

    // Sum of paid installments within the actual dataset
    const monthlyRevenue = installments.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);

    return {
      totalProjects,
      totalAvailablePlots,
      totalSoldPlots,
      activeLeads,
      pendingPayments,
      legalCasesInProgress,
      monthlyRevenue
    };
  };

  const corporateStats = getCorporateStats();

  const chartData = [
    { name: 'Available Space', value: corporateStats.totalAvailablePlots, color: '#10B981' },
    { name: 'Sold Units', value: corporateStats.totalSoldPlots, color: '#0F2942' },
    { name: 'Reserved Space', value: plots.filter(p => p.status === 'reserved').length, color: '#D29E2E' }
  ];

  const leadChartData = () => {
    const counts = { 'New Lead': 0, 'Contacted': 0, 'Site Visit': 0, 'Negotiation': 0, 'Booked': 0, 'Closed': 0 };
    leads.forEach(l => {
      if (l.status === 'new') counts['New Lead']++;
      else if (l.status === 'contacted') counts['Contacted']++;
      else if (l.status === 'site_visit') counts['Site Visit']++;
      else if (l.status === 'negotiation') counts['Negotiation']++;
      else if (l.status === 'won') counts['Booked']++;
      else if (l.status === 'lost') counts['Closed']++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  return (
    <div className="bg-[#FAF9F5] text-slate-800 flex flex-col h-full overflow-hidden font-sans">
      
      {/* 1. ENTERPRISE EXECUTIVE HEADER WITH REFINED OFFICIAL THEME */}
      <header className="bg-[#0F2942] text-white px-6 py-4.5 flex flex-col lg:flex-row items-center justify-between shadow-md shrink-0 border-b-2 border-[#D29E2E] gap-4">
        <div className="flex items-center gap-6 sm:gap-8 py-1">
          <div className="shrink-0 bg-white/5 p-1.5 rounded-lg border border-white/10">
            <Logo minimal={true} className="h-14 sm:h-18 md:h-20 w-auto transition-all" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-wider leading-tight whitespace-nowrap select-none">
              Nirmaan Avakh Developers
            </h1>
            <h2 className="text-[11px] sm:text-xs font-bold tracking-[0.25em] text-[#D29E2E] uppercase mt-1 leading-none whitespace-nowrap select-none">
              Enterprise Executive CRM Portal
            </h2>
          </div>
        </div>

        {/* Real-time Status Badge & Database Connection Indicator */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 py-1">
          <button
            onClick={() => checkPermission(['super_admin'], 'Open Supabase Control Settings') && setShowDbConsole(!showDbConsole)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono transition-all cursor-pointer ${
              db.isSupabaseConnected 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-500 border border-amber-500/25 hover:bg-amber-500/20'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{db.isSupabaseConnected ? 'CLOUD: SUPABASE ACTIVE' : 'LOCAL CACHE FALLBACK'}</span>
          </button>
          
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#0a1b2d] rounded text-[10px] font-mono border border-white/5 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-extrabold text-[9px] tracking-wider text-slate-400 uppercase">NIRMAAN AVAKH CENTRAL DATABASE</span>
          </div>
        </div>
      </header>

      {/* 2. THE DYNAMIC MULTI-ROLE EXECUTIVE ACTIVE SESSION CONTROL BAR */}
      <section className="bg-slate-900 text-slate-200 px-6 py-2.5 flex flex-col md:flex-row items-center justify-between border-b border-slate-800 gap-3 shrink-0 select-none shadow">
        <div className="flex items-center gap-3">
          <div className="bg-[#D29E2E]/20 p-1.5 rounded text-[#D29E2E]">
            <LocateProfileIcon role={activeRole} />
          </div>
          <div className="text-left">
            <p className="text-[9px] uppercase font-mono tracking-widest text-[#D29E2E] font-extrabold leading-none">
              ACTIVE AUTHENTICATED SESSION
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-white leading-tight">{activeUser.name}</span>
              <span className="bg-white/10 text-slate-300 text-[8px] font-extrabold font-mono uppercase px-1.5 py-0.5 rounded border border-white/5 leading-none">
                {activeUser.designation}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Interactive Role Switcher Drawer */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase hidden sm:inline">
            Switch Simulation Identity:
          </span>
          <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {[
              { id: 'super_admin', label: 'Super Admin', authLevel: 'S-ADM' },
              { id: 'admin', label: 'Admin', authLevel: 'ADM' },
              { id: 'sales_executive', label: 'Sales Exec', authLevel: 'SALES' },
              { id: 'customer', label: 'Customer Only', authLevel: 'CLIENT' }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => {
                  setActiveRole(btn.id as any);
                  if (btn.id === 'customer') {
                    setActiveTab('analytics'); // Reset to view personal metrics
                  }
                }}
                className={`px-2.5 py-1 rounded text-[9px] font-mono font-extrabold tracking-wider transition-all cursor-pointer uppercase ${
                  activeRole === btn.id
                    ? 'bg-[#0f2942] text-[#D29E2E] shadow font-black border border-[#D29E2E]/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Quick simulation customer drawer */}
          {activeRole === 'customer' && (
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="p-1 px-1.5 bg-slate-950 border border-slate-800 rounded font-mono text-[9px] text-[#D29E2E] focus:outline-none font-bold cursor-pointer uppercase"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  👤 {c.full_name}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      {/* --- COLLAPSIBLE ADVANCED SUPABASE CLOUD MANAGEMENT PANEL --- */}
      {showDbConsole && activeRole === 'super_admin' && (
        <section className="bg-slate-950 text-slate-100 border-b border-slate-800 shadow-inner grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 max-h-[420px] overflow-y-auto shrink-0 animate-fade-in relative z-20">
          <div className="lg:col-span-4 space-y-3.5">
            <div>
              <h3 className="font-serif text-sm font-bold text-white tracking-wide">
                Supabase Connection Manager
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Link and provision any global PostgreSQL instance safely using SSL encryption.
              </p>
            </div>

            <form onSubmit={handleVerifyAndLinkSupabase} className="space-y-2.5 text-xs">
              <div>
                <label className="text-[9px] font-bold font-mono uppercase tracking-wider text-slate-400 block mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  placeholder="e.g. https://xyz.supabase.co"
                  value={supabaseUrlInput}
                  onChange={(e) => setSupabaseUrlInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-[11px] text-[#D29E2E] font-mono focus:outline-none focus:border-[#D29E2E]"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold font-mono uppercase tracking-wider text-slate-400 block mb-1">
                  Anon API Public Secret Key
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOi..."
                  value={supabaseKeyInput}
                  onChange={(e) => setSupabaseKeyInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-[11px] text-[#D29E2E] font-mono focus:outline-none focus:border-[#D29E2E]"
                />
              </div>

              {syncMessage.text && (
                <div className={`p-2 rounded text-[10px] font-mono border ${
                  syncMessage.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                    : syncMessage.type === 'error' 
                      ? 'bg-red-500/10 border-red-500/25 text-red-400'
                      : 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400'
                }`}>
                  {syncMessage.text}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 bg-[#D29E2E] text-slate-950 hover:bg-[#b08320] text-[10px] font-extrabold uppercase py-1.5 px-3 rounded cursor-pointer text-center font-mono"
                >
                  Verify & Connect Database
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSupabaseUrlInput('');
                    setSupabaseKeyInput('');
                    db.updateSupabaseCredentials('', '');
                  }}
                  className="bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850 text-[10px] py-1.5 px-3 rounded cursor-pointer font-mono border border-slate-800"
                >
                  Disconnect
                </button>
              </div>
            </form>

            {/* Sync trigger operations */}
            <div className="pt-2.5 border-t border-slate-900 space-y-2">
              <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-slate-500 block">
                Synchronizer Tasks
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => db.pushAllToSupabase()}
                  className="flex items-center justify-center gap-1 bg-slate-900 text-white border border-slate-800 hover:bg-slate-850 px-2 py-1.5 rounded text-[10px] font-bold font-mono cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-[#D29E2E]" />
                  <span>Push Local ➜ Cloud</span>
                </button>
                <button
                  type="button"
                  onClick={() => db.pullFromSupabase()}
                  className="flex items-center justify-center gap-1 bg-slate-900 text-white border border-slate-800 hover:bg-slate-850 px-2 py-1.5 rounded text-[10px] font-bold font-mono cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-[#D29E2E]" />
                  <span>Pull Cloud ➜ Local</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col h-full bg-slate-900 border border-slate-850 rounded-lg overflow-hidden">
            <div className="bg-slate-850 px-3.5 py-1.5 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#D29E2E]" />
                <span className="text-[10px] font-bold font-mono tracking-wider text-white uppercase">
                  Terminal Synchronizer Streams Log
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  db.syncLogs = ['Terminal log clear. Syncing active...'];
                  refreshAllData();
                }}
                className="text-slate-500 hover:text-slate-300 text-[8px] font-mono uppercase tracking-wider block"
              >
                Clear Log
              </button>
            </div>
            <div className="grow overflow-y-auto p-3 font-mono text-[9px] text-[#D29E2E] space-y-1 h-[220px] select-text">
              {syncLogs.length === 0 ? (
                <p className="text-slate-500 italic">No transactions captured yet. Trigger actions below to sync...</p>
              ) : (
                syncLogs.map((log, index) => (
                  <p key={index} className="leading-relaxed border-b border-black/10 pb-0.5 whitespace-pre-wrap">
                    {log}
                  </p>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-3 flex flex-col h-full bg-[#0A1B2D]/40 border border-slate-855 rounded-lg overflow-hidden p-3.5 space-y-2 text-xs text-slate-350">
            <h4 className="font-serif text-white font-bold text-xs tracking-wide">
              PostgreSQL Schema Provisioning
            </h4>
            <p className="text-[9.5px] leading-relaxed text-slate-400">
              Run this official DDL script inside your Supabase dashboard to provision tables instantly, complete with pre-configured schemas and public read-write row status security!
            </p>
            <button
              onClick={handleSqlCopy}
              className={`w-full py-2 px-3 rounded font-mono text-[10px] font-extrabold uppercase border tracking-wider transition-all cursor-pointer block text-center ${
                sqlCopied 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-[#D29E2E]/10 text-[#D29E2E] border-[#D29E2E]/30 hover:bg-[#D29E2E]/20'
              }`}
            >
              {sqlCopied ? '✓ Copied SQL to Clipboard!' : '❐ Copy SQL Setup Script'}
            </button>
            <div className="grow border border-slate-800 rounded p-2 bg-slate-950 font-mono text-[8px] overflow-hidden text-slate-500 select-all max-h-[140px] overflow-y-auto">
              {DEPLOYMENT_SQL.substr(0, 500)}...
            </div>
          </div>
        </section>
      )}

      {/* -------------------- MAIN DASHBOARD CONTROLS -------------------- */}
      {activeRole === 'customer' ? (
        /* --- CUSTOMER DASHBOARD DOCK OVERRIDE --- */
        <div className="grow overflow-y-auto p-6 space-y-6">
          <div className="bg-[#0F2942] rounded-2xl p-5 border border-[#D29E2E]/40 shadow-xl text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-12 -translate-y-12">
              <Logo minimal={true} className="h-64 w-auto" />
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 relative z-10">
              <div>
                <span className="bg-[#D29E2E]/20 text-[#D29E2E] text-[9px] font-mono tracking-widest font-extrabold uppercase py-1 px-2.5 border border-[#D29E2E]/30 rounded-full">
                  Nirmaan Avakh Client Portal
                </span>
                <h2 className="text-2xl font-serif font-black text-white mt-1.5">
                  Welcome back, {activeUser.name}!
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  View structural construction roadmap updates, payment schedules, and verified digital receipts.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="text-right bg-black/20 p-2.5 rounded-lg border border-white/5 font-mono">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Connected Phone</span>
                  <span className="text-xs font-bold text-slate-100">{db.customers.find(c => c.id === selectedCustomerId)?.phone || 'None Selected'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Customer Column Left: Documents & Plot Metadata */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Plots Linked */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-serif text-slate-800 font-bold text-sm tracking-wide flex items-center gap-2">
                    <Building className="w-4 h-4 text-[#D29E2E]" />
                    Registered Properties
                  </h3>
                  <span className="font-mono text-[10px] text-slate-400">Guwahati Division</span>
                </div>

                {plots.filter(p => p.customer_id === selectedCustomerId).length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-gray-205 rounded-xl text-slate-400 text-xs">
                    No active property registry was found linked to your verified account phone.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {plots.filter(p => p.customer_id === selectedCustomerId).map((plot) => {
                      const payment = payments.find(p => p.plot_id === plot.id);
                      return (
                        <div key={plot.id} className="border border-gray-100 rounded-xl p-4 space-y-3.5 bg-slate-50/50">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-bold">
                                {getProjectName(plot.project_id)}
                              </span>
                              <span className="text-base font-bold text-slate-800 mt-0.5 block">
                                Plot Unit {plot.plot_number}
                              </span>
                            </div>
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full border border-emerald-200">
                              {plot.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs border-y border-gray-200/60 py-2.5 my-2">
                            <div>
                              <span className="text-gray-400 block text-[9px]">Plot Area Size</span>
                              <span className="font-bold text-slate-800 font-mono">{plot.size_lecha} Lechas</span>
                              <span className="text-gray-450 block text-[8px] font-mono text-slate-400">({lechaToSqFt(plot.size_lecha)} Sq Ft)</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-[9px]">Agreement Price</span>
                              <span className="font-bold text-slate-800 font-mono">₹{plot.price.toLocaleString()}</span>
                            </div>
                          </div>

                          {payment && (
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-gray-500 font-bold">Payment Progress:</span>
                                <span className="text-slate-800 font-mono font-bold">
                                  {Math.round((payment.paid_amount / payment.total_amount) * 100)}% Clear
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-[#D29E2E] h-1.5 rounded-full" 
                                  style={{ width: `${Math.min(100, (payment.paid_amount / payment.total_amount) * 100)}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between items-center text-[9px] text-[#D29E2E] font-mono leading-none pt-1">
                                <span>Paid: ₹{payment.paid_amount.toLocaleString()}</span>
                                <span className="text-red-500">O/S: ₹{payment.balance_outstanding.toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Legal Documentation milestones timeline */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-serif text-slate-800 font-bold text-sm tracking-wide flex items-center gap-2">
                    <FileCheck className="w-4.5 h-4.5 text-[#D29E2E]" />
                    Legal Roadmap & Title Escrow Progress
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">Verified Deed Progression</span>
                </div>

                {plots.filter(p => p.customer_id === selectedCustomerId).length === 0 ? (
                  <div className="p-4 text-center bg-slate-50 border border-gray-200 rounded-xl text-slate-400 text-xs text-slate-400 italic">
                    Configure your property above to review structural title records.
                  </div>
                ) : (
                  plots.filter(p => p.customer_id === selectedCustomerId).map((plot) => {
                    const docs = legalDocs.filter(d => d.plot_id === plot.id);
                    return (
                      <div key={plot.id} className="border border-gray-150 rounded-xl p-4 bg-slate-50/20 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700">Deed Track for Plot {plot.plot_number}</span>
                          <span className="text-[10px] text-slate-500 font-mono">Assigned Counsel: Debojit Goswami</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                          {['agreement', 'permission', 'trace_map', 'sale_deed', 'mutation'].map((stType, index) => {
                            const curDoc = docs.find(d => d.type === stType);
                            const stLabel = stType.toUpperCase().replace('_', ' ');
                            const isCompleted = curDoc?.status === 'completed';
                            const isProcessing = curDoc?.status === 'processing';
                            
                            return (
                              <div 
                                key={stType} 
                                className={`p-2.5 rounded-lg border text-center transition-all ${
                                  isCompleted 
                                    ? 'bg-emerald-50 border-emerald-250 text-emerald-800 shadow-sm'
                                    : isProcessing 
                                      ? 'bg-amber-50 border-amber-250 text-amber-800 animate-pulse'
                                      : 'bg-white border-gray-150 text-slate-400'
                                }`}
                              >
                                <span className="text-[9px] font-mono block uppercase font-bold text-slate-400">{index + 1}. STAGE</span>
                                <span className="font-serif text-[11px] font-bold block mt-1 leading-tight">{stLabel}</span>
                                <span className={`text-[8px] font-bold block mt-1.5 uppercase font-mono ${
                                  isCompleted ? 'text-emerald-600' : isProcessing ? 'text-amber-600' : 'text-slate-400'
                                }`}>
                                  {curDoc?.status || 'drafting'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Customer Column Right: Installments schedule & support history */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Payment Installments */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-serif text-slate-800 font-bold text-sm tracking-wide flex items-center gap-2 border-b border-gray-100 pb-3">
                  <CreditCard className="w-4 h-4 text-[#D29E2E]" />
                  Ledger Due Ledger
                </h3>

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {plots.filter(p => p.customer_id === selectedCustomerId).map((plot) => {
                    const payment = payments.find(p => p.plot_id === plot.id);
                    if (!payment) return null;
                    const insts = installments.filter(i => i.payment_id === payment.id);
                    return (
                      <div key={plot.id} className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 font-mono block uppercase">Plot Unit {plot.plot_number} Dues</span>
                        {insts.length === 0 ? (
                          <p className="text-[11px] text-gray-500 italic">No payments processed.</p>
                        ) : (
                          insts.map((inst, index) => (
                            <div key={inst.id} className="p-3 bg-slate-50 border border-gray-100 rounded-lg flex justify-between items-center text-xs">
                              <div>
                                <div className="font-semibold text-slate-800">₹{inst.amount.toLocaleString()}</div>
                                <div className="text-[9px] text-gray-400 mt-0.5">Due Date: {inst.due_date} ({index + 1}/4)</div>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase font-mono border ${
                                  inst.status === 'paid'
                                    ? 'bg-green-50 border-green-200 text-green-700'
                                    : inst.status === 'overdue'
                                      ? 'bg-red-50 border-red-200 text-red-650'
                                      : 'bg-amber-50 border-amber-200 text-amber-700'
                                }`}>
                                  {inst.status}
                                </span>
                                {inst.receipt_url && (
                                  <a 
                                    href={inst.receipt_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[8px] font-bold font-mono uppercase text-[#D29E2E] hover:underline flex items-center gap-0.5"
                                  >
                                    <span>Download PDF</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile device instruction banner */}
              <div className="bg-[#FAF9F5] border border-dashed border-gray-200 rounded-xl p-4.5 space-y-3">
                <div className="flex gap-2.5">
                  <Smartphone className="w-5 h-5 text-[#0F2942] shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">
                      Looking for the Mobile App?
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-normal mt-1">
                      Use the Smartphone tab controller at the top pane of this environment workspace to load and pilot the client's direct app interface!
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      ) : (
        /* -------------------- STANDARD EXECUTIVE TAB WINDOW -------------------- */
        <>
          {/* 3. TABBED MANAGEMENT MENU RAIL */}
          <nav className="bg-slate-100 px-6 py-2 border-b border-gray-200 flex flex-col sm:flex-row gap-2 shrink-0 select-none w-full shadow-sm">
            {[
              { tabId: 'analytics', label: 'Company Overview', icon: Activity },
              { tabId: 'leads', label: 'Lead Pipeline', icon: Users },
              { tabId: 'inventory', label: 'Plot Inventory & Sales', icon: Building },
              { tabId: 'payments', label: 'Payments & Ledger', icon: CreditCard },
              { tabId: 'legal', label: 'Legal Escrow Milestones', icon: FileCheck }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.tabId}
                  onClick={() => setActiveTab(item.tabId as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3.5 rounded-lg text-xs font-bold cursor-pointer transition-all border ${
                    activeTab === item.tabId
                      ? 'bg-[#0F2942] text-white shadow border-[#D29E2E]'
                      : 'text-gray-650 bg-white border-gray-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-[#D29E2E]" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* 4. SCROLLABLE TAB PANEL WINDOW */}
          <div className="grow overflow-y-auto p-6 space-y-6">
            
            {/* --- SECTION A: ANALYTICS PRECISE OVERVIEW --- */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                
                {/* The 7 Core Metrics Ordered Rows */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Stat 1: Total Projects */}
                  <div className="bg-white rounded-2xl p-4.5 border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Projects</span>
                      <span className="text-xl font-bold text-slate-800 mt-1 block">
                        {corporateStats.totalProjects}
                      </span>
                      <span className="text-[9px] text-[#D29E2E] font-medium block mt-1">Guwahati Subdivisions</span>
                    </div>
                    <div className="p-3 bg-[#0F2942]/10 rounded-xl text-[#0F2942]">
                      <Briefcase className="w-5.5 h-5.5" />
                    </div>
                  </div>

                  {/* Stat 2: Total Available Plots */}
                  <div className="bg-white rounded-2xl p-4.5 border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Available Plots</span>
                      <span className="text-xl font-bold text-emerald-600 mt-1 block">
                        {corporateStats.totalAvailablePlots}
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-1">Open for booking allocation</span>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                      <Building className="w-5.5 h-5.5" />
                    </div>
                  </div>

                  {/* Stat 3: Total Sold Plots */}
                  <div className="bg-white rounded-2xl p-4.5 border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Sold Plots</span>
                      <span className="text-xl font-bold text-blue-600 mt-1 block">
                        {corporateStats.totalSoldPlots}
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-1">Invoicing milestone activated</span>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                      <FileCheck className="w-5.5 h-5.5" />
                    </div>
                  </div>

                  {/* Stat 4: Active Leads */}
                  <div className="bg-white rounded-2xl p-4.5 border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Active Leads</span>
                      <span className="text-xl font-bold text-slate-800 mt-1 block">
                        {corporateStats.activeLeads}
                      </span>
                      <span className="text-[9px] text-amber-600 font-bold block mt-1">Nearing booking closing</span>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl text-amber-500">
                      <Users className="w-5.5 h-5.5" />
                    </div>
                  </div>

                  {/* Stat 5: Pending Payments */}
                  <div className="bg-white rounded-2xl p-4.5 border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Pending Payments</span>
                      <span className="text-xl font-bold text-amber-600 mt-1 block">
                        {corporateStats.pendingPayments} <span className="text-xs text-slate-400">Arrears</span>
                      </span>
                      <span className="text-[9px] text-red-500 font-bold block mt-1 animate-pulse">Requires ledger reviews</span>
                    </div>
                    <div className="p-3 bg-red-50 rounded-xl text-red-500">
                      <Clock className="w-5.5 h-5.5" />
                    </div>
                  </div>

                  {/* Stat 6: Legal Milestones Pending */}
                  <div className="bg-white rounded-2xl p-4.5 border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Legal Cases In-Progress</span>
                      <span className="text-xl font-bold text-purple-600 mt-1 block">
                        {corporateStats.legalCasesInProgress}
                      </span>
                      <span className="text-[9px] text-purple-500 block mt-1">Active drafting pipeline</span>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                      <ShieldCheck className="w-5.5 h-5.5" />
                    </div>
                  </div>

                  {/* Stat 7: Total Enterprise Revenue */}
                  <div className="bg-white rounded-2xl p-4.5 border border-gray-100 sm:col-span-2 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Ledger collections</span>
                      <span className="text-2xl font-black font-serif text-[#0F2942] mt-1 block">
                        ₹{corporateStats.monthlyRevenue.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-emerald-600 font-bold block mt-1">Real-time synchronized transactions</span>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-xl text-emerald-600">
                      <DollarSign className="w-6 h-6" />
                    </div>
                  </div>

                </div>

                {/* Grid Visual Panels (Township Allocation & Pipelines) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Left: Recharts Pie Chart representing township physical allocation */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-[360px]">
                    <div>
                      <h4 className="font-serif text-slate-800 font-bold text-sm tracking-wide">
                        Township Space Allocation Analysis
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Breakdown of available, reserved, and sold plots across divisions.
                      </p>
                    </div>

                    <div className="grow relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={190}>
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value} Plots`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex justify-around items-center text-xs mt-2 border-t border-gray-100 pt-3">
                      {chartData.map((obj) => (
                        <div key={obj.name} className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: obj.color }}></span>
                          <span className="text-gray-650 font-medium">{obj.name} <strong className="font-bold font-mono text-slate-850">({obj.value})</strong></span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Lead funnel stage counts bar chart */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-[360px]">
                    <div>
                      <h4 className="font-serif text-slate-800 font-bold text-sm tracking-wide">
                        Sales Funnel Conversion Metrics
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Active pipeline volume tracking from capture node to booked deeds.
                      </p>
                    </div>

                    <div className="grow mt-3">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={leadChartData()}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748B' }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#64748B' }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#D29E2E" radius={[4, 4, 0, 0]} maxBarSize={32}>
                            {leadChartData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.name === 'Booked' ? '#10B981' : '#0F2942'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

                {/* Site Inspections & Client Assistance Hub */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-3 gap-2">
                    <div>
                      <h4 className="font-serif text-slate-800 font-bold text-sm tracking-wide flex items-center gap-2">
                        <Briefcase className="w-4.5 h-4.5 text-[#D29E2E]" />
                        Client Inspections & Support Desk
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Manage user-submitted support inquiries and site tour requests in real-time.</p>
                    </div>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg shrink-0">
                      <button
                        onClick={() => setHubTab('tickets')}
                        className={`px-3 py-1 rounded text-xs transition-all font-bold ${
                          hubTab === 'tickets' ? 'bg-[#0F2942] text-white shadow' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Support Queries ({supportTickets.length})
                      </button>
                      <button
                        onClick={() => setHubTab('visits')}
                        className={`px-3 py-1 rounded text-xs transition-all font-bold ${
                          hubTab === 'visits' ? 'bg-[#0F2942] text-white shadow' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Site Visits ({siteVisits.length})
                      </button>
                    </div>
                  </div>

                  {hubTab === 'tickets' ? (
                    <div className="overflow-x-auto">
                      {supportTickets.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          No customer queries has been logged yet. All tickets will stream here in real-time.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs text-gray-650 border-collapse">
                          <thead>
                            <tr className="border-b border-gray-100 font-mono text-[9px] uppercase tracking-wider text-slate-450 text-slate-400">
                              <th className="py-2.5">Ticket ID</th>
                              <th className="py-2.5">Client Name</th>
                              <th className="py-2.5">Client Mobile Number</th>
                              <th className="py-2.5">Message Description</th>
                              <th className="py-2.5">Status</th>
                              <th className="py-2.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100/60 font-medium">
                            {supportTickets.map((t) => (
                              <tr key={t.id} className="hover:bg-slate-50/50">
                                <td className="py-2.5 font-bold text-slate-850 font-mono text-[10px] uppercase">
                                  #{t.id}
                                </td>
                                <td className="py-2.5 font-bold text-slate-800">
                                  {t.customer_name}
                                </td>
                                <td className="py-2.5 font-mono text-[10px] text-slate-500">
                                  {t.phone}
                                </td>
                                <td className="py-2.5 max-w-xs text-slate-600 truncate italic">
                                  "{t.message}"
                                </td>
                                <td className="py-2.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold font-mono uppercase ${
                                    t.status === 'open' ? 'bg-purple-100 text-purple-700' :
                                    t.status === 'in-progress' ? 'bg-sky-100 text-sky-700' :
                                    'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {t.status}
                                  </span>
                                </td>
                                <td className="py-2.5 text-right space-x-1">
                                  {t.status !== 'in-progress' && t.status !== 'resolved' && (
                                    <button
                                      onClick={() => handleUpdateTicketStatus(t.id, 'in-progress')}
                                      className="px-2 py-0.5 bg-sky-50 text-sky-700 rounded text-[9px] font-bold hover:bg-sky-100"
                                    >
                                      Accept
                                    </button>
                                  )}
                                  {t.status !== 'resolved' && (
                                    <button
                                      onClick={() => handleUpdateTicketStatus(t.id, 'resolved')}
                                      className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-bold hover:bg-emerald-100"
                                    >
                                      Resolve
                                    </button>
                                  )}
                                  {t.status === 'resolved' && (
                                    <span className="text-[10px] text-slate-400">Closed</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      {siteVisits.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          No physical site visits scheduled yet. Real-time requests stream here automatically.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs text-gray-650 border-collapse">
                          <thead>
                            <tr className="border-b border-gray-100 font-mono text-[9px] uppercase tracking-wider text-slate-450 text-slate-400">
                              <th className="py-2.5">Visit ID</th>
                              <th className="py-2.5">Applicant Name</th>
                              <th className="py-2.5">Contact Number</th>
                              <th className="py-2.5">Target Project</th>
                              <th className="py-2.5">Date & Slot</th>
                              <th className="py-2.5">Status</th>
                              <th className="py-2.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100/60 font-medium">
                            {siteVisits.map((v) => (
                              <tr key={v.id} className="hover:bg-slate-50/50">
                                <td className="py-2.5 font-bold font-mono text-[10px] text-slate-850 uppercase">
                                  #{v.id}
                                </td>
                                <td className="py-2.5 font-bold text-slate-800">
                                  {v.fullName || v.full_name || v.customer_full_name || 'Client Lead'}
                                </td>
                                <td className="py-2.5 font-mono text-[10px] text-slate-500">
                                  {v.phone || v.customer_phone_number || 'N/A'}
                                </td>
                                <td className="py-2.5 font-sans">
                                  {v.project_name || (v.project_id === 'proj_assam_valley' ? 'Assam Valley Plots' : 'Brahmaputra Hills Township')}
                                </td>
                                <td className="py-2.5 text-slate-600 font-mono text-[10px]">
                                  {v.visit_date && v.visit_date.includes('T') ? (
                                    <div className="space-y-0.5">
                                      <span className="block font-sans text-xs text-slate-800 font-medium">
                                        {new Date(v.visit_date).toLocaleDateString()}
                                      </span>
                                      {v.visit_time && (
                                        <span className="text-[9px] text-slate-500 bg-slate-100 px-1 py-0.5 rounded font-sans">
                                          {v.visit_time}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    v.visit_date
                                  )}
                                </td>
                                <td className="py-2.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold font-mono uppercase ${
                                    v.status === 'scheduled' ? 'bg-amber-100 text-amber-700' :
                                    v.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                    v.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                    'bg-rose-100 text-rose-700'
                                  }`}>
                                    {v.status || 'scheduled'}
                                  </span>
                                </td>
                                <td className="py-2.5 text-right font-sans">
                                  <div className="flex items-center justify-end">
                                    <select
                                      value={v.status || 'scheduled'}
                                      onChange={(e) => handleUpdateSiteVisitStatus(v.id, e.target.value as any)}
                                      className="text-[10px] font-sans font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-1.5 py-0.5 rounded cursor-pointer outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                                    >
                                      <option value="scheduled">Scheduled</option>
                                      <option value="confirmed">Confirmed</option>
                                      <option value="completed">Completed</option>
                                      <option value="cancelled">Cancelled</option>
                                    </select>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>

                {/* Audit trail log overview */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <h4 className="font-serif text-slate-800 font-bold text-sm tracking-wide flex items-center gap-2">
                      <ActivitySquare className="w-4.5 h-4.5 text-[#D29E2E]" />
                      Real-time Security Audit Trails
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Tamper-Proof Ledger</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-650 border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 font-mono text-[9px] uppercase tracking-wider text-slate-450 text-slate-400">
                          <th className="py-2.5">User operator</th>
                          <th className="py-2.5">Event Action</th>
                          <th className="py-2.5">Target table</th>
                          <th className="py-2.5">New state snapshot</th>
                          <th className="py-2.5 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100/60 font-medium">
                        {db.auditLogs.slice(0, 4).map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 font-bold text-slate-800 flex items-center gap-1.5 pt-3">
                              <span className="w-1.5 h-1.5 bg-[#D29E2E] rounded-full shrink-0"></span>
                              <span>{log.user_name}</span>
                              <span className="bg-slate-100 text-slate-400 text-[8px] font-mono rounded px-1">{log.user_id}</span>
                            </td>
                            <td className="py-2.5">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-700 font-bold">
                                {log.action}
                              </span>
                            </td>
                            <td className="py-2.5 font-mono text-[10px] text-slate-450">{log.table_name}</td>
                            <td className="py-2.5 max-w-xs truncate text-[9px] font-mono text-slate-500">
                              {JSON.stringify(log.new_value)}
                            </td>
                            <td className="py-2.5 text-right font-mono text-[9px] text-[#D29E2E]">
                              {new Date(log.timestamp).toLocaleTimeString() || '09:41 AM'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* --- SECTION B: LEAD MANAGEMENT PROCESS-TRACKER --- */}
            {activeTab === 'leads' && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 pb-4.5">
                  <div>
                    <h3 className="font-serif text-slate-800 font-bold text-base tracking-wide flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#D29E2E]" />
                      Global Leads Pipeline Manager
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Filter inquiries, execute callbacks, schedule property site physical tours, and assign managers.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowLeadModal(true)}
                    className="bg-[#0F2942] hover:bg-[#1a3855] text-white py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#0f2942]/10 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-[#D29E2E]" />
                    <span>Log Manual Walk-In Lead</span>
                  </button>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col md:flex-row gap-3.5">
                  <div className="relative grow">
                    <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search active pipeline by buyer name or contact phone..."
                      value={leadSearch}
                      onChange={(e) => setLeadSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-200/80 rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:border-[#D29E2E] focus:bg-white"
                    />
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-500">
                      <Filter className="w-3.5 h-3.5 text-[#D29E2E]" />
                      <span>Stage:</span>
                      <select
                        value={leadStatusFilter}
                        onChange={(e) => setLeadStatusFilter(e.target.value)}
                        className="bg-transparent focus:outline-none cursor-pointer text-slate-800"
                      >
                        <option value="all">All Pipelines</option>
                        <option value="new">1. New Capture</option>
                        <option value="contacted">2. Call Contacted</option>
                        <option value="site_visit">3. Physical Tour Scheduled</option>
                        <option value="negotiation">4. In Negotiation</option>
                        <option value="booked">5. Won/Booked</option>
                        <option value="closed">6. Closed/Lost</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Leads Pipelines Table */}
                <div className="overflow-x-auto rounded-xl border border-gray-150">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-150 font-mono text-[9px] uppercase tracking-wider text-slate-450 text-slate-400 font-black">
                        <th className="p-3.5">Buyer Full Name</th>
                        <th className="p-3.5">Callback/Origin</th>
                        <th className="p-3.5">Enquiry channel</th>
                        <th className="p-3.5">Assigned Agent advisor</th>
                        <th className="p-3.5">Funnel Pipeline Status</th>
                        <th className="p-3.5 text-center">Manage/Escalate Status Stage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 font-semibold text-slate-700">
                      {leads
                        .filter((l) => {
                          const matchSearch =
                            l.full_name.toLowerCase().includes(leadSearch.toLowerCase()) ||
                            l.phone.includes(leadSearch);
                          
                          // match status
                          if (leadStatusFilter === 'all') return matchSearch;
                          if (leadStatusFilter === 'new') return matchSearch && l.status === 'new';
                          if (leadStatusFilter === 'contacted') return matchSearch && l.status === 'contacted';
                          if (leadStatusFilter === 'site_visit') return matchSearch && l.status === 'site_visit';
                          if (leadStatusFilter === 'negotiation') return matchSearch && l.status === 'negotiation';
                          if (leadStatusFilter === 'booked') return matchSearch && l.status === 'won';
                          if (leadStatusFilter === 'closed') return matchSearch && l.status === 'lost';
                          return matchSearch;
                        })
                        .map((lead) => (
                          <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3.5">
                              <span className="font-serif text-sm font-bold text-slate-800 block">
                                {lead.full_name}
                              </span>
                              <span className="text-[9px] text-[#D29E2E] block font-semibold font-mono mt-0.5 uppercase">
                                Score Index: {lead.score}% Quality
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className="font-mono text-xs block text-slate-800">{lead.phone}</span>
                              <span className="text-slate-400 block text-[10px]">{lead.email}</span>
                            </td>
                            <td className="p-3.5 text-[10px] font-mono font-extrabold text-slate-600">
                              {lead.source.toUpperCase()}
                            </td>
                            <td className="p-3.5">
                              <select
                                value={lead.assigned_to || ''}
                                onChange={(e) =>
                                  db.assignLead(
                                    lead.id,
                                    e.target.value || null,
                                    activeUser.id,
                                    activeUser.name
                                  )
                                }
                                className="p-1 px-1.5 bg-white border border-gray-200 rounded text-[11px] text-[#0F2942] focus:outline-none font-medium text-slate-705"
                              >
                                <option value="">Unassigned</option>
                                {db.salesTeam.map((agent) => (
                                  <option key={agent.id} value={agent.id}>
                                    {agent.full_name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                                lead.status === 'won'
                                  ? 'bg-green-100 text-green-800'
                                  : lead.status === 'lost'
                                    ? 'bg-gray-100 text-gray-800'
                                    : lead.status === 'site_visit'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'font-semibold bg-amber-100 text-amber-800'
                              }`}>
                                {getPipelineLabel(lead.status)}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center justify-center gap-1">
                                {[
                                  { st: 'new', label: 'New' },
                                  { st: 'contacted', label: 'Contacted' },
                                  { st: 'site_visit', label: 'Visit' },
                                  { st: 'negotiation', label: 'Offer' },
                                  { st: 'won', label: 'Booked' },
                                  { st: 'lost', label: 'Closed' }
                                ].map((item) => (
                                  <button
                                    key={item.st}
                                    onClick={() => {
                                      if (!checkPermission(['super_admin', 'admin', 'sales_executive'], 'Update Funnel Stage Status')) return;
                                      db.updateLeadStatus(lead.id, item.st as any, activeUser.id, activeUser.name);
                                    }}
                                    className={`px-1.5 py-1 rounded font-bold text-[8px] uppercase tracking-wider border transition-all cursor-pointer ${
                                      lead.status === item.st || (item.st === 'won' && lead.status === 'won') || (item.st === 'lost' && lead.status === 'lost')
                                        ? 'bg-[#0F2942] text-white border-[#0f2942] font-black'
                                        : 'bg-white hover:bg-slate-100 border-gray-200 text-slate-600'
                                    }`}
                                  >
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* --- SECTION C: INTEGRATED TOWNSHIP PLOT INVENTORY --- */}
            {activeTab === 'inventory' && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-5 border-b border-gray-100 pb-4.5">
                  <div>
                    <h3 className="font-serif text-slate-800 font-bold text-base tracking-wide flex items-center gap-2">
                      <Building className="w-5 h-5 text-[#D29E2E]" />
                      Guwahati Subdivisions Township Inventory Catalog
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Manage plot codes, available areas (per Lecha unit), and match customer registries.
                    </p>
                  </div>
                  
                  {/* Expanded Manual Plot Addition tool */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-200 flex flex-wrap items-center gap-3">
                    <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-500">
                      Add Plot:
                    </span>
                    <select
                      value={newPlotProjId}
                      onChange={(e) => setNewPlotProjId(e.target.value)}
                      className="p-1 px-1.5 bg-white border border-gray-200 rounded text-[11px] text-slate-800"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Unit Code e.g. A-110"
                      value={newPlotNumber}
                      onChange={(e) => setNewPlotNumber(e.target.value)}
                      className="p-1 px-1.5 bg-white border border-gray-200 rounded text-[11px] font-mono text-slate-800 w-28"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Lechas"
                      value={newPlotSize}
                      onChange={(e) => setNewPlotSize(parseFloat(e.target.value) || 3.5)}
                      className="p-1 px-1.5 bg-white border border-gray-200 rounded text-[11px] font-mono text-slate-800 w-16"
                    />
                    <button
                      type="button"
                      onClick={handleAddPlot}
                      className="bg-[#D29E2E] text-slate-950 font-bold px-3 py-1 rounded text-[11px] uppercase cursor-pointer hover:bg-[#b08320]"
                    >
                      + catalog
                    </button>
                  </div>
                </div>

                {/* Filters and search catalog */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative grow">
                    <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search inventory by custom plot number unit label..."
                      value={plotSearch}
                      onChange={(e) => setPlotSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-200/80 rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:border-[#D29E2E] focus:bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-500">
                    <Filter className="w-3.5 h-3.5 text-[#D29E2E]" />
                    <span>State:</span>
                    <select
                      value={plotStatusFilter}
                      onChange={(e) => setPlotStatusFilter(e.target.value as any)}
                      className="bg-transparent focus:outline-none cursor-pointer text-slate-850"
                    >
                      <option value="all">All Units</option>
                      <option value="available">Available Catalogs</option>
                      <option value="reserved">Reserved Slots</option>
                      <option value="sold">Fully Sold Out</option>
                    </select>
                  </div>
                </div>

                {/* Plot items visual grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {plots
                    .filter((p) => {
                      const matchNo = p.plot_number.toLowerCase().includes(plotSearch.toLowerCase());
                      const matchStat = plotStatusFilter === 'all' || p.status === plotStatusFilter;
                      return matchNo && matchStat;
                    })
                    .map((plot) => {
                      const project = projects.find(prj => prj.id === plot.project_id);
                      return (
                        <div key={plot.id} className="bg-slate-50/50 rounded-2xl p-4.5 border border-gray-200/60 shadow-sm space-y-3.5 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[9px] uppercase font-mono tracking-widest text-slate-400 block font-bold">
                                  {project?.name || 'Guwahati Unit'}
                                </span>
                                <h4 className="font-serif text-slate-800 font-bold text-base mt-0.5">
                                  Plot Unit {plot.plot_number}
                                </h4>
                              </div>
                              <span className={`text-[8px] font-black tracking-wider uppercase border px-2 py-0.5 rounded-full ${
                                plot.status === 'sold'
                                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                                  : plot.status === 'reserved'
                                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              }`}>
                                {plot.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs border-y border-gray-100 py-2.5 my-3.5">
                              <div>
                                <span className="text-gray-400 block text-[9.5px]">Plot Size</span>
                                <span className="font-bold text-slate-800 font-mono text-[13px]">{plot.size_lecha} Lechas</span>
                                <span className="text-gray-400 block text-[8px] font-mono leading-none mt-0.5">({lechaToSqFt(plot.size_lecha)} Sq Ft)</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[9.5px]">Base Price</span>
                                <span className="font-bold text-slate-850 font-mono text-[13px]">₹{plot.price.toLocaleString()}</span>
                                <span className="text-slate-400 block text-[8px] font-mono leading-none mt-0.5">Assam Standard</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-slate-400 block">
                              Link Owner/Customer Registry
                            </span>
                            <div className="flex gap-1">
                              <select
                                value={plot.customer_id || ''}
                                onChange={(e) => {
                                  const custVal = e.target.value || null;
                                  const nextSt = custVal ? 'sold' : 'available';
                                  handleAssignPlotCustomer(plot.id, nextSt, custVal);
                                }}
                                className="flex-1 p-1 px-1.5 bg-white border border-gray-200 rounded text-[10px] text-slate-800 text-slate-700"
                              >
                                <option value="">[ None/Available ]</option>
                                {customers.map(c => (
                                  <option key={c.id} value={c.id}>
                                    👤 {c.full_name}
                                  </option>
                                ))}
                              </select>
                              {plot.status !== 'available' && (
                                <button
                                  type="button"
                                  onClick={() => handleAssignPlotCustomer(plot.id, 'available', null)}
                                  className="text-red-500 hover:text-red-700 p-1 border border-red-200 hover:bg-red-50 rounded"
                                  title="Revoke Booking"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

              </div>
            )}

            {/* --- SECTION D: PAYMENTS AND COLLECTIONS LEDGER --- */}
            {activeTab === 'payments' && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                
                <div className="border-b border-gray-100 pb-4.5">
                  <h3 className="font-serif text-slate-800 font-bold text-base tracking-wide flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#D29E2E]" />
                    Central Payments, Invoices, and Dues Ledger
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Track outstanding installment schedules, record administrative financial collections, and trigger receipt cascades.
                  </p>
                </div>

                {payments.length === 0 ? (
                  <div className="p-12 text-center bg-slate-50 rounded-xl text-slate-400">
                    No active payments accounts registries detected. Link custom customers inside the plot catalog view above!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {payments.map((pay) => {
                      const plot = plots.find(p => p.id === pay.plot_id);
                      const customer = customers.find(c => c.id === pay.customer_id);
                      const insts = installments.filter(i => i.payment_id === pay.id);

                      return (
                        <div key={pay.id} className="border border-gray-200 rounded-2xl bg-[#0F2942]/5 overflow-hidden shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-1 font-medium">
                          
                          {/* Left ledger capsule summary card */}
                          <div className="lg:col-span-4 bg-[#0F2942] text-white p-5.5 space-y-4 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="bg-[#D29E2E]/20 text-[#D29E2E] text-[8px] font-black tracking-widest uppercase font-mono px-2 py-0.5 rounded-full border border-[#D29E2E]/20">
                                    LEDGER ACCOUNT ID: {pay.id}
                                  </span>
                                  <h3 className="font-serif text-white font-bold text-lg mt-2">
                                    Plot Unit {plot?.plot_number || 'TBD'}
                                  </h3>
                                  <span className="text-[10px] text-slate-450 text-slate-300 font-mono block">
                                    Buyer Ref: {customer?.full_name || 'Client Unregistered'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2 text-xs border-t border-slate-700/60 pt-4">
                              <div className="flex justify-between text-slate-350 text-slate-300">
                                <span>Agreement Value:</span>
                                <span className="font-mono font-bold text-white">₹{pay.total_amount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-slate-350 text-emerald-400">
                                <span>Total Paid to Date:</span>
                                <span className="font-mono font-bold">₹{pay.paid_amount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-slate-350 text-red-400 pt-1 border-t border-dashed border-slate-705 border-slate-700">
                                <span>Balance Outstanding:</span>
                                <span className="font-mono font-extrabold text-[13px]">₹{pay.balance_outstanding.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right installments schedule row list */}
                          <div className="lg:col-span-8 p-5.5 space-y-4 bg-white">
                            <h4 className="font-semibold text-xs text-slate-500 font-mono uppercase tracking-wider">
                              4-Stage Installment Payment Schedule
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {insts.map((inst, index) => (
                                <div key={inst.id} className="p-3 bg-slate-50 border border-gray-150 rounded-xl flex justify-between items-center text-xs">
                                  <div>
                                    <div className="text-[9px] font-mono text-slate-400 uppercase font-bold">Installment {index + 1}/4</div>
                                    <div className="font-bold text-sm text-slate-800 font-mono mt-0.5">₹{inst.amount.toLocaleString()}</div>
                                    <div className="text-[9.5px] text-slate-500 mt-1">Due Date: {inst.due_date}</div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className={`text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                                      inst.status === 'paid'
                                        ? 'bg-green-50 border-green-200 text-green-700'
                                        : inst.status === 'overdue'
                                          ? 'bg-red-50 border-red-200 text-red-700'
                                          : 'bg-amber-50 border-amber-200 text-amber-700'
                                    }`}>
                                      {inst.status}
                                    </span>
                                    {inst.status !== 'paid' ? (
                                      <button
                                        type="button"
                                        onClick={() => handleAdminRecordPayment(inst.id)}
                                        className="mt-1 text-[8px] font-black font-mono uppercase text-[#D29E2E] hover:underline bg-[#0f2942]/10 border border-[#D29E2E]/20 rounded py-0.5 px-1.5 cursor-pointer block"
                                      >
                                        Approve Payment
                                      </button>
                                    ) : (
                                      <span className="text-[8px] text-emerald-600 font-mono font-bold uppercase mt-1">✓ Verified Receipt</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            )}

            {/* --- SECTION E: LEGAL DOCUMENTS STATUS MATRIX --- */}
            {activeTab === 'legal' && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                
                <div className="border-b border-gray-100 pb-4.5">
                  <h3 className="font-serif text-slate-800 font-bold text-base tracking-wide flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-[#D29E2E]" />
                    Cohesive Title Escrow & Legal Roadmap
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage Agreement of Sale draftings, physical construction permissions, trace maps, registration deeds, and mutations.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {plots
                    .filter((p) => p.status === 'sold' || p.status === 'reserved')
                    .map((plot) => {
                      const customer = customers.find(c => c.id === plot.customer_id);
                      const docs = legalDocs.filter(d => d.plot_id === plot.id);

                      return (
                        <div key={plot.id} className="border border-gray-200 rounded-2xl p-5 space-y-4 hover:shadow-md transition-shadow">
                          <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 border-b border-gray-100 pb-3">
                            <div>
                              <span className="text-[10px] font-bold font-mono tracking-widest text-[#D29E2E] uppercase">
                                Property Gated Timeline Node
                              </span>
                              <h3 className="font-serif text-slate-850 font-bold text-base mt-0.5">
                                Plot Unit {plot.plot_number} ({getProjectName(plot.project_id)})
                              </h3>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-800 text-xs font-bold font-serif whitespace-nowrap block">
                                Owner: {customer?.full_name || 'Client Registrar'}
                              </span>
                              <span className="text-[10px] text-cyan-600 block leading-none font-mono tracking-widest uppercase mt-1">
                                Physical Counsel: Debojit Goswami
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 pt-1.5">
                            {docs.map((doc) => {
                              return (
                                <div key={doc.id} className="bg-slate-50 border border-gray-150 rounded-xl p-3 flex flex-col justify-between space-y-3">
                                  <div>
                                    <span className="text-[8px] font-black font-mono tracking-wider text-slate-400 block uppercase">
                                      Deed Module TYPE
                                    </span>
                                    <h4 className="font-serif text-slate-800 font-bold text-xs capitalize mt-1.5 block leading-tight">
                                      {doc.type.toUpperCase().replace('_', ' ')}
                                    </h4>
                                    <p className="text-[9px] text-slate-400 font-medium mt-1 leading-normal">
                                      Officer: {doc.assigned_officer}
                                    </p>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-slate-400 text-[8.5px] font-bold uppercase font-mono">Status:</span>
                                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase font-mono ${
                                        doc.status === 'completed'
                                          ? 'bg-green-150 text-green-800'
                                          : doc.status === 'processing'
                                            ? 'bg-amber-100 text-[#ca8a04]'
                                            : 'bg-slate-200 text-slate-500'
                                      }`}>
                                        {doc.status}
                                      </span>
                                    </div>

                                    {/* Active administrative toggles */}
                                    <div className="grid grid-cols-3 gap-0.5">
                                      {(['drafting', 'processing', 'completed'] as const).map((stg) => (
                                        <button
                                          key={stg}
                                          onClick={() =>
                                            handleUpdateLegalDocumentMilestone(
                                              doc.id,
                                              stg,
                                              stg === 'completed' ? `/documents/verified_${doc.type}_${plot.plot_number}.pdf` : ''
                                            )
                                          }
                                          className={`text-[8.5px] font-mono font-bold leading-tight py-1 text-center border rounded capitalize transition-all cursor-pointer ${
                                            doc.status === stg
                                              ? 'bg-[#0F2942] border-[#0f2942] text-[#D29E2E]'
                                              : 'bg-white text-gray-400 border-gray-200 hover:bg-slate-100'
                                          }`}
                                        >
                                          {stg.substr(0, 4)}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>

              </div>
            )}

          </div>
        </>
      )}

      {/* --- SIMULATED WALK-IN LEAD CREATION MODAL --- */}
      {showLeadModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 font-medium backdrop-blur-xs select-none">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100 animate-slide-up">
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-slate-850 font-bold text-base tracking-wide flex items-center gap-1.5">
                <Users className="w-5 h-5 text-[#D29E2E]" />
                Log Walk-In Sales Lead
              </h3>
              <button
                type="button"
                onClick={() => setShowLeadModal(false)}
                className="text-gray-400 hover:text-slate-800 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualLead} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
                  Client Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rupak Chakraborty"
                  value={manualLeadName}
                  onChange={(e) => setManualLeadName(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#D29E2E]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 94350 xxxxx"
                  value={manualLeadPhone}
                  onChange={(e) => setManualLeadPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#D29E2E]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. rupak.c@gmail.com"
                  value={manualLeadEmail}
                  onChange={(e) => setManualLeadEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#D29E2E]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#0F2942] text-white hover:bg-[#153452] text-xs font-bold py-2.5 rounded-xl cursor-pointer text-center font-serif tracking-wider shadow"
                >
                  Create & Link Pipeline
                </button>
                <button
                  type="button"
                  onClick={() => setShowLeadModal(false)}
                  className="bg-slate-100 text-slate-505 hover:bg-slate-205 py-2.5 px-4 rounded-xl cursor-pointer text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// Sub-compo to cleanly display specific status icons for each of the 4 roles
const LocateProfileIcon: React.FC<{ role: string }> = ({ role }) => {
  switch (role) {
    case 'super_admin': return <ShieldCheck className="w-5 h-5" />;
    case 'admin': return <Sliders className="w-5 h-5" />;
    case 'sales_executive': return <Users className="w-5 h-5" />;
    default: return <User className="w-5 h-5" />;
  }
};

export default CRMDashboard;
