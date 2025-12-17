-- ============================================================================
-- FIX: Adicionar políticas RLS para usuários autenticados na tabela pix_payments
-- Permite que usuários façam pagamentos PIX diretamente do frontend
-- ============================================================================

-- Verificar se a coluna user_id existe e adicionar se necessário
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pix_payments' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.pix_payments ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Garantir que RLS está habilitado
ALTER TABLE public.pix_payments ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas que possam conflitar
DROP POLICY IF EXISTS "Users can insert own payments" ON public.pix_payments;
DROP POLICY IF EXISTS "Users can view own payments" ON public.pix_payments;
DROP POLICY IF EXISTS "Users can update own payments" ON public.pix_payments;
DROP POLICY IF EXISTS "pix_payments_insert_authenticated" ON public.pix_payments;
DROP POLICY IF EXISTS "pix_payments_select_authenticated" ON public.pix_payments;
DROP POLICY IF EXISTS "pix_payments_update_authenticated" ON public.pix_payments;

-- ✅ Política para usuários autenticados INSERIREM seus próprios pagamentos
CREATE POLICY "pix_payments_insert_authenticated" ON public.pix_payments
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- ✅ Política para usuários autenticados VEREM seus próprios pagamentos
CREATE POLICY "pix_payments_select_authenticated" ON public.pix_payments
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- ✅ Política para usuários autenticados ATUALIZAREM seus próprios pagamentos
CREATE POLICY "pix_payments_update_authenticated" ON public.pix_payments
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Manter políticas de admin existentes (não remover)
-- As políticas de admin em 03-sensitive-data-protection.sql continuam válidas

-- ============================================================================
-- VERIFICAÇÃO - Execute para confirmar:
-- ============================================================================
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'pix_payments';
