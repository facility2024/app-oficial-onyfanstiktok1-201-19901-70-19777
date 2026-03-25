
-- 1. Add 'shopkeeper' to app_role enum
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'shopkeeper' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'shopkeeper';
  END IF;
END $$;

-- 2. Create marketplace_stores table
CREATE TABLE IF NOT EXISTS public.marketplace_stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT false,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    commission_rate NUMERIC NOT NULL DEFAULT 0.30,
    total_sales NUMERIC NOT NULL DEFAULT 0,
    total_revenue NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Add store_id to marketplace_products (nullable, NULL = CocoLoja)
ALTER TABLE public.marketplace_products 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.marketplace_stores(id) ON DELETE SET NULL;

-- 4. Create store_payouts table
CREATE TABLE IF NOT EXISTS public.store_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
    order_reference TEXT,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    platform_fee NUMERIC NOT NULL DEFAULT 0,
    store_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_stores_owner ON public.marketplace_stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_stores_slug ON public.marketplace_stores(slug);
CREATE INDEX IF NOT EXISTS idx_marketplace_stores_active ON public.marketplace_stores(is_active);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_store ON public.marketplace_products(store_id);
CREATE INDEX IF NOT EXISTS idx_store_payouts_store ON public.store_payouts(store_id);

-- 6. Updated_at trigger for marketplace_stores
CREATE TRIGGER set_marketplace_stores_updated_at
    BEFORE UPDATE ON public.marketplace_stores
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. RLS for marketplace_stores
ALTER TABLE public.marketplace_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stores_public_read_active" ON public.marketplace_stores
    FOR SELECT TO anon, authenticated
    USING (is_active = true);

CREATE POLICY "stores_owner_read_own" ON public.marketplace_stores
    FOR SELECT TO authenticated
    USING (owner_id = auth.uid());

CREATE POLICY "stores_owner_insert" ON public.marketplace_stores
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "stores_owner_update" ON public.marketplace_stores
    FOR UPDATE TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "stores_admin_all" ON public.marketplace_stores
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. RLS for store_payouts
ALTER TABLE public.store_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payouts_owner_read" ON public.store_payouts
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.marketplace_stores 
            WHERE marketplace_stores.id = store_payouts.store_id 
            AND marketplace_stores.owner_id = auth.uid()
        )
    );

CREATE POLICY "payouts_admin_all" ON public.store_payouts
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9. Update marketplace_products RLS to allow shopkeepers to manage their store products
CREATE POLICY "shopkeeper_select_own_store_products" ON public.marketplace_products
    FOR SELECT TO authenticated
    USING (
        store_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.marketplace_stores 
            WHERE marketplace_stores.id = marketplace_products.store_id 
            AND marketplace_stores.owner_id = auth.uid()
        )
    );

CREATE POLICY "shopkeeper_insert_own_store_products" ON public.marketplace_products
    FOR INSERT TO authenticated
    WITH CHECK (
        store_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.marketplace_stores 
            WHERE marketplace_stores.id = store_id 
            AND marketplace_stores.owner_id = auth.uid()
        )
    );

CREATE POLICY "shopkeeper_update_own_store_products" ON public.marketplace_products
    FOR UPDATE TO authenticated
    USING (
        store_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.marketplace_stores 
            WHERE marketplace_stores.id = marketplace_products.store_id 
            AND marketplace_stores.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        store_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.marketplace_stores 
            WHERE marketplace_stores.id = marketplace_products.store_id 
            AND marketplace_stores.owner_id = auth.uid()
        )
    );

CREATE POLICY "shopkeeper_delete_own_store_products" ON public.marketplace_products
    FOR DELETE TO authenticated
    USING (
        store_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.marketplace_stores 
            WHERE marketplace_stores.id = marketplace_products.store_id 
            AND marketplace_stores.owner_id = auth.uid()
        )
    );
