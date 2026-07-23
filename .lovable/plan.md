# Plano — Algoritmo Inteligente do Feed Principal

## Escopo
Aplicar a nova lógica APENAS no Feed Principal (`src/pages/TikTokApp.tsx` + hooks de feed). Nada relacionado a: `useFeedPromotions`, `AdminFeedPromotions`, ads (`ads_*`), promoções, checkout, VIP, banners, produtos, `AdsGarotasTop*`. Esses módulos permanecem exatamente como estão — a lógica nova não toca em nenhuma tabela `ads_*`, `feed_promotions`, `offers`, `promo_ads`.

## Arquitetura proposta (modular, não-destrutiva)

### 1. Novas tabelas (migration)
```
feed_history        (user_id, video_id, shown_at, times_shown)  PK(user_id, video_id)
feed_cursor         (user_id PK, current_position int, queue jsonb, last_update)
```
Índices:
- `feed_history(user_id, shown_at DESC)`
- `feed_history(user_id, video_id)` (via PK)

RLS: usuário só lê/escreve o próprio registro; `service_role` full.

### 2. Nova função RPC `get_main_feed_queue(p_user_id, p_size)`
SECURITY DEFINER. Retorna uma fila de ~50 vídeos aplicando:
- Exclui vídeos em cooldown 24h (`feed_history.shown_at > now() - 24h`)
- Compõe 4 buckets por percentuais configuráveis (default 20/30/30/20):
  - **Novos** (created_at > now()-24h)
  - **Nunca vistos** (não existe em `feed_history` do user)
  - **Populares** (score = likes*1 + views*0.1 + comments*2)
  - **Antigos** (created_at < now()-30d)
- Filtra `is_active=true` e `visibility public/null`
- Retorna já embaralhado com regra "sem 2 consecutivos da mesma modelo"

Percentuais lidos de `admin_settings` (chave `feed_algorithm_ratios`) com fallback default → fácil de ajustar sem deploy.

### 3. Novo hook `useMainFeedQueue.tsx` (arquivo novo, não substitui os antigos)
- Carrega fila inicial via RPC
- Mantém fila em memória (state) + persiste em `feed_cursor`
- Ao restar ≤10 itens: prefetch de +50 via RPC (append, nunca reset)
- A cada 20 vídeos assistidos: chama RPC leve `get_fresh_videos_since(last_check)` e injeta no FIM da fila
- Registra visualização em `feed_history` (upsert incrementando `times_shown`) — debounced/batched

### 4. Integração em `TikTokApp.tsx`
- Substituir a fonte atual dos vídeos "orgânicos" pelo `useMainFeedQueue`
- **Manter intacta** a injeção de promos/ads existente (mesma função de composição `displayVideos`)
- Manter Session Snapshot já existente para promos

### 5. Prioridade "Novo" 24h + Modelo Nova 24h
- Vídeo com `created_at > now()-24h` entra no bucket "Novos" com peso extra
- Modelo com `models.created_at > now()-24h` recebe boost adicional
- Após 24h, cai naturalmente para rotação normal

### 6. Intercalar modelos
Pós-processamento no RPC: algoritmo guloso que garante `modelo[i] != modelo[i-1]` (reordena mantendo ordem relativa quando possível).

## Performance
- 1 RPC por batch de 50 (não N queries)
- Insert em `feed_history` batchado no client (buffer + flush a cada 5 views ou 10s)
- Índices cobrindo as buscas
- Sem loops N+1; sem consultas por render

## Arquivos afetados
**Novos:**
- Migration (2 tabelas + RPC + índices + RLS)
- `src/hooks/useMainFeedQueue.tsx`

**Editados (mínimo cirúrgico):**
- `src/pages/TikTokApp.tsx` — trocar fonte da lista orgânica; preservar promos/ads/snapshot
- `src/components/admin/` — pequeno painel opcional para ajustar percentuais (pode ficar para depois)

**NÃO tocar:**
- `useFeedPromotions`, `useSmartAdRotation`, `useAdsGarotasRealtime`
- `useIntelligentFeed`, `useSmartFeed`, `useHybridFeed` (ficam disponíveis; o novo hook não os remove)
- Qualquer componente de checkout, VIP, produtos, ofertas, banners

## Validação pós-implementação
1. Confirmar que promos ainda aparecem na cadência atual
2. Verificar via SQL que `feed_history` cresce e cooldown está sendo respeitado
3. F5 não repete os últimos 50 vídeos
4. Rolagem infinita não reinicia
5. Distribuição: nenhuma modelo aparece 2x consecutivas em amostra de 200

## Entrega faseada
- **Fase 1:** migration (tabelas + RPC + índices)
- **Fase 2:** hook novo + integração em TikTokApp
- **Fase 3:** painel admin para ratios (opcional)

Aguardando **"produzir"** para começar pela Fase 1 (migration).
