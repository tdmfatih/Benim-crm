-- ==============================================================================
-- 3AS TEKNOLOJİ - Kurumsal CRM, ERP, Saha/Montaj ve Teknik Servis Veritabanı
-- PostgreSQL 14+ Uyumlu Üretim Şeması
-- Hedef: panel.3asteknoloji.com
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROLLER VE YETKİLER (RBAC)
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    slug VARCHAR(64) NOT NULL UNIQUE,
    code VARCHAR(64),
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    can_view_cost BOOLEAN DEFAULT false,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. KULLANICILAR
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    full_name VARCHAR(128) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    role_id VARCHAR(64) NOT NULL REFERENCES roles(id) ON UPDATE CASCADE,
    role_title VARCHAR(128) NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    department VARCHAR(64) NOT NULL DEFAULT 'Yönetim',
    permissions JSONB,
    can_view_cost BOOLEAN,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- 3. ŞİRKET AYARLARI
CREATE TABLE IF NOT EXISTS company_settings (
    id VARCHAR(32) PRIMARY KEY DEFAULT 'sys-1',
    company_name VARCHAR(255) NOT NULL DEFAULT '3AS TEKNOLOJİ ve BİLİŞİM HİZMETLERİ',
    trade_name VARCHAR(128) DEFAULT '3AS TEKNOLOJİ',
    slogan VARCHAR(255) DEFAULT 'GÜVENLİK • ZAYIF AKIM • BİLİŞİM HİZMETLERİ',
    phone VARCHAR(32) DEFAULT '+905050375959',
    whatsapp_number VARCHAR(32) DEFAULT '+905050375959',
    manager_whatsapp_number VARCHAR(32) DEFAULT '+905050375959',
    lead_notification_phone VARCHAR(32) DEFAULT '+905050375959',
    email VARCHAR(255) DEFAULT 'bilgi@3asteknoloji.com',
    website VARCHAR(255) DEFAULT 'https://3asteknoloji.com',
    address TEXT DEFAULT 'Tekirdağ Süleymanpaşa',
    city VARCHAR(64) DEFAULT 'Tekirdağ',
    district VARCHAR(64) DEFAULT 'Süleymanpaşa',
    tax_office VARCHAR(128) DEFAULT 'Namık Kemal VD.',
    tax_number VARCHAR(32) DEFAULT '21976554076',
    bank_name VARCHAR(128) DEFAULT 'Ziraat Bankası',
    iban VARCHAR(64) DEFAULT 'TR12 0001 0002 0003 0004 0005 06',
    bank_accounts JSONB DEFAULT '[]'::jsonb,
    google_review_url TEXT DEFAULT 'https://g.page/r/3asteknoloji/review',
    currency VARCHAR(8) DEFAULT 'TRY',
    service_warranty_terms TEXT,
    offer_terms_default TEXT,
    logo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. HİZMET KATALOĞU
CREATE TABLE IF NOT EXISTS service_categories (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    slug VARCHAR(128) NOT NULL UNIQUE,
    description TEXT,
    icon_name VARCHAR(64) DEFAULT 'Shield',
    is_active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_items (
    id VARCHAR(64) PRIMARY KEY,
    category_id VARCHAR(64) NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(32) NOT NULL DEFAULT 'Adet',
    vat_rate INTEGER NOT NULL DEFAULT 20,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_services_category_id ON service_items(category_id);

-- 5. MÜŞTERİLER (CARİ HESAPLAR)
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(32) NOT NULL DEFAULT 'individual', -- individual | corporate
    name VARCHAR(255) NOT NULL,
    company_title VARCHAR(255),
    contact_person VARCHAR(128),
    tc_identity_number VARCHAR(16),
    tax_office VARCHAR(128),
    tax_number VARCHAR(32),
    phone VARCHAR(32) NOT NULL,
    secondary_phone VARCHAR(32),
    email VARCHAR(255),
    website VARCHAR(255),
    address TEXT,
    district VARCHAR(64),
    city VARCHAR(64),
    balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    credit_limit NUMERIC(14,2) DEFAULT 50000.00,
    contacts JSONB DEFAULT '[]'::jsonb,
    addresses JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_tax_number ON customers(tax_number);

-- 6. CRM & LEADLER (POTANSİYEL TALEPLER)
CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR(64) PRIMARY KEY,
    full_name VARCHAR(128) NOT NULL,
    company_name VARCHAR(255),
    phone VARCHAR(32) NOT NULL,
    email VARCHAR(255),
    city VARCHAR(64) DEFAULT 'Tekirdağ',
    interested_service_category VARCHAR(128) NOT NULL,
    service_details TEXT,
    message TEXT,
    source VARCHAR(64) NOT NULL DEFAULT 'Web Sitesi', -- Web Sitesi, Telefon, WhatsApp, Google, Instagram, Referans, Manuel
    stage VARCHAR(32) NOT NULL DEFAULT 'new', -- new, contacted, discovery_scheduled, offer_preparing, offer_sent, won, lost
    assigned_user_id VARCHAR(64) REFERENCES users(id) ON SET NULL,
    assigned_user_name VARCHAR(128),
    discovery_date TIMESTAMP WITH TIME ZONE,
    budget_estimate NUMERIC(14,2) DEFAULT 0.00,
    customer_id VARCHAR(64) REFERENCES customers(id) ON SET NULL,
    converted_offer_id VARCHAR(64),
    activities JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);

-- 7. DİZİ SAYAÇLARI (GÜVENLİ NUMARALANDIRMA)
CREATE TABLE IF NOT EXISTS document_sequences (
    sequence_name VARCHAR(32) PRIMARY KEY,
    current_year INTEGER NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO document_sequences (sequence_name, current_year, last_number) 
VALUES 
    ('offer', 2026, 0),
    ('service', 2026, 0),
    ('installation', 2026, 0),
    ('invoice', 2026, 0)
ON CONFLICT (sequence_name) DO NOTHING;

-- 8. TEKLİFLER (QUOTATIONS)
CREATE TABLE IF NOT EXISTS offers (
    id VARCHAR(64) PRIMARY KEY,
    offer_number VARCHAR(32) NOT NULL UNIQUE, -- TEK-2026-000001
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON UPDATE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    customer_email VARCHAR(255),
    customer_address TEXT,
    service_category VARCHAR(128) NOT NULL,
    lead_id VARCHAR(64) REFERENCES leads(id) ON SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft', -- draft, sent, viewed, approved, rejected, revised, expired
    valid_until DATE NOT NULL,
    current_version INTEGER NOT NULL DEFAULT 1,
    currency VARCHAR(8) NOT NULL DEFAULT 'TRY',
    exchange_rate NUMERIC(10,4) DEFAULT 1.0000,
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_cost NUMERIC(14,2) DEFAULT 0.00,
    margin_percentage NUMERIC(6,2) DEFAULT 0.00,
    payment_terms TEXT,
    warranty_terms TEXT,
    notes TEXT,
    secure_token VARCHAR(128) NOT NULL UNIQUE,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    client_ip VARCHAR(64),
    user_agent TEXT,
    converted_project_id VARCHAR(64),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    versions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_offers_secure_token ON offers(secure_token);
CREATE INDEX IF NOT EXISTS idx_offers_customer_id ON offers(customer_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);

-- 9. ÜRÜNLER VE STOK
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    sku VARCHAR(64) NOT NULL UNIQUE,
    barcode VARCHAR(64),
    category VARCHAR(128) NOT NULL,
    brand VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    unit VARCHAR(32) NOT NULL DEFAULT 'Adet',
    purchase_price NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    sale_price NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    vat_rate INTEGER NOT NULL DEFAULT 20,
    current_stock NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    min_stock_level NUMERIC(12,2) NOT NULL DEFAULT 5.00,
    location VARCHAR(64),
    is_service_item BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 10. STOK HAREKET DEFTERİ (INVENTORY LEDGER)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON UPDATE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL, -- purchase, sale, installation_use, service_use, return, adjustment
    quantity_change NUMERIC(12,2) NOT NULL, -- Pozitif veya negatif
    previous_stock NUMERIC(12,2) NOT NULL,
    new_stock NUMERIC(12,2) NOT NULL,
    unit_price NUMERIC(14,2) DEFAULT 0.00,
    reference_type VARCHAR(32), -- installation, service, invoice, manual
    reference_number VARCHAR(64),
    idempotency_key VARCHAR(128) UNIQUE, -- Tekrarlanan stok düşümünü kesin önler
    note TEXT,
    performed_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inv_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_ref ON inventory_movements(reference_type, reference_number);

-- 11. SAHA VE MONTAJ YÖNETİMİ
CREATE TABLE IF NOT EXISTS installations (
    id VARCHAR(64) PRIMARY KEY,
    installation_number VARCHAR(32) NOT NULL UNIQUE, -- MNT-2026-000001
    project_id VARCHAR(64),
    offer_id VARCHAR(64) REFERENCES offers(id) ON SET NULL,
    project_name VARCHAR(255) NOT NULL,
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON UPDATE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    address_title VARCHAR(128),
    full_address TEXT NOT NULL,
    city VARCHAR(64) DEFAULT 'Tekirdağ',
    status VARCHAR(32) NOT NULL DEFAULT 'planned', -- planned, scheduled, dispatched, started, in_progress, paused, completed, cancelled
    scheduled_date DATE NOT NULL,
    scheduled_time VARCHAR(32) NOT NULL,
    assigned_technicians JSONB DEFAULT '[]'::jsonb,
    tasks_description TEXT,
    checklist JSONB DEFAULT '[]'::jsonb,
    materials JSONB DEFAULT '[]'::jsonb,
    photos JSONB DEFAULT '[]'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    technician_notes TEXT,
    secure_delivery_token VARCHAR(128) NOT NULL UNIQUE,
    customer_delivery_approval JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_installations_token ON installations(secure_delivery_token);
CREATE INDEX IF NOT EXISTS idx_installations_status ON installations(status);

-- 12. TEKNİK SERVİS YÖNETİMİ
CREATE TABLE IF NOT EXISTS service_tickets (
    id VARCHAR(64) PRIMARY KEY,
    ticket_number VARCHAR(32) NOT NULL UNIQUE, -- SRV-2026-000001
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON UPDATE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    customer_email VARCHAR(255),
    device_type VARCHAR(128) NOT NULL,
    brand VARCHAR(128) NOT NULL,
    model VARCHAR(128) NOT NULL,
    serial_number VARCHAR(128),
    accessories_delivered JSONB DEFAULT '[]'::jsonb,
    reported_issue TEXT NOT NULL,
    diagnostic_notes TEXT,
    physical_condition VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'received', -- received, inspecting, diagnosing, waiting_approval, approved, waiting_parts, in_repair, testing, ready, delivered, cancelled
    priority VARCHAR(16) NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
    assigned_technician_id VARCHAR(64) REFERENCES users(id) ON SET NULL,
    assigned_technician_name VARCHAR(128),
    operations JSONB DEFAULT '[]'::jsonb,
    total_parts_cost NUMERIC(14,2) DEFAULT 0.00,
    total_labor_cost NUMERIC(14,2) DEFAULT 0.00,
    total_cost NUMERIC(14,2) DEFAULT 0.00,
    deposit_paid NUMERIC(14,2) DEFAULT 0.00,
    remaining_balance NUMERIC(14,2) DEFAULT 0.00,
    secure_approval_token VARCHAR(128) NOT NULL UNIQUE,
    customer_approval JSONB,
    photos JSONB DEFAULT '[]'::jsonb,
    service_photos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_service_tickets_token ON service_tickets(secure_approval_token);
CREATE INDEX IF NOT EXISTS idx_service_tickets_status ON service_tickets(status);

-- 13. FATURA VE TAHSİLAT
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(64) PRIMARY KEY,
    invoice_number VARCHAR(32) NOT NULL UNIQUE, -- FAT-2026-000001
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON UPDATE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    customer_email VARCHAR(255),
    customer_address TEXT,
    customer_tax_office VARCHAR(128),
    customer_tax_number VARCHAR(32),
    type VARCHAR(32) NOT NULL DEFAULT 'sales', -- sales, service, proforma
    status VARCHAR(32) NOT NULL DEFAULT 'issued', -- draft, issued, unpaid, partial, paid, overdue, cancelled
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(14,2) DEFAULT 0.00,
    tax_total NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    remaining_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    payments JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    related_offer_id VARCHAR(64) REFERENCES offers(id) ON SET NULL,
    related_installation_id VARCHAR(64) REFERENCES installations(id) ON SET NULL,
    related_service_ticket_id VARCHAR(64) REFERENCES service_tickets(id) ON SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- 14. OTOMASYON KURALLARI VE LOGLARI
CREATE TABLE IF NOT EXISTS automation_rules (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    trigger VARCHAR(64) NOT NULL,
    description TEXT,
    action_type VARCHAR(64) NOT NULL,
    template_code VARCHAR(64),
    delay_minutes INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS automation_runs (
    id VARCHAR(64) PRIMARY KEY,
    rule_id VARCHAR(64) REFERENCES automation_rules(id) ON SET NULL,
    rule_name VARCHAR(128),
    trigger VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64),
    status VARCHAR(32) NOT NULL, -- success, failed, skipped
    error_message TEXT,
    run_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. İLETİŞİM ŞABLONLARI VE LOGLARI (WHATSAPP/SMS/EMAIL)
CREATE TABLE IF NOT EXISTS communication_templates (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(128) NOT NULL,
    content TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS communication_logs (
    id VARCHAR(64) PRIMARY KEY,
    channel VARCHAR(32) NOT NULL DEFAULT 'whatsapp',
    recipient_phone VARCHAR(32) NOT NULL,
    recipient_name VARCHAR(128) NOT NULL,
    message_type VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'queued', -- queued, sent, delivered, read, failed
    related_entity_type VARCHAR(32),
    related_entity_id VARCHAR(64),
    related_entity_number VARCHAR(64),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_comm_logs_recipient ON communication_logs(recipient_phone);

-- 16. SİSTEM DENETİM VE GÜVENLİK GÜNLÜĞÜ (AUDIT LOG)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    user_name VARCHAR(128) NOT NULL,
    user_role VARCHAR(128) NOT NULL,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    entity_name VARCHAR(255) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    client_ip VARCHAR(64),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON audit_logs(created_at DESC);

-- Şema versiyon tablosu
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(64) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_migrations (version) VALUES ('001_initial_schema') ON CONFLICT DO NOTHING;
