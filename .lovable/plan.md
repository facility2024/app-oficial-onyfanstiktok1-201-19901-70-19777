

## Plano: Redirecionar na mesma aba com retorno automático após pagamento

### Problema atual
O checkout do Asaas abre em **nova aba** (`window.open(..., '_blank')`), e o app navega para `/payment-confirmation`. O usuário paga no Asaas mas fica preso lá — não há retorno automático para o app porque:
1. O Asaas não sabe para onde redirecionar (nenhum `callback.successUrl` foi configurado)
2. O checkout abre em aba separada, então o usuário precisa voltar manualmente

### Solução
Usar o recurso nativo do Asaas de **redirecionamento após pagamento** (`callback.successUrl` + `autoRedirect: true`) e abrir o checkout **na mesma aba**.

### Alterações

**1. Edge Function `supabase/functions/asaas-checkout/index.ts`**
- Receber `successUrl` do frontend no body da requisição
- Ao criar a assinatura, adicionar o campo `callback` com `successUrl` e `autoRedirect: true`
- Também atualizar a primeira cobrança gerada pela assinatura com o mesmo `callback` (via PATCH `/v3/payments/{id}`)

```typescript
// No body da subscription:
subscriptionBody.callback = {
  successUrl: body.successUrl || "https://app-oficial-onyfanstiktok1-201-19901-70-19777.lovable.app/payment-confirmation",
  autoRedirect: true
};
```

**2. Frontend `src/pages/SubscribePage.tsx`**
- Mudar de `window.open(url, '_blank')` para `window.location.href = url` (mesma aba)
- Remover o `navigate('/payment-confirmation')` (o Asaas cuidará do redirect)
- Enviar `successUrl` para a Edge Function usando o domínio publicado

```typescript
// Enviar no body:
successUrl: "https://app-oficial-onyfanstiktok1-201-19901-70-19777.lovable.app/payment-confirmation"

// Redirecionar na mesma aba:
window.location.href = data.checkoutUrl;
```

**3. Página `src/pages/PaymentConfirmation.tsx`**
- Já está funcionando corretamente — verifica o status VIP via polling
- Nenhuma alteração necessária

### Fluxo final
1. Usuário clica "Assinar" → app redireciona para checkout Asaas (mesma aba)
2. Usuário paga (PIX/Cartão) → Asaas redireciona automaticamente para `/payment-confirmation`
3. Tela mostra "Processando..." → webhook ativa VIP → tela mostra "Parabéns, você é VIP!"
4. Usuário clica "Explorar Conteúdo VIP" → volta para `/app`

### Observação importante
O domínio configurado no `successUrl` **deve ser o mesmo domínio cadastrado nos dados comerciais do Asaas**. Confirme que `app-oficial-onyfanstiktok1-201-19901-70-19777.lovable.app` está cadastrado no painel Asaas em "Configurações da conta → Informações".

