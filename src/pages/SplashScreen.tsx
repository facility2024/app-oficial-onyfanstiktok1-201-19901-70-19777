import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import coconudiLogo from '@/assets/coconudi-logo-new.png';

export const SplashScreen = () => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Marca logo como carregada após um delay
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 500);

    // Redireciona para o app após a animação completa
    const redirectTimer = setTimeout(() => {
      navigate('/app');
    }, 2500);

    return () => {
      clearTimeout(timer);
      clearTimeout(redirectTimer);
    };
  }, [navigate]);

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden">
      {/* Fundo desfocado */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1579546929518-9e396f3cc809)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(20px)',
          transform: 'scale(1.1)'
        }}
      />
      
      {/* Overlay escuro */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Logo com animação de abertura */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full gap-6">
        <div
          className={`transition-all duration-1000 ease-out ${
            isLoaded 
              ? 'scale-100 opacity-100 rotate-0' 
              : 'scale-50 opacity-0 rotate-180'
          }`}
        >
          <img 
            src={coconudiLogo}
            alt="CocoNudi"
            className="w-48 h-48 object-contain drop-shadow-2xl"
          />
        </div>
        
        {/* Nome CocoNudi com mesmo efeito */}
        <div
          className={`transition-all duration-1000 ease-out ${
            isLoaded 
              ? 'scale-100 opacity-100 rotate-0' 
              : 'scale-50 opacity-0 rotate-180'
          }`}
        >
          <h1 className="text-6xl font-bold text-white drop-shadow-2xl tracking-wider">
            CocoNudi
          </h1>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
