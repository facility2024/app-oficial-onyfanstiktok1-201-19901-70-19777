-- Corrige permissões de tabela para rastreamento em tempo real (RLS continua valendo)
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_sessions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.online_users TO anon, authenticated;