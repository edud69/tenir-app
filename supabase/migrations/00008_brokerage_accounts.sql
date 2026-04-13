-- tenir.app — Brokerage accounts + investment account linking

-- ============================================================
-- ADD BROKERAGE TYPE TO BANK ACCOUNTS
-- ============================================================
ALTER TABLE bank_accounts DROP CONSTRAINT bank_accounts_type_check;
ALTER TABLE bank_accounts ADD CONSTRAINT bank_accounts_type_check
  CHECK (type IN ('checking', 'savings', 'credit_card', 'line_of_credit', 'brokerage'));

-- ============================================================
-- LINK INVESTMENTS TO BROKERAGE ACCOUNTS
-- ============================================================

-- account_id FK to bank_accounts (brokerage type)
ALTER TABLE investments
  ADD COLUMN account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;

CREATE INDEX idx_investments_account_id ON investments(account_id);

-- Migrate existing account_type strings to a label column for display
-- (keep account_type for backwards compat during transition)
ALTER TABLE investments
  ADD COLUMN account_label TEXT;

-- Copy existing account_type into account_label so UI can still show REER/CELI etc.
UPDATE investments SET account_label = account_type WHERE account_type IS NOT NULL;
