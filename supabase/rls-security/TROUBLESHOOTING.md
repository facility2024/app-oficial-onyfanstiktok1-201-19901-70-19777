# 🔧 Troubleshooting - Scripts RLS

## ❌ ERRO: "relation public.user_roles does not exist"

### Causa
A tabela `user_roles` não foi criada ainda. Isso acontece quando:
- O script 01 não foi executado
- O script 01 foi executado parcialmente
- Houve erro na criação da tabela

### ✅ SOLUÇÃO RÁPIDA

**Passo 1: Execute o script de pré-verificação**

No Supabase Dashboard → SQL Editor, execute:

```sql
-- Copie e cole TODO o conteúdo de:
supabase/rls-security/00-pre-check-and-fix.sql
```

Este script:
- ✅ Cria a tabela `user_roles` se não existir
- ✅ Cria a função `has_role` 
- ✅ Configura as políticas RLS básicas
- ✅ Verifica se tudo está OK

**Passo 2: Criar seu usuário admin**

Após executar o script acima, execute:

```sql
-- 1. Descobrir seu user_id
SELECT auth.uid();
-- Copie o UUID retornado (exemplo: a1b2c3d4-e5f6-7890-abcd-ef1234567890)

-- 2. Criar admin (SUBSTITUA o UUID)
INSERT INTO public.user_roles (user_id, role)
VALUES ('SEU-UUID-AQUI', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Verificar
SELECT * FROM public.user_roles WHERE role = 'admin';
```

**Passo 3: Continuar com os outros scripts**

Agora você pode executar os scripts na ordem:
- ✅ `02-main-tables-policies.sql`
- ✅ `03-sensitive-data-protection.sql`
- ⏳ `04-interaction-tables-policies.sql` (opcional, pode fazer depois)
- ⏳ `05-analytics-audit.sql` (opcional, pode fazer depois)

---

## ❌ ERRO: "function has_role does not exist"

### Solução
Execute novamente o script `00-pre-check-and-fix.sql` (acima)

---

## ❌ ERRO: "infinite recursion detected in policy"

### Causa
Política antiga ainda existe que usa recursão

### Solução
```sql
-- Remover TODAS as políticas de user_roles
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_roles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', pol.policyname);
    END LOOP;
END $$;

-- Depois, re-execute o script 00-pre-check-and-fix.sql
```

---

## ❌ ERRO: "permission denied for table user_roles"

### Causa
Você não tem permissão de admin ou RLS está bloqueando

### Solução
```sql
-- Verificar se você é admin
SELECT * FROM user_roles WHERE user_id = auth.uid();

-- Se não aparecer nada, criar admin:
INSERT INTO public.user_roles (user_id, role)
VALUES (auth.uid(), 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## ❌ ERRO: "type app_role does not exist"

### Solução
```sql
-- Criar o enum manualmente
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'moderator');

-- Depois, re-execute o script 00-pre-check-and-fix.sql
```

---

## ✅ Script de Diagnóstico Completo

Execute este script para ver o estado atual do sistema:

```sql
-- ════════════════════════════════════════
-- DIAGNÓSTICO COMPLETO DO SISTEMA RLS
-- ════════════════════════════════════════

DO $$ 
BEGIN
    RAISE NOTICE '════════════════════════════════════════';
    RAISE NOTICE '         DIAGNÓSTICO DO SISTEMA         ';
    RAISE NOTICE '════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- 1. Verificar Enum
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') 
        THEN '✅ Enum app_role existe'
        ELSE '❌ Enum app_role NÃO existe'
    END as status;

-- 2. Verificar Tabela
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') 
        THEN '✅ Tabela user_roles existe'
        ELSE '❌ Tabela user_roles NÃO existe'
    END as status;

-- 3. Verificar Função
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') 
        THEN '✅ Função has_role existe'
        ELSE '❌ Função has_role NÃO existe'
    END as status;

-- 4. Verificar RLS
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'user_roles';

-- 5. Contar políticas
SELECT 
    COUNT(*) as total_policies
FROM pg_policies
WHERE tablename = 'user_roles';

-- 6. Listar políticas
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'user_roles';

-- 7. Contar admins
SELECT 
    COUNT(*) as total_admins
FROM public.user_roles
WHERE role = 'admin';

-- 8. Ver seu user_id
SELECT auth.uid() as meu_user_id;

-- 9. Verificar se você é admin
SELECT 
    CASE 
        WHEN public.has_role(auth.uid(), 'admin') 
        THEN '✅ Você é ADMIN'
        ELSE '❌ Você NÃO é admin'
    END as status;
```

---

## 📞 Ordem Correta de Execução

Se você está começando do zero:

1. **Execute**: `00-pre-check-and-fix.sql` ← **COMECE AQUI**
2. **Crie admin**: `INSERT INTO user_roles...`
3. **Execute**: `02-main-tables-policies.sql`
4. **Execute**: `03-sensitive-data-protection.sql`
5. **Opcional**: `04-interaction-tables-policies.sql`
6. **Opcional**: `05-analytics-audit.sql`

---

## 🆘 Ainda com problemas?

Se nada disso resolver, execute este script de RESET COMPLETO:

```sql
-- ⚠️ ATENÇÃO: Isso vai APAGAR tudo relacionado a roles!
-- Use apenas se estiver recomeçando do zero

-- Remover políticas
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_manage_admin" ON public.user_roles;

-- Remover função
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role);

-- Remover tabela
DROP TABLE IF EXISTS public.user_roles;

-- Remover enum
DROP TYPE IF EXISTS public.app_role;

-- Agora execute o script 00-pre-check-and-fix.sql novamente
```

---

**Última atualização**: 2025-11-20  
**Status**: Pronto para uso
