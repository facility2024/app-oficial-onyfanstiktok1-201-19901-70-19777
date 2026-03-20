

# Plano: Checkout Transparente com Asaas (Cartão de Crédito)

## Resumo

Substituir o fluxo atual (que redireciona para página externa do Asaas) por um **checkout transparente** onde o usuário preenche os dados do cartão diretamente na plataforma. O pagamento é processado via Edge Function server-side, sem expor a API Key.

## O que muda

Atualmente: usuário clica no plano → Edge Function `asaas-checkout` cria cobrança → abre URL externa do Asaas em nova aba → volta e faz polling.

**Novo fluxo**: usuário clica no plano → formulário interno com CPF, endereço (auto-complete via ViaCEP), dados do cartão → Edge Function `process-payment` cria customer + subscription no Asaas com dados do cartão → polling do status → popup de sucesso → redireciona para home.

---

## Etapas de Implementação

### 1. Adicionar secret `ASAAS_BASE_URL`
- Já existe `ASAAS_API_KEY`. Falta `ASAAS_BASE_URL` para alternar entre sandbox/produção.

### 2. Criar tabela `payments` (migração SQL)
```sql
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'mensal',
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  asaas_payment_id text,
  asaas_subscription_id text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
-- Usuário vê só os seus
CREATE POLICY "users_select_own_payments" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid());
-- Admin vê tudo
CREATE POLICY "admins_all_payments" ON public.payments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'));
-- Service role para edge functions
CREATE POLICY "service_all_payments" ON public.payments FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### 3. Adicionar campos de billing à tabela `profiles` (migração SQL)
Adicionar colunas: `cpf`, `billing_name`, `cep`, `endereco`, `numero`, `complemento`, `bairro`, `cidade`, `estado`, `asaas_customer_id`.

### 4. Criar Edge Function `process-payment`
- **Input**: CPF, nome faturamento, endereço completo, dados do cartão (number, holderName, expiryMonth, expiryYear, ccv), plan_type
- **Fluxo**:
  1. Valida JWT e extrai userId
  2. Sanitiza inputs (CPF só dígitos, cartão sem espaços)
  3. Busca/cria customer no Asaas com endereço
  4. Cria subscription `CREDIT_CARD` com `cycle: MONTHLY` e dados do `creditCard` + `creditCardHolderInfo`
  5. Salva na tabela `payments`
  6. Atualiza `profiles` com `asaas_customer_id` e dados de billing
  7. Retorna `{ success, subscriptionId, status }`
  8. **Rollback**: se falhar após criar cobrança, tenta cancelar no Asaas
- Dados do cartão nunca são armazenados, apenas enviados ao Asaas

### 5. Criar Edge Function `check-payment-status`
- Recebe `subscription_id` ou `payment_id`
- Consulta Asaas e retorna status mapeado: `APPROVED`, `PENDING`, `REJECTED`

### 6. Refatorar página `SubscribePage.tsx`
Ao clicar no plano mensal, em vez de chamar `asaas-checkout` e abrir URL externa:
- Navegar para nova rota `/checkout`

### 7. Criar página `CheckoutPage.tsx` (nova rota `/checkout`)
Formulário completo com:
- **Seção 1 - Dados Pessoais**: CPF (máscara + validação dígitos verificadores), nome completo
- **Seção 2 - Endereço**: CEP (auto-complete via ViaCEP fetch), logradouro, número, complemento, bairro, cidade, estado
- **Seção 3 - Cartão**: nome no cartão, número (máscara + validação Luhn), validade MM/AA, CVV
- **Resumo do plano**: nome, valor R$19,90/mês
- Botão "Finalizar Pagamento" → chama `process-payment` → mostra loading → polling via `check-payment-status` a cada 2s por até 60s
- Se aprovado: popup de sucesso (Dialog com animação) → redireciona para `/app`
- Se rejeitado: mensagem de erro, permite tentar novamente
- Todas as mensagens em português

### 8. Atualizar `config.toml`
```toml
[functions.process-payment]
verify_jwt = false

[functions.check-payment-status]
verify_jwt = false
```

### 9. Atualizar rotas no `App.tsx`
Adicionar rota `/checkout` protegida (usuário precisa estar logado).

---

## Segurança
- JWT validado em código nas edge functions
- Dados do cartão nunca armazenados no banco
- CPF e telefone sanitizados (apenas dígitos)
- Logs mascarados (últimos 4 dígitos do cartão apenas)
- RLS em `payments` e `profiles`
- Rollback automático se falhar após criar cobrança

## Compatibilidade
- O webhook `payment-webhook` existente continua funcionando para confirmar pagamentos via evento do Asaas
- A tabela `payment_transactions` existente é mantida; a nova `payments` é usada pelo checkout transparente

