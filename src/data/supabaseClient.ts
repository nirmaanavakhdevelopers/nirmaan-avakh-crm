import { createClient } from '@supabase/supabase-js';

// Load initial credentials from environment or fallback storage
const getSavedCredentials = () => {
  const envUrl = (import.meta as any).env.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

  const localUrl = localStorage.getItem('nirmaan_supabase_url');
  const localKey = localStorage.getItem('nirmaan_supabase_key');

  return {
    url: localUrl || envUrl || '',
    key: localKey || envKey || ''
  };
};

export const { url: SUPABASE_URL, key: SUPABASE_KEY } = getSavedCredentials();

// Initialize the client if credentials are provided
export const supabase = SUPABASE_URL && SUPABASE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

/**
 * SQL Schema Definition for easy copy-paste inside the Supabase SQL editor.
 * Ensures the user can stand up a schema in 1 click.
 */
export const DEPLOYMENT_SQL = `-- Nirmaan Avakh Developers Database Schema
-- Paste this script directly into the Supabase SQL Editor!

-- 1. CLEANUP PREVIOUS TABLES (If re-deploying)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS legal_documents CASCADE;
DROP TABLE IF EXISTS installments CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS site_visits CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS plots CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS crm_users CASCADE;

-- 2. CREATE SCHEMAS
CREATE TABLE crm_users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'super_admin', 'admin', 'sales_executive', 'customer'
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE projects (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location TEXT NOT NULL,
  total_area DECIMAL NOT NULL,
  total_plots INTEGER NOT NULL,
  base_price_per_lecha DECIMAL NOT NULL,
  coordinates JSONB,
  status VARCHAR(50) DEFAULT 'active'
);

CREATE TABLE plots (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) REFERENCES projects(id) ON DELETE CASCADE,
  plot_number VARCHAR(100) NOT NULL,
  size_lecha DECIMAL NOT NULL,
  price DECIMAL NOT NULL,
  status VARCHAR(50) DEFAULT 'available', -- 'available', 'reserved', 'sold'
  customer_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE leads (
  id VARCHAR(255) PRIMARY KEY,
  source VARCHAR(50) NOT NULL, -- 'google', 'fb', 'whatsapp', 'web', 'walk-in'
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'new', -- 'new', 'contacted', 'site_visit', 'negotiation', 'won', 'lost'
  score INTEGER DEFAULT 50,
  assigned_to VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE customers (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(100) UNIQUE NOT NULL,
  aadhaar_masked VARCHAR(50) DEFAULT 'XXXX-XXXX-TBD',
  pan_masked VARCHAR(50) DEFAULT 'XXXXXTBD',
  nominee_name VARCHAR(255) DEFAULT 'Pending'
);

-- Required site_visits table
CREATE TABLE site_visits (
  id VARCHAR(255) PRIMARY KEY,
  lead_id VARCHAR(255) REFERENCES leads(id) ON DELETE CASCADE,
  project_name VARCHAR(255),
  plot_id VARCHAR(255) REFERENCES plots(id) ON DELETE SET NULL,
  customer_full_name VARCHAR(255),
  customer_phone_number VARCHAR(100),
  customer_email VARCHAR(255),
  visit_date TIMESTAMP WITH TIME ZONE NOT NULL,
  visit_time VARCHAR(100),
  feedback TEXT,
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'no-show'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Required bookings table
CREATE TABLE bookings (
  id VARCHAR(255) PRIMARY KEY,
  customer_id VARCHAR(255) REFERENCES customers(id) ON DELETE CASCADE,
  plot_id VARCHAR(255) REFERENCES plots(id) ON DELETE CASCADE,
  booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  amount_paid DECIMAL NOT NULL,
  status VARCHAR(50) DEFAULT 'confirmed', -- 'pending', 'confirmed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payments (
  id VARCHAR(255) PRIMARY KEY,
  plot_id VARCHAR(255) REFERENCES plots(id) ON DELETE CASCADE,
  customer_id VARCHAR(255) REFERENCES customers(id) ON DELETE CASCADE,
  total_amount DECIMAL NOT NULL,
  paid_amount DECIMAL DEFAULT 0,
  balance_outstanding DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE installments (
  id VARCHAR(255) PRIMARY KEY,
  payment_id VARCHAR(255) REFERENCES payments(id) ON DELETE CASCADE,
  amount DECIMAL NOT NULL,
  due_date VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'paid', 'pending', 'overdue'
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE legal_documents (
  id VARCHAR(255) PRIMARY KEY,
  plot_id VARCHAR(255) REFERENCES plots(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL, -- 'agreement', 'permission', 'trace_map', 'sale_deed', 'mutation'
  status VARCHAR(50) DEFAULT 'drafting', -- 'drafting', 'processing', 'completed'
  file_url TEXT,
  assigned_officer VARCHAR(255),
  updated_at VARCHAR(100) NOT NULL
);

CREATE TABLE notifications (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE support_tickets (
  id VARCHAR(255) PRIMARY KEY,
  customer_id VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DB INDEXES FOR HIGH-PERFORMANCE QUERY EXECUTION
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_plots_project ON plots(project_id);
CREATE INDEX IF NOT EXISTS idx_plots_customer ON plots(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_installments_payment ON installments(payment_id);
CREATE INDEX IF NOT EXISTS idx_legal_plot ON legal_documents(plot_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_lead ON site_visits(lead_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer ON support_tickets(customer_id);

-- 3. SEED STARTING CONTENT (Internal Staff Members only)
INSERT INTO crm_users (id, email, role, full_name) VALUES
('usr_super_admin', 'director@nirmaanavakh.com', 'super_admin', 'Abhinav Avakh Sharma'),
('usr_admin', 'manager@nirmaanavakh.com', 'admin', 'Anupam Saikia'),
('usr_sales_exec', 'sales@nirmaanavakh.com', 'sales_executive', 'Rupali Das');

-- 4. ENABLE ACCESS POLICIES (Open robust CRUD setup for integration and demo environments)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Allow general public anonymous read-write access to table elements and records
CREATE POLICY "Public full access projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access plots" ON plots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access leads" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access installments" ON installments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access legal_documents" ON legal_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access crm_users" ON crm_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access site_visits" ON site_visits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access bookings" ON bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access support_tickets" ON support_tickets FOR ALL USING (true) WITH CHECK (true);
`;
