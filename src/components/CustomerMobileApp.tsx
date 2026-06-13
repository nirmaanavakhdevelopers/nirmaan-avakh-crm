/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../data/mockDatabase';
import { Customer, Plot, PaymentSummary, Installment, LegalDocument } from '../types';
import { Logo } from './Logo';
import { supabase } from '../data/supabaseClient';

const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    try {
      return window.crypto.randomUUID();
    } catch (e) {
      // fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
import {
  Smartphone,
  User,
  CreditCard,
  FileCheck2,
  Calendar,
  AlertCircle,
  TrendingUp,
  Download,
  Info,
  ShieldCheck,
  Building,
  DollarSign,
  ChevronRight,
  LogOut,
  Wifi,
  Battery,
  ShieldAlert,
  Send,
  MessageSquare,
  Lock,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CustomerMobileApp: React.FC = () => {
  // Mobile app active state
  const [currentUser, setCurrentUser] = useState<Customer | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Login / Registrations Inputs
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  
  // OTP flow states
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [simulatedSentCode, setSimulatedSentCode] = useState('');
  const [showPushNotification, setShowPushNotification] = useState(false);

  // App active view tab
  const [activeTab, setActiveTab] = useState<'home' | 'payments' | 'legal' | 'actions'>('home');

  // Load datasets dynamically linked to current user
  const [userPlots, setUserPlots] = useState<Plot[]>([]);
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [legalDocs, setLegalDocs] = useState<LegalDocument[]>([]);
  const [customerTickets, setCustomerTickets] = useState<any[]>([]);
  const [customerVisits, setCustomerVisits] = useState<any[]>([]);
  
  const [loginError, setLoginError] = useState('');
  const [showReceipt, setShowReceipt] = useState<string | null>(null);

  // Additional utilities
  const [supportText, setSupportText] = useState('');
  const [bookingPrjId, setBookingPrjId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('11:00 AM - 01:00 PM');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Subscribe to central DB transitions
  useEffect(() => {
    refreshClientData();
    const unsubscribe = db.subscribe(() => {
      refreshClientData();
    });
    return unsubscribe;
  }, [currentUser]);

  const refreshClientData = () => {
    if (currentUser) {
      // Find customer in database fresh (since records might have updated)
      const freshCust = db.customers.find(c => c.id === currentUser.id);
      if (freshCust) {
        setCurrentUser(freshCust);
      }

      const plots = db.plots.filter(p => p.customer_id === currentUser.id);
      setUserPlots(plots);

      const plotIds = plots.map(p => p.id);
      
      const payloadPays = db.payments.filter(p => plotIds.includes(p.plot_id));
      setPayments(payloadPays);

      const payIds = payloadPays.map(p => p.id);
      setInstallments(db.installments.filter(i => payIds.includes(i.payment_id)));

      setLegalDocs(db.legalDocuments.filter(d => plotIds.includes(d.plot_id)));

      // Load tickets for this user
      const tickets = db.supportTickets ? db.supportTickets.filter(t => t.customer_id === currentUser.id) : [];
      setCustomerTickets(tickets);

      // Load site visits for this user based on phone matches
      const cleanUserPhone = currentUser.phone.replace(/\D/g, '');
      const userLeads = db.leads.filter(l => l.phone.replace(/\D/g, '') === cleanUserPhone);
      const leadIds = userLeads.map(l => l.id);
      const visits = db.siteVisits ? db.siteVisits.filter(sv => leadIds.includes(sv.lead_id)) : [];
      setCustomerVisits(visits);
    } else {
      setUserPlots([]);
      setPayments([]);
      setInstallments([]);
      setLegalDocs([]);
      setCustomerTickets([]);
      setCustomerVisits([]);
    }
  };

  // Trigger simulated secure mobile OTP
  const triggerOtpSend = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (!phoneInput || phoneInput.length < 8) {
      setLoginError('Please enter a valid mobile number.');
      return;
    }

    if (isRegistering && !nameInput) {
      setLoginError('Please enter your full name for registration.');
      return;
    }

    // Generate a random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSimulatedSentCode(code);
    setOtpSent(true);
    setShowPushNotification(true);

    // Hide push alert after 10 seconds
    setTimeout(() => {
      setShowPushNotification(false);
    }, 12000);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (otpInput !== simulatedSentCode) {
      setLoginError('Incorrect 6-digit OTP code. Please check code or try again.');
      return;
    }

    if (isRegistering) {
      // Complete production registration in central db
      const newCust = db.registerCustomerAccount(nameInput, phoneInput, emailInput || 'support@nirmaanavakh.com');
      setCurrentUser(newCust);
      setIsRegistering(false);
    } else {
      // Lookup existing customer by phone match
      const trimmedPhone = phoneInput.trim().replace(/\s+/g, '');
      const foundUser = db.customers.find(
        c => c.phone.replace(/\s+/g, '') === trimmedPhone || c.phone.includes(trimmedPhone)
      );

      if (foundUser) {
        setCurrentUser(foundUser);
        db.addSyncLog('Mobile App', `Client "${foundUser.full_name}" logged into secure Legal Portal (OTP Verified).`);
      } else {
        setLoginError('Registered mobile number not found. If you are a new customer, please click "Register New Account" below.');
        setOtpSent(false); // Go back
      }
    }

    // Reset OTP states
    setOtpSent(false);
    setOtpInput('');
    setShowPushNotification(false);
  };

  // Simulate payment of an installment (Immediate real-time sync with CRM!)
  const handlePayInstallment = (instId: string) => {
    const inst = installments.find(i => i.id === instId);
    if (!inst) return;

    const receiptUrl = `https://nirmaanavakhdevelopers.com/receipts/rec_pay_${instId}.pdf`;
    db.recordInvoicePayment(instId, receiptUrl, currentUser?.id || 'client', currentUser?.full_name || 'Client App');
    
    db.addSyncLog('Mobile App', `Client "${currentUser?.full_name}" paid an installment of ₹${inst.amount.toLocaleString()} online.`);
  };

  // Logged-in Site Visit Booking Action
  const handleAppBookVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingPrjId || !bookingDate) {
      alert('Please fill out all booking fields.');
      return;
    }

    if (!supabase) {
      alert('Supabase client is not initialized.');
      return;
    }

    const parseTimeToISO = (dateStr: string, timeSlotStr: string): string => {
      let hour = 11;
      let minute = 0;
      
      if (timeSlotStr) {
        const match = timeSlotStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
          let h = parseInt(match[1], 10);
          const m = parseInt(match[2], 10);
          const ampm = match[3].toUpperCase();
          
          if (ampm === 'PM' && h < 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
          
          hour = h;
          minute = m;
        }
      }
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${dateStr}T${pad(hour)}:${pad(minute)}:00Z`;
    };

    const visit_date = parseTimeToISO(bookingDate, bookingTime);
    const visit_time = bookingTime;

    // Before insert:
    console.log('VISIT_DATE', visit_date);
    console.log('VISIT_TIME', visit_time);

    try {
      // Find lead_id for the current user
      let lead_id = '';
      const userPhone = currentUser?.phone || '';

      const { data: existingLeads } = await supabase
        .from('leads')
        .select('id')
        .eq('phone', userPhone)
        .limit(1);

      if (existingLeads && existingLeads.length > 0) {
        lead_id = existingLeads[0].id;
        await supabase.from('leads').update({ status: 'site_visit' }).eq('id', lead_id);
      } else {
        // Create matching lead in Supabase
        lead_id = generateUUID();
        const leadRecord = {
          id: lead_id,
          source: 'mob',
          full_name: currentUser?.full_name || 'Nirmaan Client',
          phone: userPhone,
          email: currentUser?.email || `${(currentUser?.full_name || 'client').toLowerCase().replace(/\s+/g, '')}@nirmaanavakh.com`,
          status: 'site_visit',
          score: 95,
          assigned_to: null,
          created_at: new Date().toISOString()
        };
        await supabase.from('leads').insert([leadRecord]);
      }

      const newSiteVisitId = generateUUID();
      const plot_id = null;

      const newSiteVisit = {
        id: newSiteVisitId,
        lead_id,
        project_name: getProjectName(bookingPrjId),
        plot_id,
        customer_full_name: currentUser?.full_name || 'Nirmaan Client',
        customer_phone_number: currentUser?.phone || '',
        customer_email: currentUser?.email || '',
        visit_date,
        visit_time,
        status: 'scheduled',
        created_at: new Date().toISOString()
      };

      let finalSiteVisitRecord = newSiteVisit;

      // Ensure:
      const { error: visitError } = await supabase.from('site_visits').insert(newSiteVisit);

      if (visitError) {
        const isColumnErr = visitError.message?.toLowerCase().includes('column') || 
                            visitError.message?.toLowerCase().includes('not found') || 
                            visitError.message?.toLowerCase().includes('schema cache');
        if (isColumnErr) {
          // Fallback to storing custom variables in the feedback column
          const fallbackVisit = {
            id: newSiteVisitId,
            lead_id,
            plot_id,
            visit_date,
            status: 'scheduled',
            feedback: JSON.stringify({
              project_name: getProjectName(bookingPrjId),
              customer_full_name: currentUser?.full_name || 'Nirmaan Client',
              customer_phone_number: currentUser?.phone || '',
              customer_email: currentUser?.email || '',
              visit_time,
              created_at: new Date().toISOString()
            })
          };
          const { error: fallbackError } = await supabase.from('site_visits').insert(fallbackVisit);
          if (fallbackError) {
            throw new Error(`Failed to book site-visit fallback: ${fallbackError.message}`);
          }
          finalSiteVisitRecord = fallbackVisit as any;
        } else {
          throw new Error(visitError.message);
        }
      }

      db.bookSiteVisitRecord(
        currentUser?.full_name || 'Nirmaan Avakh Developers Client',
        currentUser?.phone || '',
        bookingPrjId,
        bookingDate,
        bookingTime,
        finalSiteVisitRecord
      );

      setActionSuccessMsg(`Site tour successfully scheduled for ${bookingDate} (${bookingTime})! Check real-time booking status below.`);
      
      // Clear fields
      setBookingPrjId('');
      setBookingDate('');
    } catch (err: any) {
      console.error(err);
      alert(`❌ BOOKING ERROR: ${err.message || 'Verification of network request or table schemas failed.'}`);
    }
  };

  // Logged-in Support Submission Action
  const handleAppSubmitSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportText) return;
    const ticket = db.submitSupportTicket(currentUser?.id || 'guest', currentUser?.full_name || 'Nirmaan Avakh Developers Client', currentUser?.phone || '', supportText);
    setActionSuccessMsg(`Your support request has been logged. Ticket ID: ${ticket.id}. Real-time tracking is active below.`);
    setSupportText('');
  };

  // Helper to find parent project of plot
  const getProjectName = (projectId: string) => {
    return db.projects.find(p => p.id === projectId)?.name || 'Nirmaan Premium Township';
  };

  // Helper to calculate project construction milestones based on legal docs draftings
  const calculateMilestoneProgress = (plotId: string) => {
    const plotDocs = db.legalDocuments.filter(d => d.plot_id === plotId);
    if (plotDocs.length === 0) return 0;
    const completed = plotDocs.filter(d => d.status === 'completed').length;
    return Math.round((completed / plotDocs.length) * 100);
  };

  return (
    <div className="bg-[#0b0f19] text-white rounded-[40px] p-4.5 shadow-2xl relative border-[6px] border-slate-800 max-w-sm mx-auto h-[680px] flex flex-col justify-between overflow-hidden select-none font-sans">
      
      {/* Top Mobile Camera notch bar */}
      <div className="absolute top-2.5 left-1/2 transform -translate-x-1/2 w-32 h-5 bg-[#0b0f19] rounded-full z-30 flex items-center justify-center gap-2">
        <div className="w-12 h-1 bg-slate-800 rounded-full"></div>
        <div className="w-2.5 h-2.5 bg-[#1e293b] rounded-full border border-slate-800"></div>
      </div>

      {/* Screen Interface Frame */}
      <div className="bg-[#0c1220] rounded-[30px] grow overflow-hidden flex flex-col relative border border-slate-900 mt-2.5">
        
        {/* Android / iOS Status Bar */}
        <div className="bg-[#0F2942] px-5 py-2 flex justify-between items-center text-[10px] text-slate-300 select-none font-medium shrink-0 z-10 pt-2.5">
          <span>09:41 AM</span>
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3 h-3" />
            <span className="font-mono text-[9px] font-bold">5G</span>
            <Battery className="w-3.5 h-3.5 text-slate-200" />
          </div>
        </div>

        {/* Corporate App Header banner */}
        <div className="bg-[#0F2942] py-4 px-4 flex flex-col items-center justify-center border-b-2 border-[#D29E2E] shrink-0 shadow-sm relative text-center select-none">
          <div className="absolute right-3 top-3">
            <span className="bg-emerald-500/10 text-emerald-400 text-[7px] font-bold tracking-widest uppercase border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-mono">
              SECURE
            </span>
          </div>
          
          {/* Official Premium Logo */}
          <div className="mb-1.5 shrink-0">
            <Logo minimal={true} className="h-10 w-auto" />
          </div>

          <div className="flex flex-col items-center">
            <h1 className="text-[11px] font-serif font-bold text-white tracking-wider leading-tight uppercase">
              Nirmaan Avakh Developers
            </h1>
            <h2 className="text-[8px] font-sans font-bold tracking-[0.2em] text-[#D29E2E] uppercase mt-0.5 leading-none">
              Client Portal
            </h2>
          </div>
        </div>

        {/* --- SIMULATED MOBILE OTP SMS PUSH BANNER --- */}
        <AnimatePresence>
          {showPushNotification && (
            <motion.div
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              className="absolute top-12 left-2 right-2 bg-slate-900 border-l-4 border-[#D29E2E] p-3 rounded-lg shadow-xl z-50 text-slate-100 flex gap-2 items-start"
            >
              <Lock className="w-4 h-4 text-[#D29E2E] shrink-0 mt-0.5" />
              <div className="text-[10px] grow">
                <div className="font-bold text-white flex justify-between">
                  <span>Message from NIRMAAN-OTP</span>
                  <span className="opacity-60 text-[8px]">now</span>
                </div>
                <p className="mt-0.5 font-mono text-[#D29E2E] font-bold">
                  Your official Nirmaan secure login OTP is: <span className="underline tracking-wider font-extrabold text-white bg-slate-850 px-1 rounded">{simulatedSentCode}</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOtpInput(simulatedSentCode);
                    setShowPushNotification(false);
                  }}
                  className="mt-1.5 text-[8px] text-[#D29E2E] font-bold uppercase hover:underline block"
                >
                  ⚡ Autofill OTP code
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile View Container */}
        <div className="grow overflow-y-auto p-4 flex flex-col text-slate-100 bg-[#070b13]">
          
          <AnimatePresence mode="wait">
            {!currentUser ? (
              // AUTHENTICATION OVERLAYS
              <motion.div
                key="client-auth"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col justify-between h-full space-y-4 py-2"
              >
                <div className="text-center space-y-2 mt-4 select-none">
                  <div className="mx-auto w-12 h-12 rounded-full bg-[#D29E2E]/10 flex items-center justify-center border border-[#D29E2E]/30 shadow-lg">
                    <User className="w-6 h-6 text-[#D29E2E]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-serif font-bold tracking-wider text-white uppercase">Nirmaan Avakh Developers</h4>
                    <h3 className="text-[10px] font-sans font-extrabold text-[#D29E2E] uppercase tracking-widest mt-0.5">Secure Client Portal</h3>
                    <p className="text-[10px] text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                      Secure Client Authentication
                    </p>
                  </div>
                </div>

                {/* Sub Forms */}
                {!otpSent ? (
                  // STEP 1: ENTER PHONE / INFO
                  <form onSubmit={triggerOtpSend} className="space-y-3">
                    {isRegistering && (
                      <>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Your Full Name
                          </label>
                          <input
                            type="text"
                            required
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            placeholder="Full Legal Name"
                            className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#D29E2E]"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            placeholder="your.email@domain.com"
                            className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#D29E2E]"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Registered Mobile Number
                      </label>
                      <input
                        type="text"
                        required
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="Enter Registered Mobile Number"
                        className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#D29E2E] font-mono"
                      />
                    </div>

                    {loginError && (
                      <div className="p-2 bg-red-950/40 border border-red-500/20 rounded text-[9px] text-red-300 flex gap-1.5 items-center leading-normal">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                        <span>{loginError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full bg-[#D29E2E] hover:bg-amber-500 text-slate-950 font-bold py-2.5 rounded-lg text-[10px] tracking-widest uppercase transition-colors shadow-lg cursor-pointer"
                    >
                      {isRegistering ? 'Register & Send OTP' : 'Send Verification OTP'}
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegistering(!isRegistering);
                          setLoginError('');
                        }}
                        className="text-[10px] text-[#D29E2E] hover:underline hover:text-amber-400 font-semibold"
                      >
                        {isRegistering ? 'Already registered? Log In' : 'New Customer? Register New Account'}
                      </button>
                    </div>
                  </form>
                ) : (
                  // STEP 2: ENTER OTP
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Verify 6-Digit SMS OTP
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        placeholder="••••••"
                        className="w-full text-center text-sm tracking-[0.4em] px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-[#D29E2E] placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#D29E2E] font-mono font-bold"
                      />
                    </div>

                    {loginError && (
                      <div className="p-2 bg-red-950/40 border border-red-500/20 rounded text-[9px] text-red-300 flex gap-1.5 items-center">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                        <span>{loginError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full bg-[#D29E2E] hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-lg text-[10px] tracking-widest uppercase transition-colors cursor-pointer"
                    >
                      Confirm and Authenicate
                    </button>

                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="w-full text-center text-[9px] text-slate-400 hover:text-slate-200"
                    >
                      ← Change Mobile Number
                    </button>
                  </form>
                )}

                <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-800/40 text-[9px] text-slate-300 leading-normal space-y-1">
                  <span className="font-semibold text-slate-100">📱 Real-estate Authentication Guidelines:</span>
                  <p className="text-slate-400">Registered customers can securely sign in using their approved mobile number. All authentication is protected with OTP verification and encrypted data synchronization.</p>
                </div>
              </motion.div>
            ) : (
              // ACTIVE PORTAL FLOW
              <motion.div
                key="client-portal-dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {/* Home/Dashboard Tab */}
                {activeTab === 'home' && (
                  <div className="space-y-4">
                    {/* Welcome banner */}
                    <div className="flex items-center justify-between">
                      <div className="max-w-[240px] truncate">
                        <span className="text-[9px] uppercase text-[#D29E2E] tracking-wider font-bold">
                          Nirmaan Avakh Developers Client
                        </span>
                        <h4 className="text-xs font-bold text-slate-100 mt-0.5">{currentUser.full_name}</h4>
                        <p className="text-[9px] text-[#D29E2E] mt-0.5 font-mono">ID: {currentUser.id}</p>
                      </div>
                      <button
                        onClick={() => {
                          setCurrentUser(null);
                          setPhoneInput('');
                          setActiveTab('home');
                        }}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded-full text-slate-400 hover:text-red-400 transition-all cursor-pointer border border-slate-800"
                        title="Sign Out"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Plot details list */}
                    <div className="space-y-3">
                      <h5 className="text-[9px] uppercase font-bold tracking-widest text-[#D29E2E] flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-[#D29E2E]" />
                        Your Registered Plot Holdings
                      </h5>

                      {userPlots.length === 0 ? (
                        <div className="p-6 bg-slate-900/30 text-center rounded-xl border border-slate-800 text-slate-400 text-[10px] space-y-2">
                          <p className="font-semibold text-slate-300">No active plot purchases logged yet.</p>
                          <p className="text-[9px] text-slate-500 leading-relaxed">
                            Book a plot via website or contact our support team. Once assigned, milestones will appear instantly.
                          </p>
                        </div>
                      ) : (
                        userPlots.map((plot) => {
                          const payment = payments.find(p => p.plot_id === plot.id);
                          const progress = calculateMilestoneProgress(plot.id);
                          return (
                            <div
                              key={plot.id}
                              className="bg-gradient-to-br from-slate-900 to-[#0e1627] p-3.5 rounded-xl border border-slate-800 space-y-3 shadow-md"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[9px] bg-[#0c1220] text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-800">
                                    PLOT: {plot.plot_number}
                                  </span>
                                  <h6 className="text-[10px] font-bold text-slate-100 mt-1 max-w-[150px] truncate">
                                    {getProjectName(plot.project_id)}
                                  </h6>
                                </div>
                                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                  plot.status === 'sold'
                                    ? 'bg-emerald-950 border border-emerald-500/20 text-emerald-400'
                                    : 'bg-amber-950 border border-amber-500/20 text-[#D29E2E]'
                                }`}>
                                  {plot.status}
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-[9px] text-slate-400">
                                  <span>Registry Progress</span>
                                  <span className="font-bold text-slate-200">{progress}%</span>
                                </div>
                                <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-[#D29E2E] to-amber-400 h-full transition-all"
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* Simple payment bar */}
                              {payment && (
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/40 text-[9px]">
                                  <div>
                                    <span className="text-slate-500 block">Total Paid Equity</span>
                                    <span className="font-bold text-slate-200">
                                      ₹{payment.paid_amount.toLocaleString()}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 block">Outstanding Arrears</span>
                                    <span className="font-bold text-[#D29E2E]">
                                      ₹{payment.balance_outstanding.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Quick actions direct buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setActiveTab('payments')}
                        className="bg-slate-900/40 hover:bg-[#0F2942]/20 border border-slate-800/80 transition-all p-3 rounded-xl flex flex-col items-center justify-center gap-1 text-center cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-bold text-slate-200">Ledger Schedules</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('legal')}
                        className="bg-slate-900/40 hover:bg-[#0F2942]/20 border border-slate-800/80 transition-all p-3 rounded-xl flex flex-col items-center justify-center gap-1 text-center cursor-pointer"
                      >
                        <FileCheck2 className="w-4 h-4 text-sky-400" />
                        <span className="text-[10px] font-bold text-slate-200">Municipal Vault</span>
                      </button>
                    </div>

                    <button
                      onClick={() => { setActiveTab('actions'); setActionSuccessMsg(''); }}
                      className="w-full py-2 bg-gradient-to-r from-slate-900 to-slate-950 hover:bg-slate-850 text-[#D29E2E] border border-[#D29E2E]/20 text-[10px] font-bold tracking-widest uppercase rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      Book Visit & Help Desk
                    </button>
                  </div>
                )}

                {/* Payments Ledger Tab */}
                {activeTab === 'payments' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <h5 className="text-[10px] uppercase font-bold tracking-widest text-[#D29E2E]">
                        Payments & Milestone Invoices
                      </h5>
                    </div>

                    {installments.length === 0 ? (
                      <div className="text-center text-[10px] text-slate-400 py-6">
                        No active payment schedules available.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {installments.map((inst) => (
                          <div
                            key={inst.id}
                            className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 space-y-2 text-xs"
                          >
                            <div className="flex justify-between items-center bg-[#070b13] p-1.5 rounded">
                              <div>
                                <span className="text-[9px] text-slate-500 block font-mono">DUE: {inst.due_date}</span>
                                <span className="font-bold text-[#D29E2E] text-xs">
                                  ₹{inst.amount.toLocaleString()}
                                </span>
                              </div>
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                inst.status === 'paid'
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/10'
                                  : inst.status === 'overdue'
                                    ? 'bg-red-950/80 text-red-400 border border-red-500/10 animate-pulse'
                                    : 'bg-slate-800 text-slate-300'
                              }`}>
                                {inst.status}
                              </span>
                            </div>

                            {/* Action Buttons */}
                            {inst.status !== 'paid' ? (
                              <button
                                onClick={() => handlePayInstallment(inst.id)}
                                className="w-full bg-[#D29E2E] text-slate-950 hover:bg-amber-400 transition-colors font-bold text-[9px] py-1.5 rounded flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <DollarSign className="w-3 h-3" />
                                Clear Installment Security
                              </button>
                            ) : (
                              inst.receipt_url && (
                                <button
                                  onClick={() => setShowReceipt(inst.receipt_url)}
                                  className="w-full bg-slate-950 text-slate-300 hover:text-[#D29E2E] border border-slate-800 font-semibold text-[9px] py-1 px-2 rounded flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Download className="w-3 h-3" />
                                  Download Invoice Receipt
                                </button>
                              )
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Receipt visualization sandbox modal */}
                    {showReceipt && (
                      <div className="bg-slate-900 border border-[#D29E2E]/30 p-3 rounded-xl text-[10px] text-slate-300 space-y-2">
                        <div className="flex justify-between items-center text-slate-200">
                          <span className="font-bold text-[9px]">Official Document Reader</span>
                          <button
                            onClick={() => setShowReceipt(null)}
                            className="text-red-400 hover:text-red-300 font-bold"
                          >
                            Close
                          </button>
                        </div>
                        <div className="bg-white text-slate-800 p-2.5 rounded font-mono text-[8px] space-y-0.5 border border-slate-700">
                          <p className="font-semibold text-center uppercase text-slate-900">
                            Nirmaan Avakh Developers
                          </p>
                          <p className="text-center text-[7px] text-gray-500">Guwahati, Assam, India</p>
                          <hr className="my-1" />
                          <p>GATEWAY STATUS: PAID IN FULL</p>
                          <p>PAYEE: {currentUser.full_name}</p>
                          <p>SYSTEM ACTION: POSTGRES SYNCHRONIZED</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Legal Tracker Tab */}
                {activeTab === 'legal' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
                      <FileCheck2 className="w-4 h-4 text-sky-400" />
                      <h5 className="text-[10px] uppercase font-bold tracking-widest text-[#D29E2E]">
                        Legal progress roadmap
                      </h5>
                    </div>

                    {legalDocs.length === 0 ? (
                      <p className="text-center text-[10px] text-slate-400 py-6">
                        No active legal documents tracked.
                      </p>
                    ) : (
                      <div className="space-y-3 relative pl-3 border-l border-slate-800">
                        {legalDocs.map((doc, idx) => (
                          <div key={doc.id} className="relative">
                            {/* Roadmap Node Indicator */}
                            <span className={`absolute -left-[16.5px] top-1 w-2.5 h-2.5 rounded-full border ${
                              doc.status === 'completed'
                                ? 'bg-emerald-500 border-slate-950 shadow-sm'
                                : doc.status === 'processing'
                                  ? 'bg-[#D29E2E] border-slate-950 animate-pulse'
                                  : 'bg-slate-800 border-slate-950'
                            }`} />

                            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 space-y-1 ml-2.5">
                              <div className="flex justify-between items-start">
                                <span className="text-[9px] font-bold text-slate-100 uppercase tracking-wide">
                                  {idx + 1}. {doc.type.replace('_', ' ')}
                                </span>
                                <span className={`text-[7px] px-1 py-0.1 rounded font-mono uppercase ${
                                  doc.status === 'completed'
                                    ? 'bg-emerald-950 text-emerald-400'
                                    : doc.status === 'processing'
                                      ? 'bg-amber-950 text-[#D29E2E]'
                                      : 'bg-slate-950 text-slate-500'
                                }`}>
                                  {doc.status}
                                </span>
                              </div>

                              <p className="text-[9px] text-slate-400 leading-normal">
                                Officer: {doc.assigned_officer}
                              </p>

                              {doc.status === 'completed' && doc.file_url ? (
                                <div className="pt-1">
                                  <span className="text-[8px] text-[#D29E2E] flex items-center gap-1 font-mono font-medium">
                                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                    Doc Securely Registered
                                  </span>
                                </div>
                              ) : (
                                <p className="text-[8px] font-mono text-slate-500 pt-0.5">
                                  {doc.status === 'processing'
                                    ? '⏳ Under review from municipal bodies.'
                                    : '🔒 Pending previous milestones.'}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Support and Booking tab */}
                {activeTab === 'actions' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
                      <Compass className="w-4 h-4 text-[#D29E2E]" />
                      <h5 className="text-[10px] uppercase font-bold tracking-widest text-[#D29E2E]">
                        Assistance & Scheduling Desk
                      </h5>
                    </div>

                    {actionSuccessMsg && (
                      <div className="p-3 bg-emerald-950/80 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-lg">
                        {actionSuccessMsg}
                      </div>
                    )}

                    {/* Site Visit Booking */}
                    <form onSubmit={handleAppBookVisit} className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <span className="font-bold text-[9px] text-[#D29E2E] uppercase">Schedule Physical Site Inspection</span>
                      
                      <div className="space-y-2 z-10">
                        <select
                          required
                          value={bookingPrjId}
                          onChange={e => setBookingPrjId(e.target.value)}
                          className="w-full text-[10px] p-2 bg-slate-950 border border-slate-800 rounded text-slate-100"
                        >
                          <option value="">-- Choose Project Area --</option>
                          <option value="proj_assam_valley">Assam Valley Plots</option>
                          <option value="proj_brahmaputra_hills">Brahmaputra Hills Township</option>
                        </select>
                        <input
                          type="date"
                          required
                          value={bookingDate}
                          onChange={e => setBookingDate(e.target.value)}
                          className="w-full text-[10px] p-2 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono"
                        />
                        <button type="submit" className="w-full bg-[#D29E2E] text-slate-950 font-bold py-1.5 rounded text-[9px] uppercase tracking-wider">
                          Schedule Tour
                        </button>
                      </div>
                    </form>

                    {/* Support Submit Desk */}
                    <form onSubmit={handleAppSubmitSupport} className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <span className="font-bold text-[9px] text-[#D29E2E] uppercase">Submit Support Query Message</span>
                      <textarea
                        required
                        value={supportText}
                        onChange={e => setSupportText(e.target.value)}
                        placeholder="Type legal, registry or general queries here..."
                        rows={2}
                        className="w-full text-[10px] p-2 bg-slate-950 border border-slate-800 rounded text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#D29E2E]"
                      />
                      <button type="submit" className="w-full bg-slate-800 text-slate-100 hover:text-[#D29E2E] transition-colors py-1.5 rounded text-[9px] uppercase font-bold">
                        Submit Query ticket
                      </button>
                    </form>

                    {/* Real-time Site Tour Bookings Status */}
                    <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/80 space-y-2 text-[10px]">
                      <div className="flex justify-between items-center pb-1 border-b border-white/5">
                        <span className="font-bold text-[9px] text-[#D29E2E] uppercase">Site Inspections</span>
                        <span className="bg-slate-950 text-slate-400 font-mono px-1 rounded text-[8px] uppercase">Live Tracker</span>
                      </div>
                      {customerVisits.length === 0 ? (
                        <p className="text-slate-500 text-center py-2 text-[9px]">No scheduled site visits found.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          {customerVisits.map((v: any) => (
                            <div key={v.id} className="flex justify-between items-center p-1.5 bg-slate-950/60 rounded border border-white/5">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-200">
                                  {v.plot_id ? `Plot ${v.plot_id.replace('plot_', '').toUpperCase()}` : 'General Site Tour'}
                                </span>
                                <span className="text-[8px] text-slate-500 font-mono">{v.visit_date}</span>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase font-mono ${
                                v.status === 'scheduled' ? 'bg-amber-950/80 text-amber-400 border border-amber-500/10' :
                                v.status === 'completed' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/10' :
                                'bg-slate-900 text-slate-400 border border-white/5'
                              }`}>
                                {v.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Real-time Support Assistance Tickets Status */}
                    <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/80 space-y-2 text-[10px]">
                      <div className="flex justify-between items-center pb-1 border-b border-white/5">
                        <span className="font-bold text-[9px] text-[#D29E2E] uppercase">Support Tickets</span>
                        <span className="bg-slate-950 text-slate-400 font-mono px-1 rounded text-[8px] uppercase">Client Care</span>
                      </div>
                      {customerTickets.length === 0 ? (
                        <p className="text-slate-500 text-center py-2 text-[9px]">No submitted support tickets found.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          {customerTickets.map((t: any) => (
                            <div key={t.id} className="p-1.5 bg-slate-950/60 rounded border border-white/5 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-mono text-[8px] text-slate-500 font-bold">{t.id.toUpperCase()}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase font-mono ${
                                  t.status === 'open' ? 'bg-purple-950/80 text-purple-400 border border-purple-500/10' :
                                  t.status === 'in-progress' ? 'bg-sky-950/80 text-sky-400 border border-sky-500/10' :
                                  'bg-emerald-950/80 text-emerald-400 border border-emerald-500/10'
                                }`}>
                                  {t.status}
                                </span>
                              </div>
                              <p className="text-slate-300 text-[9px] line-clamp-2 italic">{t.message}</p>
                              <p className="text-[7px] text-slate-600 font-mono text-right">{new Date(t.created_at).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Smartphone Bottom Native Tab Bar navigator */}
        {currentUser && (
          <div className="bg-[#0F2942] py-3.5 px-4 border-t border-white/5 flex justify-around text-slate-400 shrink-0 select-none z-10">
            <button
              onClick={() => { setActiveTab('home'); setActionSuccessMsg(''); }}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                activeTab === 'home' ? 'text-[#D29E2E]' : 'hover:text-slate-200 text-slate-400'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span className="text-[8px] font-bold">Plots</span>
            </button>
            <button
              onClick={() => { setActiveTab('payments'); setActionSuccessMsg(''); }}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                activeTab === 'payments' ? 'text-[#D29E2E]' : 'hover:text-slate-200 text-slate-400'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span className="text-[8px] font-bold">Ledger</span>
            </button>
            <button
              onClick={() => { setActiveTab('legal'); setActionSuccessMsg(''); }}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                activeTab === 'legal' ? 'text-[#D29E2E]' : 'hover:text-slate-200 text-slate-400'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span className="text-[8px] font-bold">Milestones</span>
            </button>
            <button
              onClick={() => { setActiveTab('actions'); setActionSuccessMsg(''); }}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                activeTab === 'actions' ? 'text-[#D29E2E]' : 'hover:text-slate-200 text-slate-400'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="text-[8px] font-bold">Desk</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default CustomerMobileApp;
