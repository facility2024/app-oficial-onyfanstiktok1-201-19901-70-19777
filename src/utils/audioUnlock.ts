/**
 * Desbloqueio global de áudio (iOS/Android).
 *
 * Navegadores mobile só permitem áudio depois de um gesto real do usuário.
 * Antes, cada instância de player guardava esse estado localmente — então ao
 * rolar o feed o novo vídeo montava "travado em mudo" novamente.
 * Aqui o estado é GLOBAL: o primeiro toque/clique em qualquer lugar libera o
 * áudio para todos os players seguintes.
 */

let unlocked = false;
const listeners = new Set<() => void>();

export const isAudioUnlocked = () => unlocked;

const markUnlocked = () => {
  if (unlocked) return;
  unlocked = true;
  listeners.forEach((fn) => {
    try { fn(); } catch {}
  });
  removeListeners();
};

const EVENTS: (keyof DocumentEventMap)[] = ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'];

const removeListeners = () => {
  if (typeof document === 'undefined') return;
  EVENTS.forEach((evt) => document.removeEventListener(evt, markUnlocked, true));
};

if (typeof document !== 'undefined') {
  EVENTS.forEach((evt) =>
    document.addEventListener(evt, markUnlocked, { capture: true, passive: true } as AddEventListenerOptions),
  );
}

/** Chamado por handlers de clique dos players (gesto direto). */
export const unlockAudio = () => markUnlocked();

export const subscribeAudioUnlock = (fn: () => void) => {
  if (unlocked) {
    try { fn(); } catch {}
    return () => {};
  }
  listeners.add(fn);
  return () => listeners.delete(fn);
};
