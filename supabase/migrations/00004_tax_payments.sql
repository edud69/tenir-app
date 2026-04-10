-- Tax payments tracking table
CREATE TABLE IF NOT EXISTS tax_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,
  authority TEXT NOT NULL CHECK (authority IN ('federal', 'provincial')),
  payment_type TEXT NOT NULL DEFAULT 'installment'
               CHECK (payment_type IN ('installment', 'balance_owing', 'arrears')),
  quarter INTEGER CHECK (quarter BETWEEN 1 AND 4),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  due_amount DECIMAL(12,2),
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'online'
               CHECK (payment_method IN ('online', 'cheque', 'preauthorized', 'my_account', 'other')),
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tax_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org tax payments" ON tax_payments
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));
