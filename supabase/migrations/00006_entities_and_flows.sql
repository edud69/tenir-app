-- tenir.app — Entities & Inter-Entity Financial Flows
-- Supports: physical persons (shareholders) and legal entities (corporations)
-- Fiscal flows: intercorporate dividends (art. 112 ITA), shareholder loans (art. 15(2) ITA),
--               loan repayments, advances, advance repayments

-- ============================================================
-- ENTITIES
-- A person or corporation that can hold shares or receive flows.
-- The "current organization" is always implicitly an entity too.
-- ============================================================
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Identity
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('corporation', 'individual')),

  -- For corporations
  neq TEXT,                     -- Numéro d'entreprise du Québec
  business_number TEXT,         -- Federal BN
  incorporation_date DATE,
  province TEXT DEFAULT 'QC',
  corporation_type TEXT CHECK (corporation_type IN ('ccpc', 'general', 'professional', 'holding', 'operating', 'other')),

  -- For individuals
  sin_last4 TEXT,               -- Last 4 digits of SIN (for display only, not full SIN)
  is_shareholder BOOLEAN NOT NULL DEFAULT true,

  -- Flags
  is_current_org BOOLEAN NOT NULL DEFAULT false, -- true if this entity represents the org itself
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ENTITY RELATIONS
-- Ownership / participation structure between entities.
-- parent_entity owns shares in child_entity.
-- ============================================================
CREATE TABLE entity_relations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  parent_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  child_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,

  -- Ownership details
  ownership_percentage DECIMAL(7,4) NOT NULL DEFAULT 100 CHECK (ownership_percentage > 0 AND ownership_percentage <= 100),
  share_class TEXT DEFAULT 'A',       -- Share class (actions de catégorie A, etc.)
  num_shares INTEGER,                  -- Number of shares held
  share_value DECIMAL(14,2),          -- Value per share at acquisition (PBR)

  -- Timeline
  effective_date DATE NOT NULL,        -- When the ownership started
  end_date DATE,                       -- If sold / disposed

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Can't own yourself
  CONSTRAINT no_self_ownership CHECK (parent_entity_id != child_entity_id)
);

-- ============================================================
-- FINANCIAL FLOWS
-- Money moving between entities.
-- Covers: intercorporate dividends, shareholder loans, repayments, advances.
-- ============================================================
CREATE TABLE financial_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Direction: from_entity pays / transfers to to_entity
  from_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  to_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,

  -- Flow type with fiscal significance
  flow_type TEXT NOT NULL CHECK (flow_type IN (
    'dividend_eligible',        -- Dividende déterminé (art. 112 ITA — inter-société généralement exempt)
    'dividend_non_eligible',    -- Dividende non déterminé
    'dividend_capital',         -- Dividende en capital (CDC)
    'shareholder_loan',         -- Prêt consenti à l'actionnaire (art. 15(2) ITA)
    'loan_repayment',           -- Remboursement de prêt actionnaire
    'advance',                  -- Avance inter-sociétés ou à l'actionnaire
    'advance_repayment',        -- Remboursement d'avance
    'management_fee',           -- Frais de gestion inter-sociétés
    'capital_contribution'      -- Apport en capital (injection)
  )),

  amount DECIMAL(14,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'CAD',
  date DATE NOT NULL,

  -- Fiscal year this applies to (for dividend correlation with RDTOH, etc.)
  fiscal_year INTEGER,

  -- For loans/advances: balance tracking
  is_open_balance BOOLEAN NOT NULL DEFAULT false,  -- true if this creates an open receivable/payable
  outstanding_balance DECIMAL(14,2),               -- Current outstanding if partially repaid
  interest_rate DECIMAL(6,4),                      -- Annual rate (e.g. 5.0 = 5%) — CRA prescribed rate for 2025/2026 is 5%
  due_date DATE,                                   -- Repayment deadline (art. 15(2): end of following fiscal year)

  -- For dividends: RDTOH / GRIP impact tracking
  rdtoh_refund_eligible DECIMAL(12,2),            -- Estimated RDTOH refund triggered (38.33% of eligible div)
  grip_impact DECIMAL(12,2),                      -- Impact on GRIP balance

  -- Status
  status TEXT NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded', 'confirmed', 'overdue', 'repaid', 'cancelled')),

  description TEXT,
  notes TEXT,
  document_ref TEXT,  -- Reference to supporting document (resolution, contract, etc.)

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Can't flow to yourself
  CONSTRAINT no_self_flow CHECK (from_entity_id != to_entity_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_entities_org ON entities(organization_id);
CREATE INDEX idx_entities_type ON entities(entity_type);
CREATE INDEX idx_entity_relations_org ON entity_relations(organization_id);
CREATE INDEX idx_entity_relations_parent ON entity_relations(parent_entity_id);
CREATE INDEX idx_entity_relations_child ON entity_relations(child_entity_id);
CREATE INDEX idx_financial_flows_org ON financial_flows(organization_id);
CREATE INDEX idx_financial_flows_from ON financial_flows(from_entity_id);
CREATE INDEX idx_financial_flows_to ON financial_flows(to_entity_id);
CREATE INDEX idx_financial_flows_date ON financial_flows(date);
CREATE INDEX idx_financial_flows_type ON financial_flows(flow_type);
CREATE INDEX idx_financial_flows_fiscal_year ON financial_flows(fiscal_year);
CREATE INDEX idx_financial_flows_status ON financial_flows(status);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_flows ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['entities', 'entity_relations', 'financial_flows'])
  LOOP
    EXECUTE format('
      CREATE POLICY "Org members can view %1$s"
        ON %1$s FOR SELECT USING (user_belongs_to_org(organization_id));
      CREATE POLICY "Org members can insert %1$s"
        ON %1$s FOR INSERT WITH CHECK (user_belongs_to_org(organization_id));
      CREATE POLICY "Org members can update %1$s"
        ON %1$s FOR UPDATE USING (user_belongs_to_org(organization_id));
      CREATE POLICY "Org members can delete %1$s"
        ON %1$s FOR DELETE USING (user_belongs_to_org(organization_id));
    ', tbl);
  END LOOP;
END $$;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE TRIGGER set_updated_at BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON entity_relations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON financial_flows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
