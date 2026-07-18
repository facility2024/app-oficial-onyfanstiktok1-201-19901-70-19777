## Objetivo
Criar sistema de "Páginas de Acesso" por produto: quando o comprador clicar num produto liberado em `/meus-acessos`, abre dentro do app uma página com os vídeos daquela oferta. Tudo gerenciado por painel admin.

## Banco de dados (migration)

**`access_pages`** — uma página por produto
- `id uuid pk`, `product_id uuid fk products` (unique), `slug text unique`
- `title text`, `description text`, `cover_url text`
- `is_published boolean default false`
- `created_at`, `updated_at`

**`access_page_videos`** — cards de vídeo dentro da página
- `id uuid pk`, `page_id uuid fk access_pages on delete cascade`
- `title text`, `description text`, `thumbnail_url text`, `video_url text`
- `sort_order int default 0`, `is_active boolean default true`
- `created_at`

RLS:
- SELECT público em `access_pages` e `access_page_videos` **apenas** onde `is_published=true` / `is_active=true` (a verificação de entitlement é feita na página do app, não na policy — assim admin edita livre e página exibe apenas se publicada).
- ALL para admin (`has_role admin`).
- GRANTs: `anon`+`authenticated` SELECT; `authenticated` ALL condicionado por policy; `service_role` ALL.

## Painel Admin

Novo item no menu admin: **"Páginas de Acesso"** → `src/pages/admin/AdminAccessPages.tsx`

Lista todas as páginas com: produto vinculado, título, status (publicada/rascunho), nº de vídeos, ações (editar/excluir/publicar).

**Editor** (`AdminAccessPageEditor.tsx`, aberto em modal ou rota `/admin/access-pages/:id`):
- Selecionar produto (dropdown de `products` ativos que ainda não têm página, ou o próprio na edição).
- Campos: título, descrição, capa (upload no bucket `checkout-media` já existente), slug (auto do produto).
- Lista de cards de vídeo com: título, descrição, thumbnail (upload), URL do vídeo (Bunny), reordenar (drag ou setas), ativar/desativar, excluir.
- Botão **"Salvar e Publicar"** (seta `is_published=true`) e **"Salvar rascunho"**.

## Fluxo do usuário

1. `MyAccessPanel.tsx` — botão **"Acessar"** de um produto liberado passa a navegar para `/acesso-produto/:productId` (interno, sem link externo).
2. Nova rota + página `src/pages/ProductAccessPage.tsx`:
   - Valida que o usuário/whatsapp tem entitlement daquele `product_id` (via `useUserEntitlements`).
   - Se não tiver → redireciona para `/meus-acessos` com toast.
   - Se tiver → carrega `access_pages` do produto + `access_page_videos` publicados.
   - Renderiza header (capa/título/descrição) e grid de cards de vídeo no mesmo estilo da imagem de referência.
   - Clique num card abre player inline (modal com `<video>` HTML5, sem sair do app).
   - Botão **"Voltar ao app"** no topo → `navigate('/app')`.

## Rotas (App.tsx)
- `/acesso-produto/:productId` — pública dentro do app, mas com guard de entitlement por dentro.
- `/admin/access-pages` e `/admin/access-pages/:id` — dentro de `AdminRoute`.

## Ligação com pagamento
Nada muda no webhook: `products.access_key` + `user_entitlements` já existem. A nova página só lê o entitlement para liberar. Escalável: cada produto novo criado no admin ganha uma página nova sem tocar em código.

## Arquivos a criar/alterar
- Migration nova (tabelas + RLS + GRANTs + realtime opcional).
- `src/pages/admin/AdminAccessPages.tsx` (lista) e `AdminAccessPageEditor.tsx` (editor).
- Adicionar entrada no menu do `AdminDashboard.tsx`.
- `src/pages/ProductAccessPage.tsx` (visualização pelo comprador).
- `src/components/MyAccessPanel.tsx` — trocar `onClick` do botão Acessar.
- `src/App.tsx` — registrar 3 rotas novas.

Confirma com **"produzir"** que aplico tudo.
