-- Nirmaan Avakh Developers Database Schema
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

-- 3. SEED STARTING CONTENT (Matches mock defaults)
INSERT INTO crm_users (id, email, role, full_name) VALUES
('usr_super_admin', 'director@nirmaanavakh.com', 'super_admin', 'Abhinav Avakh Sharma'),
('usr_admin', 'manager@nirmaanavakh.com', 'admin', 'Anupam Saikia'),
('usr_sales_exec', 'sales@nirmaanavakh.com', 'sales_executive', 'Rupali Das'),
('usr_customer', 'client@nirmaanavakh.com', 'customer', 'Gitartha Baruah');

INSERT INTO projects (id, name, location, total_area, total_plots, base_price_per_lecha, coordinates, status) VALUES
('proj_assam_valley', 'Assam Valley Plots', 'Guwahati-Shillong Road, Guwahati, Assam', 8.5, 20, 350000, '{"lat": 26.1158, "lng": 91.7925}', 'active'),
('proj_brahmaputra_hills', 'Brahmaputra Hills Township', 'Sonapur Viewpoint, Guwahati, Assam', 12.0, 15, 280000, '{"lat": 26.1287, "lng": 91.9745}', 'active');

INSERT INTO customers (id, user_id, full_name, phone, aadhaar_masked, pan_masked, nominee_name) VALUES
('cust_gitartha', 'user_cust_gitartha', 'Gitartha Baruah', '+91 9864011223', 'XXXX-XXXX-9912', 'XXXXX5412A', 'Minati Baruah'),
('cust_barasha', 'user_cust_barasha', 'Barasha Devi', '+91 8134098765', 'XXXX-XXXX-5561', 'XXXXX9987C', 'Bhaskar Sharma'),
('cust_bikash', 'user_cust_bikash', 'Bikash Hazarika', '+91 9435678123', 'XXXX-XXXX-4422', 'XXXXX3322E', 'Dipali Hazarika'),
('cust_jahnvi', 'user_cust_jahnvi', 'Jahnvi Goswami', '+91 7002012012', 'XXXX-XXXX-7070', 'XXXXX7070P', 'Debojit Goswami');

INSERT INTO plots (id, project_id, plot_number, size_lecha, price, status, customer_id) VALUES
('plot_av_101', 'proj_assam_valley', 'A-101', 3.5, 1225000, 'sold', 'cust_gitartha'),
('plot_av_102', 'proj_assam_valley', 'A-102', 4.0, 1400000, 'reserved', 'cust_barasha'),
('plot_av_103', 'proj_assam_valley', 'A-103', 3.0, 1050000, 'available', NULL),
('plot_av_104', 'proj_assam_valley', 'A-104', 5.0, 1750000, 'available', NULL),
('plot_av_105', 'proj_assam_valley', 'A-105', 3.5, 1225000, 'available', NULL),
('plot_av_106', 'proj_assam_valley', 'A-106', 4.5, 1575000, 'sold', 'cust_bikash'),
('plot_av_107', 'proj_assam_valley', 'A-107', 3.2, 1120000, 'available', NULL),
('plot_bh_201', 'proj_brahmaputra_hills', 'B-201', 5.0, 1400000, 'sold', 'cust_jahnvi'),
('plot_bh_202', 'proj_brahmaputra_hills', 'B-202', 6.5, 1820000, 'reserved', NULL),
('plot_bh_203', 'proj_brahmaputra_hills', 'B-203', 4.0, 1120000, 'available', NULL),
('plot_bh_204', 'proj_brahmaputra_hills', 'B-204', 4.5, 1260000, 'available', NULL);

INSERT INTO leads (id, source, full_name, phone, email, status, score, assigned_to, created_at) VALUES
('lead_001', 'google', 'Pranjal Kakati', '+91 9435012345', 'pranjal.kakati@gmail.com', 'site_visit', 85, 'agent_anupam', NOW() - INTERVAL '4 days'),
('lead_002', 'fb', 'Deepika Bora', '+91 8876045612', 'deepika.bora@outlook.com', 'new', 45, 'agent_rupali', NOW() - INTERVAL '2 days'),
('lead_003', 'whatsapp', 'Mrinal Talukdar', '+91 7002134567', 'mrinal.talukdar@rediffmail.com', 'negotiation', 72, 'agent_anupam', NOW() - INTERVAL '7 days'),
('lead_004', 'web', 'Nayan Jyoti Kalita', '+91 9954001122', 'nayan.kalita@yahoo.com', 'contacted', 60, NULL, NOW() - INTERVAL '1 day');

