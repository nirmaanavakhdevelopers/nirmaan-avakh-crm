/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Project,
  Plot,
  CRMUser,
  SalesMember,
  Lead,
  SiteVisit,
  Customer,
  PaymentSummary,
  Installment,
  LegalDocument,
  AuditLog,
  SystemNotification,
  LeadSource,
  LeadStatus,
  SupportTicket
} from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Helper to generate UUIDs/Short IDs
export const generateId = (prefix: string = 'id') => {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
};

// --- INITIAL SEED DATA ---
const initialProjects: Project[] = [];

const initialPlots: Plot[] = [];

const initialCRMUsers: CRMUser[] = [
  { id: 'user_admin', email: 'director@nirmaanavakh.com', role: 'director', full_name: 'Abhinav Avakh Sharma' },
  { id: 'user_sales_mgr', email: 'sales@nirmaanavakh.com', role: 'sales_manager', full_name: 'Anupam Saikia' },
  { id: 'user_legal_head', email: 'legal@nirmaanavakh.com', role: 'legal', full_name: 'Debojit Goswami' },
  { id: 'user_accountant', email: 'accts@nirmaanavakh.com', role: 'accountant', full_name: 'Rupali Das' }
];

const initialSalesTeam: SalesMember[] = [
  { id: 'agent_anupam', user_id: 'user_sales_mgr', full_name: 'Anupam Saikia', target_monthly: 2500000 },
  { id: 'agent_rupali', user_id: 'user_accountant', full_name: 'Rupali Das', target_monthly: 1500000 }
];

const initialLeads: Lead[] = [];

const initialCustomers: Customer[] = [];

const initialPayments: PaymentSummary[] = [];

const initialInstallments: Installment[] = [];

const initialLegalDocuments: LegalDocument[] = [];

const initialNotifications: SystemNotification[] = [];

const initialAuditLogs: AuditLog[] = [];

// --- BACKEND STATE STORE WITH SUPABASE CONNECTION SYNC ---
class CentralDatabase {
  projects: Project[] = [];
  plots: Plot[] = [];
  crmUsers: CRMUser[] = [];
  salesTeam: SalesMember[] = [];
  leads: Lead[] = [];
  customers: Customer[] = [];
  payments: PaymentSummary[] = [];
  installments: Installment[] = [];
  legalDocuments: LegalDocument[] = [];
  notifications: SystemNotification[] = [];
  auditLogs: AuditLog[] = [];
  siteVisits: any[] = [];
  bookings: any[] = [];
  supportTickets: SupportTicket[] = [];

  listeners: Set<() => void> = new Set();
  syncLogs: string[] = [];

  // Supabase states
  supabaseClient: SupabaseClient | null = null;
  isSupabaseConfigured = false;
  isSupabaseConnected = false;
  supabaseError: string | null = null;
  supabaseUrl = '';
  supabaseAnonKey = '';

  constructor() {
    this.loadFromStorage();
    this.initializeSupabase();
  }

  // Attempt to initialize Supabase
  initializeSupabase() {
    try {
      const storedUrl = localStorage.getItem('nirmaan_supabase_url') || (import.meta as any).env.VITE_SUPABASE_URL || '';
      const storedKey = localStorage.getItem('nirmaan_supabase_key') || (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

      this.supabaseUrl = storedUrl;
      this.supabaseAnonKey = storedKey;

      if (storedUrl && storedKey) {
        this.isSupabaseConfigured = true;
        this.supabaseClient = createClient(storedUrl, storedKey);
        this.testSupabaseConnection();
      } else {
        this.addSyncLog('Supabase', 'No active Supabase keys. Running in Local Offline Mode with browser storage.');
      }
    } catch (e: any) {
      this.supabaseError = e?.message || 'Error configuring Supabase Client.';
      this.addSyncLog('Supabase', `Error context: ${this.supabaseError}`);
    }
  }

  // Save new client credentials dynamically
  async updateSupabaseCredentials(url: string, key: string) {
    if (!url || !key) {
      localStorage.removeItem('nirmaan_supabase_url');
      localStorage.removeItem('nirmaan_supabase_key');
      this.supabaseClient = null;
      this.isSupabaseConfigured = false;
      this.isSupabaseConnected = false;
      this.supabaseError = null;
      this.addSyncLog('Supabase', 'Cleared Supabase configuration keys. Reverting to Local Offline Mode.');
      this.save();
      return { success: true, message: 'Supabase disconnected' };
    }

    try {
      localStorage.setItem('nirmaan_supabase_url', url);
      localStorage.setItem('nirmaan_supabase_key', key);
      this.supabaseUrl = url;
      this.supabaseAnonKey = key;
      this.isSupabaseConfigured = true;
      this.supabaseClient = createClient(url, key);
      
      const testResult = await this.testSupabaseConnection();
      if (testResult.success) {
        this.addSyncLog('Supabase', 'Keys registered and verified! Connection Active.');
        // Pull latest contents
        await this.pullFromSupabase();
        return { success: true, message: 'Successfully connected and synced database!' };
      } else {
        return { success: false, message: `Could not reach database: ${testResult.error}` };
      }
    } catch (e: any) {
      this.isSupabaseConnected = false;
      this.supabaseError = e?.message || 'Verification failed.';
      return { success: false, message: this.supabaseError };
    }
  }

  // Test remote connectivity by pinging 'projects'
  async testSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.supabaseClient) {
      this.isSupabaseConnected = false;
      return { success: false, error: 'No initialized client.' };
    }

