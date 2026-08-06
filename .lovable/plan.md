# Diagnóstico do feed + paginação real por cursor

## 1. Como o feed é montado hoje

Tudo acontece em um único arquivo: `src/pages/TikTokApp.tsx`.

### a) O limite de 500 é um LIMIT fixo, não paginação
Na função `initializeFeed()` (linha ~1367) existe uma única consulta:

```text
supabase.from('videos').select('*')
  .eq('is_active', true)
  .or('visibility.eq.public,visibility.is.null')
  .order('created_at', { ascending: false })
  .range(0, 499)          <-- corte fixo: só os 500 mais recentes
```

Essa consulta roda uma vez, na abertura da sessão. O resultado (mais os posts agendados e modelos) é ordenado e guardado em `allAvailableVideos`. Não existe nenhuma outra ida ao banco depois disso.

Consequência: assim que 500 vídeos novos entram, todo o acervo antigo fica permanentemente fora do app. Não é cache nem offset — é um teto rígido.

### b) O "carregar mais" não busca nada no banco
`loadMoreVideos()` (linha ~2161) apenas fatia o array já carregado em blocos de 50 (`VIDEOS_PER_BLOCK`), priorizando não assistidos e, quando acabam, reembaralhando os já assistidos. Ou seja: o scroll infinito hoje é **repetição do mesmo pool de 500**, não paginação.

### c) Como anúncios/ofertas são intercalados
A injeção NÃO está na query nem no estado base. Ela é feita no `useMemo` `displayVideos` (linha ~621), de forma pura:
- pega `adQueue` do hook `useAdServer` (fila exclusiva por usuário, com regra de período do dia);
- calcula `adminInterval` = menor `position_interval` da fila;
- a cada N vídeos reais insere um item sintético `promo-<id>-slot-<i>`, sem reciclar a fila (1 exibição por anúncio por período);
- promo compartilhada por link é prefixada no topo.

Como `displayVideos` é derivado de `videos` por posição, **acrescentar mais vídeos ao final não altera as posições já calculadas** — os anúncios continuam caindo nos mesmos intervalos.

### d) Conteúdo vindo do painel admin
Não é uma API externa: são as tabelas `posts_agendados`, `posts_principais` (limit 50, só de hoje) e `models.posting_panel_url` (fallback que cria registros em `videos`). Tudo é buscado em paralelo no `initializeFeed` e mesclado com os vídeos antes da ordenação por dono (round-robin). Esse merge continua sendo feito só na carga inicial.

## 2. O que proponho mudar

Objetivo: quando o pool local em memória estiver acabando, buscar o **próximo lote no banco** por cursor, em vez de reembaralhar vídeos repetidos.

- Guardar um cursor de `created_at` (o `created_at` mais antigo já carregado) e uma flag `hasMoreFromDb`.
- Reduzir a carga inicial de 500 para 200 (abertura mais rápida) e buscar lotes de 200 sob demanda com `.lt('created_at', cursor)`.
- Em `loadMoreVideos()`: se a quantidade de vídeos ainda não exibidos cair abaixo de um lote, disparar o fetch do próximo lote, aplicar o mesmo filtro de URL válida e o mesmo mapeamento de modelo/criador da carga inicial, e concatenar em `allAvailableVideos`. Só cair no fallback de reembaralhar quando o banco realmente não tiver mais nada (`hasMoreFromDb === false`).
- Manter intactos: `displayVideos` (anúncios), Ad Server, snapshot de sessão, memória de assistidos, round-robin por dono e filtro por gênero.

## 3. Arquivos alterados

- `src/pages/TikTokApp.tsx` — único arquivo. Alterações isoladas em três pontos:
  1. novos estados `feedCursor` / `hasMoreFromDb`;
  2. `initializeFeed`: `range(0,499)` → `range(0,199)` + gravação do cursor;
  3. `loadMoreVideos`: bloco novo de fetch por cursor antes da lógica de fatiamento existente.

Nenhuma migração de banco, nenhuma mudança em Edge Functions, nenhuma alteração nos componentes de anúncio ou no painel admin.

## 4. Como validar

- Console: log do lote (`cursor`, quantidade retornada) a cada busca.
- Rolar além de ~200 vídeos e confirmar que aparecem itens com `created_at` antigo, sem repetição.
- Conferir que os anúncios continuam surgindo no mesmo intervalo configurado.
