-- Tabela de socios da plataforma para split de vendas NeonPay
-- Cada socio tem um ID de conta NeonPay e uma porcentagem do valor liquido

CREATE TABLE IF NOT EXISTS public.platform_socios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  neonpay_producer_id text NOT NULL,
  percentage numeric NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Comentarios
COMMENT ON TABLE public.platform_socios IS 'Socios da plataforma com split de vendas NeonPay';
COMMENT ON COLUMN public.platform_socios.name IS 'Nome do socio (ex: João, Empresa X)';
COMMENT ON COLUMN public.platform_socios.neonpay_producer_id IS 'ID da conta NeonPay do socio';
COMMENT ON COLUMN public.platform_socios.percentage IS 'Porcentagem do valor liquido (apos comissao da plataforma)';

-- RLS: apenas admins podem gerenciar
ALTER TABLE public.platform_socios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage socios"
  ON public.platform_socios
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Funcao RPC para buscar socios ativos
CREATE OR REPLACE FUNCTION public.get_active_socios()
RETURNS TABLE (
  id uuid,
  name text,
  neonpay_producer_id text,
  percentage numeric
)
LANGUAGE sql STABLE
AS $$
  SELECT id, name, neonpay_producer_id, percentage
  FROM public.platform_socios
  WHERE is_active = true
  ORDER BY created_at ASC;
$$;

-- Funcao RPC para calcular splits dos socios sobre um valor liquido
CREATE OR REPLACE FUNCTION public.calculate_socio_splits(liquid_amount numeric)
RETURNS TABLE (
  socio_id uuid,
  socio_name text,
  neonpay_producer_id text,
  split_amount numeric
)
LANGUAGE sql STABLE
AS $$
  SELECT
    s.id,
    s.name,
    s.neonpay_producer_id,
    ROUND(liquid_amount * s.percentage / 100, 2) AS split_amount
  FROM public.platform_socios s
  WHERE s.is_active = true
  ORDER BY s.created_at ASC;
$$;
