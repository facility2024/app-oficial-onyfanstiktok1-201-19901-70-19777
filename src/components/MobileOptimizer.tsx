import { useEffect, useState } from 'react';

/**
 * Componente para otimizações específicas de mobile
 */
export const MobileOptimizer = () => {
  const [isOptimized, setIsOptimized] = useState(false);

  useEffect(() => {
    // Detectar dispositivo mobile
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Otimizações para mobile
      const optimizeMobile = () => {
        // Reduzir qualidade de animações para melhor performance
        document.documentElement.style.setProperty('--animation-speed', '0.2s');
        
        
      // Otimizar viewport para dispositivos mobile
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 
            'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover'
          );
        }

        // Otimizar scrolling para iOS
        (document.body.style as any).webkitOverflowScrolling = 'touch';
        
        setIsOptimized(true);
      };

      optimizeMobile();

      // Removido auto-recovery para evitar conflitos com a montagem do React no mobile

      // Listener para Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'MOBILE_OPTIMIZED') {
            console.log('✅ App otimizado para mobile');
          }
        });
      }

      // Preload primeiro vídeo em background após 1 segundo
      setTimeout(() => {
        const videoElements = document.querySelectorAll('video');
        if (videoElements.length > 0) {
          const firstVideo = videoElements[0];
          firstVideo.preload = 'metadata';
        }
      }, 1000);
    }

    return () => {
      // Cleanup
      if (isMobile) {
        (document.body.style as any).webkitOverflowScrolling = '';
      }
    };
  }, []);

  // Não renderiza nenhum elemento visual
  return null;
};