

## Plano: Sistema Cocoflix - Catálogo de Vídeos Estilo Netflix

### Visão Geral
Criar uma seção "Cocoflix" dentro do app Coconudi, acessível pelo menu lateral, com interface estilo Netflix. O sistema terá sua própria estrutura de conteúdo premium separada dos vídeos do feed, com categorias, previews, compra via Asaas e área de conteúdo liberado.

### Estrutura do Banco de Dados (3 novas tabelas)

**1. `cocoflix_content`** - Conteúdo das criadoras/modelos
- `id` (uuid, PK)
- `model_id` (uuid, FK → models)
- `creator_id` (uuid, FK → profiles, nullable)
- `title` (text) - nome do pacote/conteúdo
- `description` (text) - descrição do conteúdo
- `preview_video_url` (text) - vídeo de preview curto
- `thumbnail_url` (text) - capa do conteúdo
- `price` (numeric) - valor para liberar acesso
- `category` (text) - categoria (ex: Fitness, Danca, etc.)
- `is_active` (boolean)
- `created_at`, `updated_at`

**2. `cocoflix_videos`** - Vídeos completos dentro de cada conteúdo
- `id` (uuid, PK)
- `content_id` (uuid, FK → cocoflix_content)
- `title` (text)
- `video_url` (text) - URL do vídeo completo
- `thumbnail_url` (text)
- `duration` (text)
- `display_order` (int)
- `is_active` (boolean)
- `created_at`

**3. `cocoflix_purchases`** - Compras dos usuários
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `content_id` (uuid, FK → cocoflix_content)
- `payment_status` (text: pending, confirmed, expired)
- `payment_reference` (text) - referência Asaas
- `price_paid` (numeric)
- `created_at`, `updated_at`
- UNIQUE(user_id, content_id)

**RLS:**
- `cocoflix_content`: leitura pública (ativos), admin gerencia tudo
- `cocoflix_videos`: leitura apenas para quem comprou o content_id correspondente, admin vê tudo
- `cocoflix_purchases`: usuário vê/insere próprias compras, admin vê todas

### Páginas e Componentes Frontend

**1. Página `/cocoflix`** (`src/pages/CocoflixPage.tsx`)
- Layout escuro estilo Netflix
- Header com logo Coconudi + "COCOFLIX"
- Categorias horizontais no topo (filtros)
- Grid de cards por categoria com scroll horizontal
- Cada card mostra: thumbnail, título do conteúdo, nome da modelo, preço
- Aba "Meus Vídeos" para conteúdo já comprado

**2. Página `/cocoflix/:contentId`** (`src/pages/CocoflixContentPage.tsx`)
- Player de preview do vídeo (curto)
- Descrição, nome da modelo, preço
- Botão "Comprar Acesso - R$ X,XX"
- Se já comprou: lista de todos os vídeos da modelo nesse pacote

**3. Componentes:**
- `CocoflixCategoryRow.tsx` - linha horizontal de cards por categoria
- `CocoflixCard.tsx` - card individual do conteúdo
- `CocoflixPlayer.tsx` - player de vídeo completo (pós-compra)

### Fluxo de Compra
1. Usuário clica em "Comprar" no conteúdo
2. Redireciona para `/checkout` com parâmetros do Cocoflix (reutiliza Edge Function `process-payment` do Asaas)
3. Webhook confirma pagamento → insere em `cocoflix_purchases`
4. Conteúdo aparece na aba "Meus Vídeos"

### Menu Lateral
- Adicionar item "Cocoflix" no `CategoryMenu.tsx` com ícone de filme/TV

### Admin
- Nova aba no painel admin para gerenciar conteúdo Cocoflix (cadastrar conteúdo, vídeos, ver compras)

### Arquivos a criar/editar
| Ação | Arquivo |
|------|---------|
| Criar | `src/pages/CocoflixPage.tsx` |
| Criar | `src/pages/CocoflixContentPage.tsx` |
| Criar | `src/components/cocoflix/CocoflixCategoryRow.tsx` |
| Criar | `src/components/cocoflix/CocoflixCard.tsx` |
| Criar | `src/components/cocoflix/CocoflixPlayer.tsx` |
| Criar | `src/components/admin/AdminCocoflix.tsx` |
| Editar | `src/components/tiktok/CategoryMenu.tsx` (add menu item) |
| Editar | `src/App.tsx` (add rotas /cocoflix e /cocoflix/:contentId) |
| Editar | `src/components/AdminDashboard.tsx` (add aba Cocoflix) |
| Migration | 3 tabelas + RLS + índices |

