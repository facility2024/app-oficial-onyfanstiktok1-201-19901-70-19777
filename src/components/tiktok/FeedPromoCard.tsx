import React, { useState, useRef, useCallback } from 'react';
import { Heart, MessageCircle, Share2, UserPlus, Volume2, VolumeX, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface FeedPromotion {
  id: string;
  title: string;
  description: string | null;
  avatar_url: string | null;
  display_name: string;
  media_url: string;
  media_type: string;
  banner_url: string | null;
  cta_text: string | null;
  cta_link: string | null;
  is_active: boolean;
  priority: number;
  views_count: number;
  clicks_count: number;
}

interface FeedPromoCardProps {
  promo: FeedPromotion;
  isMuted?: boolean;
  isCurrentSlide?: boolean;
}

export const FeedPromoCard: React.FC<FeedPromoCardProps> = ({ promo, isMuted = true, isCurrentSlide = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [localMuted, setLocalMuted] = useState(isMuted);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideoMedia = (promo.media_type || '').toLowerCase() === 'video' || /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?|$)/i.test(promo.media_url || '');

  const trackClick = useCallback((buttonType: string) => {
    const sessionId = localStorage.getItem('session_id') || crypto.randomUUID();
    if (!localStorage.getItem('session_id')) localStorage.setItem('session_id', sessionId);
    
    // Get region from active_sessions or localStorage
    const region = localStorage.getItem('user_region') || 'Desconhecido';
    const city = localStorage.getItem('user_city') || '';
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);

    (supabase as any).from('promo_click_tracking').insert({
      promo_id: promo.id,
      button_type: buttonType,
      region,
      city,
      device_type: isMobile ? 'mobile' : 'desktop',
      session_id: sessionId,
    }).then(() => {});
  }, [promo.id]);

  const handleMediaClick = () => {
    if (isVideoMedia && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleCtaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackClick('cta');
    if (promo.cta_link) {
      window.open(promo.cta_link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="w-full h-full bg-black relative flex flex-col">
      {/* Top: Avatar + Name + Perfil */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent pt-16 pb-6 px-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/50 shadow-lg flex-shrink-0">
            <img 
              src={promo.avatar_url || '/placeholder.svg'} 
              alt={promo.display_name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base truncate">{promo.display_name}</p>
            {promo.title && (
              <p className="text-white/70 text-xs truncate">{promo.title}</p>
            )}
          </div>
        </div>
      </div>

      {/* Center: Media (Video or Image) */}
      <div className="flex-1 flex items-center justify-center relative" onClick={handleMediaClick}>
        {isVideoMedia ? (
          <>
            <video
              ref={videoRef}
              src={promo.media_url}
              className="w-full h-full object-cover"
              loop
              playsInline
              muted={localMuted}
              poster={promo.banner_url || undefined}
              autoPlay={isCurrentSlide}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-8 h-8 text-white ml-1" fill="white" />
                </div>
              </div>
            )}
          </>
        ) : (
          <img
            src={promo.media_url}
            alt={promo.title || promo.display_name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
          />
        )}
      </div>

      {/* Right: Action buttons */}
      <div className="absolute right-3 bottom-40 z-20 flex flex-col items-center gap-5">
        {/* Avatar pequeno */}
        <div className="flex flex-col items-center">
          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-lg">
            <img 
              src={promo.avatar_url || '/placeholder.svg'} 
              alt={promo.display_name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
            />
          </div>
          <span className="text-white text-[10px] mt-1">Perfil</span>
        </div>

        {/* Seguir */}
        <div className="flex flex-col items-center" onClick={() => trackClick('seguir')}>
          <UserPlus className="w-7 h-7 text-white drop-shadow-lg" />
          <span className="text-white text-[10px] mt-1">Seguir</span>
        </div>

        {/* Like */}
        <div className="flex flex-col items-center" onClick={() => trackClick('like')}>
          <Heart className="w-7 h-7 text-white drop-shadow-lg" />
          <span className="text-white text-[10px] mt-1">0</span>
        </div>

        {/* Comentário */}
        <div className="flex flex-col items-center" onClick={() => trackClick('comentario')}>
          <MessageCircle className="w-7 h-7 text-white drop-shadow-lg" />
          <span className="text-white text-[10px] mt-1">0</span>
        </div>

        {/* Mute/Unmute (se vídeo) */}
        {isVideoMedia && (
          <div className="flex flex-col items-center cursor-pointer" onClick={(e) => { e.stopPropagation(); setLocalMuted(!localMuted); }}>
            {localMuted ? (
              <VolumeX className="w-7 h-7 text-white drop-shadow-lg" />
            ) : (
              <Volume2 className="w-7 h-7 text-white drop-shadow-lg" />
            )}
          </div>
        )}

        {/* Compartilhar */}
        <div className="flex flex-col items-center" onClick={() => trackClick('compartilhar')}>
          <Share2 className="w-7 h-7 text-white drop-shadow-lg" />
          <span className="text-white text-[10px] mt-1">compartilhar</span>
        </div>
      </div>

      {/* Bottom: Description + CTA + Banner */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent pb-20 pt-8 px-4">
        {/* Descrição */}
        {promo.description && (
          <p className="text-white/90 text-sm mb-3 line-clamp-2">{promo.description}</p>
        )}

        {/* CTA Button */}
        {promo.cta_text && promo.cta_link && (
          <Button
            onClick={handleCtaClick}
            className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-3 rounded-lg shadow-lg mb-3"
          >
            {promo.cta_text}
          </Button>
        )}

        {/* Banner da modelo */}
        {promo.banner_url && (
          <div className="w-full rounded-lg overflow-hidden shadow-lg" onClick={handleCtaClick}>
            <img
              src={promo.banner_url}
              alt={`Banner ${promo.display_name}`}
              className="w-full h-auto object-cover max-h-24"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
      </div>

      {/* Badge "Patrocinado" */}
      <div className="absolute top-16 right-3 z-30">
        <span className="bg-black/50 backdrop-blur-sm text-white/70 text-[10px] px-2 py-0.5 rounded-full">
          Patrocinado
        </span>
      </div>
    </div>
  );
};
