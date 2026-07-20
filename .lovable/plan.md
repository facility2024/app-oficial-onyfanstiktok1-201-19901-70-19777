# Vincular Template PIX aos Cards da Garotas Top

## Objetivo
Permitir escolher, no editor de cada card da página **Garotas Top 10**, um **Template de Checkout PIX** (dos que já são gerados no painel de Checkout Templates) para ser usado no botão "Assinar via PIX". Incluir botão **"Aplicar este template em todos os cards"** para preencher em massa.

## Caminho no Admin (onde o editor mora)
- Painel Admin → menu lateral → **"Garotas Top 10"** (`AdminAdsGarotasTop`)
- É onde você já cadastra nome, imagem, vídeo, valor e ordem de cada card.
- Os **Templates PIX** são criados em: Painel Admin → **"Checkout Templates"** (`AdminCheckoutTemplates`) — cada um gera um link `/checkout/<slug>` e tem valor próprio.

## Mudanças

### 1. Banco de Dados
- Adicionar coluna `checkout_template_id` (uuid, opcional) em `ads_garotas_top`, `ads_latinas` e `ads_novidades` — mesma lógica nos três modais.
- Referência solta para `checkout_templates(id)` com `ON DELETE SET NULL`.

### 2. Editor Admin (`AdminAdsGarotasTop`, `AdminAdsLatinas`, `AdminAdsNovidades`)
- Novo campo por card: **"Template PIX vinculado"** (select com busca dos templates ativos).
- Bloco de ações em massa acima da lista:
  - Select "Escolha o template PIX"
  - Botão **"Aplicar em todos os cards"** — atualiza `checkout_template_id` de todos os cards da tabela.
  - Botão **"Limpar template de todos"** — zera o vínculo.

### 3. Modal do Feed (`AdsGarotasTopModal`, `AdsLatinasModal`, `AdsNovidasModal`)
Ao clicar em "Assinar via PIX":
- Se o card tem `checkout_template_id` → resolver o `slug` do template e **navegar para `/checkout/<slug>`** (usa o valor, order bumps e mídia do template).
- Se **não tem** → mantém o comportamento atual (abre `PixCheckoutModal` interno com `valor` do card ou preço fallback).

## Regras de Prioridade (do botão do card)
1. `checkout_template_id` do card → checkout template completo (recomendado).
2. `valor` do card → PIX interno com esse valor.
3. Preço padrão da categoria (`useCheckoutPrice`) → PIX interno com esse valor.

## Detalhes Técnicos
- Migration: `ALTER TABLE ads_garotas_top ADD COLUMN checkout_template_id uuid REFERENCES checkout_templates(id) ON DELETE SET NULL;` (idem nas outras duas).
- No editor: reaproveitar padrão de select já usado em `AdminCheckoutOrderBumps` (fetch de `checkout_templates` where `ativo=true`).
- Ação em massa: `UPDATE ads_garotas_top SET checkout_template_id = $1` (sem `WHERE`, pois é a tabela toda).
- Modal: buscar `slug` do template com `.select('slug, ativo').eq('id', card.checkout_template_id).maybeSingle()` e `navigate(/checkout/${slug})`.
