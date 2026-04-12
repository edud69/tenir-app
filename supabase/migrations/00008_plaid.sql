-- tenir.app — Plaid bank connection integration

-- ============================================================
-- PLAID ITEMS (one per connected institution per org)
-- ============================================================
CREATE TABLE plaid_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plaid_item_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  institution_id TEXT,
  institution_name TEXT,
  cursor TEXT, -- Plaid transactions/sync cursor for incremental sync
  last_synced_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, plaid_item_id)
);

CREATE INDEX idx_plaid_items_org_id ON plaid_items(organization_id);

-- ============================================================
-- PLAID ACCOUNTS (individual accounts within an item)
-- ============================================================
CREATE TABLE plaid_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plaid_item_id UUID NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  plaid_account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  official_name TEXT,
  type TEXT NOT NULL,   -- depository, credit, loan, investment
  subtype TEXT,         -- checking, savings, credit card, etc.
  mask TEXT,            -- last 4 digits
  currency TEXT NOT NULL DEFAULT 'CAD',
  current_balance DECIMAL(12,2),
  available_balance DECIMAL(12,2),
  credit_limit DECIMAL(12,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plaid_account_id)
);

CREATE INDEX idx_plaid_accounts_org_id ON plaid_accounts(organization_id);
CREATE INDEX idx_plaid_accounts_item_id ON plaid_accounts(plaid_item_id);

-- ============================================================
-- UPDATE TRANSACTIONS TABLE
-- ============================================================

-- Plaid transaction ID for dedup
ALTER TABLE transactions
  ADD COLUMN plaid_transaction_id TEXT UNIQUE;

-- Source: manual entry vs plaid sync
ALTER TABLE transactions
  ADD COLUMN sync_source TEXT CHECK (sync_source IN ('manual', 'plaid')) NOT NULL DEFAULT 'manual';

-- Duplicate detection
ALTER TABLE transactions
  ADD COLUMN is_duplicate BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE transactions
  ADD COLUMN duplicate_of_id UUID REFERENCES transactions(id) ON DELETE SET NULL;

-- Pending state from Plaid (not yet posted)
ALTER TABLE transactions
  ADD COLUMN pending BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_transactions_plaid_tx_id ON transactions(plaid_transaction_id) WHERE plaid_transaction_id IS NOT NULL;
CREATE INDEX idx_transactions_sync_source ON transactions(sync_source);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE plaid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plaid_items_org_members" ON plaid_items
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "plaid_accounts_org_members" ON plaid_accounts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER update_plaid_items_updated_at
  BEFORE UPDATE ON plaid_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_plaid_accounts_updated_at
  BEFORE UPDATE ON plaid_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
