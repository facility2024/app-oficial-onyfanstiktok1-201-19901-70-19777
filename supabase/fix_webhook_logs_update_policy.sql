-- ============================================
-- CORRIGIR: Adicionar política de UPDATE para webhook_logs
-- Problema: Edge Function não consegue atualizar logs após inserção
-- ============================================

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "webhook_logs_admin_select" ON public.webhook_logs;
DROP POLICY IF EXISTS "webhook_logs_service_insert" ON public.webhook_logs;
DROP POLICY IF EXISTS "webhook_logs_service_update" ON public.webhook_logs;

-- Garantir RLS habilitado
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: Apenas admins podem ver
CREATE POLICY "webhook_logs_admin_select" ON public.webhook_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- INSERT: Qualquer um pode inserir (webhooks externos são anônimos)
CREATE POLICY "webhook_logs_service_insert" ON public.webhook_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- UPDATE: Qualquer um pode atualizar (para a Edge Function conseguir atualizar)
CREATE POLICY "webhook_logs_service_update" ON public.webhook_logs
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- ATIVAR VIP MANUALMENTE PARA dante@gmail.com
-- ============================================
INSERT INTO public.premium_users (email, name, subscription_status, subscription_type, subscription_start, subscription_end)
VALUES ('dante@gmail.com', 'Dante Testa', 'active', 'mensal', NOW(), NOW() + INTERVAL '30 days')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  subscription_status = 'active',
  subscription_type = 'mensal',
  subscription_start = NOW(),
  subscription_end = NOW() + INTERVAL '30 days',
  updated_at = NOW();

-- Verificar se foi ativado
SELECT email, name, subscription_status, subscription_type, subscription_end 
FROM public.premium_users 
WHERE email = 'dante@gmail.com';
