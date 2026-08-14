# Correções: exclusão de vídeo, clique na busca e métricas base no Dashboard

Três correções independentes, aplicadas em blocos separados, sem tocar em feed pro, ads ou checkout.

## 1. Exclusão de vídeo continua aparecendo no feed

O feed não é alimentado só pela tabela `videos`. Ele monta a lista a partir de três fontes: `videos`, `posts_agendados` (status "publicado") e `posts_principais`. Excluir o registro em `videos` não remove o post espelhado dessas outras duas listas — o item continua no feed com player sem fonte válida.

O que será feito:
- Centralizar a exclusão numa função única no banco que, na mesma transação, remove o vídeo e tudo que o referencia: posts agendados/principais que apontam para a mesma URL ou modelo, curtidas, comentários, compartilhamentos, histórico de visualização, favoritos, itens da fila de feed/promos e registros de anúncio.
- Antes de apagar, descontar os contadores agregados para os totais não ficarem inflados.
- Marcar o vídeo como excluído (soft delete com data) e só então remover fisicamente, para haver rastro em caso de erro.
- Aplicar o filtro "não excluído" em todas as leituras do feed, busca, perfil e recomendações.
- Limpar o snapshot da sessão no app, para o vídeo sumir na hora e não só quando o usuário reabre o app.

Aceite: excluir no painel remove o vídeo imediatamente do feed, da busca e do perfil, sem espaço em branco nem player quebrado.

## 2. Clique no resultado da busca não abre o vídeo

Hoje o clique procura o vídeo apenas dentro da lista já carregada na tela. Se ele não estiver nessa lista, cai num fallback pelo dono do perfil ou mostra "vídeo não encontrado". Como o feed carrega em blocos, a maioria dos resultados de busca simplesmente não está carregada no momento do clique.

O que será feito:
- Ao clicar num resultado de vídeo: se ele não estiver na lista atual, buscar o registro no banco, inserir no início da sequência exibida e abrir direto nele.
- Ao clicar num resultado de perfil: abrir o perfil com a lista de vídeos dele, como já é esperado.
- Casar o identificador do resultado de busca com o identificador usado pelo feed (inclusive nos itens clonados/duplicados do feed), evitando abrir outro vídeo.
- Não retornar nos resultados vídeos inativos ou excluídos (depende do item 1).

Aceite: buscar por nome, @usuário ou ID e clicar sempre abre o conteúdo certo.

## 3. Dashboard ignora as métricas base do painel de Engajamento

Os cards do Dashboard somam apenas os números orgânicos (contagem das tabelas de curtidas, visualizações, seguidores). O valor base aplicado na tela de Engajamento não entra nessa conta, então o app mostra um número e o admin mostra outro.

O que será feito:
- Passar a somar `base + real` nos cards: Total de Curtidas, Views Totais, Seguidores e nas estatísticas de criadores.
- Views Hoje: somar a base só quando ela foi aplicada (ou agendada e executada) na data de hoje, para não inflar o dia errado.
- Reagendamento/edição de base recalcula o total, sem resíduo do valor anterior.
- Gráficos que dependem desses totais passam a usar a mesma fórmula.

Aceite: aplicar curtidas/visualizações base numa modelo reflete no Dashboard, somado ao orgânico, e bate com o número exibido no app.

## Detalhes técnicos

- Banco: função `SECURITY DEFINER` `delete_video_cascade(video_id)` com as remoções em transação; colunas `deleted_at`/`status` em `public.videos`; base já existe em `base_likes`/`base_views`/`base_followers`.
- Frontend exclusão: pontos de exclusão do admin passam a chamar a RPC; `useVideosRealtimeSync` já propaga o DELETE para o feed aberto — será estendido para também remover o item espelhado de posts agendados/principais.
- Busca: `goToVideoById` em `TikTokApp.tsx` ganha fallback com fetch pontual e injeção no início de `displayVideos`; normalização de ID via `_originalId` sem o sufixo de clone.
- Dashboard: `useRealTimeStats.tsx` passa a agregar `SUM(base_likes)`, `SUM(base_views)` de `videos` + `feed_promotions` e `SUM(base_followers)` de `models`; Views Hoje filtra a base por data de aplicação em `engagement_schedules`.
