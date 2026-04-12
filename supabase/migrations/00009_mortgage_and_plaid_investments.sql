-- tenir.app — Mortgage fields on rental properties + Plaid brokerage investment sync

-- ============================================================
-- MORTGAGE FIELDS ON RENTAL PROPERTIES
-- ============================================================
ALTER TABLE rental_properties
  ADD COLUMN IF NOT EXISTS mortgage_lender           TEXT,
  ADD COLUMN IF NOT EXISTS mortgage_original_amount  DECIMAL(14, 2),
  ADD COLUMN IF NOT EXISTS mortgage_balance          DECIMAL(14, 2),
  ADD COLUMN IF NOT EXISTS mortgage_interest_rate    DECIMAL(7, 5),    -- e.g. 0.05250 for 5.25%
  ADD COLUMN IF NOT EXISTS mortgage_amortization_years INTEGER,         -- total amortization (e.g. 25)
  ADD COLUMN IF NOT EXISTS mortgage_term_years       INTEGER,           -- current term (e.g. 5)
  ADD COLUMN IF NOT EXISTS mortgage_start_date       DATE,
  ADD COLUMN IF NOT EXISTS mortgage_payment_frequency TEXT
    CHECK (mortgage_payment_frequency IN ('monthly', 'biweekly', 'weekly')),
  ADD COLUMN IF NOT EXISTS mortgage_payment_amount   DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS building_value_pct        DECIMAL(5, 2) DEFAULT 80; -- % of purchase = building (not land)

-- property_id FK on transactions already exists from migration 00003.
-- Expense transactions use the same property_id column as income.

-- ============================================================
-- PLAID BROKERAGE / INVESTMENT ACCOUNTS
-- ============================================================

-- Track Plaid investment holdings synced from brokerages (Disnat, etc.)
CREATE TABLE IF NOT EXISTS plaid_investment_holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plaid_account_id TEXT NOT NULL,             -- from plaid_accounts.plaid_account_id
  investment_id UUID REFERENCES investments(id) ON DELETE SET NULL, -- linked tenir investment
  security_id TEXT,                           -- Plaid security ID
  symbol TEXT,
  name TEXT NOT NULL,
  type TEXT,                                  -- equity, etf, mutual fund, etc.
  quantity DECIMAL(18, 8),
  cost_basis DECIMAL(14, 2),
  institution_price DECIMAL(14, 4),           -- last known price from broker
  institution_price_as_of DATE,
  currency TEXT NOT NULL DEFAULT 'CAD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plaid_account_id, security_id)
);

CREATE INDEX IF NOT EXISTS idx_plaid_investment_holdings_org ON plaid_investment_holdings(organization_id);
CREATE INDEX IF NOT EXISTS idx_plaid_investment_holdings_account ON plaid_investment_holdings(plaid_account_id);

-- RLS
ALTER TABLE plaid_investment_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plaid_investment_holdings_org_members" ON plaid_investment_holdings
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE TRIGGER update_plaid_investment_holdings_updated_at
  BEFORE UPDATE ON plaid_investment_holdings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
