-- =====================================================
-- SCRIPT DE EXCLUSÃO COMPLETA DE DADOS PREMIUM
-- Data: 2025-01-23
-- Ação: IRREVERSÍVEL - Apaga premium_users, bonus_users, gamification_users e gamification_actions
-- =====================================================

-- ⚠️ IMPORTANTE: FAÇA BACKUP ANTES DE EXECUTAR!
-- No Supabase Dashboard:
-- 1. Vá em "Table Editor"
-- 2. Selecione cada tabela abaixo
-- 3. Clique em "Export" → "CSV"
-- 4. Salve localmente: premium_users.csv, bonus_users.csv, gamification_users.csv, gamification_actions.csv

-- =====================================================
-- FASE 1: VERIFICAÇÃO ANTES DA EXCLUSÃO
-- =====================================================

-- Contar registros atuais (ANOTE ESTES NÚMEROS!)
SELECT 'premium_users' as tabela, COUNT(*) as total FROM premium_users
UNION ALL
SELECT 'bonus_users', COUNT(*) FROM bonus_users
UNION ALL
SELECT 'gamification_users', COUNT(*) FROM gamification_users
UNION ALL
SELECT 'gamification_actions', COUNT(*) FROM gamification_actions;

-- Verificar dependências
SELECT 
  'gamification_actions órfãos' as check_type,
  COUNT(*) as count
FROM gamification_actions 
WHERE user_id NOT IN (SELECT id FROM gamification_users);

-- =====================================================
-- FASE 2: EXCLUSÃO SEQUENCIAL (ORDEM IMPORTANTE!)
-- =====================================================

-- ⚠️ APÓS EXECUTAR ESTA SEÇÃO, NÃO HÁ VOLTA!

-- 1️⃣ PRIMEIRO: Apagar ações de gamificação (tabela dependente)
DELETE FROM gamification_actions;
-- ✅ Registros deletados serão exibidos

-- 2️⃣ SEGUNDO: Apagar usuários de gamificação
DELETE FROM gamification_users;
-- ✅ Registros deletados serão exibidos

-- 3️⃣ TERCEIRO: Apagar usuários bonus (formulário VIP)
DELETE FROM bonus_users;
-- ✅ Registros deletados serão exibidos

-- 4️⃣ QUARTO: Apagar usuários premium (assinaturas PIX)
DELETE FROM premium_users;
-- ✅ Registros deletados serão exibidos

-- 5️⃣ OPCIONAL: Limpar pagamentos PIX órfãos (se existirem)
DELETE FROM pix_payments 
WHERE user_email NOT IN (SELECT email FROM auth.users);
-- ✅ Registros deletados serão exibidos (pode ser 0)

-- =====================================================
-- FASE 3: VERIFICAÇÃO PÓS-EXCLUSÃO
-- =====================================================

-- Confirmar que as tabelas estão vazias (DEVE RETORNAR 0 PARA TODAS)
SELECT 'premium_users' as tabela, COUNT(*) as total FROM premium_users
UNION ALL
SELECT 'bonus_users', COUNT(*) FROM bonus_users
UNION ALL
SELECT 'gamification_users', COUNT(*) FROM gamification_users
UNION ALL
SELECT 'gamification_actions', COUNT(*) FROM gamification_actions;

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- Todas as contagens devem ser 0
-- 
-- Se precisar RESTAURAR (use os CSVs exportados):
-- 1. Vá em "Table Editor" → Selecione a tabela
-- 2. Clique em "Insert" → "Import from CSV"
-- 3. Faça upload do arquivo de backup
-- =====================================================

-- LOG DE EXECUÇÃO (PREENCHER APÓS EXECUTAR):
-- Data/Hora: _____________________
-- Executor: _____________________
-- premium_users deletados: _____
-- bonus_users deletados: _____
-- gamification_users deletados: _____
-- gamification_actions deletados: _____
-- Backup salvo em: _____________________
