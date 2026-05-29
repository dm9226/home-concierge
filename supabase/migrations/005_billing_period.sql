-- Rename monthly_retainer_amount to fee_amount on properties
ALTER TABLE properties RENAME COLUMN monthly_retainer_amount TO fee_amount;

-- Add billing_period with a default of monthly for all existing rows
ALTER TABLE properties
  ADD COLUMN billing_period TEXT NOT NULL DEFAULT 'monthly'
  CHECK (billing_period IN ('monthly', 'quarterly', 'annually'));

-- Rename retainer_amount to fee_amount on invoices
ALTER TABLE invoices RENAME COLUMN retainer_amount TO fee_amount;
