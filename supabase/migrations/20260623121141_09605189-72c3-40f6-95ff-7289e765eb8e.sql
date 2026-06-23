
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS seller_id uuid,
  ADD COLUMN IF NOT EXISTS commission_percentage numeric,
  ADD COLUMN IF NOT EXISTS platform_amount numeric,
  ADD COLUMN IF NOT EXISTS seller_amount numeric,
  ADD COLUMN IF NOT EXISTS neonpay_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_net numeric;

CREATE INDEX IF NOT EXISTS idx_purchases_seller_id ON public.purchases(seller_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON public.purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases(status);

-- Policy: vendedor pode ver as próprias vendas
DROP POLICY IF EXISTS "purchases_seller_select" ON public.purchases;
CREATE POLICY "purchases_seller_select"
  ON public.purchases FOR SELECT TO authenticated
  USING (auth.uid() = seller_id);
