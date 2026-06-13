/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Project {
  id: string;
  name: string;
  location: string;
  total_area: number; // in acres/Bighas
  total_plots: number;
  base_price_per_lecha: number;
  coordinates: { lat: number; lng: number };
  status: 'planning' | 'active' | 'completed';
}

export interface Plot {
  id: string;
  project_id: string;
  plot_number: string;
  size_lecha: number;
  price: number;
  status: 'available' | 'reserved' | 'sold';
  customer_id: string | null;
}

export type CRMUserRole = 'admin' | 'director' | 'sales_manager' | 'legal' | 'accountant';

export interface CRMUser {
  id: string;
  email: string;
  role: CRMUserRole;
  full_name: string;
}

export interface SalesMember {
  id: string;
  user_id: string;
  full_name: string;
  target_monthly: number;
}

export type LeadSource = 'fb' | 'ig' | 'google' | 'web' | 'whatsapp' | 'walk-in';
export type LeadStatus = 'new' | 'contacted' | 'site_visit' | 'negotiation' | 'won' | 'lost';

export interface Lead {
  id: string;
  source: LeadSource;
  full_name: string;
  phone: string;
  email: string;
  status: LeadStatus;
  score: number; // 0 - 100 lead score
  assigned_to: string | null; // sales_team.id
  created_at: string;
}

export interface SiteVisit {
  id: string;
  lead_id: string;
  plot_id: string;
  visit_date: string;
  feedback: string;
  status: 'scheduled' | 'completed' | 'no-show';
}

export interface Customer {
  id: string;
  user_id: string | null; // link to crm_users if they have a portal account
  full_name: string;
  phone: string;
  aadhaar_masked: string;
  pan_masked: string;
  nominee_name: string;
}

export interface PaymentSummary {
  id: string;
  plot_id: string;
  customer_id: string;
  total_amount: number;
  paid_amount: number;
  balance_outstanding: number;
}

export interface Installment {
  id: string;
  payment_id: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  receipt_url: string | null;
}

export type LegalDocType = 'agreement' | 'permission' | 'trace_map' | 'sale_deed' | 'mutation';
export type LegalDocStatus = 'drafting' | 'processing' | 'completed';

export interface LegalDocument {
  id: string;
  plot_id: string;
  type: LegalDocType;
  status: LegalDocStatus;
  file_url: string;
  assigned_officer: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string; // crm_users.id or 'system' / 'landing_page'
  user_name: string;
  action: string; // e.g. "PLOT_STATUS_UPDATE", "LEAD_CAPTURED", "PAYMENT_RECORDED"
  table_name: string;
  old_value: any;
  new_value: any;
  timestamp: string;
}

export interface SystemNotification {
  id: string;
  user_id: string | null; // target, null means all or general
  title: string;
  message: string;
  is_read: boolean;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  customer_id: string;
  customer_name: string;
  phone: string;
  message: string;
  status: 'open' | 'in-progress' | 'resolved';
  created_at: string;
}