    try {
      // Test querying projects table
      const { data, error } = await this.supabaseClient.from('projects').select('id').limit(1);
      if (error) {
        this.isSupabaseConnected = false;
        this.supabaseError = `${error.code}: ${error.message} (Tables might not be set up yet. Run SQL script!)`;
        this.addSyncLog('Supabase', `Warning: ${this.supabaseError}`);
        this.triggerListeners();
        return { success: false, error: this.supabaseError };
      }

      this.isSupabaseConnected = true;
      this.supabaseError = null;
      this.addSyncLog('Supabase', 'Connected! Supabase Postgres Engine Synchronized.');
      this.triggerListeners();
      return { success: true };
    } catch (e: any) {
      this.isSupabaseConnected = false;
      this.supabaseError = e?.message || 'Network connectivity error.';
      this.addSyncLog('Supabase', `Connection Error: ${this.supabaseError}`);
      this.triggerListeners();
      return { success: false, error: this.supabaseError };
    }
  }

  // Force seed / Push all local records to Supabase tables (Full CRUD)
  async pushAllToSupabase() {
    if (!this.supabaseClient || !this.isSupabaseConnected) {
      alert('Must configure a valid, connected Supabase database first.');
      return;
    }

    this.addSyncLog('Sync', 'Starting complete database upload to Supabase tables...');
    try {
      // Upsert projects
      const projErr = await this.supabaseClient.from('projects').upsert(this.projects);
      if (projErr.error) throw new Error(`Projects upload failed: ${projErr.error.message}`);

      // Upsert customers
      const custErr = await this.supabaseClient.from('customers').upsert(this.customers);
      if (custErr.error) throw new Error(`Customers upload failed: ${custErr.error.message}`);

      // Upsert plots
      const plotErr = await this.supabaseClient.from('plots').upsert(this.plots);
      if (plotErr.error) throw new Error(`Plots upload failed: ${plotErr.error.message}`);

      // Upsert leads
      const leadErr = await this.supabaseClient.from('leads').upsert(this.leads);
      if (leadErr.error) throw new Error(`Leads upload failed: ${leadErr.error.message}`);

      // Upsert payments
      const payErr = await this.supabaseClient.from('payments').upsert(this.payments);
      if (payErr.error) throw new Error(`Payments upload failed: ${payErr.error.message}`);

      // Upsert installments
      const instErr = await this.supabaseClient.from('installments').upsert(this.installments);
      if (instErr.error) throw new Error(`Installments upload failed: ${instErr.error.message}`);

      // Upsert legal milestones
      const legErr = await this.supabaseClient.from('legal_documents').upsert(this.legalDocuments);
      if (legErr.error) throw new Error(`Legal Docs upload failed: ${legErr.error.message}`);

      // Upsert audit logs
      const audErr = await this.supabaseClient.from('audit_logs').upsert(this.auditLogs);
      if (audErr.error) throw new Error(`Audit Logs upload failed: ${audErr.error.message}`);

      // Upsert notifications
      const notErr = await this.supabaseClient.from('notifications').upsert(this.notifications);
      if (notErr.error) throw new Error(`Notifications upload failed: ${notErr.error.message}`);

      // Upsert site visits
      if (this.siteVisits.length > 0) {
        const svErr = await this.supabaseClient.from('site_visits').upsert(this.siteVisits);
        if (svErr.error) throw new Error(`Site Visits upload failed: ${svErr.error.message}`);
      }

      // Upsert bookings
      if (this.bookings.length > 0) {
        const bkErr = await this.supabaseClient.from('bookings').upsert(this.bookings);
        if (bkErr.error) throw new Error(`Bookings upload failed: ${bkErr.error.message}`);
      }

      // Upsert support tickets
      if (this.supportTickets.length > 0) {
        try {
          await this.supabaseClient.from('support_tickets').upsert(this.supportTickets);
        } catch (err) {
          console.warn('Support tickets upsert warning (table may not exist yet):', err);
        }
      }

      this.addSyncLog('Sync', 'Success! All CRM tables synchronized to Supabase Cloud.');
      this.triggerListeners();
      alert('All local database records successfully pushed and synchronized with your Supabase database!');
    } catch (err: any) {
      this.addSyncLog('Sync', `Push failure: ${err?.message || err}`);
      alert(`Push action failed. Verify that you ran the SQL Setup Script in Supabase. Details: ${err?.message}`);
    }
  }

  // Force pull database tables from Supabase (Full CRUD retrieval)
  async pullFromSupabase() {
    if (!this.supabaseClient) return;
    this.addSyncLog('Sync', 'Pulling updated tables from Supabase...');
    try {
      const p = await this.supabaseClient.from('projects').select('*');
      if (p.data) this.projects = p.data;

      const c = await this.supabaseClient.from('customers').select('*');
      if (c.data) this.customers = c.data;

      const pl = await this.supabaseClient.from('plots').select('*');
      if (pl.data) this.plots = pl.data;

      const l = await this.supabaseClient.from('leads').select('*').order('created_at', { ascending: false });
      if (l.data) this.leads = l.data;

      const py = await this.supabaseClient.from('payments').select('*');
      if (py.data) this.payments = py.data;

      const ins = await this.supabaseClient.from('installments').select('*');
      if (ins.data) this.installments = ins.data;

      const leg = await this.supabaseClient.from('legal_documents').select('*');
      if (leg.data) this.legalDocuments = leg.data;

      const aud = await this.supabaseClient.from('audit_logs').select('*').order('timestamp', { ascending: false });
      if (aud.data) this.auditLogs = aud.data;

      const not = await this.supabaseClient.from('notifications').select('*').order('timestamp', { ascending: false });
      if (not.data) this.notifications = not.data;

      const sv = await this.supabaseClient.from('site_visits').select('*');
      if (sv.data) {
        this.siteVisits = sv.data.map((v: any) => {
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
              // Ignore invalid parse
            }
          }
          return v;
        });
      }

      const bk = await this.supabaseClient.from('bookings').select('*');
      if (bk.data) this.bookings = bk.data;

      try {
        const st = await this.supabaseClient.from('support_tickets').select('*').order('created_at', { ascending: false });
        if (st.data) this.supportTickets = st.data;
      } catch (err) {
        console.warn('Support tickets pull warning (table may not exist yet):', err);
      }

      this.addSyncLog('Sync', 'Database pull completed. Deployed state updated.');
      this.saveLocalOnly();
      this.triggerListeners();
    } catch (err: any) {
      this.addSyncLog('Sync', `Error pulling from Supabase: ${err.message}`);
    }
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem('nirmaan_avakh_db');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.projects = parsed.projects || initialProjects;
        this.plots = parsed.plots || initialPlots;
        this.crmUsers = parsed.crmUsers || initialCRMUsers;
        this.salesTeam = parsed.salesTeam || initialSalesTeam;
        this.leads = parsed.leads || initialLeads;
        this.customers = parsed.customers || initialCustomers;
        this.payments = parsed.payments || initialPayments;
        this.installments = parsed.installments || initialInstallments;
        this.legalDocuments = parsed.legalDocuments || initialLegalDocuments;
        this.notifications = parsed.notifications || initialNotifications;
        this.auditLogs = parsed.auditLogs || initialAuditLogs;
        this.siteVisits = parsed.siteVisits || [];
        this.bookings = parsed.bookings || [];
        this.supportTickets = parsed.supportTickets || [];
        this.syncLogs = parsed.syncLogs || ['Centralized Unified Database Deployed.'];
      } else {
        this.resetToDefaults();
      }
    } catch (e) {
      console.error('Error loading DB, resetting...', e);
      this.resetToDefaults();
    }
  }

  resetToDefaults() {
    this.projects = JSON.parse(JSON.stringify(initialProjects));
    this.plots = JSON.parse(JSON.stringify(initialPlots));
    this.crmUsers = JSON.parse(JSON.stringify(initialCRMUsers));
    this.salesTeam = JSON.parse(JSON.stringify(initialSalesTeam));
    this.leads = JSON.parse(JSON.stringify(initialLeads));
    this.customers = JSON.parse(JSON.stringify(initialCustomers));
    this.payments = JSON.parse(JSON.stringify(initialPayments));
    this.installments = JSON.parse(JSON.stringify(initialInstallments));
    this.legalDocuments = JSON.parse(JSON.stringify(initialLegalDocuments));
    this.notifications = JSON.parse(JSON.stringify(initialNotifications));
    this.auditLogs = JSON.parse(JSON.stringify(initialAuditLogs));
    this.siteVisits = [];
    this.bookings = [];
    this.supportTickets = [];
    this.syncLogs = [
      `[DATABASE] Central Database Engine Initialized. Seeded with 2 Projects, 11 Plots, 4 Customers, 4 Leads.`,
      `[BROADCAST] Sync Service Ready. Connected frontends: Website, CRM, Mobile App.`
    ];
    this.saveLocalOnly();
  }

  saveLocalOnly() {
    const data = {
      projects: this.projects,
      plots: this.plots,
      crmUsers: this.crmUsers,
      salesTeam: this.salesTeam,
      leads: this.leads,
      customers: this.customers,
      payments: this.payments,
      installments: this.installments,
      legalDocuments: this.legalDocuments,
      notifications: this.notifications,
      auditLogs: this.auditLogs,
      siteVisits: this.siteVisits,
      bookings: this.bookings,
      supportTickets: this.supportTickets,
      syncLogs: this.syncLogs
    };
    localStorage.setItem('nirmaan_avakh_db', JSON.stringify(data));
  }

  save() {
    this.saveLocalOnly();
    this.triggerListeners();
  }

  // Helper to run background queries (Full CRUD Operations)
  public async safeSupabaseWrite(tableName: string, payload: any, action: 'insert' | 'update' | 'upsert' = 'upsert') {
    if (!this.supabaseClient || !this.isSupabaseConnected) return;

    try {
      let query;
      if (action === 'insert') {
        query = this.supabaseClient.from(tableName).insert(payload);
      } else if (action === 'update') {
        query = this.supabaseClient.from(tableName).update(payload).eq('id', payload.id);
      } else {
        query = this.supabaseClient.from(tableName).upsert(payload);
      }

      const { error } = await query;
      if (error) {
        this.addSyncLog('Supabase', `Background query error on '${tableName}': ${error.message}`);
      } else {
        this.addSyncLog('Supabase', `Synced ${action} to table '${tableName}' for record: ${payload.id || 'bulk'}`);
      }
    } catch (e: any) {
      this.addSyncLog('Supabase', `Failed background syncer write: ${e.message}`);
    }
  }

  // Live subscription (mimics Supabase real-time and WebSockets)
  subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  triggerListeners() {
    this.listeners.forEach(fn => fn());
  }

  addSyncLog(origin: string, message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.syncLogs.unshift(`[${timestamp}] [${origin.toUpperCase()}] ${message}`);
    if (this.syncLogs.length > 100) {
      this.syncLogs.pop();
    }
  }

  // --- ACTIONS WITH AUDIT LOGGING & COMPONENT RE-SYNC (CRUD Operations) ---

  // 1. Submit Website Lead Form (Instantly captured in CRM)
  captureWebLead(formData: { full_name: string; phone: string; email: string; source: LeadSource; interest_project_id?: string }) {
    const newLead: Lead = {
      id: generateId('lead'),
      source: formData.source,
      full_name: formData.full_name,
      phone: formData.phone,
      email: formData.email,
      status: 'new',
      score: Math.floor(Math.random() * 41) + 40,
      assigned_to: null,
      created_at: new Date().toISOString()
    };

    this.leads.unshift(newLead);
    this.addSyncLog('Website', `Lead Captured! "${newLead.full_name}" submitted form. Source: ${newLead.source.toUpperCase()}`);
    
    this.createNotification(
      'New Lead Captured',
      `Lead "${newLead.full_name}" registered via public website. Phone: ${newLead.phone}.`
    );

    this.createAuditLog(
      'landing_page',
      'Web Lead Form',
      'LEAD_CAPTURED',
      'leads',
      null,
      newLead
    );

    this.save();

    // Background push
    this.safeSupabaseWrite('leads', newLead, 'insert');
    return newLead;
  }

  // Register Customer Account Online
  registerCustomerAccount(fullName: string, phone: string, email: string) {
    let customer = this.customers.find(c => c.phone.replace(/\s+/g, '') === phone.replace(/\s+/g, ''));
    if (!customer) {
      customer = {
        id: generateId('cust'),
        user_id: `user_cust_${fullName.toLowerCase().replace(/\s+/g, '_')}`,
        full_name: fullName,
        phone: phone,
        aadhaar_masked: 'XXXX-XXXX-TBD',
        pan_masked: 'XXXXXTBD',
        nominee_name: 'Pending legal profile'
      };
      this.customers.push(customer);
      this.safeSupabaseWrite('customers', customer, 'insert');
    }

    const leadExists = this.leads.some(l => l.phone.replace(/\s+/g, '') === phone.replace(/\s+/g, ''));
    if (!leadExists) {
      const newLead: Lead = {
        id: generateId('lead'),
        source: 'web',
        full_name: fullName,
        phone: phone,
        email: email,
        status: 'new',
        score: 90,
        assigned_to: null,
        created_at: new Date().toISOString()
      };
      this.leads.unshift(newLead);
      this.safeSupabaseWrite('leads', newLead, 'insert');
    }

    this.addSyncLog('Database', `Production Registration: Customer "${fullName}" registered phone account.`);
    this.createNotification(
      'Client Registered Online',
      `New customer "${fullName}" has completed mobile registration.`
    );
    this.createAuditLog(
      'system',
      'Mobile Client API',
      'CUSTOMER_REGISTERED',
      'customers',
      null,
      customer
    );
    this.save();
    return customer;
  }

  // Book Site Visit
  bookSiteVisitRecord(fullName: string, phone: string, prjId: string, visitDate: string, timeSlot: string, existingVisit?: any) {
    let lead = this.leads.find(l => l.phone.replace(/\s+/g, '') === phone.replace(/\s+/g, ''));
    if (!lead) {
      lead = {
        id: existingVisit?.lead_id || generateId('lead'),
        source: 'web',
        full_name: fullName,
        phone: phone,
        email: `${fullName.toLowerCase().replace(/\s+/g, '')}@nirmaanavakh.com`,
        status: 'site_visit',
        score: 95,
        assigned_to: null,
        created_at: new Date().toISOString()
      };
      this.leads.unshift(lead);
      if (!existingVisit) {
        this.safeSupabaseWrite('leads', lead, 'insert');
      }
    } else {
      lead.status = 'site_visit';
      if (!existingVisit) {
        this.safeSupabaseWrite('leads', lead, 'update');
      }
    }

    const newSiteVisit = existingVisit || {
      id: generateId('sv'),
      lead_id: lead.id,
      project_name: prjId === 'proj_assam_valley' ? 'Assam Valley Plots' : 'Brahmaputra Hills Township',
      plot_id: null,
      customer_full_name: fullName,
      customer_phone_number: phone,
      customer_email: `${fullName.toLowerCase().replace(/\s+/g, '')}@nirmaanavakh.com`,
      visit_date: `${visitDate} (${timeSlot})`,
      visit_time: timeSlot,
      feedback: 'Scheduled via online web portal',
      status: 'scheduled',
      created_at: new Date().toISOString()
    };

    let normalizedVisit = newSiteVisit;
    if (newSiteVisit && newSiteVisit.feedback && newSiteVisit.feedback.trim().startsWith('{')) {
      try {
        const meta = JSON.parse(newSiteVisit.feedback);
        normalizedVisit = {
          ...newSiteVisit,
          project_name: newSiteVisit.project_name || meta.project_name,
          customer_full_name: newSiteVisit.customer_full_name || meta.customer_full_name,
          customer_phone_number: newSiteVisit.customer_phone_number || meta.customer_phone_number,
          customer_email: newSiteVisit.customer_email || meta.customer_email,
          visit_time: newSiteVisit.visit_time || meta.visit_time,
          created_at: newSiteVisit.created_at || meta.created_at
        };
      } catch (e) {
        // Ignore
      }
    }

    this.siteVisits.unshift(normalizedVisit);
    if (!existingVisit) {
      this.safeSupabaseWrite('site_visits', newSiteVisit, 'insert');
    }

    this.addSyncLog('Database', `Site Visit Scheduled: "${fullName}" booked visit on ${visitDate} at ${timeSlot}.`);
    this.createNotification(
      'Site Visit Booked',
      `Client "${fullName}" (${phone}) scheduled a physical site visit on ${visitDate} (${timeSlot}).`
    );
    this.createAuditLog(
      'system',
      'Booking Scheduler',
      'SITE_VISIT_BOOKED',
      'leads',
      null,
      { fullName, prjId, visitDate, timeSlot }
    );
    this.save();
  }

  // Support Ticket
  submitSupportTicket(customerId: string, fullName: string, phone: string, message: string) {
    const ticketId = generateId('st');
    const newTicket: SupportTicket = {
      id: ticketId,
      customer_id: customerId,
      customer_name: fullName,
      phone: phone,
      message: message,
      status: 'open',
      created_at: new Date().toISOString()
    };

    this.supportTickets.unshift(newTicket);
    this.safeSupabaseWrite('support_tickets', newTicket, 'insert');

    this.addSyncLog('Database', `Support Ticket #${ticketId} Submitted: "${fullName}" (${phone}): ${message.substring(0, 50)}...`);
    
    this.createNotification(
      'Customer Support Request',
      `Support Ticket #${ticketId} submitted for "${fullName}" (${phone}): "${message}"`
    );

    this.createAuditLog(
      'system',
      'Customer Care Portal',
      'SUPPORT_TICKET_SUBMITTED',
      'support_tickets',
      null,
      newTicket
    );

    this.save();
    return newTicket;
  }

  // Assign Lead to Agent
  assignLead(leadId: string, agentId: string | null, userId: string, userName: string) {
    const lead = this.leads.find(l => l.id === leadId);
    if (!lead) return;

    const oldVal = { assigned_to: lead.assigned_to };
    lead.assigned_to = agentId;

    const agentName = this.salesTeam.find(a => a.id === agentId)?.full_name || 'Unassigned';
    this.addSyncLog('CRM', `Lead "${lead.full_name}" assigned to agent ${agentName}`);
    
    this.createAuditLog(
      userId,
      userName,
      'LEAD_ASSIGNMENT',
      'leads',
      oldVal,
      { assigned_to: agentId, agent_name: agentName }
    );

    this.save();
    this.safeSupabaseWrite('leads', lead, 'update');
  }

  // Update Pipeline Status for Lead
  updateLeadStatus(leadId: string, status: LeadStatus, userId: string, userName: string) {
    const lead = this.leads.find(l => l.id === leadId);
    if (!lead) return;

    const oldStatus = lead.status;
    lead.status = status;

    this.addSyncLog('CRM', `Lead "${lead.full_name}" status updated: ${oldStatus.toUpperCase()} -> ${status.toUpperCase()}`);
    
    this.createAuditLog(
      userId,
      userName,
      'LEAD_STATUS_UPDATE',
      'leads',
      { status: oldStatus },
      { status: status }
    );

    if (status === 'won') {
      this.automatingLeadToCustomerTransition(lead, userId, userName);
    } else {
      this.save();
    }

    this.safeSupabaseWrite('leads', lead, 'update');
  }

  // Automates lead creation
  private automatingLeadToCustomerTransition(lead: Lead, userId: string, userName: string) {
    let customer = this.customers.find(c => c.phone === lead.phone);
    if (!customer) {
      customer = {
        id: generateId('cust'),
        user_id: `user_cust_${lead.full_name.toLowerCase().replace(/\s+/g, '_')}`,
        full_name: lead.full_name,
        phone: lead.phone,
        aadhaar_masked: 'XXXX-XXXX-TBD',
        pan_masked: 'XXXXXTBD',
        nominee_name: 'Pending details'
      };
      this.customers.push(customer);
      this.addSyncLog('System', `Lead WON! Auto-onboarded user client "${customer.full_name}".`);
      
      this.createNotification(
        'Client Onboarded',
        `New customer profile created for "${customer.full_name}" as lead transitioned to WON.`
      );

      this.safeSupabaseWrite('customers', customer, 'insert');
    }
    this.save();
  }

  // Update plot status
  updatePlotStatus(plotId: string, status: 'available' | 'reserved' | 'sold', customerId: string | null, userId: string, userName: string) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return;

    const oldVal = { status: plot.status, customer_id: plot.customer_id };
    plot.status = status;
    plot.customer_id = customerId;

    const customerName = customerId ? (this.customers.find(c => c.id === customerId)?.full_name || 'Selected Customer') : 'None';
    this.addSyncLog('CRM', `Plot "${plot.plot_number}" updated to ${status.toUpperCase()} (Linked Customer: ${customerName})`);
    
    this.createNotification(
      'Plot Status Updated',
      `Plot "${plot.plot_number}" is now ${status.toUpperCase()}.`
    );

    this.createAuditLog(
      userId,
      userName,
      'PLOT_STATUS_UPDATE',
      'plots',
      oldVal,
      { status: status, customer_id: customerId }
    );

    if ((status === 'sold' || status === 'reserved') && customerId) {
      this.cascadePaymentLedger(plot, customerId);
    }

    this.save();
    this.safeSupabaseWrite('plots', plot, 'update');
  }

  // Cascade plot creation to ledgers & documents
  cascadePaymentLedger(plot: Plot, customerId: string) {
    const existing = this.payments.find(p => p.plot_id === plot.id && p.customer_id === customerId);
    if (existing) return;

    const totalAmount = plot.price;
    const paidAmount = plot.status === 'sold' ? totalAmount * 0.4 : totalAmount * 0.15;
    const outstanding = totalAmount - paidAmount;

    const paymentId = generateId('pay');
    const paymentRecord: PaymentSummary = {
      id: paymentId,
      plot_id: plot.id,
      customer_id: customerId,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      balance_outstanding: outstanding
    };

    this.payments.push(paymentRecord);
    this.safeSupabaseWrite('payments', paymentRecord, 'insert');

    // Insert to bookings table
    const bookingRecord = {
      id: generateId('booking'),
      customer_id: customerId,
      plot_id: plot.id,
      booking_date: new Date().toISOString(),
      amount_paid: paidAmount,
      status: 'confirmed',
      created_at: new Date().toISOString()
    };
    this.bookings.push(bookingRecord);
    this.safeSupabaseWrite('bookings', bookingRecord, 'insert');

    // immediate installment
    const install1 = {
      id: generateId('inst'),
      payment_id: paymentId,
      amount: paidAmount,
      due_date: new Date().toISOString().split('T')[0],
      status: 'paid' as const,
      receipt_url: `https://nirmaanavakhdevelopers.com/receipts/rec_${paymentId}_booking.pdf`
    };
    this.installments.push(install1);
    this.safeSupabaseWrite('installments', install1, 'insert');

    // remaining installments
    const installCount = 3;
    const rawAmt = outstanding / installCount;

    for (let i = 1; i <= installCount; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i * 3);
      const postInst = {
        id: generateId('inst'),
        payment_id: paymentId,
        amount: Math.round(rawAmt),
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending' as const,
        receipt_url: null
      };
      this.installments.push(postInst);
      this.safeSupabaseWrite('installments', postInst, 'insert');
    }

    // seed legal doc stages
    const stages: ('agreement' | 'permission' | 'trace_map' | 'sale_deed' | 'mutation')[] = ['agreement', 'permission', 'trace_map', 'sale_deed', 'mutation'];
    stages.forEach((stg, index) => {
      const doc = {
        id: generateId('leg'),
        plot_id: plot.id,
        type: stg,
        status: (index === 0 ? 'processing' : 'drafting') as any,
        file_url: '',
        assigned_officer: 'Debojit Goswami (Legal)',
        updated_at: new Date().toISOString().split('T')[0]
      };
      this.legalDocuments.push(doc);
      this.safeSupabaseWrite('legal_documents', doc, 'insert');
    });

    this.addSyncLog('System', `Payment-Installment Cascade & Legal Milestones configured for Plot ${plot.plot_number}.`);
  }

  // Record administrative financial payments
  recordInvoicePayment(installmentId: string, refReceiptUrl: string | null, userId: string, userName: string) {
    const inst = this.installments.find(i => i.id === installmentId);
    if (!inst || inst.status === 'paid') return;

    inst.status = 'paid';
    inst.receipt_url = refReceiptUrl || `https://nirmaanavakhdevelopers.com/receipts/rec_ref_${generateId('rec')}.pdf`;

    const payment = this.payments.find(p => p.id === inst.payment_id);
    if (payment) {
      payment.paid_amount += inst.amount;
      payment.balance_outstanding = Math.max(0, payment.total_amount - payment.paid_amount);

      const customer = this.customers.find(c => c.id === payment.customer_id);
      const plot = this.plots.find(p => p.id === payment.plot_id);

      this.addSyncLog('Finance', `Recorded collection of ₹${inst.amount.toLocaleString()} for Plot ${plot?.plot_number || 'TBD'}.`);
      
      this.createNotification(
        'Payment Recorded',
        `Payment of ₹${inst.amount.toLocaleString()} collected from client "${customer?.full_name}".`
      );

      this.createAuditLog(
        userId,
        userName,
        'PAYMENT_RECORDED',
        'installments',
        { status: 'pending' },
        { status: 'paid', amount: inst.amount, payment_id: payment.id }
      );

      this.safeSupabaseWrite('payments', payment, 'update');
    }

    this.save();
    this.safeSupabaseWrite('installments', inst, 'update');
  }

  // Update Legal Milestone
  updateLegalMilestone(docId: string, status: 'drafting' | 'processing' | 'completed', fileUrl: string, userId: string, userName: string) {
    const doc = this.legalDocuments.find(d => d.id === docId);
    if (!doc) return;

    const oldStatus = doc.status;
    doc.status = status;
    doc.updated_at = new Date().toISOString().split('T')[0];
    if (fileUrl) {
      doc.file_url = fileUrl;
    }

    const plot = this.plots.find(p => p.id === doc.plot_id);
    this.addSyncLog('Legal', `Legal File "${doc.type.toUpperCase()}" for Plot ${plot?.plot_number} set to ${status.toUpperCase()}`);
    
    this.createNotification(
      'Legal Roadmap Progress',
      `Legal stage "${doc.type.toUpperCase()}" for plot ${plot?.plot_number || ''} is now ${status.toUpperCase()}.`
    );

    this.createAuditLog(
      userId,
      userName,
      'LEGAL_DOC_UPDATE',
      'legal_documents',
      { status: oldStatus },
      { status: status, file_url: fileUrl }
    );

    if (status === 'completed') {
      const plotDocs = this.legalDocuments.filter(d => d.plot_id === doc.plot_id);
      const stagesOrder: ('agreement' | 'permission' | 'trace_map' | 'sale_deed' | 'mutation')[] = ['agreement', 'permission', 'trace_map', 'sale_deed', 'mutation'];
      const curIndex = stagesOrder.indexOf(doc.type);
      if (curIndex !== -1 && curIndex < stagesOrder.length - 1) {
        const nextType = stagesOrder[curIndex + 1];
        const nextDoc = plotDocs.find(d => d.type === nextType);
        if (nextDoc && nextDoc.status === 'drafting') {
          nextDoc.status = 'processing';
          this.safeSupabaseWrite('legal_documents', nextDoc, 'update');
          this.addSyncLog('System', `Cascade Trigger: Next legal stage "${nextType.toUpperCase()}" activated.`);
        }
      }
    }

    this.save();
    this.safeSupabaseWrite('legal_documents', doc, 'update');
  }

  // Add New Plot
  addPlotToProject(projectId: string, plotNumber: string, sizeLecha: number, customPrice?: number) {
    const proj = this.projects.find(p => p.id === projectId);
    if (!proj) return;

    const basePrice = customPrice || proj.base_price_per_lecha * sizeLecha;
    const newPlot: Plot = {
      id: generateId('plot'),
      project_id: projectId,
      plot_number: plotNumber,
      size_lecha: sizeLecha,
      price: basePrice,
      status: 'available',
      customer_id: null
    };

    this.plots.push(newPlot);
    proj.total_plots += 1;

    this.addSyncLog('CRM', `New Plot "${plotNumber}" added to project "${proj.name}" (Size: ${sizeLecha} lechas).`);
    
    this.createAuditLog(
      'user_admin',
      'Abhinav Avakh Sharma',
      'PLOT_CREATED',
      'plots',
      null,
      newPlot
    );

    this.save();
    this.safeSupabaseWrite('plots', newPlot, 'insert');
    this.safeSupabaseWrite('projects', proj, 'update');
    return newPlot;
  }

  createNotification(title: string, message: string) {
    const notif: SystemNotification = {
      id: generateId('not'),
      user_id: null,
      title,
      message,
      is_read: false,
      timestamp: new Date().toISOString()
    };
    this.notifications.unshift(notif);
    this.safeSupabaseWrite('notifications', notif, 'insert');
    return notif;
  }

  clearNotifications() {
    this.notifications = [];
    this.save();
    if (this.supabaseClient) {
      this.supabaseClient.from('notifications').delete().neq('id', 'null').then(({ error }) => {
        if (error) this.addSyncLog('Supabase', `Error clearing: ${error.message}`);
      });
    }
  }

  createAuditLog(userId: string, userName: string, action: string, tableName: string, oldValue: any, newValue: any) {
    const log: AuditLog = {
      id: generateId('audit'),
      user_id: userId,
      user_name: userName,
      action,
      table_name: tableName,
      old_value: oldValue,
      new_value: newValue,
      timestamp: new Date().toISOString()
    };
    this.auditLogs.unshift(log);
    this.safeSupabaseWrite('audit_logs', log, 'insert');
  }
}

export const db = new CentralDatabase();
