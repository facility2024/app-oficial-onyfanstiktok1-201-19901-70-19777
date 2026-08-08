# Sincronizar play + áudio no feed (1 clique, sem travar)

## O que está acontecendo hoje (verificado no código)

- O estado já é centralizado no pai (`TikTokApp.tsx`): `isMuted`, `isPlaying` e `currentVideoIndex`. Isso está correto e será mantido.
- O problema real é **conflito duplo no clique**: em `UniversalVideoPlayer.handleUserClick` o toque já chama `attemptPlay()` (dá play) e, na sequência, dispara `onClick` → `VideoPlayer.handleVideoTap` → `onTogglePlay()` no pai, que inverte `isPlaying` e **pausa o vídeo que acabou de tocar**. Resultado: o primeiro clique "empata" e é preciso um segundo clique.
- `handleVideoTap` decide play/pause pelo estado React (`isPlaying` do pai), nunca lê `video.paused` real.
- Não há debounce: `onClick` + eventos de toque no mobile podem disparar duas vezes seguidas.
- O mute efetivo é recalculado dentro do player como `isMuted || (isMobile && !audioUnlocked)`, e o unmute só acontece em um `useEffect` separado do `play()`. Por isso o áudio não entra junto com o vídeo ativo: play e mute rodam em momentos diferentes.

## O que será feito

1. **Função única de ativação** em `UniversalVideoPlayer`: `activateVideo()` que, na mesma chamada, define `video.muted` (a partir do `isMuted` global + desbloqueio de áudio) e executa `play()`. Todo caminho de ativação (observer/`isPlaying`, desbloqueio de áudio, retry) passa a usar essa função — nunca mais mute e play em efeitos separados.
2. **Ao desbloquear o áudio** (primeiro gesto global), o vídeo ativo é re-sincronizado imediatamente: aplica `muted = isMuted` e mantém a reprodução, sem exigir clique no vídeo.
3. **Um único responsável pelo clique**: `UniversalVideoPlayer` deixa de chamar `attemptPlay()` no clique quando o vídeo já está tocando; ele apenas desbloqueia o áudio e repassa o evento. A decisão play/pause fica só no `handleVideoTap`.
4. **Leitura do estado real**: `handleVideoTap` passa a consultar `video.paused` / `video.muted` do elemento antes de decidir, em vez de confiar no estado React.
5. **Debounce de 280ms** no handler de clique do vídeo, preservando a detecção de duplo toque (like) que já existe.

## Fora do escopo (não será tocado)

- Lógica de anúncios / Ad Server, promoções e ofertas patrocinadas.
- Vídeos vindos da API do painel admin, feed, curtidas, comentários e pagamentos.
- Layout, botões CTA e overlays.

## Detalhes técnicos

Arquivos alterados:
- `src/components/tiktok/UniversalVideoPlayer.tsx` — `activateVideo()`, remoção do play duplicado no clique, re-sync no evento de unlock.
- `src/components/tiktok/VideoPlayer.tsx` — `handleVideoTap` com leitura do elemento real (via ref) + debounce.

`TikTokApp.tsx` permanece como fonte única de `isMuted`/`isPlaying`; nenhuma mudança de estado global é necessária.

## Verificação

Teste no preview com Playwright (desktop) confirmando que um clique alterna play/pause sem travar, e checagem manual do comportamento no iOS/Android (autoplay começa mudo por política do navegador e liga o som no primeiro gesto, sem precisar tocar no vídeo).
