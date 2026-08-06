# Correção Global da Pesquisa de Perfis

## Diagnóstico confirmado

Consultei o banco e o código antes de propor a correção:

- `@itsniaxo` existe em duas tabelas: `models` (id `56698bc0…`, nome "Estefania") e `profiles` (id `2ebf0d4a…`, nome "Estefania").
- Ela possui 3 vídeos ativos vinculados como modelo.
- O painel Engajamento carrega apenas os **500 vídeos mais recentes** (existem **2.900 vídeos ativos**). Os 3 vídeos dela ficam fora dessa fatia — por isso "0 item(ns) exibido(s) de 680 carregado(s)".
- Além disso, o filtro do painel é feito **em memória** e compara apenas: título do vídeo, nome do dono ("Estefania") e ID. O **username** (`itsniaxo`) não é comparado e o "@" não é removido da busca. Ou seja, mesmo com o vídeo carregado, buscar `@itsniaxo` não retornaria nada.

Nenhuma regra de curtidas, visualizações, pagamentos, créditos, planos ou agendamentos está envolvida nesse defeito — ele está inteiramente na camada de pesquisa.

## O que será feito

### 1. Serviço único de pesquisa de perfis

Criar `src/services/profileSearch.ts` com `searchProfiles(query, options)`:

- Normaliza o termo: remove `@`, espaços extras, ignora maiúsculas/minúsculas e acentos.
- Consulta **no servidor** (não em memória) as tabelas de perfis já existentes do projeto: `models` e `profiles`/`public_profiles`, usando `ilike` em `name` e `username`, mais correspondência por ID (completo ou prefixo).
- Deduplica perfis que aparecem nas duas tabelas (mesmo username), mantendo a origem (Modelo / Criadora).
- Ordena: correspondência exata de username → começa com o termo → mais recente → alfabética.
- Limite padrão de resultados (ex.: 30) com paginação opcional.
- Nenhuma tabela nova, nenhuma migração de dados, nenhuma alteração de RLS.

### 2. Painel Engajamento — Curtidas e Visualizações

- A busca passa a usar `searchProfiles()` em vez do filtro em memória sobre 500 vídeos.
- Ao digitar (com debounce de ~300ms), o painel mostra os perfis encontrados; ao selecionar um perfil, ele carrega **os vídeos daquele perfil** (consulta direta por `model_id`/`creator_id`) e os exibe na lista para aplicar curtidas/visualizações base.
- A lista padrão (sem busca) continua exatamente como está hoje.
- A lógica de aplicar/agendar base de curtidas, visualizações e seguidores **não é tocada**.

### 3. Busca do Feed (lupa)

- `SearchModal.tsx` passa a usar o mesmo `searchProfiles()` para a parte de perfis, no lugar da carga completa de `models` + filtro local.
- A busca de vídeos por título/ID e o comportamento de abrir o vídeo/perfil no feed permanecem como estão.

### 4. Demais painéis com seletor de perfil

Depois que o serviço estiver validado nesses dois pontos, os demais seletores de modelo/criadora do admin (agendador de vídeos, chat, promoções, etc.) podem migrar para o mesmo serviço em uma etapa seguinte, sem alterar o que cada painel faz com o perfil escolhido.

## Detalhes técnicos

- Arquivo novo: `src/services/profileSearch.ts` (única fonte de verdade da busca de perfis).
- Arquivos alterados: `src/components/admin/AdminEngagement.tsx` (apenas a camada de busca/carregamento por perfil) e `src/components/tiktok/SearchModal.tsx` (apenas a busca de perfis).
- Consultas usam `ilike` com limite e debounce; sem varreduras de milhares de linhas no cliente.
- Índices: se as consultas se mostrarem lentas, avaliar índices `pg_trgm` em `models.username/name` e `profiles.username/name` numa migração separada — não incluída nesta etapa.
- Sem mudanças em RLS, permissões, edge functions, gateway de pagamento, créditos, planos, pedidos, logs ou automações.

## Validação

Após implementar, testar: `@itsniaxo`, `itsniaxo`, `nia`, `its`, `Estefania`, `Estefa` e o ID do perfil — no painel Engajamento e na lupa do Feed. Confirmar que aplicar curtidas/visualizações base no perfil encontrado continua funcionando normalmente.
