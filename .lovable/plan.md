# Sistema de Bonificação por Indicação (Cocons)

Vou entregar em **5 partes independentes**. Cada parte só será implementada após você responder **"produzir parte X"**. Assim tudo flui sem quebrar nada do que já existe.

---

## PARTE 1 — Banco de Dados (fundação)

Criar/ajustar tabelas via migration:

- **`referral_program_config`** (singleton, admin): `cocon_value_brl`, `cocons_per_referral`, `bonus_percentage`, `program_active`, `neon_official_link`.
- **`referrals`** (ajustar): garantir campos `status` (`pending` | `approved` | `cancelled`), `cocons_awarded`, `approved_at`, `cancelled_at`, `approved_by`.
- **`referral_link_clicks`**: rastreia cada acesso ao link (`referrer_id`, `ip`, `user_agent`, `created_at`).
- **`referrer_payout_info`**: dados de recebimento do indicador (`user_id`, `pix_key`, `pix_type`, `neon_id`, `full_name`, `cpf`).
- **`profiles`**: flag `is_referrer_only` (cadastro só para divulgar).

RLS: indicador vê o próprio; admin vê tudo; insert de clicks é público (anon).
Trigger: ao criar `profiles.referred_by`, cria `referrals` com `status='pending'` (não credita ainda — aprovação manual pelo admin, conforme requisito).

---

## PARTE 2 — Painel Admin do Programa

Nova aba em `/admin` → **"Programa de Indicação"**:

- Configurações: valor do Cocon, Cocons por indicação, %, ativar/desativar programa, link oficial Neon.
- Lista de indicadores: nome, total indicados, aprovados, Cocons, valor R$, dados PIX/Neon.
- Lista de indicações: indicador, indicado, data, status, botões **Aprovar / Cancelar**.
- Ao aprovar: credita `cocons_per_referral` na `user_wallets` do indicador usando o valor vigente.

---

## PARTE 3 — Página Pública de Cadastro do Indicador

- Rota **`/indicador/cadastro`** (também aceita `?ref=CODIGO`).
- Formulário simplificado: nome, email, senha, WhatsApp.
- Marca `is_referrer_only = true` e gera `referral_code` único.
- Redireciona para `/indicador` (área do membro).

---

## PARTE 4 — Área do Indicador

Rota **`/indicador`** (protegida):

- Link exclusivo + botão copiar + share (WhatsApp, Telegram, X, nativo).
- Cards: links compartilhados, cadastros recebidos, aprovados, Cocons, saldo R$.
- Tabela: nome do indicado, data, status (Pendente/Aprovada).
- Seção **Dados de Recebimento**: PIX, ID Neon, CPF, nome.
- Banner com link oficial Neon (vindo da config admin).

---

## PARTE 5 — Rastreamento e Vinculação Automática

- Middleware em `/auth` e `/indicador/cadastro`: detecta `?ref=`, grava em `referral_link_clicks`, salva em `localStorage` (`pending_referral`).
- Ao concluir cadastro: vincula `profiles.referred_by = referrer_id` → trigger cria `referrals` pending.
- Contador de "links compartilhados" incrementado no clique de share.
- Desativar demais fluxos de bônus (missões, gamification credit) mantendo código, apenas com flag `program_active` do admin cortando novos créditos que não sejam de indicação.

---

## Detalhes técnicos

- Cálculo do saldo é **snapshot no momento da aprovação** (`cocons_awarded` gravado na `referrals`), mas o **display do valor R$** usa sempre `cocon_value_brl` atual — atende o exemplo da regra (100 Cocons × novo valor).
- Reutiliza `user_wallets`, `wallet_transactions`, `useReferralSystem`, `useNudixWallet` existentes.
- Nenhuma alteração no feed, vídeos, VIP ou marketplace.

---

Responda **"produzir parte 1"** para eu começar pela migration do banco.
