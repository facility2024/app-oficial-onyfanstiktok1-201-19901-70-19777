import { forwardRef, useState, useRef, useCallback } from 'react';
import { Play } from 'lucide-react';

interface UniversalVideoPlayerProps {
  src: string;
  poster?: string;
  isPlaying?: boolean;
  isMuted?: boolean;
  onLoadedData?: () => void;
  onError?: (error: any) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onClick?: (event: React.MouseEvent) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const UniversalVideoPlayer = forwardRef<HTMLVideoElement, UniversalVideoPlayerProps>(
  ({ 
    src, 
    poster, 
    isPlaying = false, 
    isMuted = true, 
    onLoadedData, 
    onError, 
    onPlay, 
    onPause, 
    onClick, 
    className = '',
    style = {}
  }, ref) => {
    const [showPlayButton, setShowPlayButton] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const actualRef = (ref as any) || videoRef;

    const handleClick = useCallback((e: React.MouseEvent) => {
      const video = actualRef.current;
      if (!video) return;
      
      if (showPlayButton) {
        video.play().then(() => {
          setShowPlayButton(false);
          if (onPlay) onPlay();
        }).catch(console.error);
      }
      
      if (onClick) onClick(e);
    }, [showPlayButton, onPlay, onClick, actualRef]);

    return (
      <div className="relative w-full h-full bg-black">
        <video
          ref={actualRef}
          src={src}
          poster={poster}
          className={`w-full h-full object-cover ${className}`}
          style={{ backgroundColor: '#000', ...style }}
          loop
          muted={isMuted}
          playsInline
          preload="metadata"
          onClick={handleClick}
          onLoadedData={onLoadedData}
          onError={onError}
          onPlay={() => { setShowPlayButton(false); if (onPlay) onPlay(); }}
          onPause={onPause}
        />
        
        {showPlayButton && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-50" onClick={handleClick}>
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/30">
              <Play className="w-10 h-10 text-white ml-1" fill="white" />
            </div>
          </div>
        )}
      </div>
    );
  }
);

UniversalVideoPlayer.displayName = 'UniversalVideoPlayer';
