

# Plano de Correção: Login Admin para coconudi@gmail.com

## Problema Identificado
Após a limpeza do banco de dados, o usuário `coconudi@gmail.com` pode ter perdido sua role de admin na tabela `user_roles`, ou o usuário pode não existir mais no `auth.users`.

## Solução Completa

### Passo 1: Diagnóstico no Supabase SQL Editor
Execute este SQL para verificar o estado atual:

```sql
-- 1. Verificar se usuário existe
SELECT id, email, created_at, email_confirmed_at 
FROM auth.users 
WHERE email = 'coconudi@gmail.com';

-- 2. Verificar roles existentes
SELECT * FROM public.user_roles;

-- 3. Verificar se função has_role existe
SELECT routine_name, security_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name = 'has_role';

-- 4. Verificar políticas RLS na tabela user_roles
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_roles';
```

### Passo 2: Criar Usuário (se não existir)
Se o SQL acima retornar vazio para `coconudi@gmail.com`:
1. Acesse o Supabase Dashboard
2. Vá em **Authentication → Users → Add user**
3. Email: `coconudi@gmail.com`
4. Senha: `15183020`
5. Marque **Auto Confirm User**

### Passo 3: Script SQL Completo de Correção
Execute este script no SQL Editor do Supabase:

```sql
-- =====================================================
-- CORREÇÃO COMPLETA ADMIN COCONUDI@GMAIL.COM
-- =====================================================

-- ETAPA 1: Garantir que enum app_role existe com 'admin' e 'creator'
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'creator');
EXCEPTION
  WHEN duplicate_object THEN 
    -- Já existe, verificar se tem 'creator'
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'creator';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
END $$;

-- ETAPA 2: Garantir que tabela user_roles existe
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ETAPA 3: Recriar função has_role (SECURITY DEFINER)
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

-- ETAPA 4: Recriar função is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- ETAPA 5: Limpar e recriar políticas RLS
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_manage_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_combined" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_creators_public" ON public.user_roles;

-- Política 1: Usuário vê suas próprias roles
CREATE POLICY "user_roles_select_own" 
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Política 2: Creators são visíveis publicamente (para busca)
CREATE POLICY "user_roles_select_creators_public" 
ON public.user_roles FOR SELECT TO authenticated
USING (role = 'creator'::public.app_role);

-- Política 3: Admins veem todas as roles
CREATE POLICY "user_roles_select_admin" 
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Política 4: Admins podem inserir roles
CREATE POLICY "user_roles_insert_admin" 
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Política 5: Admins podem atualizar roles
CREATE POLICY "user_roles_update_admin" 
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Política 6: Admins podem deletar roles
CREATE POLICY "user_roles_delete_admin" 
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Garantir GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- ETAPA 6: Adicionar role admin para coconudi@gmail.com
INSERT INTO public.user_roles (user_id, role, granted_at)
SELECT 
  id,
  'admin'::app_role,
  now()
FROM auth.users
WHERE email = 'coconudi@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- ETAPA 7: Adicionar role creator para bianca@gmail.com
INSERT INTO public.user_roles (user_id, role, granted_at)
SELECT 
  id,
  'creator'::app_role,
  now()
FROM auth.users
WHERE email = 'bianca@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- ETAPA 8: Verificação final
SELECT 
  '=== RESULTADO FINAL ===' as status,
  u.id as user_id,
  u.email,
  ur.role,
  CASE 
    WHEN ur.role = 'admin' THEN '✅ ADMIN OK'
    WHEN ur.role = 'creator' THEN '✅ CREATOR OK'
    ELSE '⚠️ Outra role'
  END as resultado
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email IN ('coconudi@gmail.com', 'bianca@gmail.com');
```

## Detalhes Técnicos

### Estrutura de Segurança
- **Tabela `user_roles`**: Armazena roles separadamente (evita escalação de privilégios)
- **Função `has_role()`**: SECURITY DEFINER que bypassa RLS (evita recursão infinita)
- **Função `is_admin()`**: Verifica se o usuário atual é admin

### Políticas RLS Criadas

| Política | Operação | Quem pode |
|----------|----------|-----------|
| `user_roles_select_own` | SELECT | Próprio usuário vê suas roles |
| `user_roles_select_creators_public` | SELECT | Todos veem creators (para busca) |
| `user_roles_select_admin` | SELECT | Admins veem todas as roles |
| `user_roles_insert_admin` | INSERT | Somente admins |
| `user_roles_update_admin` | UPDATE | Somente admins |
| `user_roles_delete_admin` | DELETE | Somente admins |

### Fluxo de Login Admin
1. Usuário faz login via `supabase.auth.signInWithPassword()`
2. Frontend chama `AdminRoute.tsx` que verifica role
3. Query: `SELECT role FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'`
4. Se retornar dados → acesso liberado ao painel admin

### Resultado Esperado
Após executar o script:
- `coconudi@gmail.com` terá role **admin**
- `bianca@gmail.com` terá role **creator**
- Login funcionará normalmente

