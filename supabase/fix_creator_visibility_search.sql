-- =====================================================
-- CORREÇÃO: PERMITIR BUSCA DE CRIADORES PARA TODOS
-- =====================================================
-- Este script adiciona uma política RLS que permite
-- usuários autenticados verem roles do tipo 'creator'
-- para que criadores apareçam na busca do aplicativo

-- 1️⃣ Adicionar política para permitir leitura de roles 'creator'
CREATE POLICY "user_roles_select_creators_public" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (
  -- Permitir ver roles do tipo 'creator' (perfis públicos)
  role = 'creator'::public.app_role
);

-- =====================================================
-- ✅ RESULTADO ESPERADO
-- =====================================================
-- Após executar este SQL:
-- ✅ @Bianca e outros criadores aparecerão na busca
-- ✅ Todos os usuários autenticados poderão descobrir criadores
-- ✅ Não expõe roles sensíveis (admin, moderator)
-- ✅ Mantém segurança de outras roles
-- =====================================================

-- Nota: Esta política se combina com as existentes sem conflito:
-- - user_roles_select_combined: permite ver próprias roles + admins verem tudo
-- - Esta nova política: permite TODOS verem roles do tipo 'creator'
