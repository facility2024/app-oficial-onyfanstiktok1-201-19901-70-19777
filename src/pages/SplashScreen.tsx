import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import splashLogo from '@/assets/coconudi-splash.png';

export const SplashScreen = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'start' | 'zoom' | 'done'>('start');

  useEffect(() => {
    // Inicia zoom após breve delay
    const zoomTimer = setTimeout(() => setPhase('zoom'), 200);

    // Redireciona após 3 segundos
    const redirectTimer = setTimeout(() => {
      setPhase('done');
      navigate('/app');
    }, 3000);

    return () => {
      clearTimeout(zoomTimer);
      clearTimeout(redirectTimer);
    };
  }, [navigate]);

  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-b from-gray-900 via-black to-gray-950 overflow-hidden">
      {/* Logo com efeito de zoom */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
        <img 
          src={splashLogo}
          alt="CocoNudi"
          className="w-52 h-52 md:w-72 md:h-72 object-contain drop-shadow-[0_0_40px_rgba(128,0,255,0.3)] transition-all duration-[2500ms] ease-out"
          style={{
            transform: phase === 'start' ? 'scale(0.3)' : 'scale(1)',
            opacity: phase === 'start' ? 0 : 1,
          }}
        />
      </div>
    </div>
  );
};

export default SplashScreen;
