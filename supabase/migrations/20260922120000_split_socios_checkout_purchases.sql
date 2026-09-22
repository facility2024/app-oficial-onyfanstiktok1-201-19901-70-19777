-- Divisão de lucro (sócios) nas vendas de checkout
-- O dinheiro cai 100% na conta NeonPay principal (ADMIN_PRODUCER_ID) e é
-- dividido na origem via split para os sócios (produtores) de cada produto.
ALTER TABLE public.checkout_purchases
  ADD COLUMN IF NOT EXISTS platform_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS seller_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS seller_percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS seller_producer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_checkout_purchases_paid_at ON public.checkout_purchases(paid_at);
CREATE INDEX IF NOT EXISTS idx_checkout_purchases_seller ON public.checkout_purchases(seller_producer_id);