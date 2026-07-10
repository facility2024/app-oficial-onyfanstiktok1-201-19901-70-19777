import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import splashLogo from '@/assets/coconudi-splash.png';

export const SplashScreen = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'start' | 'zoom' | 'done'>('start');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Inicia zoom após breve delay
    const zoomTimer = setTimeout(() => setPhase('zoom'), 300);

    // Progresso suave de 0 a 100 em 4 segundos
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 40); // 100 steps * 40ms = 4000ms

    // Redireciona após 4.2 segundos
    const redirectTimer = setTimeout(() => {
      setPhase('done');
      navigate('/app');
    }, 4200);

    return () => {
      clearTimeout(zoomTimer);
      clearTimeout(redirectTimer);
      clearInterval(interval);
    };
  }, [navigate]);

  return (
    <div
      className="fixed inset-0 w-full h-full overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at center, #6a00b8 0%, #3a0070 45%, #000000 100%)',
      }}
    >
      {/* Halo pulsante atrás do logo */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[60%] w-[420px] h-[420px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(180,80,255,0.35) 0%, rgba(180,80,255,0) 70%)',
          animation: 'splashPulse 2.4s ease-in-out infinite',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full gap-10">
        <img
          src={splashLogo}
          alt="CocoNudi"
          className="w-52 h-52 md:w-72 md:h-72 object-contain transition-all duration-[3500ms] ease-out"
          style={{
            transform: phase === 'start' ? 'scale(0.2)' : 'scale(1)',
            opacity: phase === 'start' ? 0 : 1,
            filter:
              'drop-shadow(0 0 30px rgba(180,80,255,0.55)) drop-shadow(0 0 60px rgba(255,80,200,0.35))',
          }}
        />

        {/* Barra de carregamento com brilho passando */}
        <div className="relative w-56 md:w-72 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-100 ease-linear"
            style={{
              width: `${progress}%`,
              background:
                'linear-gradient(to right, #ff0000, #ff8c00, #ffd700, #00c853, #2979ff, #7c4dff)',
              boxShadow: '0 0 12px rgba(255,255,255,0.5)',
            }}
          />
          <div
            className="absolute inset-y-0 w-1/3 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
              animation: 'splashShine 1.6s linear infinite',
            }}
          />
        </div>

        <p
          className="text-xs tracking-[0.4em] text-white/70 uppercase"
          style={{
            opacity: phase === 'start' ? 0 : 1,
            transition: 'opacity 1.2s ease-out 0.6s',
          }}
        >
          Carregando experiência
        </p>
      </div>

      <style>{`
        @keyframes splashPulse {
          0%, 100% { transform: translate(-50%, -60%) scale(1); opacity: 0.7; }
          50%      { transform: translate(-50%, -60%) scale(1.15); opacity: 1; }
        }
        @keyframes splashShine {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
