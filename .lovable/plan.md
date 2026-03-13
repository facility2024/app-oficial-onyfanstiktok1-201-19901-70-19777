

## Plano: Adicionar campo Wallet ID do Asaas no Admin

### Situação atual
- A integração Asaas está funcional (Edge Functions `asaas-checkout` e `payment-webhook` criadas)
- O webhook já está configurado no painel Asaas
- **Falta**: campo no admin para configurar o Wallet ID do Asaas
- **Falta**: a Edge Function `asaas-checkout` não usa Wallet ID (necessário para split de pagamentos no Asaas)

### O que será feito

**1. Adicionar seção "Integração Asaas" no AdminSettings.tsx**
- Campo de input para o Wallet ID do Asaas
- Salvar no localStorage (mesmo padrão usado para VIP plans)
- Botão "Salvar" com feedback visual

**2. Atualizar a Edge Function `asaas-checkout` para usar o Wallet ID**
- Adicionar secret `ASAAS_WALLET_ID` no projeto
- Incluir o campo `split` na criação de assinaturas, direcionando o pagamento para a carteira configurada (caso o Wallet ID esteja presente)

**3. Arquivos a editar**
- `src/components/admin/AdminSettings.tsx` — nova seção com campo Wallet ID
- `src/hooks/useAdminSettings.tsx` — estado e persistência do Wallet ID
- `supabase/functions/asaas-checkout/index.ts` — usar `ASAAS_WALLET_ID` se configurado

### Observação
O Wallet ID no Asaas é usado para direcionar os recebimentos para uma carteira específica (split). Se você usa apenas uma conta Asaas sem split, o Wallet ID é opcional — os pagamentos já caem na conta principal. Confirme se precisa do split ou se apenas o campo visual no admin já é suficiente.

