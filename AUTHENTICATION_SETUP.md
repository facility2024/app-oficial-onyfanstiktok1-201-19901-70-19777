# 🔐 Sistema de Autenticação - Guia de Configuração

## ✅ Arquivos Implementados

### Novos Componentes
- ✅ `src/pages/Auth.tsx` - Página de login/cadastro
- ✅ `src/components/ProtectedRoute.tsx` - Proteção de rotas
- ✅ `src/App.tsx` - Rotas atualizadas com proteção
- ✅ `src/pages/TikTokApp.tsx` - Botão de logout funcional

### SQL
- ✅ `supabase/migrations/auto_user_role_trigger.sql` - Trigger para role automática

---

## 📋 Passo a Passo de Configuração

### 1️⃣ Executar SQL no Supabase

**Acesse:** [Supabase Dashboard](https://supabase.com/dashboard) → Seu Projeto → SQL Editor

**Cole e execute o seguinte script:**

```sql
-- Função que adiciona role 'user' automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger que executa após INSERT em auth.users
DROP TRIGGER IF EXISTS on_auth_user_role_created ON auth.users;
CREATE TRIGGER on_auth_user_role_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user_role();
```

**Verificar se funcionou:**
```sql
-- Ver triggers ativos
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_role_created';
```

---

### 2️⃣ Configurar Autenticação no Supabase (Opcional para Testes)

**Acesse:** Authentication → Settings

#### Desabilitar Confirmação de Email (apenas para testes rápidos)
- Desmarque: **"Enable email confirmations"**
- Isso permite que usuários façam login imediatamente após cadastro

⚠️ **IMPORTANTE:** Em produção, mantenha a confirmação de email ativada!

#### Configurar URLs de Redirecionamento

**Acesse:** Authentication → URL Configuration

**Site URL:**
```
https://seu-app.lovable.app
```

**Redirect URLs (adicione todas):**
```
https://seu-app.lovable.app/app
http://localhost:5173/app
http://localhost:3000/app
```

---

### 3️⃣ Testar o Sistema

#### ✅ Fluxo de Cadastro
1. Acesse `/` ou `/auth`
2. Clique em "Não tem conta? Cadastre-se"
3. Preencha: Nome, Email, Senha
4. Clique em "Criar Conta"
5. **Esperado:**
   - Toast de sucesso
   - Redirecionamento para `/app`
   - Usuário logado automaticamente

#### ✅ Verificar no Banco de Dados
```sql
-- Ver usuários criados
SELECT email, created_at FROM auth.users;

-- Ver perfis criados
SELECT * FROM public.profiles;

-- Ver roles atribuídas (deve ter 'user' para cada novo cadastro)
SELECT 
  u.email,
  ur.role,
  ur.created_at as role_created_at
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at DESC;
```

#### ✅ Fluxo de Login
1. Acesse `/auth`
2. Digite email e senha de conta existente
3. Clique em "Entrar"
4. **Esperado:**
   - Toast de sucesso
   - Redirecionamento para `/app`

#### ✅ Proteção de Rotas
1. Faça logout (botão "Sair" no menu lateral)
2. Tente acessar `/app` diretamente
3. **Esperado:**
   - Redirecionamento automático para `/auth`

#### ✅ Fluxo de Logout
1. Estando logado, clique no menu lateral (≡)
2. Clique em "Sair"
3. **Esperado:**
   - Toast "Logout realizado"
   - Redirecionamento para `/auth`

---

## 🔒 Segurança Implementada

### Validações
- ✅ **Zod Schema:** Todos os inputs validados
- ✅ **Sanitização:** Email trimmed e validado
- ✅ **Limites:** 
  - Email: max 255 caracteres
  - Senha: min 6, max 100 caracteres
  - Nome: min 2, max 100 caracteres
- ✅ **Mensagens Genéricas:** Não expõe se email existe

### Proteção de Rotas
- ✅ **ProtectedRoute:** Verifica sessão antes de renderizar
- ✅ **Redirecionamento:** Não-autenticados vão para `/auth`
- ✅ **Auto-redirect:** Usuários logados em `/auth` vão para `/app`
- ✅ **Session Listener:** Sincronização em tempo real

### Supabase Best Practices
- ✅ **emailRedirectTo:** Configurado para todas as plataformas
- ✅ **Session Storage:** Persistido em localStorage
- ✅ **Auto Refresh Token:** Habilitado por padrão
- ✅ **onAuthStateChange:** Sincronização de estado

### Row Level Security (RLS)
- ✅ **user_roles:** Protegida por RLS
- ✅ **profiles:** Protegida por RLS
- ✅ **SECURITY DEFINER:** Trigger com privilégios elevados

---

## 🐛 Troubleshooting

### Erro: "Table user_roles does not exist"
**Solução:** Execute o script SQL de criação da tabela `user_roles` primeiro.

### Erro: "Invalid login credentials"
**Possíveis causas:**
1. Email ou senha incorretos
2. Usuário não confirmou email (se confirmação estiver habilitada)
3. Usuário foi deletado

### Erro: "User already registered"
**Solução:** Email já cadastrado. Tente fazer login ou use "Esqueci minha senha".

### Usuário não recebe role 'user' automaticamente
**Verificar:**
1. Trigger foi criado? (query acima)
2. Função existe? `SELECT * FROM pg_proc WHERE proname = 'handle_new_user_role'`
3. Tabela user_roles existe? `SELECT * FROM user_roles LIMIT 1`

### Redirecionamento não funciona após login
**Verificar:**
1. URLs configuradas em Authentication → URL Configuration
2. `emailRedirectTo` está correto no código
3. Console do navegador para erros

---

## 📊 Estrutura de Fluxo

```
┌─────────────────────────────────────────────────┐
│         USUÁRIO ACESSA / ou /auth               │
└─────────────────────────────────────────────────┘
                     │
                     ▼
             ┌───────────────┐
             │ Está logado?  │
             └───────────────┘
                │        │
            NÃO │        │ SIM
                │        │
                ▼        ▼
        ┌──────────┐  ┌──────────┐
        │  /auth   │  │  /app    │
        │ (Login)  │  │ (Redirect)│
        └──────────┘  └──────────┘
                │
                │ [Cadastro ou Login]
                ▼
    ┌──────────────────────────────┐
    │ Supabase Auth                │
    │ ↓                            │
    │ Trigger: create profile      │
    │ Trigger: add role 'user'     │
    └──────────────────────────────┘
                │
                │ [Auto-login com session]
                ▼
        ┌──────────────────┐
        │   /app           │
        │ (Autenticado)    │
        │                  │
        │ [Menu: Sair]     │
        └──────────────────┘
                │
                │ [Logout]
                ▼
        ┌──────────────────┐
        │  /auth           │
        │ (Desconectado)   │
        └──────────────────┘
```

---

## 🎯 Próximos Passos (Opcionais)

### Funcionalidades Adicionais
- [ ] Recuperação de senha ("Esqueci minha senha")
- [ ] Login com Google OAuth
- [ ] Login com Apple
- [ ] Verificação de email obrigatória
- [ ] Perfil do usuário editável
- [ ] Avatar upload
- [ ] 2FA (Two-Factor Authentication)

### Melhorias de UX
- [ ] Loading states melhores
- [ ] Animações de transição
- [ ] Feedback visual ao digitar
- [ ] Mostrar força da senha
- [ ] Sugestões de senha segura

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do console do navegador
2. Verifique os logs do Supabase Dashboard
3. Revise a documentação oficial: [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
