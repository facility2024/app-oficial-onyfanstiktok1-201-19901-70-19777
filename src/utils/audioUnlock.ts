/**
 * Desbloqueio global de áudio (iOS/Android/Desktop).
 *
 * Mantido como FACHADA por compatibilidade: toda a lógica agora vive no
 * AudioSessionManager (Singleton). Nenhum consumidor existente precisa mudar.
 */
import { audioSessionManager } from '@/services/AudioSessionManager';

export const isAudioUnlocked = () => audioSessionManager.isUnlocked();

/** Chamado por handlers de clique dos players (gesto direto). */
export const unlockAudio = () => audioSessionManager.handleUserGesture();

export const subscribeAudioUnlock = (fn: () => void) => audioSessionManager.subscribeUnlock(fn);
