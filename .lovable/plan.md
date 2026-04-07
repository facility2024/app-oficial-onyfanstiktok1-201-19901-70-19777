

## Plano: Trocar a logo na navbar para a nova logo Coconudi

### Problema
A logo atual usada na navbar (e em todo o app) é `coconudi-logo-new.png`. O usuário quer substituí-la pela nova logo rainbow "C" enviada em anexo.

### Solução

1. **Copiar a nova logo** para `src/assets/coconudi-logo-new.png`, substituindo a atual. Isso atualiza automaticamente todos os ~15 arquivos que importam essa logo (navbar do TikTokApp, AdminHeader, Auth, MarketplacePage, etc.)

### Arquivos impactados (sem edição necessária)
Todos já importam `coconudi-logo-new.png`, então a substituição do arquivo resolve tudo:
- `src/pages/TikTokApp.tsx` (navbar principal)
- `src/components/admin/AdminHeader.tsx` (navbar admin)
- `src/pages/Auth.tsx`, `MarketplacePage.tsx`, `UserProfile.tsx`, etc.

### Resultado
A nova logo rainbow "C" aparecerá em todas as navbars e telas que usam a logo do Coconudi.

