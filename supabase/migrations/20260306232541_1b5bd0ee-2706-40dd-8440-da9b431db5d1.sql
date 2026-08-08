-- Permitir múltiplas sessões simultâneas por usuário (mobile + desktop + outros estados)
-- online_users: remover unicidade por user_id
ALTER TABLE public.online_users DROP CONSTRAINT IF EXISTS online_users_user_id_key;
ALTER TABLE public.online_users DROP CONSTRAINT IF EXISTS online_users_user_id_unique;

-- user_sessions: remover unicidade por user_id
ALTER TABLE public.user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_unique;