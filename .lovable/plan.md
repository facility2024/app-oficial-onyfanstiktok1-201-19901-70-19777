
# Plano: Marketplace Inteligente + "Cocoa Live" Branding

## Resumo

Reestruturar o Marketplace para que conteudos aparecam exclusivamente dentro das abas de genero, e a tela inicial exiba apenas itens marcados como "PRODUTOS EM ALTA". Adicionar toggle no Creator Studio para essa marcacao. Substituir "Music" por "Cocoa" no branding Live.

---

## Parte 1: Branding "Cocoa Live"

Substituir qualquer referencia a "Music" por "Cocoa" nos componentes relacionados a Live. Manter nome "Live", cores vermelhas e todos os efeitos visuais (pulsing, vibrating) ja implementados.

**Arquivos afetados:**
- Busca global por "Music" nos componentes Live/tiktok para substituir por "Cocoa"

---

## Parte 2: Banco de Dados - Campo `is_featured`

Adicionar coluna `is_featured` (boolean, default false) na tabela `videos` via migration SQL.

```text
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_videos_is_featured ON public.videos (is_featured) WHERE is_featured = true;
```

Isso permite que criadoras marquem seus videos como "PRODUTOS EM ALTA".

---

## Parte 3: Creator Studio - Toggle "Produtos em Alta"

**Arquivo:** `src/pages/CreatorStudio.tsx`

No formulario de upload, adicionar um novo toggle abaixo da selecao de visibilidade:

```text
[ ] Marcar como PRODUTOS EM ALTA
```

- Novo campo `is_featured` no `formData` (boolean, default false)
- Ao publicar, enviar `is_featured` junto com os outros dados do video
- Icone de fogo/estrela para destaque visual

**Arquivo:** `src/components/creator/VideoManagementTable.tsx`

- Adicionar badge "Em Alta" nos videos marcados
- Adicionar botao para alternar `is_featured` em videos ja publicados

**Arquivo:** `src/hooks/useCreatorVideos.tsx`

- Adicionar funcao `toggleVideoFeatured` para alternar o campo `is_featured`

---

## Parte 4: Marketplace - Logica de Exibicao

**Arquivo:** `src/pages/MarketplacePage.tsx`

Reestruturar a logica de exibicao:

1. **Tela inicial (home):** Buscar videos onde `is_featured = true` e exibir na secao "PRODUTOS EM ALTA"
2. **Abas de genero:** Ao clicar num genero, buscar videos com `.contains('genres', [genre])` - isso ja funciona
3. **Remover:** A listagem de `marketplace_products` da tela principal (ou mover para aba propria)

Fluxo de dados:
```text
Tela Home Marketplace:
  - TOP 10 MODELOS (carousel - mantido)
  - Banner Promocional (mantido)
  - CATEGORIAS - GENERO (botoes - mantido)
  - PRODUTOS EM ALTA = videos WHERE is_featured = true
  
Ao clicar num genero:
  - Exibe videos WHERE genres @> [genero_selecionado]
  - Nao mistura com a home
```

Mudancas especificas:
- Nova query `fetchFeaturedVideos` que busca `videos` com `is_featured = true`
- A secao "PRODUTOS EM ALTA" exibe apenas esses videos destacados
- Videos de genero continuam aparecendo apenas ao clicar na aba

---

## Parte 5: Botao "Voltar" nos Generos

Quando um genero esta selecionado, exibir botao "Voltar" claro para retornar a tela principal do Marketplace, limpando a selecao de genero.

---

## Secao Tecnica - Detalhes de Implementacao

### Migration SQL
```text
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
```

### Query para Home do Marketplace
```text
supabase.from('videos')
  .select('*, models(name, profile_image_url), profiles:creator_id(username, avatar_url)')
  .eq('is_active', true)
  .eq('is_featured', true)
  .order('created_at', { ascending: false })
  .limit(20)
```

### Toggle no Creator Studio (formData)
```text
formData.is_featured: boolean (default: false)
```

### Toggle na Tabela de Videos (VideoManagementTable)
Novo botao "Em Alta" / "Remover Destaque" por video, chamando:
```text
supabase.from('videos').update({ is_featured: !current }).eq('id', videoId)
```

### Arquivos modificados
1. `src/pages/CreatorStudio.tsx` - toggle no upload
2. `src/components/creator/VideoManagementTable.tsx` - badge + botao toggle
3. `src/hooks/useCreatorVideos.tsx` - funcao toggleVideoFeatured
4. `src/pages/MarketplacePage.tsx` - logica de exibicao reestruturada
5. Migration SQL para `is_featured`
