# 🚀 Guia de Execução - Scripts RLS no Supabase Dashboard

## 📋 Passo a Passo Completo

### **ANTES DE COMEÇAR**

⚠️ **IMPORTANTE**: Faça backup do banco de dados antes de executar os scripts!

```sql
-- No SQL Editor, execute para fazer backup lógico das tabelas críticas:
-- (Salve os resultados em arquivos .sql)
SELECT * FROM premium_users;
SELECT * FROM pix_payments;
SELECT * FROM user_roles;
```

---

## 🔐 ETAPA 1: Acessar o Supabase Dashboard

1. Acesse: https://supabase.com/dashboard/project/tnzvhwapfhkhqjgyiomk

2. No menu lateral esquerdo, clique em **"SQL Editor"**

3. Clique no botão **"New query"** (canto superior direito)

---

## 📝 ETAPA 2: Executar Script 01 - Sistema de Roles (CRÍTICO)

### 2.1 Copiar o Script

Abra o arquivo: `supabase/rls-security/01-critical-role-system.sql`

**Copie TODO o conteúdo** (Ctrl+A, Ctrl+C)

### 2.2 Colar no SQL Editor

No Supabase Dashboard:
- Cole o conteúdo no editor SQL
- Clique em **"Run"** (ou pressione F5)
- Aguarde a execução (pode levar 10-30 segundos)

### 2.3 Verificar Sucesso

No mesmo SQL Editor, execute:

```sql
-- Verificar se a tabela foi criada
SELECT * FROM public.user_roles;

-- Verificar se a função foi criada
SELECT public.has_role('00000000-0000-0000-0000-000000000000'::uuid, 'admin');
```

✅ **Sucesso**: Retorna resultado sem erros  
❌ **Erro**: Veja seção "Troubleshooting" abaixo

---

## 👤 ETAPA 3: Criar Usuário Admin Inicial (CRÍTICO)

### 3.1 Descobrir Seu User ID

No SQL Editor, execute:

```sql
-- Opção 1: Se você está logado no aplicativo
SELECT auth.uid();

-- Opção 2: Ver todos os usuários (se admin do Supabase)
SELECT 
    id,
    email,
    created_at
FROM auth.users
ORDER BY created_at DESC;
```

