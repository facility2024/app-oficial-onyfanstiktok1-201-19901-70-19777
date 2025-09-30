import { useState, useEffect, useRef } from 'react';

interface VideoProgressBarProps {
  videoRef: React.RefObject<HTMLVideoElement> | React.ForwardedRef<HTMLVideoElement>;
}

export const VideoProgressBar = ({ videoRef }: VideoProgressBarProps) => {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef && 'current' in videoRef ? videoRef.current : null;
    if (!video) return;

    const updateProgress = () => {
      if (!isDragging) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const updateDuration = () => {
      setDuration(video.duration);
    };

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', updateDuration);

    return () => {
      video.removeEventListener('timeupdate', updateProgress);
      video.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [videoRef, isDragging]);

  const handleProgressClick = (e: React.MouseEvent) => {
    const video = videoRef && 'current' in videoRef ? videoRef.current : null;
    const progressBar = progressBarRef.current;
    if (!video || !progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * video.duration;
    
    video.currentTime = newTime;
    setProgress((newTime / video.duration) * 100);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleProgressClick(e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const video = videoRef && 'current' in videoRef ? videoRef.current : null;
    const progressBar = progressBarRef.current;
    if (!video || !progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = Math.max(0, Math.min((clickX / rect.width) * video.duration, video.duration));
    
    video.currentTime = newTime;
    setProgress((newTime / video.duration) * 100);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute bottom-20 left-4 right-20">
      {/* Time display */}
      <div className="flex justify-between text-xs text-white/70 mb-1">
        <span>{formatTime((progress / 100) * duration)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      
      {/* Progress bar */}
      <div 
        ref={progressBarRef}
        className="h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer group"
        onMouseDown={handleMouseDown}
        onClick={handleProgressClick}
      >
        <div 
          className="h-full bg-white rounded-full transition-all duration-200 group-hover:bg-red-500"
          style={{ width: `${progress}%` }}
        />
        
        {/* Thumb */}
        {isDragging && (
          <div 
            className="absolute top-1/2 w-3 h-3 bg-white rounded-full transform -translate-y-1/2 -translate-x-1/2 shadow-lg"
            style={{ left: `${progress}%` }}
          />
        )}
      </div>
    </div>
  );
};