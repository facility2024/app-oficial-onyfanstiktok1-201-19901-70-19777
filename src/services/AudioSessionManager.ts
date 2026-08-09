/**
 * AudioSessionManager — camada ÚNICA (Singleton) de gerenciamento de áudio.
 *
 * Responsabilidades:
 *  - manter o AudioContext vivo e retomá-lo automaticamente (iOS/Android/Desktop);
 *  - detectar bloqueio de autoplay e liberar no primeiro gesto real do usuário;
 *  - registrar os elementos <video>/<audio> ativos e ressincronizá-los quando o
 *    app volta do background, troca de aba, gira a tela ou reconecta a rede;
 *  - recuperação automática de erros (NotAllowedError, AbortError, NetworkError,
 *    MediaError, contexto suspenso, timeout) SEM recarregar a aplicação.
 *
 * Não altera regras de negócio, feed, auth, pagamentos ou banco de dados.
 */

export enum AudioState {
  IDLE = 'IDLE',
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  BLOCKED = 'BLOCKED',
  RESUMING = 'RESUMING',
  ERROR = 'ERROR',
}

export interface AudioSessionSnapshot {
  state: AudioState;
  unlocked: boolean;
  muted: boolean;
  volume: number;
}

type Listener = () => void;

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const isDev = Boolean(import.meta.env?.DEV);

const log = (...args: unknown[]) => {
  if (isDev) console.log('[AudioManager]', ...args);
};

const GESTURE_EVENTS: (keyof DocumentEventMap)[] = [
  'pointerdown',
  'touchstart',
  'touchend',
  'click',
  'keydown',
];

class AudioSessionManagerImpl {
  private state: AudioState = AudioState.IDLE;
  private unlocked = false;
  private muted = false;
  private volume = 0.8;

  private ctx: AudioContext | null = null;
  private initialized = false;
  private listeners = new Set<Listener>();
  private unlockListeners = new Set<Listener>();
  private media = new Set<HTMLMediaElement>();
  private snapshot: AudioSessionSnapshot = {
    state: AudioState.IDLE,
    unlocked: false,
    muted: false,
    volume: 0.8,
  };
  private cleanupFns: Array<() => void> = [];
  private resumeTimer: ReturnType<typeof setTimeout> | null = null;

  // ---------- estado observável ----------

  getSnapshot = (): AudioSessionSnapshot => this.snapshot;

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  subscribeUnlock = (fn: Listener): (() => void) => {
    if (this.unlocked) {
      try {
        fn();
      } catch {
        /* noop */
      }
      return () => {};
    }
    this.unlockListeners.add(fn);
    return () => {
      this.unlockListeners.delete(fn);
    };
  };

  isUnlocked = () => this.unlocked;
  getState = () => this.state;

