-- ============================================================
-- HOME OFFICE / SIÈGE SOCIAL
-- ============================================================

-- Table principale : lieux d'affaires à domicile
CREATE TABLE home_offices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Identification du lieu
  label TEXT NOT NULL,
  office_type TEXT NOT NULL DEFAULT 'registered_office'
    CHECK (office_type IN ('registered_office', 'secondary_establishment', 'both')),

  -- Adresse
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL DEFAULT 'QC',
  postal_code TEXT,

  -- Type de tenure
  tenure_type TEXT NOT NULL DEFAULT 'tenant'
    CHECK (tenure_type IN ('tenant', 'owner')),

  -- Dimensions (pi²)
  total_area_sqft DECIMAL(10,2) NOT NULL,
  office_area_sqft DECIMAL(10,2) NOT NULL,

  -- Période d'utilisation
  start_date DATE NOT NULL,
  end_date DATE,
  months_used_per_year INTEGER NOT NULL DEFAULT 12
    CHECK (months_used_per_year BETWEEN 1 AND 12),

  -- Statut
  is_active BOOLEAN NOT NULL DEFAULT true,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table : dépenses personnelles liées au domicile
CREATE TABLE home_office_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_office_id UUID NOT NULL REFERENCES home_offices(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  expense_type TEXT NOT NULL CHECK (expense_type IN (
    'rent',
    'mortgage_interest',
    'municipal_taxes',
    'school_taxes',
    'electricity',
    'gas',
    'home_insurance',
    'maintenance',
    'other'
  )),

  amount DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CAD',

  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  linked_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

  description TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table : preuves supplémentaires
CREATE TABLE home_office_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_office_id UUID NOT NULL REFERENCES home_offices(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  document_type TEXT NOT NULL CHECK (document_type IN (
    'mortgage_statement',
    'lease_agreement',
    'sublease_agreement',
    'municipal_tax_bill',
    'school_tax_bill',
    'electricity_bill',
    'gas_bill',
    'insurance_policy',
    'floor_plan',
    'other'
  )),

  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,

  period_start DATE,
  period_end DATE,
  amount DECIMAL(12,2),
  description TEXT,

  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_home_offices_org ON home_offices(organization_id);
CREATE INDEX idx_home_offices_active ON home_offices(organization_id, is_active);
CREATE INDEX idx_home_office_expenses_office ON home_office_expenses(home_office_id);
CREATE INDEX idx_home_office_expenses_org ON home_office_expenses(organization_id);
CREATE INDEX idx_home_office_docs_office ON home_office_documents(home_office_id);

-- RLS
ALTER TABLE home_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_office_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_office_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage home_offices"
  ON home_offices FOR ALL
  USING (user_belongs_to_org(organization_id))
  WITH CHECK (user_belongs_to_org(organization_id));

CREATE POLICY "org members can manage home_office_expenses"
  ON home_office_expenses FOR ALL
  USING (user_belongs_to_org(organization_id))
  WITH CHECK (user_belongs_to_org(organization_id));

CREATE POLICY "org members can manage home_office_documents"
  ON home_office_documents FOR ALL
  USING (user_belongs_to_org(organization_id))
  WITH CHECK (user_belongs_to_org(organization_id));

-- Triggers updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON home_offices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON home_office_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