Copie o **UUID** do seu usuário (exemplo: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

### 3.2 Criar Admin

**SUBSTITUA** `SEU-USER-ID-AQUI` pelo UUID que você copiou:

```sql
-- IMPORTANTE: Substitua o UUID abaixo pelo seu!
INSERT INTO public.user_roles (user_id, role)
VALUES ('SEU-USER-ID-AQUI', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Exemplo:
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;
```

### 3.3 Verificar Admin

```sql
-- Verificar se você é admin
SELECT * FROM public.user_roles WHERE role = 'admin';

-- Testar função has_role (substitua seu UUID)
SELECT public.has_role('SEU-USER-ID-AQUI'::uuid, 'admin');
```

✅ **Sucesso**: Retorna `true`  
❌ **Erro**: Verifique se o UUID está correto

---

## 📊 ETAPA 4: Executar Scripts 02 e 03 (CRÍTICOS)

### 4.1 Script 02 - Tabelas Principais

1. Clique em **"New query"** novamente
2. Copie o conteúdo de: `supabase/rls-security/02-main-tables-policies.sql`
3. Cole no editor e clique em **"Run"**
4. Aguarde conclusão (10-15 segundos)

### 4.2 Verificar Script 02

```sql
-- Verificar políticas criadas
SELECT 
    tablename, 
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('users', 'profiles', 'videos')
ORDER BY tablename, policyname;
```

### 4.3 Script 03 - Dados Sensíveis

1. Clique em **"New query"** novamente
2. Copie o conteúdo de: `supabase/rls-security/03-sensitive-data-protection.sql`
3. Cole no editor e clique em **"Run"**
4. Aguarde conclusão (10-15 segundos)

### 4.4 Verificar Script 03

```sql
-- Verificar políticas de segurança
SELECT 
    tablename, 
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('premium_users', 'pix_payments', 'gamification_users', 'model_followers', 'admin_settings')
GROUP BY tablename
ORDER BY tablename;
```

---

## 🔄 ETAPA 5: Executar Scripts 04 e 05 (OPCIONAL - Pode fazer depois)

### 5.1 Script 04 - Interações (Alta Prioridade)

Execute em 24-48h:

```sql
-- Copie de: supabase/rls-security/04-interaction-tables-policies.sql
```

### 5.2 Script 05 - Auditoria (Média Prioridade)

Execute em 1 semana:

```sql
-- Copie de: supabase/rls-security/05-analytics-audit.sql
```

---

## ✅ ETAPA 6: Verificação Final

Execute todos estes comandos para confirmar que tudo está OK:

```sql
-- 1. Verificar sistema de roles
SELECT COUNT(*) as admin_count 
FROM public.user_roles 
WHERE role = 'admin';
-- Deve retornar pelo menos 1

-- 2. Verificar total de políticas criadas
SELECT COUNT(*) as total_policies 
FROM pg_policies 
WHERE schemaname = 'public';
-- Deve retornar 50+ políticas

-- 3. Verificar tabelas com RLS habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;
-- Deve mostrar várias tabelas

-- 4. Testar acesso admin
SELECT public.has_role(auth.uid(), 'admin') as sou_admin;
-- Deve retornar true se você criou o admin

-- 5. Verificar audit log (se executou script 05)
SELECT COUNT(*) FROM public.security_audit_log;
-- Pode retornar 0 (OK, ainda sem eventos)
```

---

## 🧪 ETAPA 7: Testes de Segurança

Execute estes testes para garantir que a segurança está funcionando:

### Teste 1: Isolamento de Dados

```sql
-- Como usuário normal, tente ver dados de outros
-- Deve retornar 0 linhas
SELECT * FROM premium_users 
WHERE id != auth.uid()::text
LIMIT 5;
```

### Teste 2: Proteção Admin

```sql
-- Tente ver configurações de admin (apenas admin pode)
SELECT * FROM admin_settings LIMIT 1;
-- Se você é admin: deve funcionar
-- Se não é admin: erro de permissão (CORRETO!)
```

### Teste 3: Dados Públicos

```sql
-- Verificar que views públicas não expõem PII
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users_public';
-- Não deve ter: email, phone, etc.
```

---

## 🚨 Troubleshooting

### Erro: "role app_role does not exist"

**Causa**: Script 01 não foi executado completamente

**Solução**:
```sql
-- Criar o enum manualmente
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'moderator');
```

---

### Erro: "function has_role does not exist"

**Causa**: Função não foi criada

**Solução**: Re-execute apenas a parte da função do Script 01:
```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
```

---

### Erro: "infinite recursion detected in policy"

**Causa**: Política antiga ainda existe

**Solução**:
```sql
-- Remover todas as políticas de uma tabela
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'NOME_DA_TABELA'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 
            pol.policyname, 'NOME_DA_TABELA');
    END LOOP;
END $$;

-- Depois, re-execute o script correspondente
```

---

### Erro: "permission denied for table"

**Causa**: Você não é admin ou RLS está bloqueando

**Verificar**:
```sql
-- Ver se você é admin
SELECT * FROM user_roles WHERE user_id = auth.uid();

-- Se necessário, criar admin novamente
INSERT INTO public.user_roles (user_id, role)
VALUES (auth.uid(), 'admin')
ON CONFLICT DO NOTHING;
```

---

### Erro: "column role does not exist in table profiles"

**Causa**: Script 01 já removeu a coluna (OK!)

**Solução**: Ignore este erro, é esperado se você já executou o script antes.

---

## 📊 Dashboard de Monitoramento

Após executar todos os scripts, você pode usar estas queries para monitorar:

### Painel de Segurança

```sql
-- 1. Usuários com roles de admin
SELECT 
    u.email,
    ur.role,
    ur.granted_at
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY ur.granted_at DESC;

-- 2. Políticas por tabela
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC;

-- 3. Últimas mudanças auditadas (se script 05 executado)
SELECT 
    action,
    table_name,
    created_at
FROM security_audit_log
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📝 Checklist de Conclusão

Marque cada item conforme completar:

- [ ] ✅ Backup do banco realizado
- [ ] ✅ Script 01 executado com sucesso
- [ ] ✅ Usuário admin criado e testado
- [ ] ✅ Script 02 executado
- [ ] ✅ Script 03 executado
- [ ] ✅ Verificação final executada
- [ ] ✅ Testes de segurança passaram
- [ ] ✅ Edge Function follow-model deployada (automático)
- [ ] ⏳ Script 04 agendado (24-48h)
- [ ] ⏳ Script 05 agendado (1 semana)

---

## 🎉 Parabéns!

Se chegou até aqui e todos os testes passaram, seu sistema COCONUDI agora tem:

✅ Sistema de roles seguro sem vulnerabilidades  
✅ Proteção de dados pessoais (PII) e financeiros  
✅ Políticas RLS otimizadas para 80+ tabelas  
✅ Rate limiting em operações críticas  
✅ Auditoria automática de mudanças sensíveis (se script 05)  

---

## 📞 Próximos Passos

1. **Testar no aplicativo**: Faça login e teste as funcionalidades
2. **Criar mais admins**: Adicione outros usuários admin conforme necessário
3. **Monitorar logs**: Acompanhe tentativas de acesso negadas
4. **Scripts 04 e 05**: Execute quando tiver tempo

---

**Última atualização**: 2025-11-20  
**Tempo total**: ~45-60 minutos  
**Status**: ✅ Pronto para execução