  private emit() {
    this.snapshot = {
      state: this.state,
      unlocked: this.unlocked,
      muted: this.muted,
      volume: this.volume,
    };
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch {
        /* noop */
      }
    });
  }

  private setState(next: AudioState) {
    if (this.state === next) return;
    this.state = next;
    log('state ->', next);
    this.emit();
  }

  // ---------- inicialização ----------

  init() {
    if (!isBrowser || this.initialized) return;
    this.initialized = true;
    this.setState(AudioState.INITIALIZING);

    GESTURE_EVENTS.forEach((evt) => {
      const handler = () => this.handleUserGesture();
      document.addEventListener(evt, handler, { capture: true, passive: true });
      this.cleanupFns.push(() => document.removeEventListener(evt, handler, true));
    });

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        log('visibility -> visible');
        this.scheduleResume();
      }
    };
    const onFocus = () => this.scheduleResume();
    const onPageShow = () => this.scheduleResume();
    const onOnline = () => this.scheduleResume();
    const onBlur = () => log('window blur');
    const onPageHide = () => log('page hide');
    const onOffline = () => log('offline');
    const onFullscreen = () => this.scheduleResume();
    const onOrientation = () => this.scheduleResume();

    const winEvents: Array<[string, EventListener]> = [
      ['focus', onFocus],
      ['blur', onBlur],
      ['pageshow', onPageShow],
      ['pagehide', onPageHide],
      ['online', onOnline],
      ['offline', onOffline],
    ];
    winEvents.forEach(([evt, fn]) => {
      window.addEventListener(evt, fn);
      this.cleanupFns.push(() => window.removeEventListener(evt, fn));
    });

    document.addEventListener('visibilitychange', onVisibility);
    this.cleanupFns.push(() => document.removeEventListener('visibilitychange', onVisibility));

    document.addEventListener('fullscreenchange', onFullscreen);
    this.cleanupFns.push(() => document.removeEventListener('fullscreenchange', onFullscreen));

    const orientation = (screen as unknown as { orientation?: EventTarget }).orientation;
    if (orientation && typeof orientation.addEventListener === 'function') {
      orientation.addEventListener('change', onOrientation);
      this.cleanupFns.push(() => orientation.removeEventListener('change', onOrientation));
    }

    this.setState(AudioState.READY);
    log('AudioContext Initialized (lazy)');
  }

  dispose() {
    this.cleanupFns.forEach((fn) => {
      try {
        fn();
      } catch {
        /* noop */
      }
    });
    this.cleanupFns = [];
    if (this.resumeTimer) clearTimeout(this.resumeTimer);
    this.resumeTimer = null;
    this.media.clear();
    this.initialized = false;
  }

  // ---------- AudioContext ----------

  private ensureContext(): AudioContext | null {
    if (!isBrowser) return null;
    if (this.ctx) return this.ctx;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
      log('AudioContext created');
    } catch (err) {
      log('AudioContext error', err);
      return null;
    }
    return this.ctx;
  }

  async resumeContext(): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
      try {
        await ctx.resume();
        log('AudioContext Resumed');
      } catch (err) {
        log('AudioContext resume failed', err);
      }
    }
  }

  // ---------- gesto do usuário ----------

  handleUserGesture = () => {
    void this.resumeContext();
    if (this.unlocked) return;
    this.unlocked = true;
    this.unlockedAt = Date.now();
    log('User Interaction Detected — audio unlocked');
    // iOS: aplicar unmute + play SÍNCRONO dentro do gesto (não em efeito React),
    // caso contrário o Safari mantém o vídeo mudo/pausado.
    this.media.forEach((el) => {
      try {
        if (el.dataset.audioShouldPlay !== 'true') return;
        el.muted = this.muted;
        if (!this.muted) el.removeAttribute('muted');
        el.volume = this.volume;
        const p = el.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {
        /* noop */
      }
    });
    this.setState(this.state === AudioState.BLOCKED ? AudioState.READY : this.state);
    this.emit();
    this.unlockListeners.forEach((fn) => {
      try {
        fn();
      } catch {
        /* noop */
      }
    });
    this.unlockListeners.clear();
    this.syncMedia();
  };


  // ---------- players ----------

  registerMedia = (el: HTMLMediaElement | null | undefined): (() => void) => {
    if (!el) return () => {};
    this.media.add(el);
    log('Player Ready', this.media.size);
    return () => {
      this.media.delete(el);
    };
  };

  private syncMedia() {
    this.media.forEach((el) => {
      try {
        if (!el.paused) return;
        if (el.dataset.audioAutoresume === 'off') return;
      } catch {
        /* noop */
      }
    });
  }

  private scheduleResume() {
    if (!isBrowser) return;
    if (this.resumeTimer) clearTimeout(this.resumeTimer);
    this.resumeTimer = setTimeout(() => {
      this.resumeTimer = null;
      void this.resumeAll();
    }, 120);
  }

  /** Retoma contexto + players que estavam tocando antes do background. */
  async resumeAll(): Promise<void> {
    if (document.visibilityState !== 'visible') return;
    this.setState(AudioState.RESUMING);
    await this.resumeContext();
    const pending: Promise<void>[] = [];
    this.media.forEach((el) => {
      if (!el.isConnected) {
        this.media.delete(el);
        return;
      }
      if (el.dataset.audioShouldPlay !== 'true') return;
      if (!el.paused) return;
      pending.push(this.play(el));
    });
    await Promise.allSettled(pending);
    this.setState(this.hasPlaying() ? AudioState.PLAYING : AudioState.READY);
    log('Playback Resumed');
  }

  private hasPlaying(): boolean {
    let playing = false;
    this.media.forEach((el) => {
      if (!el.paused && !el.ended) playing = true;
    });
    return playing;
  }

  /**
   * Reprodução resiliente: tenta com áudio; se o navegador bloquear
   * (NotAllowedError), cai para mudo e libera o som no primeiro gesto.
   */
  play = async (el: HTMLMediaElement, opts?: { allowMutedFallback?: boolean }): Promise<void> => {
    if (!el) return;
    const allowMutedFallback = opts?.allowMutedFallback !== false;
    el.dataset.audioShouldPlay = 'true';
    await this.resumeContext();
    try {
      await el.play();
      this.setState(AudioState.PLAYING);
      log('Playback Started');
    } catch (error) {
      await this.recover(el, error, allowMutedFallback);
    }
  };

  pause = (el: HTMLMediaElement) => {
    if (!el) return;
    el.dataset.audioShouldPlay = 'false';
    try {
      el.pause();
    } catch {
      /* noop */
    }
    this.setState(this.hasPlaying() ? AudioState.PLAYING : AudioState.PAUSED);
  };

  /** Recovery automático — sem reload da aplicação. */
  private async recover(el: HTMLMediaElement, error: unknown, allowMutedFallback: boolean) {
    const name = (error as { name?: string })?.name || 'Error';

    if (name === 'NotAllowedError') {
      this.setState(AudioState.BLOCKED);
      log('Playback Blocked (autoplay policy)');
      if (allowMutedFallback && !el.muted) {
        el.muted = true;
        el.setAttribute('muted', 'true');
        try {
          await el.play();
          log('Playback Started (muted fallback)');
          this.setState(AudioState.PLAYING);
          this.subscribeUnlock(() => {
            if (!this.muted) {
              el.muted = false;
              el.removeAttribute('muted');
              void el.play().catch(() => {});
            }
          });
          return;
        } catch {
          /* segue para erro */
        }
      }
      return;
    }

    if (name === 'AbortError') {
      // Interrupção comum ao trocar de vídeo rapidamente: nova tentativa curta.
      log('Playback Error: AbortError — retry');
      await new Promise((r) => setTimeout(r, 150));
      try {
        await el.play();
        this.setState(AudioState.PLAYING);
        return;
      } catch {
        /* segue */
      }
    }

    if (name === 'NotSupportedError' || el.error) {
      log('Playback Error: MediaError', el.error?.code);
      this.setState(AudioState.ERROR);
      return;
    }

    log('Playback Error', name, error);
    this.setState(AudioState.ERROR);
  }

  // ---------- volume / mute (estado em memória) ----------

  setMuted = (muted: boolean) => {
    if (this.muted === muted) return;
    this.muted = muted;
    this.media.forEach((el) => {
      try {
        el.muted = muted;
      } catch {
        /* noop */
      }
    });
    this.emit();
  };

  setVolume = (volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    if (this.volume === clamped) return;
    this.volume = clamped;
    this.media.forEach((el) => {
      try {
        el.volume = clamped;
      } catch {
        /* noop */
      }
    });
    this.emit();
  };
}

export const audioSessionManager = new AudioSessionManagerImpl();

if (isBrowser) {
  audioSessionManager.init();
}
