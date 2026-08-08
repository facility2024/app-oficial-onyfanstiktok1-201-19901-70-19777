-- Corrigir políticas RLS para permitir inserções públicas nas tabelas necessárias

-- 1. Permitir inserções públicas na tabela gamification_users
DROP POLICY IF EXISTS "gamification_users_public_insert" ON public.gamification_users;
CREATE POLICY "gamification_users_public_insert" 
ON public.gamification_users 
FOR INSERT 
WITH CHECK (true);

-- 2. Permitir inserções públicas na tabela analytics_events
DROP POLICY IF EXISTS "System can insert analytics" ON public.analytics_events;
CREATE POLICY "analytics_events_public_insert" 
ON public.analytics_events 
FOR INSERT 
WITH CHECK (true);

-- 3. Permitir inserções públicas na tabela video_views
DROP POLICY IF EXISTS "video_views_public_insert" ON public.video_views;
CREATE POLICY "video_views_public_insert" 
ON public.video_views 
FOR INSERT 
WITH CHECK (true);

-- 4. Permitir leituras públicas das tabelas essenciais
DROP POLICY IF EXISTS "gamification_users_public_read" ON public.gamification_users;
CREATE POLICY "gamification_users_public_read" 
ON public.gamification_users 
FOR SELECT 
USING (true);

-- 5. Permitir atualizações públicas na tabela gamification_users para contadores
DROP POLICY IF EXISTS "gamification_users_public_update" ON public.gamification_users;
CREATE POLICY "gamification_users_public_update" 
ON public.gamification_users 
FOR UPDATE 
USING (true);