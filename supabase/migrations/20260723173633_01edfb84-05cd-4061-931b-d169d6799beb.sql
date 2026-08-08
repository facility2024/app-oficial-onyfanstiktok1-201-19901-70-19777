
-- Habilitar pg_net para dispatch assíncrono de webhooks
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =========================================
-- 1) TABELAS
-- =========================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read:events']::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_used_at TIMESTAMPTZ,
  usage_count BIGINT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_keys_admin_all" ON public.api_keys
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));


CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY['*']::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_delivery_at TIMESTAMPTZ,
  last_status INT,
  failure_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_endpoints TO authenticated;
GRANT ALL ON public.webhook_endpoints TO service_role;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook_endpoints_admin_all" ON public.webhook_endpoints
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));


CREATE TABLE IF NOT EXISTS public.api_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  action TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_events_type ON public.api_events(event_type);
CREATE INDEX IF NOT EXISTS idx_api_events_created_at ON public.api_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_events_resource ON public.api_events(resource_type, resource_id);
GRANT SELECT, INSERT ON public.api_events TO authenticated;
GRANT ALL ON public.api_events TO service_role;
ALTER TABLE public.api_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_events_admin_select" ON public.api_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "api_events_service_insert" ON public.api_events
  FOR INSERT TO service_role
  WITH CHECK (true);


CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.api_events(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  status_code INT,
  response_body TEXT,
  error_message TEXT,
  attempt INT NOT NULL DEFAULT 1,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON public.webhook_deliveries(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON public.webhook_deliveries(created_at DESC);
GRANT SELECT ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook_deliveries_admin_select" ON public.webhook_deliveries
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- =========================================
-- 2) FUNÇÃO GENÉRICA DE EMISSÃO DE EVENTOS
-- =========================================

CREATE OR REPLACE FUNCTION public.emit_api_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type TEXT;
  v_resource TEXT := TG_ARGV[0];
  v_action TEXT;
  v_id TEXT;
  v_payload JSONB;
  v_event_id UUID;
  v_dispatcher_url TEXT;
  v_supabase_url TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_id := COALESCE(NEW.id::TEXT, gen_random_uuid()::TEXT);
    v_payload := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    v_id := COALESCE(NEW.id::TEXT, OLD.id::TEXT);
    v_payload := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSE
    v_action := 'deleted';
    v_id := OLD.id::TEXT;
    v_payload := to_jsonb(OLD);
  END IF;

  v_event_type := v_resource || '.' || v_action;

  INSERT INTO public.api_events (event_type, resource_type, resource_id, action, payload)
  VALUES (v_event_type, v_resource, v_id, v_action, v_payload)
  RETURNING id INTO v_event_id;

  -- Dispatch async via pg_net (best-effort, não bloqueia a transação em caso de erro)
  BEGIN
    v_supabase_url := 'https://tnzvhwapfhkhqjgyiomk.supabase.co';
    v_dispatcher_url := v_supabase_url || '/functions/v1/webhook-dispatcher';
    PERFORM net.http_post(
      url := v_dispatcher_url,
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('event_id', v_event_id)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Silenciosamente ignora falha de dispatch; evento fica no api_events
    NULL;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;


-- =========================================
-- 3) TRIGGERS EM TABELAS RELEVANTES
--    (drop-and-create pra ser idempotente)
-- =========================================

DO $$
DECLARE
  r RECORD;
  spec TEXT[][] := ARRAY[
    ARRAY['models','model'],
    ARRAY['videos','video'],
    ARRAY['sales','sale'],
    ARRAY['payment_transactions','payment'],
    ARRAY['premium_users','subscription_vip'],
    ARRAY['user_follows','follow'],
    ARRAY['model_followers','model_follow'],
    ARRAY['likes','like'],
    ARRAY['comments','comment'],
    ARRAY['referrals','referral'],
    ARRAY['wallet_transactions','wallet_transaction'],
    ARRAY['checkout_purchases','checkout_purchase'],
    ARRAY['user_entitlements','entitlement'],
    ARRAY['creator_applications','creator_application'],
    ARRAY['model_subscriptions','model_subscription'],
    ARRAY['transactions','transaction'],
    ARRAY['profiles','user']
  ];
  i INT;
  tbl TEXT;
  resource TEXT;
BEGIN
  FOR i IN 1..array_length(spec,1) LOOP
    tbl := spec[i][1];
    resource := spec[i][2];
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=tbl) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS emit_api_event_%I ON public.%I', tbl, tbl);
      EXECUTE format(
        'CREATE TRIGGER emit_api_event_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.emit_api_event(%L)',
        tbl, tbl, resource
      );
    END IF;
  END LOOP;
END;
$$;


-- =========================================
-- 4) TRIGGER DE updated_at
-- =========================================

CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS touch_api_keys ON public.api_keys;
CREATE TRIGGER touch_api_keys BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS touch_webhook_endpoints ON public.webhook_endpoints;
CREATE TRIGGER touch_webhook_endpoints BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
