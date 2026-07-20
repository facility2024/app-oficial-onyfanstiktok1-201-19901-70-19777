# Correção da atualização global do valor PIX

## Diagnóstico confirmado
- O template ativo `/checkout/p` está salvo em `checkout_templates.amount` com **R$ 5,00**.
- Todos os cards estão vinculados a esse template, porém alguns ainda mantêm `valor` antigo (**R$ 14,90/R$ 14,97**) e os demais têm `valor` vazio.
- A ação atual **Aplicar em todos os cards** atualiza apenas `checkout_template_id`; ela não copia o novo `amount` para o campo `valor` dos cards.
- A página principal exibe o preço de `admin_settings.checkout_prices`, mas esse registro não existe; por isso ela cai no valor fixo padrão de **R$ 14,97**.
- O checkout por slug já consulta `checkout_templates` e gera o PIX usando `template.amount`, portanto a correção deve alinhar as demais fontes com esse valor.

## Implementação
1. Ajustar **Aplicar em todos os cards** para buscar o `amount` atual do template selecionado e atualizar, na mesma ação, `checkout_template_id` e `valor` em todos os cards da categoria.
2. Ao aplicar o template globalmente, persistir também o preço padrão da categoria em `admin_settings.checkout_prices`, preservando os preços das outras categorias.
3. Validar erros e a quantidade de linhas atualizadas antes de informar sucesso; atualizar imediatamente a lista de cards e templates no painel.
4. Ajustar a leitura do preço da página para receber a atualização imediatamente, sem depender do fallback fixo ou de estado antigo.
5. Manter o checkout por slug usando exclusivamente o valor atual de `checkout_templates.amount`, garantindo que o mesmo valor seja enviado à geração do PIX.

## Escopo preservado
- Nenhuma alteração visual.
- Nenhuma mudança no fluxo de pagamento, produtos, order bumps ou liberação de acesso.
- Alterações restritas à sincronização e leitura dos valores PIX.