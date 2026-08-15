# Plano: Otimização de Retenção e Rotação do Feed

Este plano estabelece a estratégia para garantir que o feed permaneça dinâmico e sem repetições em um ciclo de 24 horas, baseando-se no inventário atual de 305 vídeos (112 Criadoras e 193 Modelos).

## Análise Técnica
O sistema já utiliza a RPC `get_main_feed_queue` integrada à tabela `feed_history`. Esta lógica garante que vídeos visualizados entrem em "quarentena" (cooldown) para o usuário específico por 24 horas.

## Ações Recomendadas

### 1. Ajuste de Volume e Mix
Para um funcionamento ideal sem repetições perceptíveis:
- **Volume Atual (305 vídeos):** Suficiente para ~30-40 minutos de scroll contínuo sem repetições para um usuário médio.
- **Meta Recomendada:** Expandir para **500 vídeos ativos** totais. Isso aumenta a margem de segurança para usuários "heavy users" (que consomem muito conteúdo diariamente).
- **Proporção:** Manter o equilíbrio de ~40% Criadoras e ~60% Modelos.

### 2. Monitoramento de Cooldown
- Validar se a limpeza da `feed_history` está ocorrendo via trigger/cron ou se a consulta da RPC está filtrando corretamente pelo timestamp de 24h.
- A quantidade de **305 vídeos** é o limite seguro atual; se um usuário vir 305 vídeos em um dia, ele começará a ver repetições ou o feed ficará vazio se o filtro for estrito.

## Detalhes Técnicos
- **Localização da Lógica:** `src/hooks/useMainFeedQueue.tsx` e a função Postgres `get_main_feed_queue`.
- **Estratégia de Memória:** Documentado em `mem://features/feed/distribution-strategy-2026` para consultas futuras.
