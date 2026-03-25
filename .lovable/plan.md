

## Adicionar "Lojas SaaS" ao menu lateral do Admin

### Problema
O item "Lojas SaaS" (`stores`) existe na navegação horizontal (`AdminNavigation.tsx`) mas **não foi adicionado** ao `AdminSidebar.tsx` no grupo "Negócios".

### Solução
Adicionar `{ id: 'stores', label: 'Lojas SaaS', icon: Store }` ao grupo "Negócios" no `AdminSidebar.tsx`, logo após o item "Nossa Loja".

### Arquivo alterado
- `src/components/admin/AdminSidebar.tsx` — inserir uma linha no array `items` do grupo "Negócios"

