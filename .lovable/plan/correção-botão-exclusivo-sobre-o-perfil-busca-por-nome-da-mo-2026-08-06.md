# Correção: botão "Exclusivo" sobre o perfil + busca por nome da modelo

## 1. Botão do feed aparecendo por cima da tela de perfil

O botão CTA ("Exclusivo") do feed é renderizado com camada `z-60`, enquanto a tela de perfil abre com camada `z-50`. Por isso o botão continua visível flutuando sobre o perfil (imagem enviada).

Correção: elevar a camada do container da tela de perfil para ficar acima do CTA do feed, mantendo-a abaixo dos modais internos (que usam camada 9999). Nada mais do perfil ou do feed é alterado.

## 2. Busca não encontra modelos pelo nome exibido no feed (ex.: oriental_lexis)

Verificado no banco: a modelo `oriental_lexis` existe, está ativa e tem 3 vídeos ativos. O problema está na busca do app:

- A busca carrega a lista de `videos` (apenas `model_id`) para saber quais modelos têm vídeo e filtrar as vazias.
- Essa consulta traz no máximo 1000 linhas (limite padrão), mas existem 2855 vídeos de modelos.
- Resultado: centenas de modelos ficam de fora da lista "tem vídeo" e desaparecem da busca, mesmo digitando o nome exato.

Correção: buscar a lista de modelos com vídeo de forma paginada (blocos de 1000 até acabar), garantindo o conjunto completo antes de filtrar. O mesmo cuidado será aplicado à lista de criadoras (`videos.creator_id`), que sofre do mesmo limite.

Complemento: para criadoras, o campo `username` hoje é preenchido com o nome de exibição; será incluído também o `username` real do perfil quando existir, para que a busca por @usuário funcione igual à das modelos.

## Detalhes técnicos

- `src/components/tiktok/ProfileScreen.tsx`: container raiz `fixed inset-0 z-50` → `z-[80]`.
- `src/components/tiktok/SearchModal.tsx` (`loadModels`):
  - substituir as consultas únicas de `videos` (model_id e creator_id) por leitura paginada com `.range(offset, offset+999)` em laço até retornar menos de 1000 linhas;
  - incluir `username` no `select` de `profiles` e usá-lo no campo `username` das criadoras (fallback para o nome atual).
- Sem mudanças em RLS, feed, engajamento ou qualquer lógica recente.
