-- Verificar e corrigir políticas RLS para admin ver todos os dados

-- 1. Permitir que admin veja todos os analytics_events
DROP POLICY IF EXISTS "Admin can view all analytics" ON public.analytics_events;
CREATE POLICY "Admin can view all analytics" 
ON public.analytics_events 
FOR SELECT 
USING (is_admin());

-- 2. Permitir que admin veja todos os video_views  
DROP POLICY IF EXISTS "Admin can view all video_views" ON public.video_views;
CREATE POLICY "Admin can view all video_views" 
ON public.video_views 
FOR SELECT 
USING (is_admin());

-- 3. Permitir que admin veja todos os likes
DROP POLICY IF EXISTS "Admin can view all likes" ON public.likes;
CREATE POLICY "Admin can view all likes" 
ON public.likes 
FOR SELECT 
USING (is_admin());

-- 4. Permitir que admin veja user_sessions
DROP POLICY IF EXISTS "Admin can view all user_sessions" ON public.user_sessions;
CREATE POLICY "Admin can view all user_sessions" 
ON public.user_sessions 
FOR SELECT 
USING (is_admin());

-- 5. Permitir que admin veja online_users
DROP POLICY IF EXISTS "Admin can view all online_users" ON public.online_users;
CREATE POLICY "Admin can view all online_users" 
ON public.online_users 
FOR SELECT 
USING (is_admin());