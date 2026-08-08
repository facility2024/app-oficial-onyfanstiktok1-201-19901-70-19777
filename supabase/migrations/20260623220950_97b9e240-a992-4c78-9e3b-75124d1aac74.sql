ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS creator_net_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS neonpay_fee NUMERIC(10,2);