-- Add missing columns to tax_profiles for extended tax calculation data
ALTER TABLE tax_profiles
  ADD COLUMN IF NOT EXISTS taxable_income DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS effective_rate DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS installments JSONB,
  ADD COLUMN IF NOT EXISTS integration_data JSONB,
  ADD COLUMN IF NOT EXISTS tax_breakdown JSONB;
