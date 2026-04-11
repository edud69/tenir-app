-- tenir.app — Bank accounts + transaction account linking + transfers

-- ============================================================
-- BANK ACCOUNTS
-- ============================================================
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'credit_card', 'line_of_credit')),
  institution TEXT,
  last_four TEXT,
  currency TEXT NOT NULL DEFAULT 'CAD',
  current_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  credit_limit DECIMAL(12,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_accounts_org_id ON bank_accounts(organization_id);

-- ============================================================
-- UPDATE TRANSACTIONS TABLE
-- ============================================================

-- Link transaction to a bank/credit card account
ALTER TABLE transactions
  ADD COLUMN account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;

-- Self-reference for linked transfer pairs (credit card payment, advance, inter-account transfer)
ALTER TABLE transactions
  ADD COLUMN linked_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;

-- Sub-type for transfer transactions
ALTER TABLE transactions
  ADD COLUMN transfer_type TEXT CHECK (transfer_type IN ('credit_card_payment', 'account_advance', 'transfer'));

-- Add 'transfer' to the type constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('expense', 'income', 'dividend', 'capital_gain', 'interest', 'transfer'));

CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_linked_tx ON transactions(linked_transaction_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_accounts_org_members" ON bank_accounts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
