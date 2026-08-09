import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface NewVideosNotificationProps {
  show: boolean;
  onDismiss?: () => void;
  duration?: number;
}

export const NewVideosNotification = ({
  show,
  onDismiss,
  duration = 3000,
}: NewVideosNotificationProps) => {
  const [visible, setVisible] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);

  useEffect(() => {
    if (!show) {
      setVisible(false);
      setAnimatingOut(false);
      return;
    }

    setVisible(true);
    setAnimatingOut(false);

    const timer = setTimeout(() => {
      setAnimatingOut(true);
      const exitTimer = setTimeout(() => {
        setVisible(false);
        setAnimatingOut(false);
        onDismiss?.();
      }, 400);
      return () => clearTimeout(exitTimer);
    }, duration);

    return () => clearTimeout(timer);
  }, [show, duration, onDismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed left-1/2 z-[200] pointer-events-none"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + 60px)',
        transform: `translateX(-50%) translateY(${animatingOut ? '-120%' : '0'})`,
        opacity: animatingOut ? 0 : 1,
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
        willChange: 'transform, opacity',
      }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold shadow-lg shadow-pink-500/30 backdrop-blur-sm border border-white/20">
        <Sparkles className="w-4 h-4" />
        <span>Vídeos novos</span>
      </div>
    </div>
  );
};
