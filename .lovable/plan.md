

## Plano: Integração Asaas para Assinatura VIP

### Resumo

Substituir o fluxo atual (abrir link Hoopay em nova aba) por um checkout via API do Asaas. Quando o usuário clicar em "Assinar VIP Mensal" (R$ 19,90), o sistema criará um checkout do Asaas via Edge Function e redirecionará o usuário. Após pagamento, o Asaas envia webhook que ativa o VIP no banco de dados.

### Arquitetura

```text
Usuário clica "Assinar VIP"
        │
        ▼
SubscribePage.tsx → chama Edge Function "asaas-checkout"
        │
        ▼
Edge Function cria checkout via POST /v3/checkouts
  (usando ASAAS_API_KEY do secrets)
        │
        ▼
Retorna URL do checkout → redireciona usuário
        │
        ▼
Usuário paga no checkout Asaas
        │
        ▼
Asaas envia webhook → Edge Function "payment-webhook" (já existe)
  detecta status "PAYMENT_RECEIVED" / "PAYMENT_CONFIRMED"
        │
        ▼
Ativa VIP na tabela premium_users (fluxo já funciona)
```

### Etapas de implementação

**1. Configurar secret da API Key do Asaas**
- Adicionar `ASAAS_API_KEY` nos secrets do projeto (chave de API obtida no painel Asaas)
- Você precisará informar se vai usar sandbox (`api-sandbox.asaas.com`) ou produção (`api.asaas.com`)

**2. Criar Edge Function `asaas-checkout`**
- Recebe: email do usuário, nome, telefone, plano (mensal)
- Primeiro cria/busca o customer no Asaas via `POST /v3/customers`
- Depois cria um checkout via `POST /v3/checkouts` com:
  - `billingTypes`: ["CREDIT_CARD", "PIX"]
  - `chargeTypes`: ["RECURRENT"]
  - `subscription`: `{ cycle: "MONTHLY", nextDueDate: hoje }` 
  - `value`: 19.90
  - `callback.successUrl`: URL da sua app (ex: `/payment-confirmation`)
  - `externalReference`: user ID para rastreamento
- Retorna a URL do checkout para o frontend
- Registrar `verify_jwt = false` no `config.toml`

**3. Atualizar `SubscribePage.tsx`**
- Ao clicar em "Assinar", chamar a Edge Function `asaas-checkout` via `supabase.functions.invoke()`
- Receber a URL do checkout e abrir em nova aba (ou redirecionar)
- Manter o fluxo de verificação de pagamento existente (PaymentVerificationIndicator)

**4. Atualizar Edge Function `payment-webhook` existente**
- Adicionar suporte ao formato de webhook do Asaas:
  - Evento: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`
  - Campos: `payment.customer`, `payment.subscription`, `payment.value`
  - Extrair email, nome e telefone do payload do Asaas
- O resto do fluxo (ativar VIP em `premium_users`) já funciona

**5. Configurar Wallet ID no Admin**
- Adicionar campo "Asaas Wallet ID" nas configurações do admin (`AdminSettings.tsx`) para ser salvo e usado na Edge Function

**6. Configurar webhook no painel Asaas**
- URL: `https://tnzvhwapfhkhqjgyiomk.supabase.co/functions/v1/payment-webhook`
- Eventos: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`

### Pré-requisitos do usuário
- Conta no Asaas (sandbox ou produção)
- Chave de API do Asaas
- Wallet ID (disponível no painel Asaas)

