# Corrigir flicker e delay dos botões CTA no feed mobile

## Problema

Ao rolar o feed no celular (iOS e Android), o vídeo e o botão CTA piscam ou demoram até 3 segundos para aparecer. Na web funciona normalmente.

## Causa confirmada no código

Em `src/components/tiktok/VideoPlayer.tsx`:

- Quando o item sai do viewport, o player inteiro é substituído por uma `div` preta (`{isInView ? <player/> : <div className="bg-black"/>}`). Ou seja, o `<video>` é **desmontado e remontado** a cada rolagem — é isso que causa o "recarregar" e o atraso.
- O `IntersectionObserver` usa `threshold: [0, 0.01]`, disparando na menor fração de pixel, sem qualquer debounce.
- O botão CTA não tem hint de compositing em GPU, então cada frame de scroll gera repaint visível.

Os atributos `playsinline` / `webkit-playsinline` já são aplicados em `UniversalVideoPlayer` (via `setupVideo`), mas só depois da montagem — serão fixados também como atributos JSX para valerem desde o primeiro frame.

## O que será feito

1. **Manter o `<video>` montado**: remover o fallback de `div` preta. O player permanece renderizado; a visibilidade passa a controlar apenas `play()`/`pause()` e o carregamento (`preload`).
2. **Observer estável**: `threshold: [0, 0.6, 0.75]` com `rootMargin` ajustado, e um estado separado "vídeo ativo" derivado de `intersectionRatio >= 0.6`.
3. **Debounce de 120ms** na transição de ativo/inativo, para absorver os múltiplos disparos típicos do iOS/Android.
4. **CTA em GPU**: aplicar `will-change: opacity, transform` e `transform: translateZ(0)` no container do botão CTA, e remover qualquer aparecimento condicionado à entrada em viewport (o CTA passa a montar junto com o item).
5. **playsInline explícito** no JSX do `<video>` em `UniversalVideoPlayer` (`playsInline`, `webkit-playsinline`, `x5-playsinline`).

## O que NÃO será alterado

- Lógica do feed, ordenação, snapshot de sessão e paginação.
- Ad Server, promoções, ofertas patrocinadas e vídeos vindos do painel externo.
- Curtidas, comentários, views, RLS e qualquer integração de API.
- Tamanho/estilo já aprovado do botão (187x55, ícone 55x55).

## Arquivos tocados

- `src/components/tiktok/VideoPlayer.tsx`
- `src/components/tiktok/UniversalVideoPlayer.tsx`

## Verificação

Simulação de scroll em viewport mobile (iOS Safari e Android) via navegador headless, conferindo que o `<video>` não é recriado entre itens e que o CTA permanece estável durante a rolagem.
