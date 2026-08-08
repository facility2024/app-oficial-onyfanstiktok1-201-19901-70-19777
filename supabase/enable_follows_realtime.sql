-- =====================================================
-- HABILITAR REAL-TIME PARA TABELAS DE FOLLOWS
-- =====================================================
-- Este script habilita sincronização real-time entre
-- dispositivos para follows de modelos e criadores
-- =====================================================

-- 1️⃣ Habilitar REPLICA IDENTITY FULL para capturar todas as mudanças
-- Isso garante que o Supabase capture o estado completo das linhas
ALTER TABLE public.model_followers REPLICA IDENTITY FULL;
ALTER TABLE public.user_follows REPLICA IDENTITY FULL;

-- 2️⃣ Adicionar tabelas à publicação de realtime
-- Isso ativa a transmissão de mudanças via WebSocket
ALTER PUBLICATION supabase_realtime ADD TABLE public.model_followers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_follows;

-- 3️⃣ Verificar se as tabelas foram adicionadas corretamente
SELECT 
  schemaname,
  tablename,
  'Realtime habilitado' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('model_followers', 'user_follows');

-- =====================================================
-- ✅ REAL-TIME HABILITADO
-- =====================================================
-- Agora as mudanças em follows serão transmitidas
-- automaticamente para todos os dispositivos conectados
-- =====================================================
