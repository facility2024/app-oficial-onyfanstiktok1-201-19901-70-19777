import { useEffect, useState } from 'react';

interface VinylRecordProps {
  isPlaying: boolean;
  hasMusic: boolean;
}

export const VinylRecord = ({ isPlaying, hasMusic }: VinylRecordProps) => {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!isPlaying || !hasMusic) return;

    const interval = setInterval(() => {
      setRotation(prev => (prev + 2) % 360);
    }, 50); // Rotação suave

    return () => clearInterval(interval);
  }, [isPlaying, hasMusic]);

  if (!hasMusic) return null;

  return (
    <div className="relative flex items-center justify-center">
      <div 
        className="w-12 h-12 rounded-full bg-black shadow-2xl transition-transform duration-50 border-2 border-gray-800"
        style={{ 
          transform: `rotate(${rotation}deg)`,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2), 0 4px 12px rgba(0,0,0,0.6), 0 0 20px rgba(0,0,0,0.4)'
        }}
      >
        {/* Vinyl texture rings - more visible white lines */}
        <div className="absolute inset-1 rounded-full border border-white/40"></div>
        <div className="absolute inset-2 rounded-full border border-white/35"></div>
        <div className="absolute inset-3 rounded-full border border-white/30"></div>
        <div className="absolute inset-4 rounded-full border border-white/25"></div>
        <div className="absolute inset-[18px] rounded-full border border-white/20"></div>
        
        {/* Center label - red like classic vinyl */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-red-600 rounded-full shadow-inner border border-red-700">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-black rounded-full"></div>
          {/* Small text simulation */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 border border-black/20 rounded-full"></div>
        </div>

        {/* Additional groove lines for more realism */}
        <div className="absolute inset-[6px] rounded-full border border-white/15"></div>
        <div className="absolute inset-[8px] rounded-full border border-white/12"></div>
        <div className="absolute inset-[10px] rounded-full border border-white/10"></div>
        <div className="absolute inset-[12px] rounded-full border border-white/8"></div>
        <div className="absolute inset-[14px] rounded-full border border-white/6"></div>
        <div className="absolute inset-[16px] rounded-full border border-white/5"></div>

        {/* Vinyl reflection - more subtle but visible */}
        <div 
          className="absolute top-0 left-0 w-full h-full rounded-full bg-gradient-to-br from-white/25 via-transparent to-transparent opacity-80"
          style={{ clipPath: 'polygon(0 0, 50% 0, 25% 50%, 0 25%)' }}
        ></div>
      </div>
      
      {/* Enhanced glow effect when playing */}
      {isPlaying && (
        <div className="absolute inset-0 rounded-full bg-red-500/30 blur-lg animate-pulse"></div>
      )}
      
      {/* Spinning indicator */}
      {isPlaying && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-white text-xs opacity-60">
          ♪
        </div>
      )}
    </div>
  );
};