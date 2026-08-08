ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC,
  ADD COLUMN IF NOT EXISTS platform_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS creator_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS creator_producer_id TEXT;