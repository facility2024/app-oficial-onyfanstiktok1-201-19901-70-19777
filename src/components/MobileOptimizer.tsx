import { useEffect, useState } from 'react';

/**
 * Componente para otimizações específicas de mobile e performance geral
 */
export const MobileOptimizer = () => {
  const [isOptimized, setIsOptimized] = useState(false);

  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Performance CSS aplicado globalmente (mobile e desktop)
    const style = document.createElement('style');
    style.id = 'perf-optimizer';
    style.textContent = `
      /* GPU acceleration para vídeos */
      video {
        will-change: auto;
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
      }
      
      /* Otimizar imagens com lazy loading */
      img[loading="lazy"] {
        content-visibility: auto;
      }
      
      /* Reduzir compositing layers em mobile */
      ${isMobile ? `
        .embla__slide:not(.active) video {
          will-change: auto;
        }
        
        /* Forçar compositing suave */
        .embla__container {
          -webkit-perspective: 1000;
          perspective: 1000;
        }
      ` : ''}
    `;
    document.head.appendChild(style);

    if (isMobile) {
      const optimizeMobile = () => {
        // Reduzir qualidade de animações para melhor performance
        document.documentElement.style.setProperty('--animation-speed', '0.2s');
        
        // Otimizar viewport para dispositivos mobile
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 
            'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
          );
        }

        // Desabilitar seleção de texto desnecessária em mobile
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        document.body.style.touchAction = 'manipulation';

        // Otimizar scrolling para iOS
        (document.body.style as any).webkitOverflowScrolling = 'touch';
        
        setIsOptimized(true);
      };

      optimizeMobile();

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
      const perfStyle = document.getElementById('perf-optimizer');
      if (perfStyle) perfStyle.remove();
      
      if (isMobile) {
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        document.body.style.touchAction = '';
        (document.body.style as any).webkitOverflowScrolling = '';
      }
    };
  }, []);

  // Não renderiza nenhum elemento visual
  return null;
};