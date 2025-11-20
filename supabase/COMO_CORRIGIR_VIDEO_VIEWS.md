# 🔧 Como Corrigir o Erro de Permissão em video_views

## ❌ Problema
O aplicativo está retornando erro 403 (Forbidden) ao tentar registrar visualizações de vídeos:
```
POST /rest/v1/video_views 403 (Forbidden)
permission denied for table video_views
```

## 🎯 Solução - PASSO A PASSO

### ⚠️ IMPORTANTE: VOCÊ DEVE COPIAR O CÓDIGO SQL, NÃO O NOME DO ARQUIVO!

Siga EXATAMENTE estes passos:

**PASSO 1:** Acesse o [Supabase Dashboard](https://supabase.com/dashboard) e selecione o projeto `tnzvhwapfhkhqjgyiomk`

**PASSO 2:** No menu lateral esquerdo, clique em **SQL Editor**

**PASSO 3:** Clique em **New Query** (botão verde)

**PASSO 4:** ABRA o arquivo `supabase/fix_video_views_rls.sql` no seu editor de código (VSCode, etc)

**PASSO 5:** Selecione **TODO O TEXTO** dentro do arquivo (Ctrl+A ou Cmd+A)
```sql
-- O conteúdo começa assim:
-- ============================================================================
-- FIX: RLS policies for video_views table
...
```

**PASSO 6:** Copie o texto selecionado (Ctrl+C ou Cmd+C)

**PASSO 7:** VOLTE ao SQL Editor do Supabase e COLE o código (Ctrl+V ou Cmd+V)

**PASSO 8:** Clique em **RUN** (ou Ctrl+Enter)

**PASSO 9:** Aguarde a mensagem de sucesso: ✅ Políticas de video_views atualizadas com sucesso!

---

### ❌ NÃO FAÇA ISSO:
```sql
fix_video_views_rls.sql  ← ERRADO! Isso é o nome do arquivo, não o código
```

### ✅ FAÇA ISSO:
```sql
-- ============================================================================
-- FIX: RLS policies for video_views table
-- Este script corrige as permissões para permitir tracking anônimo de views
-- ============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
...
← CORRETO! Cole TODO o código SQL do arquivo
```

### Opção 2: Executar via Supabase CLI (Local)

Se você tem o Supabase CLI instalado localmente:

```bash
# No terminal, na raiz do projeto
supabase db reset

# Ou aplicar apenas este arquivo específico
psql -h db.tnzvhwapfhkhqjgyiomk.supabase.co \
     -U postgres \
     -d postgres \
     -f supabase/fix_video_views_rls.sql
```

## Verificação

Após executar o script, teste se o erro foi corrigido:

1. Recarregue a página do aplicativo
2. Navegue pelos vídeos
3. Verifique no console do navegador se não há mais erros 403
4. As visualizações devem ser registradas com sucesso

## O que o Script Faz

1. **Remove todas as políticas antigas conflitantes** da tabela `video_views`
2. **Habilita RLS** na tabela
3. **Cria 2 novas políticas**:
   - `video_views_insert_public`: Permite que QUALQUER usuário (anônimo ou autenticado) registre visualizações
   - `video_views_select_admin`: Apenas admins podem ler dados de analytics
4. **Verifica o resultado** e exibe estatísticas

## Impacto

- ✅ Usuários anônimos poderão registrar visualizações de vídeos
- ✅ Contador de views funcionará corretamente
- ✅ Analytics continuarão protegidos (apenas admins veem)
- ⚠️ Se quiser permitir leitura pública de analytics, comente a política `video_views_select_admin`

## Suporte

Se o erro persistir após executar o script:
1. Verifique se há outras políticas conflitantes usando:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'video_views';
   ```
2. Verifique se a tabela existe:
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name = 'video_views';
   ```
