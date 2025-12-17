-- ============================================================================
-- Adicionar colunas faltantes na tabela pix_payments
-- Necessário para o sistema de pagamentos PIX funcionar corretamente
-- ============================================================================

-- Adicionar colunas faltantes
ALTER TABLE public.pix_payments 
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS plan_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS qr_code TEXT,
ADD COLUMN IF NOT EXISTS hoopay_order_uuid TEXT;

-- Criar índice para consultas por hoopay_order_uuid
CREATE INDEX IF NOT EXISTS idx_pix_payments_hoopay_uuid ON public.pix_payments(hoopay_order_uuid);

-- ============================================================================
-- VERIFICAÇÃO - Execute para confirmar as colunas:
-- ============================================================================
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'pix_payments';
