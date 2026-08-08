
-- HOTFIX 1: premium_users — remover policies que permitem usuário autenticado
-- conceder/alterar/apagar o próprio VIP (bypass total do paywall).
-- Escrita continua funcionando via service_role (webhooks NeonPay/Asaas).
DROP POLICY IF EXISTS "Allow premium_users insert for owner" ON public.premium_users;
DROP POLICY IF EXISTS "Allow premium_users update for owner" ON public.premium_users;
DROP POLICY IF EXISTS "Allow premium_users delete for owner" ON public.premium_users;

-- HOTFIX 2: webhook_logs — remover INSERT aberto para anon/authenticated.
-- Edge functions de webhook usam service_role, que ignora RLS.
DROP POLICY IF EXISTS "webhook_logs_service_insert" ON public.webhook_logs;

-- HOTFIX 3: model_followers — remover INSERT público (permitia anon seguir
-- em nome de qualquer usuário). Policies autenticadas escopadas continuam ativas.
DROP POLICY IF EXISTS "Public can insert follows" ON public.model_followers;
