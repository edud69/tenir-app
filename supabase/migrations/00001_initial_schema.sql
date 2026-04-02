-- tenir.app — Initial database schema
-- Targeting small holding companies in Quebec/Canada

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  neq TEXT, -- Numéro d'entreprise du Québec
  business_number TEXT, -- Federal Business Number
  fiscal_year_end_month INTEGER NOT NULL DEFAULT 12,
  fiscal_year_end_day INTEGER NOT NULL DEFAULT 31,
  incorporation_date DATE,
  province TEXT NOT NULL DEFAULT 'QC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- ============================================================
-- RECEIPTS
-- ============================================================
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  vendor TEXT,
  amount DECIMAL(12,2),
  currency TEXT NOT NULL DEFAULT 'CAD',
  date DATE,
  gst_amount DECIMAL(10,2),
  qst_amount DECIMAL(10,2),
  tax_number TEXT,
  category TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  ocr_data JSONB,
  source TEXT NOT NULL DEFAULT 'upload' CHECK (source IN ('upload', 'email', 'drive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TRANSACTIONS (expenses, income, dividends, capital gains)
-- ============================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'dividend', 'capital_gain', 'interest')),
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CAD',
  date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  vendor TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_frequency TEXT CHECK (recurrence_frequency IN ('monthly', 'quarterly', 'annually')),
  gst_amount DECIMAL(10,2),
  qst_amount DECIMAL(10,2),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INVESTMENTS
-- ============================================================
CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'stock' CHECK (type IN ('stock', 'etf', 'bond', 'gic', 'mutual_fund', 'other')),
  shares DECIMAL(14,6) NOT NULL,
  purchase_price DECIMAL(12,4) NOT NULL,
  purchase_date DATE NOT NULL,
  adjusted_cost_base DECIMAL(14,4) NOT NULL,
  current_price DECIMAL(12,4),
  currency TEXT NOT NULL DEFAULT 'CAD',
  account_type TEXT,
  notes TEXT,
  sold BOOLEAN NOT NULL DEFAULT false,
  sale_price DECIMAL(12,4),
  sale_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DIVIDEND RECORDS
-- ============================================================
CREATE TABLE dividend_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  investment_id UUID REFERENCES investments(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  dividend_type TEXT NOT NULL CHECK (dividend_type IN ('eligible', 'non_eligible', 'capital', 'foreign')),
  date DATE NOT NULL,
  payer TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CAD',
  withholding_tax DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TAX PROFILES
-- ============================================================
CREATE TABLE tax_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,
  corporation_type TEXT NOT NULL DEFAULT 'ccpc' CHECK (corporation_type IN ('ccpc', 'general', 'professional')),
  small_business_limit DECIMAL(14,2) NOT NULL DEFAULT 500000,
  active_business_income DECIMAL(14,2) NOT NULL DEFAULT 0,
  aggregate_investment_income DECIMAL(14,2) NOT NULL DEFAULT 0,
  taxable_capital DECIMAL(14,2) NOT NULL DEFAULT 0,
  rdtoh_eligible DECIMAL(14,2) NOT NULL DEFAULT 0,
  rdtoh_non_eligible DECIMAL(14,2) NOT NULL DEFAULT 0,
  grip_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  cda_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  federal_tax DECIMAL(14,2),
  provincial_tax DECIMAL(14,2),
  total_tax DECIMAL(14,2),
  installment_base DECIMAL(14,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, tax_year)
);

-- ============================================================
-- GOVERNMENT FORMS
-- ============================================================
CREATE TABLE government_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL CHECK (form_type IN ('t2', 'co17', 't5', 'rl3', 't5013', 't106')),
  tax_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'submitted', 'accepted', 'rejected')),
  data JSONB NOT NULL DEFAULT '{}',
  file_path TEXT,
  submitted_at TIMESTAMPTZ,
  confirmation_number TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'upload' CHECK (source IN ('upload', 'drive', 'generated')),
  category TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AI CONVERSATIONS
-- ============================================================
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_receipts_org ON receipts(organization_id);
CREATE INDEX idx_receipts_date ON receipts(date);
CREATE INDEX idx_receipts_status ON receipts(status);
CREATE INDEX idx_transactions_org ON transactions(organization_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_investments_org ON investments(organization_id);
CREATE INDEX idx_dividend_records_org ON dividend_records(organization_id);
CREATE INDEX idx_tax_profiles_org_year ON tax_profiles(organization_id, tax_year);
CREATE INDEX idx_gov_forms_org ON government_forms(organization_id);
CREATE INDEX idx_gov_forms_type_year ON government_forms(form_type, tax_year);
CREATE INDEX idx_documents_org ON documents(organization_id);
CREATE INDEX idx_ai_conversations_org ON ai_conversations(organization_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dividend_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user belongs to org
CREATE OR REPLACE FUNCTION user_belongs_to_org(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS Policies for each table
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (user_belongs_to_org(id));

CREATE POLICY "Owners can update their organizations"
  ON organizations FOR UPDATE
  USING (user_belongs_to_org(id));

CREATE POLICY "Users can insert organizations"
  ON organizations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Members can view org members"
  ON organization_members FOR SELECT
  USING (user_belongs_to_org(organization_id));

CREATE POLICY "Owners can manage org members"
  ON organization_members FOR ALL
  USING (user_belongs_to_org(organization_id));

-- Apply same pattern to all data tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['receipts', 'transactions', 'investments', 'dividend_records', 'tax_profiles', 'government_forms', 'documents', 'ai_conversations'])
  LOOP
    EXECUTE format('
      CREATE POLICY "Org members can view %1$s" ON %1$s FOR SELECT USING (user_belongs_to_org(organization_id));
      CREATE POLICY "Org members can insert %1$s" ON %1$s FOR INSERT WITH CHECK (user_belongs_to_org(organization_id));
      CREATE POLICY "Org members can update %1$s" ON %1$s FOR UPDATE USING (user_belongs_to_org(organization_id));
      CREATE POLICY "Org members can delete %1$s" ON %1$s FOR DELETE USING (user_belongs_to_org(organization_id));
    ', tbl);
  END LOOP;
END $$;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON investments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tax_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON government_forms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ai_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
