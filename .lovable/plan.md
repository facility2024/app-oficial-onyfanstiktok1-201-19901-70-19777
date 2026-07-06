
# Plano: Order Bump no Checkout PIX

## Objetivo
Adicionar uma seção de "ofertas adicionais" (order bump) no `PixCheckoutModal`, gerenciada pelo Admin. Ao marcar um item extra, o valor do PIX é recalculado automaticamente (soma do valor base + itens marcados) antes de gerar o QR Code.

## O que muda

### 1. Banco de dados (nova tabela `checkout_order_bumps`)
Migration com:
- `id` (uuid, pk)
- `titulo` (text) — ex: "Pacote Extra de Fotos"
- `descricao` (text, opcional)
- `valor` (numeric) — valor adicional em R$
- `imagem_url` (text, opcional)
- `ativo` (boolean, default true)
- `ordem` (int, default 0)
- `created_at`, `updated_at`

GRANTs: `SELECT` para `anon` + `authenticated` (leitura pública no checkout); `ALL` para `service_role`.
RLS: leitura pública quando `ativo=true`; escrita apenas para `admin` via `has_role`.

### 2. Painel Admin (novo componente)
`src/components/admin/AdminCheckoutOrderBumps.tsx`:
- Listar todos os bumps
- Criar / editar / excluir (título, descrição, valor R$, imagem opcional, ativo, ordem)
- Mesmo estilo visual dos outros admins (alto contraste)

Integrar no menu do Admin (adicionar aba/entrada onde ficam as outras configs de checkout).

### 3. Checkout (`PixCheckoutModal.tsx`)
- Buscar `checkout_order_bumps` onde `ativo=true`, ordenado por `ordem`
- Renderizar cada bump como um card com checkbox (estilo neon/roxo já existente, casando com o header do timer)
- Estado local `selectedBumps: string[]`
- `finalAmount = amount + sum(bumps.filter(selected).valor)`
- Substituir todos os usos de `amount` (exibição do valor, geração do PIX, texto do botão) por `finalAmount`
- Mostrar breakdown: "Produto: R$ X + Extras: R$ Y = **Total: R$ Z**"

### 4. Preservação
- Não altera lógica de cronômetro, cores, imagem CDN, fluxo Asaas/NeonPay, coleta de dados, rodapé.
- Não altera o campo `valor` já criado por card (segue sendo o valor base).

## Arquivos afetados
- `supabase/migrations/<nova>.sql` (nova tabela + RLS + GRANTs)
- `src/components/admin/AdminCheckoutOrderBumps.tsx` (novo)
- Registro do novo componente no dashboard admin existente
- `src/components/PixCheckoutModal.tsx` (fetch + UI dos bumps + soma)

## Fora do escopo
- Rastrear quais bumps foram comprados (pode ser adicionado depois na tabela `pix_payments` como coluna `bumps_selecionados jsonb`, se quiser).
- Order bump condicional por produto (nesta v1 é global; se quiser por card, viramos escopo).

Confirma que posso executar? Ou quer que os bumps sejam **por card** (cada produto tem seus próprios bumps) em vez de globais?
