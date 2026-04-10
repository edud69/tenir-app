-- ============================================================
-- Rental properties & units
-- ============================================================

CREATE TABLE rental_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  province TEXT NOT NULL DEFAULT 'QC',
  postal_code TEXT,
  nickname TEXT,
  property_type TEXT NOT NULL DEFAULT 'residential' CHECK (property_type IN ('residential', 'commercial', 'multi_unit', 'condo')),
  purchase_price DECIMAL(14,2),
  purchase_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rental_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES rental_properties(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL DEFAULT '1',
  tenant_name TEXT,
  tenant_email TEXT,
  lease_start DATE,
  lease_end DATE,
  monthly_rent DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_vacant BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link transactions to a rental property (for rent income tracking)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES rental_properties(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE rental_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage rental_properties"
  ON rental_properties FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org members can manage rental_units"
  ON rental_units FOR ALL
  USING (
    property_id IN (
      SELECT id FROM rental_properties
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );
