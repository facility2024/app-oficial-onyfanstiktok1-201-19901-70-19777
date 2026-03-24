

## Correcao: Criar Conta de Autenticacao ao Aprovar Criador

### Problema Identificado
Quando um modelo/criador e aprovado pelo painel admin, o sistema apenas adiciona a role "creator" na tabela `user_roles` e atualiza o status da aplicacao. Porem, se o modelo foi cadastrado por um sistema externo (como o painel marketing.coconudi.com), ele **nao possui uma conta no Supabase Auth** -- por isso ao tentar fazer login, recebe "Email ou senha incorretos".

### Solucao
Criar uma **Edge Function** chamada `approve-creator` que sera chamada pelo painel admin ao aprovar uma aplicacao. Essa funcao ira:

1. Verificar se o email ja tem conta no `auth.users`
2. Se NAO tiver, criar a conta usando `supabase.auth.admin.createUser()` com uma senha temporaria
3. Adicionar a role `creator` na tabela `user_roles`
4. Atualizar o status da aplicacao para `approved`
5. Retornar os dados incluindo a senha temporaria para o admin enviar ao modelo

### Etapas de Implementacao

**1. Criar Edge Function `approve-creator`**
- Arquivo: `supabase/functions/approve-creator/index.ts`
- Usa o `SUPABASE_SERVICE_ROLE_KEY` (ja configurado) para criar usuarios via Admin API
- Recebe: `application_id`, `admin_user_id`
- Gera senha aleatoria segura
- Cria usuario no auth.users (se nao existir)
- Adiciona role creator
- Atualiza application status
- Retorna email + senha temporaria

**2. Atualizar `AdminCreatorApplications.tsx`**
- Modificar `handleApprove()` para chamar a Edge Function em vez de fazer insert direto
- Apos aprovacao bem-sucedida, mostrar um modal com as credenciais (email + senha) para o admin copiar e enviar ao modelo
- Adicionar botao de copiar credenciais e enviar via WhatsApp

**3. Configurar `supabase/config.toml`**
- Adicionar configuracao da nova Edge Function com `verify_jwt = false` (validacao manual no codigo)

### Detalhes Tecnicos

```text
Fluxo de Aprovacao:
  Admin clica "Aprovar"
       |
       v
  Edge Function "approve-creator"
       |
       +-- Busca dados da aplicacao (email, nome)
       |
       +-- Verifica se email existe em auth.users
       |      |
       |      +-- SIM: Apenas adiciona role "creator"
       |      |
       |      +-- NAO: Cria conta com senha temporaria
       |              e adiciona role "creator"
       |
       +-- Atualiza status da aplicacao
       |
       v
  Retorna credenciais ao admin
       |
       v
  Modal com email + senha + botao WhatsApp
```

### Arquivos a Criar/Modificar
- **Criar**: `supabase/functions/approve-creator/index.ts`
- **Modificar**: `src/components/admin/AdminCreatorApplications.tsx`
- **Modificar**: `supabase/config.toml`

### Seguranca
- A Edge Function valida que o chamador e admin verificando o JWT
- Senha temporaria gerada com caracteres alfanumericos (12 chars)
- O `SUPABASE_SERVICE_ROLE_KEY` ja esta configurado nos secrets

