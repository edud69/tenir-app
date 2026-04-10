-- Migration 00005: Mortgage fields on rental_properties
-- Adds mortgage details (lender, balance, rate, amortization, payment) and
-- building-value percentage for CCA (amortissement) calculation.

ALTER TABLE rental_properties
  ADD COLUMN IF NOT EXISTS mortgage_lender           TEXT,
  ADD COLUMN IF NOT EXISTS mortgage_original_amount  DECIMAL(14, 2),
  ADD COLUMN IF NOT EXISTS mortgage_balance          DECIMAL(14, 2),
  ADD COLUMN IF NOT EXISTS mortgage_interest_rate    DECIMAL(7,  5),   -- e.g. 0.05250 for 5.25%
  ADD COLUMN IF NOT EXISTS mortgage_amortization_years INTEGER,          -- total amortization (e.g. 25)
  ADD COLUMN IF NOT EXISTS mortgage_term_years       INTEGER,            -- current term (e.g. 5)
  ADD COLUMN IF NOT EXISTS mortgage_start_date       DATE,
  ADD COLUMN IF NOT EXISTS mortgage_payment_frequency TEXT
    CHECK (mortgage_payment_frequency IN ('monthly', 'biweekly', 'weekly')),
  ADD COLUMN IF NOT EXISTS mortgage_payment_amount   DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS building_value_pct        DECIMAL(5, 2) DEFAULT 80; -- % of purchase price = building (not land)

-- The property_id FK on transactions already exists from migration 00003.
-- No additional schema changes are needed for linking expenses to a property;
-- expense transactions simply use the same property_id column.
