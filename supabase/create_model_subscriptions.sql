-- ============================================
-- Sistema de Assinatura Individual por Modelo/Criador
-- ============================================

-- 1. Tabela de Planos de Assinatura por Modelo
CREATE TABLE IF NOT EXISTS public.model_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL, -- ID da modelo (models.id) ou creator_id (profiles.id)
  model_type TEXT NOT NULL DEFAULT 'model' CHECK (model_type IN ('model', 'creator')),
  plan_type TEXT NOT NULL CHECK (plan_type IN ('mensal', 'trimestral', 'anual')),
  price DECIMAL(10,2) NOT NULL,
  discount_label TEXT, -- ex: '17% OFF', '25% OFF'
  payment_url TEXT, -- Link do Hoopay para este plano específico
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(model_id, plan_type)
);

-- 2. Tabela de Assinaturas Ativas dos Usuários
CREATE TABLE IF NOT EXISTS public.model_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscriber_email TEXT NOT NULL,
  subscriber_phone TEXT,
  model_id UUID NOT NULL, -- modelo/criador assinado
  model_type TEXT NOT NULL DEFAULT 'model' CHECK (model_type IN ('model', 'creator')),
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('mensal', 'trimestral', 'anual')),
  subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'expired', 'cancelled')),
  subscription_start TIMESTAMPTZ DEFAULT now(),
  subscription_end TIMESTAMPTZ NOT NULL,
  price_paid DECIMAL(10,2),
  payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subscriber_id, model_id)
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_model_subscription_plans_model_id ON public.model_subscription_plans(model_id);
CREATE INDEX IF NOT EXISTS idx_model_subscriptions_subscriber_id ON public.model_subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_model_subscriptions_model_id ON public.model_subscriptions(model_id);
CREATE INDEX IF NOT EXISTS idx_model_subscriptions_email ON public.model_subscriptions(subscriber_email);
CREATE INDEX IF NOT EXISTS idx_model_subscriptions_status ON public.model_subscriptions(subscription_status);

-- 4. Habilitar RLS
ALTER TABLE public.model_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para model_subscription_plans
-- Todos podem ver planos ativos
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.model_subscription_plans;
CREATE POLICY "Anyone can view active plans" ON public.model_subscription_plans
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- Modelos/Criadores podem gerenciar seus próprios planos
DROP POLICY IF EXISTS "Models can manage own plans" ON public.model_subscription_plans;
CREATE POLICY "Models can manage own plans" ON public.model_subscription_plans
  FOR ALL
  TO authenticated
  USING (model_id = auth.uid())
  WITH CHECK (model_id = auth.uid());

-- Admins podem gerenciar todos os planos
DROP POLICY IF EXISTS "Admins can manage all plans" ON public.model_subscription_plans;
CREATE POLICY "Admins can manage all plans" ON public.model_subscription_plans
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Políticas RLS para model_subscriptions
-- Usuários podem ver suas próprias assinaturas
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.model_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.model_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    subscriber_id = auth.uid() 
    OR LOWER(subscriber_email) = LOWER(auth.jwt()->>'email')
  );

-- Modelos podem ver quem assinou elas
DROP POLICY IF EXISTS "Models can view their subscribers" ON public.model_subscriptions;
CREATE POLICY "Models can view their subscribers" ON public.model_subscriptions
  FOR SELECT
  TO authenticated
  USING (model_id = auth.uid());

-- Admins podem gerenciar todas as assinaturas
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.model_subscriptions;
CREATE POLICY "Admins can manage all subscriptions" ON public.model_subscriptions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Permitir service_role e anon para automações (N8N/webhooks)
DROP POLICY IF EXISTS "Service role full access subscriptions" ON public.model_subscriptions;
CREATE POLICY "Service role full access subscriptions" ON public.model_subscriptions
  FOR ALL
  TO service_role, anon
  USING (true)
  WITH CHECK (true);

-- 7. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_model_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_model_subscription_plans ON public.model_subscription_plans;
CREATE TRIGGER trigger_update_model_subscription_plans
  BEFORE UPDATE ON public.model_subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_model_subscription_updated_at();

DROP TRIGGER IF EXISTS trigger_update_model_subscriptions ON public.model_subscriptions;
CREATE TRIGGER trigger_update_model_subscriptions
  BEFORE UPDATE ON public.model_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_model_subscription_updated_at();

-- 8. Habilitar Realtime para atualizações em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.model_subscriptions;

-- 9. Função para verificar assinatura ativa (útil para RLS de vídeos)
CREATE OR REPLACE FUNCTION public.has_model_subscription(_user_id UUID, _model_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.model_subscriptions
    WHERE (subscriber_id = _user_id OR LOWER(subscriber_email) = LOWER((SELECT email FROM auth.users WHERE id = _user_id)))
      AND model_id = _model_id
      AND subscription_status = 'active'
      AND subscription_end >= now()
  )
$$;

-- 10. Comentários para documentação
COMMENT ON TABLE public.model_subscription_plans IS 'Planos de assinatura configurados por cada modelo/criador';
COMMENT ON TABLE public.model_subscriptions IS 'Assinaturas ativas dos usuários para modelos/criadores específicos';
COMMENT ON FUNCTION public.has_model_subscription IS 'Verifica se usuário tem assinatura ativa para uma modelo específica';
