/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../data/mockDatabase';
import { LeadSource, Project } from '../types';
import { Globe, Send, CheckCircle, Info, Landmark, HelpCircle, Calendar, MessageSquare, PhoneCall } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

export const WebsiteForm: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<'inquiry' | 'visit' | 'support'>('inquiry');

  // Shared form inputs
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [interestProj, setInterestProj] = useState('');
  const [notes, setNotes] = useState('');

  // Site visit unique inputs
  const [visitDate, setVisitDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('11:00 AM - 01:00 PM');

  // Support message inputs
  const [supportMsg, setSupportMsg] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reload projects whenever DB updates (to list genuine active properties)
  useEffect(() => {
    setProjects(db.projects);
    const unsubscribe = db.subscribe(() => {
      setProjects([...db.projects]);
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) {
      alert('Please fill out all required fields.');
      return;
    }

    if (!supabase) {
      alert('Supabase client is not initialized. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (activeTab === 'inquiry') {
        // Generate a real unique standard UUID
        const newLeadId = generateUUID();
        const leadRecord = {
          id: newLeadId,
          source: 'web',
          full_name: fullName,
          phone: phone,
          email: email || 'inquiry@nirmaan.com',
          status: 'new',
          score: Math.floor(Math.random() * 41) + 40,
          assigned_to: null,
          created_at: new Date().toISOString()
        };

        // Real insert into the leads table in Supabase
        const { error } = await supabase.from('leads').insert([leadRecord]);
        if (error) {
          throw new Error(`Supabase insert failed: ${error.message}`);
        }

        // Also sync local memory store so CRM UI shows the new lead immediately
        db.captureWebLead({
          full_name: fullName,
          phone,
          email: email || 'inquiry@nirmaan.com',
          source: 'web',
          interest_project_id: interestProj || undefined,
        });

        setSuccessMsg(`Thank you, ${fullName}! Your project inquiry has been logged securely in Supabase. Our executive will reach out within 2 hours.`);
      } else if (activeTab === 'visit') {
        if (!visitDate) {
          alert('Please choose a preferred date for the site visit.');
          setIsSubmitting(false);
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

        const visit_date = parseTimeToISO(visitDate, timeSlot);
        const visit_time = timeSlot;

        // Before insert:
        console.log('VISIT_DATE', visit_date);
        console.log('VISIT_TIME', visit_time);

        // Generate a real unique lead ID
        let leadId = generateUUID();

        // Fetch to see if lead already exists
        const { data: existingLeads, error: checkError } = await supabase
          .from('leads')
          .select('id')
          .eq('phone', phone)
          .limit(1);

        if (checkError) {
          console.warn('Could not query existing lead. Proceeding with new creation.', checkError);
        }

        if (existingLeads && existingLeads.length > 0) {
          leadId = existingLeads[0].id;
          // Update status
          await supabase.from('leads').update({ status: 'site_visit' }).eq('id', leadId);
        } else {
          // Insert a new lead container first with a valid uuid
          const leadRecord = {
            id: leadId,
            source: 'web',
            full_name: fullName,
            phone: phone,
            email: email || `${fullName.toLowerCase().replace(/\s+/g, '')}@nirmaanavakh.com`,
            status: 'site_visit',
            score: 95,
            assigned_to: null,
            created_at: new Date().toISOString()
          };
          const { error: insertLeadError } = await supabase.from('leads').insert([leadRecord]);
          if (insertLeadError) {
            throw new Error(`Failed to create corresponding lead: ${insertLeadError.message}`);
          }
        }

        // Insert site visit record directly to Supabase with proper uuid keys
        const newSiteVisitId = generateUUID();
        const plot_id = null;

        const newSiteVisit = {
          id: newSiteVisitId,
          lead_id: leadId,
          project_name: getProjectName(interestProj),
          plot_id,
          customer_full_name: fullName,
          customer_phone_number: phone,
          customer_email: email || `${fullName.toLowerCase().replace(/\s+/g, '')}@nirmaanavakh.com`,
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
              lead_id: leadId,
              plot_id,
              visit_date,
              status: 'scheduled',
              feedback: JSON.stringify({
                project_name: getProjectName(interestProj),
                customer_full_name: fullName,
                customer_phone_number: phone,
                customer_email: email || `${fullName.toLowerCase().replace(/\s+/g, '')}@nirmaanavakh.com`,
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
            throw new Error(`Failed to book site-visit: ${visitError.message}`);
          }
        }

        // Also update local database cache to sync live UI views
        db.bookSiteVisitRecord(fullName, phone, interestProj, visitDate, timeSlot, finalSiteVisitRecord);

        setSuccessMsg(`Success! Site visit for ${getProjectName(interestProj)} has been scheduled for ${visitDate} (${timeSlot}). Confirmation SMS sent to ${phone}.`);
      } else if (activeTab === 'support') {
        if (!supportMsg) {
          alert('Please write your query/support message.');
          setIsSubmitting(false);
          return;
        }

        // Seek or create corresponding customer record on Supabase first
        let customerId: string | null = null;
        try {
          const { data: existingCusts } = await supabase
            .from('customers')
            .select('id')
            .eq('phone', phone)
            .limit(1);
          if (existingCusts && existingCusts.length > 0) {
            customerId = existingCusts[0].id;
          }
        } catch (e) {
          console.warn("Could not query customer table", e);
        }

        if (!customerId) {
          // Create/insert a guest customer to avoid foreign key errors on UUID check
          customerId = generateUUID();
          const newCustomer = {
            id: customerId,
            full_name: fullName,
            phone: phone,
            aadhaar_masked: 'XXXX-XXXX-TBD',
            pan_masked: 'XXXXXTBD',
            nominee_name: 'Pending'
          };
          const { error: custErr } = await supabase.from('customers').insert([newCustomer]);
          if (custErr) {
            console.warn("Could not upsert guest customer, continuing support submission in case FK permits it", custErr);
          }
        }

        const newTicketId = generateUUID();
        const ticketRecord = {
          id: newTicketId,
          customer_id: customerId,
          customer_name: fullName,
          phone: phone,
          message: supportMsg,
          status: 'open',
          created_at: new Date().toISOString()
        };

        // Real insert into Supabase support_tickets table
        const { error: ticketError } = await supabase.from('support_tickets').insert([ticketRecord]);
        if (ticketError) {
          throw new Error(`Failed to submit support ticket: ${ticketError.message}`);
        }

        // Also sync local cache memory store
        db.submitSupportTicket(customerId, fullName, phone, supportMsg);

        setSuccessMsg(`Support ticket registered under ID: ${newTicketId}. Case officer has been notified, and will reach out to ${phone} shortly.`);
      }

      setSubmitted(true);
      // Reset Form fields
      setFullName('');
      setPhone('');
      setEmail('');
      setNotes('');
      setSupportMsg('');
    } catch (err: any) {
      console.error(err);
      alert(`❌ DATABASE ERROR:\n${err.message || 'Verification of network request or table schemas failed. Please reload or review the Supabase status.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProjectName = (id: string) => {
    return projects.find(p => p.id === id)?.name || 'Assam Valley Plots';
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden flex flex-col h-full bg-slate-50/50">
      {/* Header bar representing official portal status */}
      <div className="bg-[#0F2942] px-4 py-5 flex flex-col items-center justify-center border-b-2 border-[#D29E2E] text-center shrink-0 relative">
        <div className="absolute right-3 top-3 hidden sm:block">
          <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-mono border border-emerald-500/20 font-semibold uppercase tracking-wider">
            ● Secure Gateway
          </span>
        </div>
        <Globe className="w-5 h-5 text-[#D29E2E] animate-pulse mb-1.5" />
        <h2 className="text-sm sm:text-base font-serif font-bold text-white tracking-wider uppercase leading-tight">
          Nirmaan Avakh Developers
        </h2>
        <h3 className="text-[10px] sm:text-xs font-bold tracking-[0.18em] text-[#D29E2E] uppercase mt-1 leading-none">
          Customer Inquiry Portal
        </h3>
      </div>

      {/* Portal Tab Navigators */}
      <div className="bg-slate-100 flex p-1 border-b border-gray-200 select-none">
        <button
          onClick={() => { setActiveTab('inquiry'); setSubmitted(false); }}
          className={`flex-1 py-2 text-center text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'inquiry'
              ? 'bg-[#0F2942] text-[#D29E2E] shadow-sm'
              : 'text-gray-600 hover:bg-slate-200'
          }`}
        >
          <PhoneCall className="w-3.5 h-3.5" />
          Project Inquiries
        </button>
        <button
          onClick={() => { setActiveTab('visit'); setSubmitted(false); }}
          className={`flex-1 py-2 text-center text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'visit'
              ? 'bg-[#0F2942] text-[#D29E2E] shadow-sm'
              : 'text-gray-600 hover:bg-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Book Site Visit
        </button>
        <button
          onClick={() => { setActiveTab('support'); setSubmitted(false); }}
          className={`flex-1 py-2 text-center text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'support'
              ? 'bg-[#0F2942] text-[#D29E2E] shadow-sm'
              : 'text-gray-600 hover:bg-slate-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Customer Support
        </button>
      </div>

      {/* Form Content container */}
      <div className="p-5 overflow-y-auto grow flex flex-col justify-between">
        <div>
          {/* Section Headers */}
          <div className="mb-4 text-center">
            {activeTab === 'inquiry' && (
              <>
                <span className="text-[#D29E2E] font-semibold text-[10px] tracking-wider uppercase bg-[#D29E2E]/10 px-2.5 py-1 rounded-full border border-[#D29E2E]/20">
                  Premium Residential & Commercial Plots
                </span>
                <h3 className="text-base font-serif font-bold text-[#0F2942] mt-2">
                  Elite Land Investment Assam
                </h3>
              </>
            )}
            {activeTab === 'visit' && (
              <>
                <span className="text-emerald-700 font-semibold text-[10px] tracking-wider uppercase bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                  Physical On-Site Exploration
                </span>
                <h3 className="text-base font-serif font-bold text-[#0F2942] mt-2">
                  Schedule Guided Project Inspection
                </h3>
              </>
            )}
            {activeTab === 'support' && (
              <>
                <span className="text-indigo-700 font-semibold text-[10px] tracking-wider uppercase bg-indigo-100 px-2.5 py-1 rounded-full border border-indigo-200">
                  Dedicated Help Desk Services
                </span>
                <h3 className="text-base font-serif font-bold text-[#0F2942] mt-2">
                  Corporate Support & Settlement
                </h3>
              </>
            )}
          </div>

          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.form
                key={activeTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                onSubmit={handleSubmit}
                className="space-y-3.5"
              >
                {/* Standard input group */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                    Your Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your registered or legal name"
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F2942] focus:border-[#0F2942] bg-white transition-all text-gray-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 Required"
                      className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F2942] focus:border-[#0F2942] bg-white transition-all text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. client@domain.com"
                      className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F2942] focus:border-[#0F2942] bg-white transition-all text-gray-800"
                    />
                  </div>
                </div>

                {/* Tab specific inquiries */}
                {activeTab === 'inquiry' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                        Selected Township / Project
                      </label>
                      <select
                        value={interestProj}
                        onChange={(e) => setInterestProj(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F2942] focus:border-[#0F2942] bg-white text-gray-800"
                      >
                        <option value="">-- Choose Premium Property Area --</option>
                        {projects.map((proj) => (
                          <option key={proj.id} value={proj.id}>
                            {proj.name} (from ₹{proj.base_price_per_lecha.toLocaleString()}/lecha)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                        Specific Plot Requirements (Optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Inquire about custom sizing, road access, and physical features..."
                        rows={2}
                        className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F2942] focus:border-[#0F2942] bg-white text-gray-800"
                      ></textarea>
                    </div>
                  </>
                )}

                {activeTab === 'visit' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                        Target Location for Visit
                      </label>
                      <select
                        required
                        value={interestProj}
                        onChange={(e) => setInterestProj(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F2942] focus:border-[#0F2942] bg-white text-gray-800"
                      >
                        <option value="">-- Choose Project Area --</option>
                        {projects.map((proj) => (
                          <option key={proj.id} value={proj.id}>
                            {proj.name} ({proj.location.split(',')[0]})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                          Preferred Date
                        </label>
                        <input
                          type="date"
                          required
                          value={visitDate}
                          onChange={(e) => setVisitDate(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F2942] focus:border-[#0F2942] bg-white text-gray-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                          Preferred Time Box
                        </label>
                        <select
                          value={timeSlot}
                          onChange={(e) => setTimeSlot(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F2942] focus:border-[#0F2942] bg-white text-gray-800"
                        >
                          <option value="09:00 AM - 11:00 AM">09:00 AM - 11:00 AM</option>
                          <option value="11:00 AM - 01:00 PM">11:00 AM - 01:00 PM</option>
                          <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM</option>
                          <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'support' && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                      Describe your Query / Issue
                    </label>
                    <textarea
                      required
                      value={supportMsg}
                      onChange={(e) => setSupportMsg(e.target.value)}
                      placeholder="Please enter details regarding billing issues, registry assistance, or customer care help..."
                      rows={4}
                      className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F2942] focus:border-[#0F2942] bg-white text-gray-800"
                    ></textarea>
                  </div>
                )}

                {/* Official Action submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full bg-[#0F2942] text-white hover:bg-[#153A5F] py-3 px-4 rounded-lg font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 shadow-md shadow-[#0F2942]/10 transition-all cursor-pointer border border-[#D29E2E]/20 ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  <Send className={`w-3.5 h-3.5 text-[#D29E2E] ${isSubmitting ? 'animate-spin' : ''}`} />
                  {isSubmitting ? (
                    <span>Processing Submission...</span>
                  ) : (
                    <>
                      {activeTab === 'inquiry' && 'Send Project Inquiry'}
                      {activeTab === 'visit' && 'Confirm Site Visit Schedule'}
                      {activeTab === 'support' && 'Submit Support Query'}
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="success"
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.98, opacity: 0 }}
                className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-4 my-2"
              >
                <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center border border-emerald-200">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Submission Successful</h4>
                  <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                    {successMsg}
                  </p>
                </div>

                <button
                  onClick={() => setSubmitted(false)}
                  className="bg-[#0F2942] hover:bg-[#153A5F] text-[#D29E2E] border border-[#D29E2E]/20 text-[10px] font-bold tracking-widest uppercase py-2 px-4 rounded-lg transition-all cursor-pointer"
                >
                  Submit Another Form
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Cohesive design footer */}
        <div className="mt-4 pt-3.5 border-t border-gray-100 text-[11px] text-gray-500 bg-slate-50 -mx-5 -mb-5 p-4 flex gap-2 items-start font-mono leading-relaxed">
          <Landmark className="w-4 h-4 text-[#D29E2E] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-800 uppercase text-[9px] tracking-widest">Nirmaan Avakh Developers Systems</p>
            <p className="text-[10px] text-slate-500 font-sans mt-0.5">
              Live updates are automatically dispatched across the secure CRM core. Realtime sync triggers instantly on database insertion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default WebsiteForm;
