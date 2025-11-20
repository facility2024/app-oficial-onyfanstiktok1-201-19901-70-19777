# 🔐 Guia de Implementação - Otimização RLS

## 📋 Índice
- [Visão Geral](#visão-geral)
- [Ordem de Execução](#ordem-de-execução)
- [Scripts SQL](#scripts-sql)
- [Verificação](#verificação)
- [Troubleshooting](#troubleshooting)
- [Testes de Segurança](#testes-de-segurança)

---

## 🎯 Visão Geral

Este guia implementa um sistema completo de segurança RLS (Row Level Security) para o COCONUDI, protegendo:

- ✅ **Dados Pessoais (PII)**: emails, telefones, endereços
- ✅ **Dados Financeiros**: pagamentos PIX, transações
- ✅ **Sistema de Roles**: separado e seguro contra escalação
- ✅ **Auditoria**: logging automático de mudanças sensíveis
- ✅ **Rate Limiting**: proteção contra abuso

---

## 📊 Ordem de Execução

### **FASE 1 - CRÍTICO (Implementar AGORA)**
Tempo estimado: 15-30 minutos

```bash
# 1. Sistema de Roles Seguro
supabase/rls-security/01-critical-role-system.sql
```

**⚠️ ATENÇÃO**: Após executar, você DEVE criar um usuário admin inicial!

```sql
-- Descobrir seu user_id
SELECT auth.uid();

-- Criar admin inicial
INSERT INTO public.user_roles (user_id, role)
VALUES ('SEU-USER-ID-AQUI', 'admin')
ON CONFLICT DO NOTHING;
```

---

### **FASE 2 - CRÍTICO (Primeiras 24h)**
Tempo estimado: 10-15 minutos

```bash
# 2. Políticas para Tabelas Principais
supabase/rls-security/02-main-tables-policies.sql
```

---

### **FASE 3 - CRÍTICO (Primeiras 24h)**
Tempo estimado: 10-15 minutos

```bash
# 3. Proteção de Dados Sensíveis
supabase/rls-security/03-sensitive-data-protection.sql
```

---

### **FASE 4 - ALTA (24-48h)**
Tempo estimado: 10 minutos

```bash
# 4. Políticas para Interações (likes, comments)
supabase/rls-security/04-interaction-tables-policies.sql
```

---

### **FASE 5 - MÉDIA (1 semana)**
Tempo estimado: 15-20 minutos

```bash
# 5. Analytics e Auditoria
supabase/rls-security/05-analytics-audit.sql
```

---

## 🔧 Como Executar os Scripts

### **Opção 1: Supabase Dashboard (Recomendado)**

1. Acesse: https://supabase.com/dashboard/project/tnzvhwapfhkhqjgyiomk
2. Vá em: **SQL Editor**
3. Clique em: **New Query**
4. Copie e cole o conteúdo do script
5. Clique em: **Run** (ou F5)
6. Verifique se não há erros no console

### **Opção 2: Supabase CLI**

```bash
# Conectar ao projeto
supabase link --project-ref tnzvhwapfhkhqjgyiomk

# Executar script
supabase db execute -f supabase/rls-security/01-critical-role-system.sql

# Verificar status
supabase db status
```

### **Opção 3: PostgreSQL Client (psql)**

```bash
# Conectar via psql
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Executar script
\i supabase/rls-security/01-critical-role-system.sql

# Verificar
\d+ user_roles
```

---

## ✅ Verificação

### **1. Verificar Sistema de Roles**

```sql
-- Verificar tabela user_roles
SELECT * FROM public.user_roles;

-- Testar função has_role
SELECT public.has_role(auth.uid(), 'admin');

-- Verificar políticas
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'user_roles';
```

### **2. Verificar Políticas Criadas**

```sql
-- Contar políticas por tabela
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC;

-- Ver todas as políticas de uma tabela específica
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'premium_users';
```

### **3. Verificar Triggers de Auditoria**

```sql
-- Listar triggers
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as enabled
FROM pg_trigger 
WHERE tgname LIKE 'audit_%'
ORDER BY table_name;

-- Ver logs de auditoria
SELECT * FROM public.security_audit_log 
ORDER BY created_at DESC 
LIMIT 10;
```

### **4. Verificar Views Públicas**

```sql
-- Testar view pública de usuários
SELECT * FROM public.users_public LIMIT 5;

-- Testar leaderboard
SELECT * FROM public.gamification_leaderboard LIMIT 10;
```

---

## 🧪 Testes de Segurança

### **Teste 1: Isolamento de Dados**

```sql
-- Como usuário normal, tentar ver dados de outros
-- Deve retornar 0 linhas ou apenas seus dados
SELECT * FROM premium_users 
WHERE email != current_setting('request.jwt.claims', true)::json->>'email';
```

**✅ Esperado**: 0 linhas ou erro de permissão

---

### **Teste 2: Escalação de Privilégios**

```sql
-- Tentar se tornar admin sem permissão
INSERT INTO user_roles (user_id, role) 
VALUES (auth.uid(), 'admin');
```

**✅ Esperado**: Erro de RLS policy violation

---

### **Teste 3: Acesso a Dados Financeiros**

```sql
-- Como usuário comum, tentar ver pagamentos de outros
SELECT * FROM pix_payments 
WHERE user_email != current_setting('request.jwt.claims', true)::json->>'email';
```

**✅ Esperado**: 0 linhas ou erro de permissão

---

### **Teste 4: Admin Total Access**

```sql
-- Como admin, deve ver tudo
SELECT COUNT(*) FROM premium_users;
SELECT COUNT(*) FROM pix_payments;
SELECT COUNT(*) FROM user_roles;
```

**✅ Esperado**: Acesso completo se você é admin

---

### **Teste 5: PII Não Vaza em Views Públicas**

```sql
-- Verificar que views públicas não expõem PII
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users_public';
```

**✅ Esperado**: Sem colunas `email`, `phone`, `address`

---

## 🚨 Troubleshooting

### **Erro: "infinite recursion detected in policy"**

**Causa**: Política RLS referenciando a mesma tabela

**Solução**: Use a função `has_role()` em vez de queries diretas

```sql
-- ❌ ERRADO
CREATE POLICY "admin_policy" ON table
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ✅ CORRETO
CREATE POLICY "admin_policy" ON table
USING (public.has_role(auth.uid(), 'admin'));
```

---

### **Erro: "permission denied for table"**

**Causa**: RLS bloqueando acesso

**Verificar**:
```sql
-- Ver suas políticas de acesso
SELECT * FROM pg_policies WHERE tablename = 'NOME_DA_TABELA';

-- Ver seu role atual
SELECT * FROM user_roles WHERE user_id = auth.uid();
```

**Solução temporária** (apenas para debug):
```sql
-- TEMPORÁRIO: Desabilitar RLS para debug
ALTER TABLE public.NOME_DA_TABELA DISABLE ROW LEVEL SECURITY;

-- LEMBRE DE RE-HABILITAR!
ALTER TABLE public.NOME_DA_TABELA ENABLE ROW LEVEL SECURITY;
```

---

### **Erro: "function has_role does not exist"**

**Causa**: Script 01 não foi executado

**Solução**: Execute `01-critical-role-system.sql` primeiro

---

### **Edge Function não funciona após RLS**

**Causa**: Edge Function usando client anon em vez de service_role

**Solução**: Verifique se está usando `SUPABASE_SERVICE_ROLE_KEY`:

```typescript
// ✅ CORRETO
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Service role bypassa RLS
);

// ❌ ERRADO
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '' // Anon key segue RLS
);
```

---

## 📊 Monitoramento

### **Dashboard de Segurança (Admin)**

Criar queries para dashboard admin:

```sql
-- 1. Tentativas de acesso negadas (últimas 24h)
SELECT 
    COUNT(*) as blocked_attempts,
    user_id,
    table_name
FROM security_audit_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
    AND action = 'ACCESS_DENIED'
GROUP BY user_id, table_name
ORDER BY blocked_attempts DESC;

-- 2. Mudanças em dados sensíveis (últimas 24h)
SELECT 
    action,
    table_name,
    user_id,
    created_at
FROM security_audit_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
    AND table_name IN ('premium_users', 'pix_payments', 'user_roles')
ORDER BY created_at DESC;

-- 3. Rate limiting hits
SELECT 
    user_id,
    COUNT(*) as follow_count
FROM model_followers
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) >= 90
ORDER BY follow_count DESC;
```

---

## 📝 Checklist Final

Antes de considerar a implementação completa:

- [ ] ✅ Script 01 executado com sucesso
- [ ] ✅ Pelo menos 1 admin criado em `user_roles`
- [ ] ✅ Script 02 executado (tabelas principais)
- [ ] ✅ Script 03 executado (dados sensíveis)
- [ ] ✅ Script 04 executado (interações)
- [ ] ✅ Script 05 executado (auditoria)
- [ ] ✅ Edge Function `follow-model` atualizada
- [ ] ✅ Todos os 5 testes de segurança passaram
- [ ] ✅ Verificação de políticas OK
- [ ] ✅ Triggers de auditoria funcionando
- [ ] ✅ Views públicas sem PII
- [ ] ✅ Dashboard de monitoramento configurado
- [ ] ✅ Backup do banco antes das mudanças

---

## 🆘 Suporte

Se encontrar problemas:

1. **Verificar logs**: 
   - Supabase Dashboard → Logs
   - Edge Functions → Logs

2. **Testar conexão**:
   ```sql
   SELECT version();
   SELECT current_user;
   ```

3. **Reverter mudanças** (última opção):
   ```sql
   -- Listar políticas criadas
   SELECT policyname FROM pg_policies WHERE policyname LIKE '%admin%';
   
   -- Remover política específica
   DROP POLICY IF EXISTS "policy_name" ON table_name;
   ```

---

## 📚 Documentação Adicional

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Security Definer Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)

---

**Última atualização**: 2025-11-20  
**Versão**: 1.0  
**Status**: ✅ Pronto para implementação
