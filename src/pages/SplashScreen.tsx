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
        backgroundImage: 'url(https://tiktokonyfans.b-cdn.net/material%20coconudi/destbard.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full gap-10">
        {/* Logo com efeito de zoom suave */}
        <img 
          src={splashLogo}
          alt="CocoNudi"
          className="w-52 h-52 md:w-72 md:h-72 object-contain drop-shadow-[0_0_50px_rgba(128,0,255,0.25)] transition-all duration-[3500ms] ease-out"
          style={{
            transform: phase === 'start' ? 'scale(0.2)' : 'scale(1)',
            opacity: phase === 'start' ? 0 : 1,
          }}
        />

        {/* Barra de carregamento com gradiente da logo */}
        <div className="w-56 md:w-72 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-100 ease-linear"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(to right, #ff0000, #ff8c00, #ffd700, #00c853, #2979ff, #7c4dff)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
