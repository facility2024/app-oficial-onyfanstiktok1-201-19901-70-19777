

## Diagnóstico: Vídeos do Criador com Erro

### Problemas Encontrados

1. **Vídeos duplicados**: O criador `ac36042c-0097-4c69-afa0-cc65c1a4a915` tem 20 vídeos ativos, mas muitos são duplicatas (7x `01.mp4`, 7x `03.mp4`). Isso causa o mesmo vídeo aparecendo repetidamente no feed, e se algum deles tiver problema de URL/codificação, mostra o erro.

2. **URL inválida de teste**: Existe um vídeo com `video_url: https://example.com/test.mp4` que obviamente não funciona e causa o erro mostrado no screenshot.

3. **URLs com nomes muito longos**: Alguns vídeos do Bunny CDN têm nomes de arquivo extremamente longos (hashes), que podem ter problemas de codificação ou o arquivo pode não existir mais no CDN.

### Plano de Correção

**1. Limpar dados no banco (SQL)**
- Remover o vídeo de teste (`example.com/test.mp4`)
- Remover vídeos duplicados (manter apenas 1 de cada URL por criador)

**2. Melhorar o filtro no feed (`TikTokApp.tsx`)**
- Adicionar deduplicação de vídeos por `video_url` ao processar o feed, para que mesmo se houver duplicatas no banco, o feed não mostre repetidos
- Filtrar URLs obviamente inválidas como `example.com`

### Detalhes Técnicos

**SQL para limpeza:**
```sql
-- Remover vídeo de teste
DELETE FROM videos WHERE video_url = 'https://example.com/test.mp4';

-- Remover duplicatas (manter apenas o mais antigo de cada URL por creator)
DELETE FROM videos WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY creator_id, video_url ORDER BY created_at ASC) as rn
    FROM videos WHERE creator_id IS NOT NULL
  ) t WHERE rn > 1
);
```

**Arquivo editado:** `src/pages/TikTokApp.tsx`
- Após normalizar URLs (~linha 1295), adicionar deduplicação por `video_url` antes de mapear os vídeos
- Filtrar URLs com domínios conhecidamente inválidos (`example.com`, etc.)

