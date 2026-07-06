## Objetivo

Adicionar liberação automática de conteúdo após pagamento PIX aprovado, com dois tipos de acesso: **link do produto principal (vídeos)** e **link do Order Bump (oferta extra)**, ambos gerenciados pelo painel admin.

## Regras de liberação

Na tela de confirmação (`PaymentConfirmation.tsx`), após o pagamento ser aprovado:

- **Comprou só o produto principal** → aparece **1 botão**: "Clique aqui para acessar seus vídeos"
- **Comprou principal + Order Bump(s)** → aparecem **2 botões**:
  1. "Meu acesso aos vídeos" (link principal)
  2. "Acesso à minha oferta" (link do bump comprado)

## Mudanças no banco

1. Nova coluna em `checkout_order_bumps`:
   - `link_acesso` (text) — URL liberada quando o usuário compra aquele bump.
2. Nova entrada em `admin_settings`:
   - `key = 'checkout_main_access_link'` → URL do produto principal (vídeos).

## Mudanças no Admin

**`AdminCheckoutOrderBumps.tsx`**
- Adicionar campo "Link de acesso liberado" no editor de cada bump (input URL).

**Novo bloco no admin (dentro do mesmo componente ou em `AdminSettings`)**
- Campo "Link de acesso — Produto principal (vídeos)" salvando em `admin_settings.checkout_main_access_link`.

## Mudanças no Checkout

**`PixCheckoutModal.tsx`**
- Ao gerar o PIX, salvar em `sessionStorage`:
  - `purchased_main_link` (link principal)
  - `purchased_bump_links` (array com os links dos bumps selecionados)

## Mudanças na Confirmação

**`PaymentConfirmation.tsx`**
- Quando `status === 'CONFIRMED'`, ler do `sessionStorage` os links salvos e renderizar:
  - Sempre: botão "🎬 Meu acesso aos vídeos" → abre `purchased_main_link`
  - Se `purchased_bump_links.length > 0`: botão(ões) "🎁 Acesso à minha oferta" → abre cada link
- Limpar `sessionStorage` após exibir.

## Arquivos afetados

- `supabase/migrations/*` (nova migration — coluna + setting)
- `src/components/admin/AdminCheckoutOrderBumps.tsx`
- `src/components/PixCheckoutModal.tsx`
- `src/pages/PaymentConfirmation.tsx`

Aguardo o comando **"produzir"** para aplicar.