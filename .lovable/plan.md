
## Objetivo
Adicionar um botão central de gravação (Play/●) na barra inferior do app (`TikTokApp.tsx`), **visível apenas para criadores aprovados** (role `creator`), que abre a câmera do celular, grava vídeo de até **20s**, permite pré-visualizar, salvar/publicar e enviar para o **Bunny.net** usando exatamente o mesmo fluxo já existente no Creator Studio (Edge Function `bunny-video-upload` → TUS upload).

## O que NÃO será alterado
- Nada do feed, VideoPlayer, likes, comentários, VIP, checkout, promoções.
- Nada do fluxo atual de upload do Creator Studio (será reutilizado, não duplicado).
- Barra inferior mantém os 4 itens atuais (Início, Explorar, Explorar, Perfil); o botão central será **inserido no meio**, sem remover nada — vira 5 itens como no exemplo.
- Usuário comum **nunca** vê o botão (`useUserRoles` → `isCreator`).

## Mudanças

### 1. Novo componente `src/components/creator/QuickRecordModal.tsx`
Modal full-screen com:
- `getUserMedia({ video: { facingMode }, audio: true })` — suporta Android + iOS Safari (usa `playsInline`, `muted` no preview).
- Botão para alternar câmera **frontal ⇄ traseira** (`facingMode: 'user' | 'environment'`).
- `MediaRecorder` gravando em `video/mp4` (fallback `video/webm;codecs=vp9,opus` para Android).
- Timer visual 0-20s com **parada automática aos 20s**.
- Após parar: pré-visualização do blob + botões **Regravar** e **Publicar**.
- Campo opcional de título (default `Gravado em <data>`).
- No **Publicar**: chama a edge function existente `bunny-video-upload` (action `create`) → recebe `videoGuid` + assinatura TUS → faz upload TUS do blob para `https://video.bunncdn.com/tusupload` (mesmo caminho que `BunnyVideoUploader`).
- Após TUS OK: `INSERT` em `public.videos` com `creator_id = auth.uid()`, `is_active = true`, `visibility = 'public'`, `video_url` = embed URL retornada pela edge, `thumbnail_url` = thumbnail retornada. Isso garante que o vídeo aparece no **feed público** e no **Creator Studio** (mesma tabela já usada hoje).

### 2. `src/pages/TikTokApp.tsx` (mínimo)
- Importar `useUserRoles` e `QuickRecordModal`.
- Dentro da barra inferior (linha ~3584), inserir entre o 2º Explorar e o Perfil (posição central visual) um `<button>` renderizado condicionalmente com `isCreator === true` que abre o modal. Ícone: círculo vermelho neon com `Play` (lucide) — igual ao exemplo enviado.
- Estado local `showQuickRecord` para controlar o modal.

### 3. Reutilização (sem duplicar código)
- A lógica de assinatura TUS + insert já existe em `src/components/creator/BunnyVideoUploader.tsx`; vou extrair a função de upload para um helper `src/utils/bunnyTusUpload.ts` (pequena função `uploadBlobToBunny(blob, title)`) e usar tanto no `BunnyVideoUploader` quanto no novo `QuickRecordModal`. Sem quebrar o fluxo atual.

## Segurança
- Botão bloqueado no client via `isCreator`; e o `INSERT` em `videos` já é protegido por RLS (`creators_insert_own_videos` exige `creator_id = auth.uid()`), então usuário comum não conseguiria publicar mesmo se manipulasse o front.
- Edge function `bunny-video-upload` já valida `auth.getUser()` — nenhum segredo Bunny sai para o cliente.

## Compatibilidade mobile
- iOS Safari: `MediaRecorder` suportado em iOS 14.3+, usar `video/mp4;codecs=avc1,mp4a`.
- Android Chrome: `video/webm;codecs=vp9,opus`.
- Fallback: se `MediaRecorder` indisponível, mostrar aviso "Atualize o navegador".

## Aguardando comando **"produzir"** para implementar.
