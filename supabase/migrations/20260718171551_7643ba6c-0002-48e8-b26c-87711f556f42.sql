
-- 1) PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'main' CHECK (type IN ('main','bump','upsell','subscription')),
  image_url TEXT,
  description TEXT,
  default_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  access_key TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_select_active_public" ON public.products;
CREATE POLICY "products_select_active_public" ON public.products
  FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "products_admin_all" ON public.products;
CREATE POLICY "products_admin_all" ON public.products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2) CHECKOUT PURCHASES (renamed to avoid collision with marketplace purchases)
CREATE TABLE IF NOT EXISTS public.checkout_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  customer_whatsapp TEXT,
  customer_email TEXT,
  customer_name TEXT,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded','expired','cancelled')),
  gateway TEXT NOT NULL DEFAULT 'neonpay',
  gateway_payment_id TEXT,
  pix_payment_id UUID,
  paid_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_checkout_purchases_user ON public.checkout_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_checkout_purchases_whatsapp ON public.checkout_purchases(customer_whatsapp);
CREATE INDEX IF NOT EXISTS idx_checkout_purchases_gateway_pid ON public.checkout_purchases(gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_checkout_purchases_status ON public.checkout_purchases(status);
GRANT SELECT, INSERT, UPDATE ON public.checkout_purchases TO authenticated;
GRANT SELECT, INSERT ON public.checkout_purchases TO anon;
GRANT ALL ON public.checkout_purchases TO service_role;
ALTER TABLE public.checkout_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cpurchases_select_own" ON public.checkout_purchases;
CREATE POLICY "cpurchases_select_own" ON public.checkout_purchases
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "cpurchases_insert_any" ON public.checkout_purchases;
CREATE POLICY "cpurchases_insert_any" ON public.checkout_purchases
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
DROP POLICY IF EXISTS "cpurchases_admin_all" ON public.checkout_purchases;
CREATE POLICY "cpurchases_admin_all" ON public.checkout_purchases
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 3) CHECKOUT PURCHASE ITEMS
CREATE TABLE IF NOT EXISTS public.checkout_purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.checkout_purchases(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  snapshot_name TEXT,
  snapshot_access_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cpi_purchase ON public.checkout_purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_cpi_product ON public.checkout_purchase_items(product_id);
GRANT SELECT, INSERT ON public.checkout_purchase_items TO anon, authenticated;
GRANT ALL ON public.checkout_purchase_items TO service_role;
ALTER TABLE public.checkout_purchase_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cpi_select_own" ON public.checkout_purchase_items;
CREATE POLICY "cpi_select_own" ON public.checkout_purchase_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.checkout_purchases p WHERE p.id = purchase_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
  );
DROP POLICY IF EXISTS "cpi_insert_any" ON public.checkout_purchase_items;
CREATE POLICY "cpi_insert_any" ON public.checkout_purchase_items
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
DROP POLICY IF EXISTS "cpi_admin_all" ON public.checkout_purchase_items;
CREATE POLICY "cpi_admin_all" ON public.checkout_purchase_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 4) USER ENTITLEMENTS
CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  whatsapp TEXT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  purchase_id UUID REFERENCES public.checkout_purchases(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'purchase',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR whatsapp IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_entitlement_user_product
  ON public.user_entitlements(user_id, product_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_entitlement_whatsapp_product
  ON public.user_entitlements(whatsapp, product_id) WHERE user_id IS NULL AND whatsapp IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ent_user ON public.user_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_ent_whatsapp ON public.user_entitlements(whatsapp);
CREATE INDEX IF NOT EXISTS idx_ent_product ON public.user_entitlements(product_id);
GRANT SELECT ON public.user_entitlements TO authenticated;
GRANT ALL ON public.user_entitlements TO service_role;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ent_select_own" ON public.user_entitlements;
CREATE POLICY "ent_select_own" ON public.user_entitlements
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "ent_admin_all" ON public.user_entitlements;
CREATE POLICY "ent_admin_all" ON public.user_entitlements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 5) BRIDGE columns
ALTER TABLE public.checkout_templates ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.checkout_order_bumps ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

-- 6) TRIGGERS updated_at
DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_cpurchases_updated_at ON public.checkout_purchases;
CREATE TRIGGER trg_cpurchases_updated_at BEFORE UPDATE ON public.checkout_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_ent_updated_at ON public.user_entitlements;
CREATE TRIGGER trg_ent_updated_at BEFORE UPDATE ON public.user_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) REALTIME
ALTER TABLE public.user_entitlements REPLICA IDENTITY FULL;
ALTER TABLE public.checkout_purchases REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_entitlements; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.checkout_purchases; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 8) RPC: idempotent grant from a purchase (used by webhook)
CREATE OR REPLACE FUNCTION public.grant_entitlements_for_purchase(_purchase_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_whatsapp TEXT;
  v_count INTEGER := 0;
BEGIN
  SELECT user_id, customer_whatsapp INTO v_user_id, v_whatsapp
  FROM public.checkout_purchases WHERE id = _purchase_id;

  IF v_user_id IS NULL AND v_whatsapp IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO public.user_entitlements (user_id, whatsapp, product_id, purchase_id, source, status)
  SELECT v_user_id, v_whatsapp, pi.product_id, _purchase_id, 'purchase', 'active'
  FROM public.checkout_purchase_items pi
  WHERE pi.purchase_id = _purchase_id
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.grant_entitlements_for_purchase(UUID) TO service_role, authenticated;
