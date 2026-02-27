
-- Tabela de produtos físicos para a loja do Marketplace
CREATE TABLE public.physical_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'geral',
    image_urls TEXT[] NOT NULL DEFAULT '{}',
    video_url TEXT,
    purchase_url TEXT,
    price NUMERIC(10,2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.physical_products ENABLE ROW LEVEL SECURITY;

-- Leitura pública (produtos ativos)
CREATE POLICY "physical_products_public_read" ON public.physical_products
    FOR SELECT TO anon, authenticated
    USING (is_active = true);

-- Admin gerenciamento total
CREATE POLICY "physical_products_admin_all" ON public.physical_products
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE TRIGGER update_physical_products_updated_at
    BEFORE UPDATE ON public.physical_products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