INSERT INTO payments (id, plot_id, customer_id, total_amount, paid_amount, balance_outstanding) VALUES
('pay_av_101', 'plot_av_101', 'cust_gitartha', 1225000, 825000, 400000),
('pay_av_102', 'plot_av_102', 'cust_barasha', 1400000, 400000, 1000000),
('pay_av_106', 'plot_av_106', 'cust_bikash', 1575000, 1575000, 0),
('pay_bh_201', 'plot_bh_201', 'cust_jahnvi', 1400000, 500000, 900000);

INSERT INTO installments (id, payment_id, amount, due_date, status, receipt_url) VALUES
('inst_001', 'pay_av_101', 425000, '2026-02-15', 'paid', 'https://nirmaanavakhdevelopers.com/receipts/rec_gitartha_booking.pdf'),
('inst_002', 'pay_av_101', 400000, '2026-05-10', 'paid', 'https://nirmaanavakhdevelopers.com/receipts/rec_gitartha_stage1.pdf'),
('inst_003', 'pay_av_101', 400000, '2026-08-20', 'pending', NULL),
('inst_004', 'pay_av_102', 400005, '2026-04-10', 'paid', 'https://nirmaanavakhdevelopers.com/receipts/rec_barasha_booking.pdf'),
('inst_005', 'pay_av_102', 500000, '2026-07-15', 'pending', NULL),
('inst_006', 'pay_av_102', 500000, '2026-10-15', 'pending', NULL),
('inst_007', 'pay_av_106', 500000, '2025-11-20', 'paid', 'https://nirmaanavakhdevelopers.com/receipts/rec_bikash_booking.pdf'),
('inst_008', 'pay_av_106', 500000, '2026-01-15', 'paid', 'https://nirmaanavakhdevelopers.com/receipts/rec_bikash_stage2.pdf'),
('inst_009', 'pay_av_106', 575000, '2026-04-10', 'paid', 'https://nirmaanavakhdevelopers.com/receipts/rec_bikash_final.pdf'),
('inst_010', 'pay_bh_201', 500000, '2026-03-01', 'paid', 'https://nirmaanavakhdevelopers.com/receipts/rec_jahnvi_booking.pdf'),
('inst_011', 'pay_bh_201', 450000, '2026-06-15', 'overdue', NULL),
('inst_012', 'pay_bh_201', 450000, '2026-09-15', 'pending', NULL);

INSERT INTO legal_documents (id, plot_id, type, status, file_url, assigned_officer, updated_at) VALUES
('leg_001', 'plot_av_101', 'agreement', 'completed', '/documents/agreement_av_101.pdf', 'Debojit Goswami', '2026-02-18'),
('leg_002', 'plot_av_101', 'permission', 'completed', '/documents/noc_av_101.pdf', 'Debojit Goswami', '2026-03-05'),
('leg_003', 'plot_av_101', 'trace_map', 'completed', '/documents/map_av_101.pdf', 'Debojit Goswami', '2026-03-20'),
('leg_004', 'plot_av_101', 'sale_deed', 'processing', '', 'Debojit Goswami', '2026-05-10'),
('leg_005', 'plot_av_101', 'mutation', 'drafting', '', 'Debojit Goswami', '2026-06-01'),
('leg_006', 'plot_av_102', 'agreement', 'completed', '/documents/agreement_av_102.pdf', 'Debojit Goswami', '2026-04-12'),
('leg_007', 'plot_av_102', 'permission', 'processing', '', 'Debojit Goswami', '2026-05-15'),
('leg_008', 'plot_bh_201', 'agreement', 'completed', '/documents/agreement_bh_201.pdf', 'Debojit Goswami', '2026-03-05'),
('leg_009', 'plot_bh_201', 'permission', 'completed', '/documents/noc_bh_201.pdf', 'Debojit Goswami', '2026-03-25'),
('leg_010', 'plot_bh_201', 'trace_map', 'processing', '', 'Debojit Goswami', '2026-05-20');

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
