

## Corrigir erro de UUID "unknown" no TikTokApp.tsx

### Problema
Quando um vídeo não tem `user` associado, o sistema usa `defaultUser` com `id: 'unknown'`. Esse valor é passado para `checkIfFollowing()` e `registerView()` (via `trackView`), que tentam inserir/consultar no Supabase com `model_id = 'unknown'`, causando erro `invalid input syntax for type uuid`.

### Correções

**Arquivo: `src/pages/TikTokApp.tsx`**

1. **Linha ~861**: Adicionar validação antes de chamar `checkIfFollowing` — só chamar se `currentVideo.user.id` for um UUID válido (não `'unknown'`)

2. **Linha ~437 (defaultUser)**: Manter `'unknown'` como fallback (necessário para renderização), mas proteger nos pontos de chamada ao Supabase

3. **Na função `checkIfFollowing` (linha ~1931)**: Adicionar guard no início para retornar imediatamente se `modelId` for `'unknown'` ou não for UUID válido

4. **Na função `registerView` (linhas ~790-856)**: Adicionar guard para não passar `model_id = 'unknown'` ao `trackView` — passar `undefined` se o model_id não for UUID válido

**Arquivo: `src/hooks/useAppAnalytics.tsx`**

5. **Linha ~49**: Adicionar validação antes de setar `analyticsData.model_id` — ignorar se `modelId` for `'unknown'` ou não for UUID válido

### Validação UUID
Usar uma função helper simples:
```typescript
const isValidUUID = (id: string) => 
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
```

### Resultado
Os erros `invalid input syntax for type uuid: "unknown"` deixarão de aparecer no console, sem afetar o funcionamento do feed.

