import { useEffect, useRef, useState } from 'react';

/**
 * Aviso leve de "Vídeos novos".
 * - Sem polling: escuta apenas o evento global disparado pelo realtime do feed.
 * - Sem re-render do feed: componente isolado, animação em transform/opacity.
 */
export const NewVideosToast = () => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRef = useRef(0);

  useEffect(() => {
    const onNew = () => {
      const now = Date.now();
      // Antiflood: no máximo 1 aviso a cada 15s
      if (now - lastRef.current < 15000) return;
      lastRef.current = now;
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 3000);
    };
    window.addEventListener('coconudi:new-videos', onNew);
    return () => {
      window.removeEventListener('coconudi:new-videos', onNew);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 z-[70] -translate-x-1/2 will-change-transform"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + 56px)',
        transform: `translateX(-50%) translateY(${visible ? '0px' : '-24px'})`,
        opacity: visible ? 1 : 0,
        transition: 'transform 260ms ease-out, opacity 260ms ease-out',
      }}
    >
      <span className="whitespace-nowrap rounded-full bg-pink-500 px-4 py-1.5 text-xs font-bold text-white shadow-lg">
        Vídeos novos
      </span>
    </div>
  );
};
