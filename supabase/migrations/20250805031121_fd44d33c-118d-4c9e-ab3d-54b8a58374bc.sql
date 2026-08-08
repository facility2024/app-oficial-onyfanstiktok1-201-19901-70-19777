-- Criar políticas RLS públicas para leitura de dados do painel admin
-- Permitir leitura pública das principais tabelas para exibir estatísticas

-- Modelos - leitura pública
CREATE POLICY "public_read_models" ON public.models
  FOR SELECT
  USING (true);

-- Vídeos - leitura pública
CREATE POLICY "public_read_videos" ON public.videos
  FOR SELECT
  USING (is_active = true);

-- Curtidas - leitura pública para contagem
CREATE POLICY "public_read_likes" ON public.likes
  FOR SELECT
  USING (true);

-- Compartilhamentos - leitura pública para contagem
CREATE POLICY "public_read_shares" ON public.shares
  FOR SELECT
  USING (true);

-- Comentários - leitura pública de comentários aprovados
CREATE POLICY "public_read_comments" ON public.comments
  FOR SELECT
  USING (is_approved = true);

-- Usuários online - leitura pública para contagem
CREATE POLICY "public_read_online_users" ON public.online_users
  FOR SELECT
  USING (true);

-- Estatísticas diárias - leitura pública
CREATE POLICY "public_read_daily_stats" ON public.daily_stats
  FOR SELECT
  USING (true);

-- Configurações do sistema - leitura pública quando marcado como público
CREATE POLICY "public_read_system_settings" ON public.system_settings
  FOR SELECT
  USING (is_public = true);

-- Usuários (tabela users) - permitir leitura para contagem
CREATE POLICY "public_read_users_count" ON public.users
  FOR SELECT
  USING (true);