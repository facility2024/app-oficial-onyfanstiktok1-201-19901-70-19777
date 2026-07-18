## Reestruturação: Páginas de Acesso em formato "Área de Membros"

### Objetivo
Transformar a página de acesso (produto + oferta) num modelo de **cards estilo área de membros**: cada card tem um título e agrupa vários vídeos. Cadastro em lote (várias URLs de uma vez). Ao clicar num card, abre uma tela dedicada com os vídeos daquele card.

---

### 1. Banco de dados (migration)

**Nova tabela `access_page_cards`**
- `page_id` (FK access_pages)
- `title`, `description`, `cover_url`
- `sort_order`, `is_active`, `is_published`

**Alterar `access_page_videos`**
- Adicionar coluna `card_id` (FK access_page_cards, nullable)
- Vídeos existentes ficam sem card (compatível)

RLS: leitura pública quando `is_published=true`, escrita apenas admin.

---

### 2. Admin — `AdminAccessPages.tsx`

Novo editor por página:

```
[Página: Acesso Coconudi]
 ├─ + Novo card
 ├─ Card #1: "Módulo 1 - Boas-vindas"    [editar título/capa] [publicar] [🗑]
 │   ├─ Vídeos (3)
 │   ├─ [+ Adicionar em lote]  ← cola várias URLs Bunny, cria todos
 │   └─ lista com título/thumb/URL editáveis + reordenar
 ├─ Card #2: "Módulo 2 - Avançado"
 └─ ...
```

- Botão **"Adicionar em lote"**: textarea multi-linha → cria N vídeos no card.
- Salvar/publicar por card (independente).

---

### 3. Comprador — `ProductAccessPage.tsx`

Vira **grid de cards** (estilo Hotmart/Netflix):

```
[Capa do produto + descrição]

Módulos disponíveis:
 ┌────────┐ ┌────────┐ ┌────────┐
 │ Card 1 │ │ Card 2 │ │ Card 3 │
 │ 3 vids │ │ 5 vids │ │ 2 vids │
 └────────┘ └────────┘ └────────┘
```

Clicar → nova rota `/acesso-produto/:productId/card/:cardId` que mostra a lista de vídeos daquele card (grid vertical 9:16 com player modal, igual hoje).

---

### 4. Mesma lógica na **página de oferta (order bump / pix)**

O painel/rota que hoje entrega conteúdo pós-compra do bump PIX passa a usar o mesmo componente de cards. Como cada bump já aponta para um `product.access_key`, a página `/acesso-produto/:productId` cobre os dois casos automaticamente — nada muda no checkout, apenas o layout de entrega.

---

### 5. Arquivos afetados

- `supabase/migrations/*` (nova tabela + coluna)
- `src/components/admin/AdminAccessPages.tsx` (refatorar para cards + bulk)
- `src/pages/ProductAccessPage.tsx` (grid de cards)
- `src/pages/ProductAccessCardPage.tsx` (novo — vídeos de um card)
- `src/App.tsx` (nova rota `/acesso-produto/:productId/card/:cardId`)

---

Confirme com **"produzir"** para eu aplicar migration + código.
