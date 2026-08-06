# Gestão de Curtidas e Visualizações no Admin

Painel para definir números iniciais (base) de curtidas e visualizações de qualquer vídeo do app, com aplicação imediata ou agendada. O número exibido passa a ser **base + real**, então continua somando de verdade conforme as pessoas curtem e assistem.

## Regras confirmadas

- Visualização real: 1 por vídeo por usuário a cada 24h (padrão de mercado, evita inflar).
- Nada muda em posicionamento de anúncios, feed pro, ofertas ou integração com a API externa do admin. Só somamos campos e contadores em cima do que já existe.

## O que será construído

### 1. Campos base no banco

- `videos`: novas colunas `base_likes` e `base_views` (default 0).
- `feed_promotions`: mesmas colunas, para que promos/anúncios também tenham controle.
- Os contadores reais atuais (`likes_count`, `views_count`, sincronizados por gatilho) continuam intocados.

### 2. Exibição no app

O feed, perfil e cards passam a mostrar `base + real`. Alteração pontual de apresentação: nenhuma regra de negócio de curtida/visualização muda.

### 3. Registro de visualização com deduplicação 24h

Função no banco que registra a view somente se aquele usuário (ou dispositivo, quando anônimo) ainda não viu o vídeo nas últimas 24h. O contador real cresce de forma orgânica.

### 4. Nova aba "Engajamento" no Admin

- Busca de vídeo por título/criadora (mesmo padrão de autocomplete já usado nos outros painéis, limite 10 resultados).
- Também lista promos do feed, para aplicar nos anúncios.
- Campos: curtidas base e visualizações base.
- Mostra lado a lado: base, real e total exibido.
- Ações: **Aplicar agora** ou **Agendar**.
- Seleção múltipla de vídeos para aplicar o mesmo valor em lote.

### 5. Agendamento

- Nova tabela de agendamentos guardando: vídeo (ou promo), curtidas base, visualizações base, data e hora de aplicação, status (pendente / aplicado / cancelado).
- Um processador roda periodicamente e aplica os valores na data/hora escolhida.
- Na aba Engajamento: lista de agendamentos pendentes com opção de editar ou cancelar antes da execução.

## Detalhes técnicos

- Migrações: colunas `base_likes` / `base_views` em `public.videos` e `public.feed_promotions`; tabela `public.engagement_schedules` com GRANTs e RLS (somente admin via `has_role`); função `SECURITY DEFINER` para aplicar agendamentos; agendamento via `pg_cron` chamando a função a cada minuto.
- Frontend: novo componente `src/components/admin/AdminEngagement.tsx`, registrado em `AdminDashboard.tsx` e `AdminSidebar.tsx` com a aba `engagement`.
- Exibição: soma `base_* + *_count` nos pontos de leitura já existentes (`TikTokApp.tsx` e componentes de card/perfil), sem tocar na lógica de feed, ads ou snapshot de sessão.
- Dedup de views: RPC `register_video_view` com checagem de 24h em `video_views` por `video_id` + usuário/dispositivo.
- UI do admin no padrão de alto contraste já adotado.
