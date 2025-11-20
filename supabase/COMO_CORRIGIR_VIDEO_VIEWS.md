# Como Corrigir o Erro de Permissão em video_views

## Problema
O aplicativo está retornando erro 403 (Forbidden) ao tentar registrar visualizações de vídeos:
```
POST /rest/v1/video_views 403 (Forbidden)
permission denied for table video_views
```

## Causa
As políticas RLS (Row Level Security) da tabela `video_views` não permitem inserções públicas/anônimas.

## Solução

### Opção 1: Executar via Supabase Dashboard (RECOMENDADO)

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto: `tnzvhwapfhkhqjgyiomk`
3. Vá em **SQL Editor** (menu lateral esquerdo)
4. Clique em **New Query**
5. **IMPORTANTE**: Abra o arquivo `supabase/fix_video_views_rls.sql` no seu editor de código
6. **Copie TODO o conteúdo SQL** do arquivo (todas as linhas, de 1 a 82)
7. **Cole** no SQL Editor do Supabase Dashboard
8. Clique em **Run** (ou pressione Ctrl+Enter)
9. Verifique se a mensagem de sucesso aparece: ✅ Políticas de video_views atualizadas com sucesso!

**⚠️ ATENÇÃO**: NÃO digite "supabase/fix_video_views_rls.sql" no SQL Editor. Você precisa copiar o CONTEÚDO interno do arquivo!

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
