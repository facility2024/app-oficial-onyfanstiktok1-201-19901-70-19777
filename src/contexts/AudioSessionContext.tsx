import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import {
  audioSessionManager,
  AudioState,
  type AudioSessionSnapshot,
} from '@/services/AudioSessionManager';

interface AudioSessionContextValue extends AudioSessionSnapshot {
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  play: (el: HTMLMediaElement) => Promise<void>;
  pause: (el: HTMLMediaElement) => void;
  registerMedia: (el: HTMLMediaElement | null | undefined) => () => void;
}

const AudioSessionContext = createContext<AudioSessionContextValue | null>(null);

/** Estado do áudio SOMENTE em memória (sem localStorage). */
export const useAudioSessionState = (): AudioSessionSnapshot =>
  useSyncExternalStore(
    audioSessionManager.subscribe,
    audioSessionManager.getSnapshot,
    audioSessionManager.getSnapshot,
  );

export const AudioSessionProvider = ({ children }: { children: ReactNode }) => {
  const snapshot = useAudioSessionState();

  const value = useMemo<AudioSessionContextValue>(
    () => ({
      ...snapshot,
      setMuted: audioSessionManager.setMuted,
      setVolume: audioSessionManager.setVolume,
      play: audioSessionManager.play,
      pause: audioSessionManager.pause,
      registerMedia: audioSessionManager.registerMedia,
    }),
    [snapshot],
  );

  return <AudioSessionContext.Provider value={value}>{children}</AudioSessionContext.Provider>;
};

export const useAudioSession = (): AudioSessionContextValue => {
  const ctx = useContext(AudioSessionContext);
  if (ctx) return ctx;
  // Fallback seguro caso algum player seja usado fora do Provider.
  return {
    state: audioSessionManager.getState(),
    unlocked: audioSessionManager.isUnlocked(),
    muted: audioSessionManager.getSnapshot().muted,
    volume: audioSessionManager.getSnapshot().volume,
    setMuted: audioSessionManager.setMuted,
    setVolume: audioSessionManager.setVolume,
    play: audioSessionManager.play,
    pause: audioSessionManager.pause,
    registerMedia: audioSessionManager.registerMedia,
  };
};

export { AudioState };
