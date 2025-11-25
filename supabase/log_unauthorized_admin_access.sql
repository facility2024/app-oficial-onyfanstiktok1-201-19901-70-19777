-- =====================================================
-- LOG DE TENTATIVAS NÃO AUTORIZADAS DE ACESSO ADMIN
-- =====================================================
-- Este script garante que todas as tentativas de acesso
-- não autorizado ao painel admin sejam registradas

-- 1️⃣ VERIFICAR SE analytics_events ACEITA LOGS DE SEGURANÇA
-- A tabela analytics_events já existe e deve aceitar eventos de segurança

-- 2️⃣ CRIAR ÍNDICE PARA BUSCA RÁPIDA DE EVENTOS DE SEGURANÇA
CREATE INDEX IF NOT EXISTS idx_analytics_events_security
  ON public.analytics_events(event_category, created_at DESC)
  WHERE event_category = 'security';

-- 3️⃣ CRIAR ÍNDICE PARA BUSCA POR TIPO DE EVENTO
CREATE INDEX IF NOT EXISTS idx_analytics_events_security_name
  ON public.analytics_events(event_name, created_at DESC)
  WHERE event_name = 'unauthorized_admin_access_attempt';

-- 4️⃣ VERIFICAR EVENTOS DE SEGURANÇA RECENTES
SELECT 
  id,
  event_name,
  event_category,
  user_id,
  event_data,
  created_at
FROM public.analytics_events
WHERE event_category = 'security'
  AND event_name = 'unauthorized_admin_access_attempt'
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================
-- ✅ AUDITORIA DE SEGURANÇA CONFIGURADA
-- =====================================================
-- Agora todas as tentativas não autorizadas serão registradas
-- Os admins podem consultar esses logs através de:
-- SELECT * FROM analytics_events 
-- WHERE event_category = 'security'
-- ORDER BY created_at DESC;
-- =====================================================
