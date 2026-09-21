import { useEffect, useCallback } from 'react';

function isInsideLovableEditor(): boolean {
  try {
    if (window.self !== window.top) return true;
    if ((window as any).__LOVABLE__) return true;
    if (document.referrer.includes('lovable.dev')) return true;
    if (window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0) {
      for (let i = 0; i < window.location.ancestorOrigins.length; i++) {
        if (window.location.ancestorOrigins[i].includes('lovable')) return true;
      }
    }
  } catch {
    return true;
  }
  return false;
}

function isDevEnvironment(): boolean {
  return import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

function blockContextMenu(e: Event) {
  e.preventDefault();
  e.stopPropagation();
  return false;
}

function blockKeyInspect(e: KeyboardEvent) {
  const key = e.key?.toLowerCase() || '';
  const code = e.code || '';

  if (
    key === 'f12' ||
    (e.ctrlKey && e.shiftKey && (code === 'KeyI' || code === 'KeyJ' || code === 'KeyC')) ||
    (e.ctrlKey && (code === 'KeyU' || key === 'u'))
  ) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}

function overrideConsole() {
  const noop = () => {};
  try {
    Object.defineProperty(window, 'console', {
      value: new Proxy(console, {
        get: () => noop,
      }),
      writable: false,
      configurable: false,
    });
  } catch {
    // Silently fail
  }
}

function detectDevToolsOpen() {
  const widthThreshold = window.outerWidth - window.innerWidth > 160;
  const heightThreshold = window.outerHeight - window.innerHeight > 160;

  if (widthThreshold || heightThreshold) {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    window.location.href = 'about:blank';
  }
}

function debuggerTrap() {
  const threshold = 100;
  const start = performance.now();
  // eslint-disable-next-line no-debugger
  debugger;
  const elapsed = performance.now() - start;
  if (elapsed > threshold) {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    window.location.href = 'about:blank';
  }
}

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const shouldProtect = useCallback(() => {
    if (isInsideLovableEditor()) return false;
    if (isDevEnvironment()) return false;
    return true;
  }, []);

  const setupSecurity = useCallback(() => {
    if (!shouldProtect()) return;

    document.addEventListener('contextmenu', blockContextMenu, { capture: true });
    document.addEventListener('keydown', blockKeyInspect, { capture: true });
    document.addEventListener('selectstart', (e: Event) => {
      const target = e.target as HTMLElement;
      if (target?.tagName !== 'INPUT' && target?.tagName !== 'TEXTAREA' && !target?.isContentEditable) {
        e.preventDefault();
      }
    }, { capture: true });
    document.addEventListener('dragstart', (e: Event) => {
      if ((e.target as HTMLElement)?.tagName === 'IMG') {
        e.preventDefault();
      }
    }, { capture: true });

    try { debuggerTrap(); } catch { /* */ }

    if (import.meta.env.PROD) {
      overrideConsole();
    }

    const devToolsCheck = setInterval(detectDevToolsOpen, 5000);

    const debuggerCheck = setInterval(() => {
      const start = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const elapsed = performance.now() - start;
      if (elapsed > 100) {
        clearInterval(debuggerCheck);
        document.body.innerHTML = '';
        window.location.href = 'about:blank';
      }
    }, 10000);

    return () => {
      clearInterval(devToolsCheck);
      clearInterval(debuggerCheck);
    };
  }, [shouldProtect]);

  useEffect(() => {
    const cleanup = setupSecurity();
    return () => {
      cleanup?.();
      document.removeEventListener('contextmenu', blockContextMenu, { capture: true });
      document.removeEventListener('keydown', blockKeyInspect, { capture: true });
    };
  }, [setupSecurity]);

  return <>{children}</>;
}
