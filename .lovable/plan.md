

## Marketplace SaaS - Transformação em Plataforma Multi-Lojista

### Visão Geral

Transformar o marketplace atual (single-seller) em uma plataforma SaaS multi-lojista onde:
- Produtos existentes ficam na loja "CocoLoja" (loja oficial do Coconudi)
- Lojistas podem se cadastrar, criar sua loja e vender produtos
- Comissão: 30% para o site, 70% para o lojista
- Cada lojista tem um dashboard próprio para gerenciar sua loja

### Database (Migrations)

**1. Tabela `marketplace_stores` (lojas dos lojistas)**
- `id` UUID PK
- `owner_id` UUID references profiles(id) — dono da loja
- `name` TEXT — nome da loja
- `slug` TEXT UNIQUE — URL amigável (ex: /marketplace/loja/minha-loja)
- `description` TEXT
- `logo_url` TEXT
- `banner_url` TEXT
- `is_active` BOOLEAN default false (aprovação manual pelo admin)
- `is_verified` BOOLEAN default false
- `commission_rate` NUMERIC default 0.30 (30%)
- `total_sales` NUMERIC default 0
- `total_revenue` NUMERIC default 0
- `created_at`, `updated_at` TIMESTAMPTZ

**2. Alterar `marketplace_products` — adicionar coluna `store_id`**
- `store_id` UUID references marketplace_stores(id) NULLABLE
- Produtos com `store_id = NULL` pertencem à CocoLoja (loja oficial)
- Produtos com `store_id` preenchido pertencem ao lojista

**3. Tabela `store_payouts` (controle de pagamentos aos lojistas)**
- `id` UUID PK
- `store_id` UUID references marketplace_stores(id)
- `order_id` UUID references marketplace_orders(id)
- `total_amount` NUMERIC — valor total da venda
- `platform_fee` NUMERIC — 30%
- `store_amount` NUMERIC — 70%
- `status` TEXT default 'pending' (pending, paid, cancelled)
- `paid_at` TIMESTAMPTZ
- `created_at` TIMESTAMPTZ

**4. RLS Policies**
- Lojistas só podem ver/editar produtos da sua própria loja
- Lojistas só podem ver payouts da sua loja
- Público pode ver lojas e produtos ativos
- Admin pode ver tudo

**5. Role `shopkeeper`** — adicionar ao enum `app_role`

### Frontend — Novas Páginas e Componentes

**Step 1: Página de cadastro de loja (`/marketplace/criar-loja`)**
- Formulário: nome da loja, slug, descrição, logo, banner
- Usuário precisa estar logado (ProtectedRoute)
- Ao criar, o user recebe a role `shopkeeper`
- Loja começa inativa (aguardando aprovação admin)

**Step 2: Dashboard do Lojista (`/minha-loja`)**
- Rota protegida — só para usuários com role `shopkeeper`
- Tabs: Produtos, Pedidos, Financeiro, Configurações
- **Produtos**: CRUD completo (nome, preço, imagem, vídeo, categoria, estoque)
- **Pedidos**: lista de pedidos recebidos com status
- **Financeiro**: resumo de vendas, comissão 30%, valor líquido 70%, histórico de payouts
- **Configurações**: editar nome, logo, banner, descrição da loja

**Step 3: Atualizar MarketplacePage**
- Mostrar produtos de todas as lojas ativas (incluindo CocoLoja)
- Cada produto mostra badge com o nome da loja
- Filtro por loja
- Página de perfil da loja (`/marketplace/loja/:slug`) com todos os produtos daquela loja

**Step 4: Admin — Gestão de Lojas**
- Nova aba no AdminDashboard: "Lojas"
- Aprovar/rejeitar lojas pendentes
- Ver todas as lojas, desativar lojistas
- Ver relatório de comissões

**Step 5: Atualizar rotas no App.tsx**
- `/marketplace/criar-loja` — CreateStorePage
- `/minha-loja` — ShopkeeperDashboard (ProtectedRoute)
- `/marketplace/loja/:slug` — StoreProfilePage

### Technical Details

- A coluna `store_id` em `marketplace_products` será nullable — produtos existentes (NULL) são da CocoLoja
- Comissão configurável por loja via `commission_rate` (default 30%)
- Payouts são calculados automaticamente quando um pedido é concluído
- O slug da loja é gerado a partir do nome, com validação de unicidade
- Arquivos envolvidos: ~8 novos arquivos (pages + components), ~4 editados (MarketplacePage, AdminDashboard, AdminNavigation, App.tsx)
- Migration SQL com ~5 statements (create tables, alter table, RLS policies, role enum)

