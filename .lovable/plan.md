

## Plano: Vincular produtos à CocoLoja e exibir lojas SaaS no Marketplace

### Parte 1: Vincular produtos existentes à loja Coconudi Brasil

Todos os `marketplace_products` têm `store_id = NULL`. A loja "Coconudi Brasil" já existe com id `4af1ce85-758a-4389-8c26-8c3cc9827f39`.

**Ação**: Executar UPDATE para setar `store_id` de todos os produtos existentes para a loja Coconudi Brasil.

```sql
UPDATE marketplace_products 
SET store_id = '4af1ce85-758a-4389-8c26-8c3cc9827f39' 
WHERE store_id IS NULL;
```

### Parte 2: Mostrar lojas SaaS no Marketplace

Adicionar uma seção "Lojas" no `MarketplacePage.tsx` que:
- Busca lojas ativas de `marketplace_stores`
- Exibe cards com logo, nome e badge de verificação
- Ao clicar, navega para `/marketplace/loja/:slug` (rota já existente via `StoreProfilePage`)

**Arquivo editado**: `src/pages/MarketplacePage.tsx`
- Novo state `stores` com fetch de `marketplace_stores` ativas
- Nova seção "🏪 LOJAS" renderizada acima dos produtos, com grid de cards de lojas

### Resultado
- Produtos existentes ficam vinculados à CocoLoja
- Novas lojas SaaS aparecem no marketplace público para os usuários navegarem

