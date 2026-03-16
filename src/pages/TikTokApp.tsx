import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVideoActions } from '@/hooks/useVideoActions';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { VideoPlayer, MemoizedVideoPlayer } from '@/components/tiktok/VideoPlayer';
import { SideMenu } from '@/components/tiktok/SideMenu';
import { BottomInfo } from '@/components/tiktok/BottomInfo';
import { ProfileScreen } from '@/components/tiktok/ProfileScreen';
import { CommentsScreen } from '@/components/tiktok/CommentsScreen';
import { ChatScreen } from '@/components/tiktok/ChatScreen';
import { BonusGift } from '@/components/tiktok/BonusGift';
import { VinylRecord } from '@/components/tiktok/VinylRecord';
import { ActionTracker, useActionTracker } from '@/components/tiktok/ActionTracker';
import { useAppAnalytics } from '@/hooks/useAppAnalytics';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Heart, MessageCircle, User, Search, ChevronUp, ChevronDown, Gift, Radio, Home, Video, Users, ShoppingBag, MapPin, BookmarkPlus, Sparkles, LogOut, Plus, Share2, Music, Grid, Compass, Film, Crown, Phone } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { SearchModal } from '@/components/tiktok/SearchModal';
import { VideoCallPopup } from '@/components/tiktok/VideoCallPopup';
import { VideoCallListPopup } from '@/components/tiktok/VideoCallListPopup';
import { LiveListPopup } from '@/components/tiktok/LiveListPopup';
import { AgeVerificationModal } from '@/components/tiktok/AgeVerificationModal';
import { useCreatorRole } from '@/hooks/useUserRoles';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CategoryMenu } from '@/components/tiktok/CategoryMenu';
import { UserMenuHeader } from '@/components/tiktok/UserMenuHeader';
import useEmblaCarousel from 'embla-carousel-react';
import { VideoCarousel } from '@/components/ui/video-carousel';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { AdCarousel } from '@/components/tiktok/AdCarousel';
import { ModelCarousel } from '@/components/tiktok/ModelCarousel';
import { MarketplaceCarousel } from '@/components/tiktok/MarketplaceCarousel';
import { LocalBusinessCarousel } from '@/components/tiktok/LocalBusinessCarousel';
import { FullscreenVideoModal } from '@/components/tiktok/FullscreenVideoModal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGenres } from '@/hooks/useGenres';
import { GenreSelector } from '@/components/tiktok/GenreSelector';
import iconHome from '@/assets/icon-home.png';
import iconNavigation from '@/assets/icon-navigation.png';
import iconMarketplace from '@/assets/icon-marketplace.png';
import iconShare from '@/assets/icon-share.png';
import coconudiLogo from '@/assets/coconudi-logo-new.png';
import coconudiHeaderLogo from '@/assets/coconudi-logo-new.png';
import headerBackground from '@/assets/header-background.png';
// Feed inteligente reativado
import { useIntelligentFeed } from '@/hooks/useIntelligentFeed';
import { IntelligentFeedIndicator } from '@/components/tiktok/IntelligentFeedIndicator';
import { PaymentVerificationIndicator } from '@/components/tiktok/PaymentVerificationIndicator';
import { PromoPopup } from '@/components/tiktok/PromoPopup';
import { useVideoTracking } from '@/hooks/useVideoTracking';

import { useFeedPromotions } from '@/hooks/useFeedPromotions';
import coconudiWatermark from '@/assets/coconudi-c-watermark.png';
interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  user_id: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  music_name: string;
  is_active: boolean;
  visibility?: 'public' | 'premium';
  created_at: string;
  updated_at?: string;
  model_id?: string;
  creator_id?: string; // ID do criador (user autenticado)
  user: {
    id: string;
    username: string;
    avatar_url: string;
    followers_count: number;
    following_count: number;
    is_online: boolean;
    created_at: string;
    bio?: string;
    posting_panel_url?: string;
  };
}
interface Comment {
  id: string;
  text: string;
  user_id: string;
  video_id: string;
  likes_count: number;
  created_at: string;
  user: {
    username: string;
    avatar_url: string;
  };
}
export const TikTokApp = () => {
  console.log('🎬 TikTokApp: Componente renderizado');

  // Hook para obter dados do usuário logado
  const {
    user: authUser,
    profile
  } = useCurrentUser();

  // Hook para verificar se é criador
  const {
    isCreator,
    loading: creatorLoading
  } = useCreatorRole();

  // Hook para gerenciar gêneros
  const {
    selectedGenre,
    setSelectedGenre,
    genres
  } = useGenres();

  // 🧠 FEED INTELIGENTE REATIVADO com proteções anti-loop
  const {
    videos: intelligentVideos,
    loading: intelligentLoading,
    currentFeed,
    refreshFeed: refreshIntelligentFeed,
    markVideoAsWatched,
    markModelAsFavorite,
    getUserMemory
  } = useIntelligentFeed();

  // 🎯 TRACKING DE ENGAJAMENTO (Pilar 1 e 2 - sem alterar layout)
  const { trackView: trackVideoEngagement, trackStrongInterest, trackSkip, updateWatchDuration } = useVideoTracking();
  const videoWatchStartRef = useRef<number>(0);
  const lastTrackedVideoRef = useRef<string>('');

  // 📢 PROMOÇÕES NO FEED
  const { promotions } = useFeedPromotions();

  // Flag para evitar loops de refresh
  const isRefreshingFeed = useRef(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatEntity, setChatEntity] = useState<{
    name: string;
    avatar: string;
    id: string;
    isCreator: boolean;
  } | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [preloadedVideos, setPreloadedVideos] = useState<Set<number>>(new Set());
  const [followingModels, setFollowingModels] = useState<Record<string, boolean>>({});
  const [chatActiveMap, setChatActiveMap] = useState<Record<string, boolean>>({});
  const [videoCallModels, setVideoCallModels] = useState<any[]>([]);
  const [activeVideoCallModel, setActiveVideoCallModel] = useState<any>(null);
  const [chatOnlineMap, setChatOnlineMap] = useState<Record<string, boolean>>({});
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('app_isMuted');
    return saved === 'true';
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('app_volume');
    return saved ? parseFloat(saved) : 0.8; // Default 80%
  });
  const [isPlaying, setIsPlaying] = useState(true); // Inicia reproduzindo
  const [loading, setLoading] = useState(true);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  // 🔐 CONTADOR DE VÍDEOS PARA LOGIN - Reseta a cada visita ao feed (conta 10 por sessão)
  const [videosWatched, setVideosWatched] = useState(() => {
    console.log('🔐 INICIALIZANDO CONTADOR DE VÍDEOS: 0 (reset por sessão)');
    localStorage.setItem('videosWatched', '0');
    localStorage.removeItem('requiresLogin');
    return 0;
  });
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Debug do estado do modal
  useEffect(() => {
    console.log('🔐 ESTADO:', {
      videosWatched,
      currentUser: !!currentUser
    });
  }, [videosWatched, currentUser]);

  // Verifica se usuário está logado
  useEffect(() => {
    console.log('🔐 VERIFICANDO SESSÃO DO USUÁRIO...');
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      console.log('🔐 SESSÃO:', !!session?.user);
      setCurrentUser(session?.user ?? null);
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔐 MUDANÇA DE AUTH:', {
        event: _event,
        user: !!session?.user
      });
      setCurrentUser(session?.user ?? null);
      // Se usuário logar, reseta contador e volta para o app
      if (session?.user) {
        console.log('🔐 USUÁRIO LOGADO: Resetando contador');
        setVideosWatched(0);
        localStorage.setItem('videosWatched', '0');
        localStorage.removeItem('requiresLogin');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Debug do estado
  useEffect(() => {
    console.log('🔍 DEBUG: showAgeVerification mudou para:', showAgeVerification);
  }, [showAgeVerification]);

  // 🔇 PERSISTIR ESTADO DE MUTE
  useEffect(() => {
    localStorage.setItem('app_isMuted', isMuted.toString());
  }, [isMuted]);

  // 🔊 PERSISTIR ESTADO DE VOLUME
  useEffect(() => {
    localStorage.setItem('app_volume', volume.toString());
  }, [volume]);

  // 📱 NOVA LÓGICA: Estados para feed infinito em blocos
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const [allAvailableVideos, setAllAvailableVideos] = useState<Video[]>([]);
  const [usedModelIds, setUsedModelIds] = useState<Set<string>>(new Set());
  const VIDEOS_PER_BLOCK = 50; // Aumentado de 10 para 50 para carregar mais vídeos por vez
  const [showSearch, setShowSearch] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const [showVideoCallList, setShowVideoCallList] = useState(false);
  const [showLiveList, setShowLiveList] = useState(false);
  const [blockedModels, setBlockedModels] = useState<string[]>([]); // Lista de modelos bloqueados
  const [showFullscreen, setShowFullscreen] = useState(false); // Estado para tela cheia
  const [fullscreenVideoTime, setFullscreenVideoTime] = useState(0); // Tempo atual do vídeo

  // Debug do showFullscreen
  useEffect(() => {
    console.log('📺 Estado showFullscreen mudou para:', showFullscreen);
  }, [showFullscreen]);

  // Ordem de modelos no ciclo e controle de atualização
  const [modelOrder, setModelOrder] = useState<string[]>([]);
  const [cycleSize, setCycleSize] = useState(0);
  const [pendingRefresh, setPendingRefresh] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetVideoId = searchParams.get('video');
  const targetProfileId = searchParams.get('profile');
  
  // 🔗 URL amigável: receber profileId via state (de ProfilePage)
  const stateProfileId = (location.state as { profileId?: string; friendlyUrl?: string })?.profileId;
  const friendlyUrl = (location.state as { profileId?: string; friendlyUrl?: string })?.friendlyUrl;
  const {
    toast
  } = useToast();
  const isMobile = useIsMobile();
  const {
    checkAndTrackAction
  } = useActionTracker();
  const {
    trackLike,
    trackComment,
    trackShare,
    trackView,
    trackFollow
  } = useAppAnalytics();
  console.log('🎯 DEBUG: Importações do useAppAnalytics:', {
    trackLike,
    trackComment,
    trackShare,
    trackView,
    trackFollow
  });
  const {
    isPremium,
    isContentUnlocked,
    checkPremiumStatus
  } = usePremiumStatus();
  const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Verifica se um vídeo é novo (criado nas últimas 2 horas ou de modelo nova)
  const isVideoNew = (video: Video): boolean => {
    try {
      // 🆕 Vídeos de modelos novas (criadas nas últimas 48h) sempre são "novos"
      if ((video as any).isNewModel) return true;
      const videoDate = new Date(video.created_at).getTime();
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
      // Vídeos criados nas últimas 2 horas são considerados "novos"
      if (videoDate > twoHoursAgo) return true;
      // Também marcar como novo se isHighlighted (posts agendados recentes)
      if ((video as any).isHighlighted) return true;
      // Fallback: verificar contra última sessão
      const lastSession = localStorage.getItem('last_app_session');
      if (!lastSession) return false;
      const sessionDate = new Date(lastSession).getTime();
      return videoDate > sessionDate;
    } catch {
      return false;
    }
  };

  // Registra modelos com os quais o usuário interagiu (para recomendações)
  const ensureInteractedModel = (modelId?: string) => {
    try {
      if (!modelId) return;
      const raw = localStorage.getItem('interacted_model_ids');
      const arr = raw ? JSON.parse(raw) : [];
      const list: string[] = Array.isArray(arr) ? arr : [];
      if (!list.includes(modelId)) {
        list.push(modelId);
        localStorage.setItem('interacted_model_ids', JSON.stringify(list));
      }
    } catch {}
  };

  // Handle action tracking with async support
  const handleActionAttempt = async (actionType: string, userName: string): Promise<boolean> => {
    const currentVideo = videos[currentVideoIndex];
    return await checkAndTrackAction(actionType, currentVideo?.id, currentVideo?.user_id);
  };

  // Carousel otimizado para todas as plataformas (iOS fix: duration maior para evitar pulos)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'y',
    loop: false,
    dragFree: false,
    containScroll: 'trimSnaps',
    duration: isIOS ? 30 : 25,
    skipSnaps: false,
    startIndex: 0,
  });

  // Embla API ready

  // 📢 Injetar promoções como vídeos falsos no feed
  const injectPromosRef = useRef(false);
  useEffect(() => {
    if (videos.length === 0 || promotions.length === 0) return;

    // Não injetar se já tem promos — evita loop infinito
    if (videos.some(v => v.id.startsWith('promo-'))) return;

    // Usar o intervalo configurado no painel admin (position_interval de cada promo)
    // Se houver múltiplas promos, usar o menor intervalo como base
    const adminInterval = Math.max(
      1,
      Math.min(...promotions.map(p => p.position_interval || 5))
    );

    // Separar apenas vídeos reais (sem promos)
    const realVideos = videos.filter(v => !v.id.startsWith('promo-'));
    const result: any[] = [];
    let promoIdx = 0;
    const usedPromoIds = new Set<string>();

    for (let i = 0; i < realVideos.length; i++) {
      result.push(realVideos[i]);

      // Respeitar o intervalo definido pelo admin
      if ((i + 1) % adminInterval === 0 && promotions.length > 0) {
        // Selecionar próxima promo, respeitando prioridade e evitando repetição
        // Promos com maior prioridade aparecem primeiro (já vêm ordenadas por priority DESC)
        let selectedPromo = promotions[promoIdx % promotions.length];
        
        if (promotions.length > 1) {
          let attempts = 0;
          while (usedPromoIds.has(selectedPromo.id) && attempts < promotions.length) {
            promoIdx++;
            selectedPromo = promotions[promoIdx % promotions.length];
            attempts++;
          }
        }
        
        usedPromoIds.add(selectedPromo.id);
        if (usedPromoIds.size >= promotions.length) {
          usedPromoIds.clear();
        }

        const fakeVideo: any = {
          id: `promo-${selectedPromo.id}-pos${i}`,
          title: selectedPromo.title || selectedPromo.display_name,
          description: selectedPromo.description || '',
          video_url: selectedPromo.media_url,
          thumbnail_url: selectedPromo.banner_url || '',
          user_id: `promo-${selectedPromo.id}`,
          likes_count: 0,
          comments_count: 0,
          shares_count: 0,
          views_count: selectedPromo.views_count || 0,
          music_name: `${selectedPromo.display_name} • Patrocinado`,
          is_active: true,
          visibility: 'public',
          created_at: new Date().toISOString(),
          _promoCtaText: selectedPromo.cta_text || null,
          _promoCtaLink: selectedPromo.cta_link || null,
          _promoBannerUrl: selectedPromo.banner_url || null,
          _promoDescription: selectedPromo.description || null,
          user: {
            id: `promo-${selectedPromo.id}`,
            username: selectedPromo.display_name,
            avatar_url: selectedPromo.avatar_url || '/placeholder.svg',
            followers_count: 0,
            following_count: 0,
            is_online: false,
            created_at: new Date().toISOString(),
            bio: selectedPromo.description || '',
            posting_panel_url: selectedPromo.cta_link || undefined,
          },
        };
        result.push(fakeVideo);
        promoIdx++;
      }
    }

    if (promoIdx > 0) {
      console.log(`📢 Promos injetadas: ${promoIdx} anúncios a cada ${adminInterval} vídeos (${result.length} total) — intervalo do admin`);
      setVideos(result);
    }
  }, [videos, promotions]);
  const currentVideo = videos.length > 0 ? videos[currentVideoIndex] : null;

  // Preconnect otimizado para melhor performance
  useEffect(() => {
    if (!videos.length) return;
    const links: HTMLLinkElement[] = [];
    try {
      const url = new URL(videos[0].video_url);
      const preconnect = document.createElement('link');
      preconnect.rel = 'preconnect';
      preconnect.href = url.origin;
      preconnect.crossOrigin = 'anonymous';
      document.head.appendChild(preconnect);
      links.push(preconnect);
    } catch {}
    return () => {
      links.forEach(link => {
        try {
          if (link.parentNode) {
            link.parentNode.removeChild(link);
          }
        } catch {}
      });
    };
  }, [videos]);

  // Update video when carousel slides
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      const newIndex = emblaApi.selectedScrollSnap();
      if (newIndex !== currentVideoIndex) {
        // 🎯 TRACKING: Calcular duração do vídeo anterior e registrar skip/interesse
        if (currentUser?.id && lastTrackedVideoRef.current) {
          const watchDuration = Math.floor((Date.now() - videoWatchStartRef.current) / 1000);
          const prevVideo = videos[currentVideoIndex];
          if (prevVideo) {
            const prevEntityId = prevVideo.creator_id || prevVideo.model_id || '';
            updateWatchDuration(lastTrackedVideoRef.current, currentUser.id, watchDuration);
            if (watchDuration >= 20 && prevEntityId) {
              trackStrongInterest(currentUser.id, prevEntityId, 'watch_long', (prevVideo as any).tags);
            } else if (watchDuration < 3 && (prevVideo as any).tags?.length > 0) {
              trackSkip(currentUser.id, (prevVideo as any).tags);
            }
          }
        }

        setCurrentVideoIndex(newIndex);
        videoWatchStartRef.current = Date.now();

        // 🧠 FEED INTELIGENTE: Marcar vídeo como assistido
        const watchedVideo = videos[newIndex];
        if (watchedVideo && markVideoAsWatched) {
          const entityId = watchedVideo.creator_id || watchedVideo.model_id || watchedVideo.user?.id;
          if (entityId) {
            markVideoAsWatched(watchedVideo.id, entityId);
          }
        }

        // 🎯 TRACKING: Registrar visualização no DB após 3s (via timer)
        if (currentUser?.id && watchedVideo) {
          lastTrackedVideoRef.current = watchedVideo.id;
          setTimeout(() => {
            if (lastTrackedVideoRef.current === watchedVideo.id) {
              trackVideoEngagement(watchedVideo.id, currentUser.id);
            }
          }, 3000);
        }

        // 🔐 INCREMENTA CONTADOR SE USUÁRIO NÃO ESTIVER LOGADO
        if (!currentUser && newIndex > currentVideoIndex) {
          const newCount = videosWatched + 1;
          setVideosWatched(newCount);
          localStorage.setItem('videosWatched', newCount.toString());

          // Redireciona para /auth após 10 vídeos
          if (newCount >= 10) {
            localStorage.setItem('requiresLogin', 'true');
            localStorage.setItem('returnTo', '/app');
            navigate('/auth');
          }
        }
      }
    };
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, currentVideoIndex, currentUser, videosWatched, navigate]);

  // 🔐 Bloqueia interações do Embla quando redirecionado para login
  useEffect(() => {
    const requiresLogin = localStorage.getItem('requiresLogin');
    if (requiresLogin === 'true' && !currentUser) {
      // Verifica se o contador realmente atingiu 10 vídeos
      const savedCount = parseInt(localStorage.getItem('videosWatched') || '0', 10);
      if (savedCount >= 10) {
        navigate('/auth');
      } else {
        localStorage.removeItem('requiresLogin');
        localStorage.removeItem('requiresLogin');
      }
    }
  }, [currentUser, navigate]);

  // Preload adjacent videos for faster navigation (otimizado)
  useEffect(() => {
    if (videos.length === 0) return;
    const preloadVideo = (index: number) => {
      if (index < 0 || index >= videos.length || preloadedVideos.has(index)) return;
      const video = videos[index];
      if (video?.video_url && !video.id.startsWith('promo-')) {
        // Usar preload para os próximos vídeos (mais agressivo = mais rápido)
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'video';
        link.href = video.video_url;
        link.type = 'video/mp4';
        document.head.appendChild(link);
        setPreloadedVideos(prev => new Set(prev).add(index));

        // Clean up after 60 seconds
        setTimeout(() => {
          if (document.head.contains(link)) {
            document.head.removeChild(link);
          }
        }, 60000);
      }
    };

    // Preload next 3 videos for instant playback
    preloadVideo(currentVideoIndex + 1);
    preloadVideo(currentVideoIndex + 2);
    preloadVideo(currentVideoIndex + 3);
  }, [currentVideoIndex, videos, preloadedVideos]);

  // DESABILITADO: Verificação de idade
  // useEffect(() => {
  //   console.log('🔍 VERIFICAÇÃO DE IDADE: Iniciando verificação...');
  //   const verification = localStorage.getItem('ageVerification');
  //   console.log('🔍 VERIFICAÇÃO DE IDADE: Dados salvos:', verification);
  //   
  //   if (verification) {
  //     console.log('🔍 VERIFICAÇÃO DE IDADE: Usuário já verificado, iniciando reprodução');
  //     // Inicia reprodução automaticamente se já verificado
  //     setTimeout(() => {
  //       setIsPlaying(true);
  //     }, 500);
  //     return;
  //   }
  //
  //   console.log('🔍 VERIFICAÇÃO DE IDADE: Aguardando 4 segundos...');
  //   const timer = setTimeout(() => {
  //     console.log('🔍 VERIFICAÇÃO DE IDADE: Mostrando popup!');
  //     setShowAgeVerification(true);
  //     setIsPlaying(false); // Pausa o vídeo
  //   }, 4000);
  //
  //   return () => {
  //     console.log('🔍 VERIFICAÇÃO DE IDADE: Limpando timer');
  //     clearTimeout(timer);
  //   };
  // }, []);

  // DESABILITADO: Fallback específico para mobile/iOS
  // useEffect(() => {
  //   const alreadyVerified = !!localStorage.getItem('ageVerification');
  //   if (alreadyVerified) return;
  //
  //   const handleFirstTouch = () => {
  //     if (!showAgeVerification) {
  //       console.log('📱 VERIFICAÇÃO DE IDADE: Primeiro toque detectado — forçando abertura do modal');
  //       setShowAgeVerification(true);
  //       setIsPlaying(false);
  //     }
  //     window.removeEventListener('touchstart', handleFirstTouch);
  //   };
  //
  //   window.addEventListener('touchstart', handleFirstTouch, { passive: true } as any);
  //   return () => window.removeEventListener('touchstart', handleFirstTouch);
  // }, [showAgeVerification]);

  // DESABILITADO: Fallback imediato para mobile
  // useEffect(() => {
  //   try {
  //     const verified = !!localStorage.getItem('ageVerification');
  //     console.log('📱 DEBUG MOBILE:', {
  //       verified,
  //       isMobile,
  //       showAgeVerification,
  //       windowWidth: window.innerWidth
  //     });
  //     
  //     if (!verified && isMobile) {
  //       console.log('📱 VERIFICAÇÃO DE IDADE: Dispositivo móvel detectado — abrindo modal imediatamente');
  //       setShowAgeVerification(true);
  //       setIsPlaying(false);
  //     } else if (!verified && window.innerWidth < 768) {
  //       // Fallback adicional: força abertura se a largura da tela é de mobile
  //       console.log('📱 VERIFICAÇÃO DE IDADE: Largura mobile detectada — forçando abertura do modal');
  //       setShowAgeVerification(true);
  //       setIsPlaying(false);
  //     }
  //   } catch (err) {
  //     console.error('❌ Erro ao verificar mobile:', err);
  //   }
  //   // rodará sempre que o breakpoint de mobile mudar
  // }, [isMobile, showAgeVerification]);

  // Comunica globalmente (para o banner PWA) quando o modal +18 abre/fecha
  useEffect(() => {
    try {
      if (showAgeVerification) {
        localStorage.setItem('age_modal_open', 'true');
      } else {
        localStorage.removeItem('age_modal_open');
      }
    } catch {}
    // Dispara evento customizado para outros componentes no mesmo documento
    try {
      const evt = new CustomEvent('ageModalOpenChange', {
        detail: {
          open: showAgeVerification
        }
      });
      window.dispatchEvent(evt);
    } catch {}
  }, [showAgeVerification]);
  useEffect(() => {
    // ✅ REMOVER carregamento periódico para evitar notificações constantes

    // 🔄 COMUNICAÇÃO OTIMIZADA EM TEMPO REAL COM PAINEL ADMIN
    console.log('🚀 Configurando comunicação bidirecional admin-app...');
    let lastToastTime = 0;
    const TOAST_COOLDOWN = 5000; // 5 segundos entre toasts

    const showToast = (title: string, description: string) => {
      const now = Date.now();
      if (now - lastToastTime > TOAST_COOLDOWN) {
        toast({
          title,
          description
        });
        lastToastTime = now;
      }
    };

    // Canal consolidado para todas as mudanças importantes
    const adminChannel = supabase.channel('admin-app-sync').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'videos'
    }, payload => {
      console.log('🎬 ADMIN → APP: Mudança em vídeos:', payload.eventType);
      if (payload.eventType === 'INSERT') {
        showToast("📱 Novo Conteúdo!", "Vídeo adicionado pelo admin");
        // Sinalizar atualização pendente para aplicar no fim do ciclo
        setPendingRefresh(true);
      }
    }).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'models'
    }, payload => {
      console.log('👤 ADMIN → APP: Mudança em modelos:', payload.eventType);
      if (payload.eventType === 'INSERT') {
        showToast("👤 Novo Modelo!", "Perfil adicionado pelo admin");
        // Sinalizar atualização pendente para aplicar no fim do ciclo
        setPendingRefresh(true);
      }
    }).on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'posts_principais'
    }, payload => {
      console.log('🏠 ADMIN → APP: Novo post na tela principal');
      showToast("🏠 Novo Post!", "Conteúdo adicionado na tela principal");
    }).subscribe();

    // Cleanup ao desmontar
    return () => {
      console.log('🔌 Removendo canal de comunicação admin-app...');
      supabase.removeChannel(adminChannel);
    };
  }, []); // REMOVIDO currentVideo da dependência para evitar loop

  // 📹 CARREGAR MODELOS DE VÍDEO CHAMADA
  useEffect(() => {
    const loadVideoCallModels = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('video_call_models')
          .select('*')
          .eq('is_active', true);
        if (!error && data) {
          setVideoCallModels(data);
        }
      } catch (e) {
        console.log('Video call models not available');
      }
    };
    loadVideoCallModels();
  }, []);

  // 📹 HANDLER: Verifica se modelo atual tem vídeo chamada
  const handleOpenVideoCall = useCallback(() => {
    if (!currentVideo) {
      toast({ title: '📹 Vídeo Chamada', description: 'Nenhum vídeo selecionado.' });
      return;
    }
    const modelId = currentVideo.model_id || currentVideo.creator_id || currentVideo.user?.id;
    const matched = videoCallModels.find((vc: any) => vc.selected_model_id === modelId);
    if (matched) {
      setActiveVideoCallModel({
        name: matched.model_name,
        avatar_url: matched.model_avatar,
        description: matched.description,
        price: matched.price,
      });
      setShowLive(true);
    } else {
      toast({
        title: '📹 Vídeo Chamada',
        description: 'Esta modelo ainda não tem vídeo chamada disponível.',
      });
    }
  }, [currentVideo, videoCallModels, toast]);

  useEffect(() => {
    console.log('🔍 DEBUG: useEffect disparado com currentVideo:', currentVideo?.id);
    console.log('🔍 DEBUG: trackView disponível:', typeof trackView);
    const registerView = async () => {
      if (currentVideo && currentVideo.id) {
        // Usar ID original para vídeos cíclicos
        const trackingId = (currentVideo as any)._originalId || currentVideo.id;
        console.log('📹 REGISTRANDO VIEW para vídeo:', trackingId);
        try {
          const userId = currentVideo.user?.id || currentVideo.model_id || '';
          const isCreator = !!currentVideo.creator_id;
          if (userId) {
            await trackView(trackingId, userId, isCreator);
            ensureInteractedModel(userId);
            
            // 🆕 MARCAR VÍDEO COMO ASSISTIDO na memória persistente
            // Isso garante que ao recarregar/voltar, este vídeo não repita
            if (markVideoAsWatched) {
              markVideoAsWatched(currentVideo.id, userId);
            }

            // 🆕 SALVAR POST EM DESTAQUE COMO VISUALIZADO
            if ((currentVideo as any).isHighlighted) {
              try {
                const stored = localStorage.getItem('viewed_highlight_posts');
                const viewedSet = new Set(stored ? JSON.parse(stored) : []);
                viewedSet.add(currentVideo.id);
                localStorage.setItem('viewed_highlight_posts', JSON.stringify([...viewedSet]));
                console.log('✨ Post em destaque marcado como visualizado:', currentVideo.id);
              } catch (error) {
                console.warn('⚠️ Erro ao salvar post visualizado:', error);
              }
            }
            console.log('✅ VIEW registrada com sucesso!');
          }
        } catch (error) {
          console.error('❌ Erro ao registrar view:', error);
        }
      }
    };
    if (currentVideo) {
      loadComments(currentVideo.id);
      checkIfLiked(currentVideo.id);
      checkIfFollowing(currentVideo.user.id);
      registerView();
    }
  }, [currentVideo, trackView]);

  // FEED INTELIGENTE DESATIVADO - useEffect removido para evitar loop

  // ✅ INICIALIZAR FEED QUANDO O APP MONTA
  useEffect(() => {
    console.log('🎬 Inicializando app...');

    // Salvar timestamp da sessão atual para marcar vídeos novos
    const lastSession = localStorage.getItem('last_app_session');
    if (!lastSession) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      localStorage.setItem('last_app_session', oneDayAgo);
    }
    
    // 🆕 Marcar o PRIMEIRO vídeo da sessão anterior como assistido
    // Isso garante que ao recarregar, o vídeo atual não repita
    initializeFeed();

    // Atualizar timestamp e salvar vídeo atual ao fechar/sair
    return () => {
      localStorage.setItem('last_app_session', new Date().toISOString());
    };
  }, []);

  const createExampleData = (): Video[] => {
    return [];
  };

  // 📱 NOVA LÓGICA: Inicializar feed com primeiro bloco de vídeos + posts agendados
  const initializeFeed = useCallback(async () => {
    // Prevenir múltiplas inicializações simultâneas
    if (isLoadingMore) return;
    try {
      console.log('🎬 INICIANDO CARREGAMENTO DO FEED...');
      setLoading(true);

      // Check cache first for faster initial load
      const CACHE_VERSION = 'v2';
      const cacheKey = `initial_feed_${CACHE_VERSION}`;
      
      // 🆕 DESABILITAR CACHE para garantir que vídeos assistidos nunca repitam
      // O cache de sessionStorage causava repetição ao recarregar a página
      // pois ignorava a memória persistente de vídeos já assistidos
      sessionStorage.removeItem(cacheKey);
      sessionStorage.removeItem(`${cacheKey}_time`);

      // 🎯 PRIORIDADE 1: Carregar posts agendados recentes (publicados hoje)
      console.log('🌟 Carregando posts agendados recentes...');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 🆕 SISTEMA DE DESTAQUE: Carregar posts já visualizados
      const getViewedPosts = (): Set<string> => {
        try {
          const stored = localStorage.getItem('viewed_highlight_posts');
          return new Set(stored ? JSON.parse(stored) : []);
        } catch {
          return new Set();
        }
      };
      const viewedPosts = getViewedPosts();
      console.log(`📋 ${viewedPosts.size} posts em destaque já visualizados`);
      const {
        data: postsAgendados,
        error: postsError
      } = await supabase.from('posts_agendados').select(`
          *,
          modelo:models(*)
        `).eq('status', 'publicado').order('data_publicacao', {
        ascending: false
      }).limit(50);
      const {
        data: postsPrincipais,
        error: principaisError
      } = await supabase.from('posts_principais').select(`
          *,
          modelo:models(*)
        `).gte('created_at', today.toISOString()).order('created_at', {
        ascending: false
      });
      if (postsError) console.warn('⚠️ Erro ao carregar posts agendados:', postsError);
      else console.log('📋 Posts agendados carregados:', postsAgendados?.length || 0, postsAgendados?.map((p: any) => ({ id: p.id, titulo: p.titulo, status: p.status, modelo_id: p.modelo_id })));
      if (principaisError) console.warn('⚠️ Erro ao carregar posts principais:', principaisError);
      else console.log('📋 Posts principais carregados:', postsPrincipais?.length || 0);

      // Carregar todos os vídeos disponíveis (em lotes para não perder nenhum)
      console.log('📋 Carregando catálogo de vídeos...');
      let videosData: any[] = [];
      let videosError: any = null;
      {
        // Primeiro lote: 1000 mais recentes
        const { data: batch1, error: err1 } = await supabase
          .from('videos')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .range(0, 999);
        if (err1) {
          videosError = err1;
        } else {
          videosData = batch1 || [];
          // Se retornou exatamente 1000, buscar mais
          if (videosData.length === 1000) {
            const { data: batch2 } = await supabase
              .from('videos')
              .select('*')
              .eq('is_active', true)
              .order('created_at', { ascending: false })
              .range(1000, 1999);
            if (batch2 && batch2.length > 0) {
              videosData = [...videosData, ...batch2];
              console.log(`📋 Lote adicional carregado: +${batch2.length} vídeos (total: ${videosData.length})`);
            }
          }
        }
      }
      if (videosError) {
        console.error('❌ Erro ao carregar vídeos:', videosError);
        throw videosError;
      }

      // 🔍 DEBUG DETALHADO - Verificar dados dos vídeos
      console.log('🔍 Query videos result:', {
        total: videosData?.length || 0,
        withCreatorId: (videosData as any[])?.filter((v: any) => v.creator_id)?.length || 0,
        withModelId: (videosData as any[])?.filter((v: any) => v.model_id)?.length || 0,
        sample: videosData?.[0] ? {
          id: videosData[0].id,
          title: videosData[0].title,
          creator_id: (videosData[0] as any).creator_id,
          model_id: (videosData[0] as any).model_id,
          is_active: videosData[0].is_active
        } : 'nenhum vídeo',
        creatorVideos: (videosData as any[])?.filter((v: any) => v.creator_id)?.map((v: any) => ({
          id: v.id,
          title: v.title,
          creator_id: v.creator_id
        })) || []
      });
      const {
        data: modelsData,
        error: modelsError
      } = await supabase.from('models').select('*').eq('is_active', true);
      if (modelsError && (modelsError as any).code !== 'PGRST116') {
        console.warn('⚠️ Erro ao carregar modelos:', modelsError);
      }

      // 🔥 Carregar painéis de chat para verificar status online e ativo
      const {
        data: chatPanelsData,
        error: chatPanelsError
      } = await supabase.from('model_chat_panels' as any).select('model_id, creator_id, is_online, is_active');
      if (chatPanelsError) {
        console.warn('⚠️ Erro ao carregar painéis de chat:', chatPanelsError);
      }
      const chatPanelsMap: Record<string, boolean> = {};
      const chatActiveMapTemp: Record<string, boolean> = {};
      const chatOnlineMapTemp: Record<string, boolean> = {};
      (chatPanelsData as any[])?.forEach((panel: any) => {
        const entityId = panel.model_id || panel.creator_id;
        if (entityId) {
          chatPanelsMap[entityId] = panel.is_online;
          chatActiveMapTemp[entityId] = panel.is_active === true;
          chatOnlineMapTemp[entityId] = panel.is_online === true;
        }
      });
      setChatActiveMap(chatActiveMapTemp);
      setChatOnlineMap(chatOnlineMapTemp);

      // Carregar criadores (via user_roles)
      const {
        data: creatorRoles,
        error: rolesError
      } = await (supabase as any).from('user_roles').select('user_id').eq('role', 'creator');
      if (rolesError) {
        console.warn('⚠️ Erro ao carregar roles de criadores:', rolesError);
      }
      let creatorsData: any[] = [];
      if (creatorRoles && creatorRoles.length > 0) {
        const creatorIds = creatorRoles.map((r: any) => r.user_id);
        const {
          data: creatorsProfiles,
          error: creatorsError
        } = await supabase.from('profiles').select('id, name, email, avatar_url, bio').in('id', creatorIds);
        if (creatorsError) {
          console.warn('⚠️ Erro ao carregar perfis de criadores:', creatorsError);
        }
        creatorsData = creatorsProfiles || [];
      }
      console.log(`📊 Dados carregados: ${videosData?.length || 0} vídeos, ${modelsData?.length || 0} modelos, ${creatorsData?.length || 0} criadores, ${(postsAgendados?.length || 0) + (postsPrincipais?.length || 0)} posts recentes`);

      // Debug: Verificar vídeos de criadores no banco
      const videosWithCreatorId = videosData?.filter((v: any) => v.creator_id) || [];
      console.log(`🎨 Vídeos com creator_id no banco: ${videosWithCreatorId.length}`);
      if (videosWithCreatorId.length > 0) {
        console.log('🎨 IDs de criadores com vídeos:', [...new Set(videosWithCreatorId.map((v: any) => v.creator_id))]);
        console.log('🎨 Criadores disponíveis:', creatorsData?.map((c: any) => ({
          id: c.id,
          name: c.name,
          email: c.email
        })));
      }

      // 🔧 FALLBACK: Modelos que existem em 'models' mas NÃO têm vídeos em 'videos'
      // Isso acontece quando o admin cria uma modelo com posting_panel_url mas o vídeo não foi salvo
      const modelIdsWithVideos = new Set((videosData || []).map((v: any) => v.model_id).filter(Boolean));
      const modelsWithoutVideos = (modelsData || []).filter((m: any) => {
        const hasVideo = modelIdsWithVideos.has(m.id);
        const hasUrl = m.posting_panel_url && m.posting_panel_url.trim() !== '';
        return !hasVideo && hasUrl;
      });
      
      if (modelsWithoutVideos.length > 0) {
        console.log(`🔧 ${modelsWithoutVideos.length} modelos sem vídeos na tabela videos - criando entradas automaticamente`);
        
        // Criar registros de vídeo para essas modelos no banco
        const newVideoRecords = modelsWithoutVideos.map((m: any) => ({
          title: `${m.name || m.username} - Vídeo Principal`,
          description: `Conteúdo de ${m.name || m.username}`,
          video_url: m.posting_panel_url,
          thumbnail_url: m.avatar_url || '',
          model_id: m.id,
          visibility: m.is_premium ? 'premium' : 'public',
          is_active: true,
          music_name: 'Som Original'
        }));

        // Nota: Não inserimos no banco aqui pois RLS bloqueia. O ContentModal do admin já faz isso.
        console.log(`📋 ${modelsWithoutVideos.length} modelos exibidos no feed via fallback (posting_panel_url)`);

        // Adicionar ao array de vídeos atual para exibição imediata
        modelsWithoutVideos.forEach((m: any) => {
          videosData.push({
            id: `auto-${m.id}`,
            title: `${m.name || m.username} - Vídeo Principal`,
            description: `Conteúdo de ${m.name || m.username}`,
            video_url: m.posting_panel_url,
            thumbnail_url: m.avatar_url || '',
            model_id: m.id,
            creator_id: null,
            visibility: m.is_premium ? 'premium' : 'public',
            is_active: true,
            music_name: 'Som Original',
            created_at: m.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            likes_count: 0,
            comments_count: 0,
            shares_count: 0,
            views_count: 0
          });
        });
        console.log(`📊 Total de vídeos após fallback: ${videosData.length}`);
      }

      // Utilitários
      const normalizeUrl = (u: string) => {
        const raw = (u || '').trim();
        if (!raw) return '';
        if (!/^https?:\/\//i.test(raw) && /^[\w.-]+\.[\w.-]+/.test(raw)) {
          return `https://${raw}`;
        }
        return raw;
      };
      const isValidVideoUrl = (u: string) => {
        if (!/^https?:\/\//i.test(u)) return false;
        try {
          new URL(u);
          return true;
        } catch {
          return false;
        }
      };
      const isToday = (iso?: string) => {
        if (!iso) return false;
        const d = new Date(iso);
        const now = new Date();
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      };
      const interactedModelIds: Set<string> = new Set<string>((() => {
        try {
          const raw = localStorage.getItem('interacted_model_ids');
          if (!raw) return [] as string[];
          const arr = JSON.parse(raw);
          return Array.isArray(arr) ? arr : [];
        } catch {
          return [] as string[];
        }
      })());

      // 🎯 Processar posts agendados recentes como prioridade
      const processedScheduledPosts = (postsAgendados || []).filter(post => !viewedPosts.has(`scheduled-${post.id}`)) // 🆕 Filtrar já visualizados
      .map(post => {
        const model = post.modelo || modelsData?.find((m: any) => m.id === post.modelo_id);
        const contentUrl = normalizeUrl(post.conteudo_url || '');
        if (!contentUrl || !isValidVideoUrl(contentUrl) && !contentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return null;
        }
        return {
          id: `scheduled-${post.id}`,
          video_url: contentUrl,
          title: post.titulo || 'Conteúdo Agendado',
          user_id: post.modelo_id || 'unknown',
          model_id: post.modelo_id || 'unknown',
          music_name: 'Novo Conteúdo',
          visibility: 'public' as const,
          source: 'scheduled_post',
          isHighlighted: true,
          // 🆕 Marcar como destaque
          created_at: post.data_publicacao || post.created_at,
          user: model ? {
            id: model.id || post.modelo_id || 'unknown',
            username: model.username || model.name || 'Usuário',
            avatar_url: model.avatar_url || '',
            followers_count: model.followers_count || 0,
            following_count: 0,
            is_online: chatPanelsMap[model.id] || false,
            bio: model.bio || '',
            posting_panel_url: model.posting_panel_url || '',
            created_at: model.created_at || ''
          } : {
            id: post.modelo_id || 'unknown',
            username: post.modelo_username || 'Usuário',
            avatar_url: '',
            followers_count: 0,
            following_count: 0,
            is_online: false,
            bio: '',
            created_at: ''
          }
        } as any;
      }).filter(Boolean);
      const processedMainPosts = (postsPrincipais || []).filter(post => !viewedPosts.has(`main-${post.id}`)) // 🆕 Filtrar já visualizados
      .map(post => {
        const model = post.modelo || modelsData?.find((m: any) => m.id === post.modelo_id);
        const contentUrl = normalizeUrl(post.conteudo_url || '');
        if (!contentUrl || !isValidVideoUrl(contentUrl) && !contentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return null;
        }
        return {
          id: `main-${post.id}`,
          video_url: contentUrl,
          title: post.titulo || 'Novo Conteúdo',
          user_id: post.modelo_id || 'unknown',
          model_id: post.modelo_id || 'unknown',
          music_name: 'Novo Conteúdo',
          visibility: 'public' as const,
          source: 'main_post',
          isHighlighted: true,
          // 🆕 Marcar como destaque
          created_at: post.created_at,
          user: model ? {
            id: model.id || post.modelo_id || 'unknown',
            username: model.username || model.name || 'Usuário',
            avatar_url: model.avatar_url || '',
            followers_count: model.followers_count || 0,
            following_count: 0,
            is_online: chatPanelsMap[model.id] || false,
            bio: model.bio || '',
            posting_panel_url: model.posting_panel_url || '',
            created_at: model.created_at || ''
          } : {
            id: post.modelo_id || 'unknown',
            username: post.modelo_username || 'Usuário',
            avatar_url: '',
            followers_count: 0,
            following_count: 0,
            is_online: false,
            bio: '',
            created_at: ''
          }
        } as any;
      }).filter(Boolean);

      // Normalizar e enriquecer vídeos válidos do catálogo
      const validVideos = (videosData || []).map(v => ({
        ...v,
        video_url: normalizeUrl(v.video_url || '')
      })).filter(v => {
        const isValid = isValidVideoUrl(v.video_url);
        if (!isValid && v.video_url) {
          console.warn(`🚫 URL inválida filtrada: ${v.video_url}`);
        }
        return isValid;
      }).map((video: any) => {
        // Procurar owner: priorizar creator_id, depois model_id
        const owner: any = video.creator_id ? creatorsData?.find((c: any) => c.id === video.creator_id) : modelsData?.find((m: any) => m.id === video.model_id);

        // Se é criador, formatar nome
        let ownerData: any = owner;
        if (video.creator_id && owner) {
          const displayName = owner.name && owner.name !== owner.email ? owner.name : owner.email?.split('@')[0] || 'Criador';
          ownerData = {
            id: owner.id,
            username: displayName,
            name: displayName,
            avatar_url: owner.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png',
            followers_count: 0,
            is_live: false,
            bio: owner.bio || '',
            posting_panel_url: '',
            created_at: owner.created_at || ''
          };
        } else if (owner) {
          // Para modelos, verificar status online do chat panel
          ownerData = {
            ...owner,
            is_live: chatPanelsMap[owner.id] || false
          };
        }
        return {
          ...video,
          user_id: video.creator_id || video.model_id || '',
          music_name: video.title || `Som original - ${ownerData?.username || ownerData?.name || 'Autor'}`,
          visibility: video.visibility as 'public' | 'premium' || 'public',
          source: 'catalog_video',
          user: ownerData ? {
            id: ownerData.id,
            username: ownerData.username || ownerData.name || 'Usuário',
            avatar_url: ownerData.avatar_url || '',
            followers_count: ownerData.followers_count || 0,
            following_count: 0,
            is_online: ownerData.is_live || false,
            bio: ownerData.bio || '',
            posting_panel_url: ownerData.posting_panel_url || '',
            created_at: ownerData.created_at || ''
          } : {
            id: video.creator_id || video.model_id || '',
            username: video.creator_id ? 'Criador' : 'Modelo',
            avatar_url: '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png',
            followers_count: 0,
            following_count: 0,
            is_online: false,
            bio: '',
            created_at: ''
          }
        } as any;
      });
      console.log(`✅ Conteúdo processado: ${processedScheduledPosts.length} posts agendados, ${processedMainPosts.length} posts principais, ${validVideos.length} vídeos válidos`);

      // Debug: Verificar quantos vídeos são de criadores
      const creatorVideos = validVideos.filter((v: any) => v.creator_id);
      const modelVideos = validVideos.filter((v: any) => v.model_id && !v.creator_id);
      console.log(`📊 Vídeos por tipo: ${creatorVideos.length} de criadores, ${modelVideos.length} de modelos`);
      console.log('🎨 Criadores com vídeos:', [...new Set(creatorVideos.map((v: any) => v.user?.username))]);
      const allContent = [...processedScheduledPosts, ...processedMainPosts, ...validVideos];
      if (allContent.length > 0) {
        // 🌟 PRIORIDADE MÁXIMA: Posts agendados recentes sempre no topo
        const recentPosts = [...processedScheduledPosts, ...processedMainPosts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        console.log(`🌟 ${recentPosts.length} posts agendados/principais serão destacados no início`);

        // 🆕 DETECTAR MODELOS NOVOS (criados nas últimas 48h pelo admin) e marcar como destaque
        const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
        const newModelIds = new Set<string>();
        (modelsData || []).forEach((m: any) => {
          const createdAt = new Date(m.created_at).getTime();
          if (createdAt > fortyEightHoursAgo) {
            newModelIds.add(m.id);
            console.log(`🌟 Modelo nova detectada: ${m.name || m.username} (criada ${new Date(m.created_at).toLocaleString()})`);
          }
        });

        // 🆕 CARREGAR MEMÓRIA DE VÍDEOS JÁ ASSISTIDOS (persistente entre sessões)
        let watchedVideoIds = new Set<string>();
        try {
          const memoryRaw = localStorage.getItem('intelligent_feed_memory');
          if (memoryRaw) {
            const memory = JSON.parse(memoryRaw);
            watchedVideoIds = new Set(memory.videos_vistos || []);
          }
        } catch {}
        console.log(`👁️ ${watchedVideoIds.size} vídeos já assistidos pelo usuário`);

        // 1) Organizar vídeos do catálogo por modelo e preparar filas internas
        const videosByModel: Record<string, any[]> = {};
        validVideos.forEach((v: any) => {
          const mid = v.creator_id || v.model_id || v.user?.id || '';
          if (!mid) return;
          if (!videosByModel[mid]) videosByModel[mid] = [];
          
          // 🆕 Marcar vídeos de modelos novos como destaque
          if (newModelIds.has(mid)) {
            v.isHighlighted = true;
            v.isNewModel = true;
          }
          
          videosByModel[mid].push(v);
        });

        // Ordenar fila de cada modelo: hoje primeiro, depois mais recentes
        Object.keys(videosByModel).forEach(mid => {
          videosByModel[mid].sort((a, b) => {
            const aToday = isToday(a.created_at);
            const bToday = isToday(b.created_at);
            if (aToday !== bToday) return aToday ? -1 : 1;
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bTime - aTime;
          });
        });

        // 2) Definir ordem dos modelos e criadores (prioriza novos, hoje, interação, MAIS VÍDEOS)
        const modelIdsWithVideos = Object.keys(videosByModel);
        const modelScores: Record<string, number> = {};
        modelIdsWithVideos.forEach(mid => {
          const queue = videosByModel[mid] || [];
          const hasToday = queue.some(v => isToday(v.created_at));
          const interacted = interactedModelIds.has(mid);
          const isNewModel = newModelIds.has(mid);
          const modelInfo = modelsData?.find((m: any) => m.id === mid) || creatorsData?.find((c: any) => c.id === mid);
          let score = 0;
          if (isNewModel) score += 2000;
          if (hasToday) score += 1000;
          if (interacted) score += 500;
          // 🆕 Modelos com MAIS vídeos têm prioridade (mantém fila mais longa)
          score += queue.length * 10;
          score += (modelInfo?.followers_count || 0) * 0.001;
          score += Math.random() * 5;
          modelScores[mid] = score;
        });
        const orderedModels = modelIdsWithVideos.sort((a, b) => (modelScores[b] || 0) - (modelScores[a] || 0));

        // 3) Round-robin: 1 vídeo por modelo por ciclo, até esgotar filas
        const catalogVideos: any[] = [];
        let remaining = true;
        while (remaining) {
          remaining = false;
          for (const mid of orderedModels) {
            const queue = videosByModel[mid];
            if (queue && queue.length) {
              catalogVideos.push(queue.shift()!);
              remaining = true;
            }
          }
        }

        // 🆕 SEPARAR VÍDEOS EM NÃO-ASSISTIDOS E ASSISTIDOS
        const unwatchedCatalog: any[] = [];
        const watchedCatalog: any[] = [];
        catalogVideos.forEach(v => {
          if (watchedVideoIds.has(v.id)) {
            watchedCatalog.push(v);
          } else {
            unwatchedCatalog.push(v);
          }
        });
        console.log(`📊 Feed: ${unwatchedCatalog.length} não-assistidos + ${watchedCatalog.length} já assistidos`);

        // 🆕 VÍDEOS DE MODELOS NOVAS sempre no início (mesmo se já assistidos)
        const newModelVideos: any[] = [];
        const regularUnwatched: any[] = [];
        unwatchedCatalog.forEach(v => {
          if (v.isNewModel) {
            newModelVideos.push(v);
          } else {
            regularUnwatched.push(v);
          }
        });

        // 🎯 SEQUÊNCIA FINAL: Posts recentes → Modelos novas → Não-assistidos (NUNCA assistidos já vistos no início)
        // Vídeos já assistidos só aparecem quando não houver mais não-assistidos em loadMoreVideos
        const ordered: any[] = [
          ...recentPosts,           // Posts agendados recentes sempre no topo
          ...newModelVideos,        // Vídeos de modelos novas em destaque
          ...regularUnwatched,      // Vídeos ainda não assistidos
          // watchedCatalog NÃO entra aqui — só é usado em loadMoreVideos quando acabar os novos
        ];

        // 4) Definir estados (carregamento em blocos)
        const firstBlock = ordered.slice(0, VIDEOS_PER_BLOCK);
        setAllAvailableVideos(ordered as any);
        setVideos(firstBlock as any);
        setCurrentVideoIndex(0);
        setCurrentPage(1);
        setHasMoreVideos(true); // Sempre true — feed infinito
        setModelOrder(orderedModels);
        setCycleSize(orderedModels.length);
        console.log(`🎯 Feed organizado: ${recentPosts.length} posts recentes + ${catalogVideos.length} vídeos rotativos = ${ordered.length} total. Exibindo primeiros ${firstBlock.length}.`);

        // 🆕 NÃO usar cache de sessionStorage para evitar repetição de vídeos
        // A memória persistente (localStorage) é a fonte de verdade
      } else {
        console.warn('⚠️ Nenhum conteúdo válido encontrado - criando exemplo');
        const exampleData = createExampleData();
        setVideos(exampleData as any);
        setAllAvailableVideos(exampleData as any);
        setHasMoreVideos(false);
      }
      console.log('✅ IF/ELSE CONCLUÍDO - indo para FINALLY');
    } catch (error) {
      console.error('❌ Erro ao inicializar feed:', error);
      setVideos([]);
      setAllAvailableVideos([]);
      setHasMoreVideos(false);
    } finally {
      console.log('🏁 FINALIZANDO CARREGAMENTO DO FEED - setLoading(false)');
      setLoading(false);
      setIsLoadingMore(false);

      // Iniciar reprodução automaticamente se usuário já verificou idade
      const verified = localStorage.getItem('ageVerification');
      if (verified) {
        console.log('✅ Usuário já verificado, iniciando reprodução automática');
        setTimeout(() => {
          setIsPlaying(true);
        }, 800);
      }
      console.log('🎉 initializeFeed COMPLETO!');
    }
  }, []);

  // Simplificar - não precisamos mais desta função separada

  // useEffect para inicializar o feed
  useEffect(() => {
    console.log('🚀 INICIALIZANDO APLICATIVO - Carregando dados...');
    console.log('🔍 Estado inicial de loading:', loading);
    initializeFeed();
  }, []); // Executar apenas uma vez na montagem

  // 🎬 FILTRAR VÍDEOS POR GÊNERO SELECIONADO
  useEffect(() => {
    if (allAvailableVideos.length === 0 || !selectedGenre) return;
    console.log('🎬 Filtrando por gênero:', selectedGenre);
    if (selectedGenre === 'Todos') {
      // Mostrar todos os vídeos
      const firstBlock = allAvailableVideos.slice(0, VIDEOS_PER_BLOCK);
      setVideos(firstBlock);
      setCurrentVideoIndex(0);
      setHasMoreVideos(allAvailableVideos.length > VIDEOS_PER_BLOCK);
      console.log(`📋 Mostrando todos: ${firstBlock.length} vídeos`);
    } else {
      // Filtrar vídeos pelo gênero selecionado
      const filteredVideos = allAvailableVideos.filter((video: any) => {
        const videoGenres = video.genres || [];
        return videoGenres.includes(selectedGenre);
      });
      const firstBlock = filteredVideos.slice(0, VIDEOS_PER_BLOCK);
      setVideos(firstBlock);
      setCurrentVideoIndex(0);
      setHasMoreVideos(filteredVideos.length > VIDEOS_PER_BLOCK);
      console.log(`🎬 Filtrado por "${selectedGenre}": ${firstBlock.length} vídeos de ${filteredVideos.length} total`);
    }

    // Resetar carousel
    if (emblaApi) {
      emblaApi.scrollTo(0);
    }
  }, [selectedGenre, allAvailableVideos, emblaApi]);

  // Escutar mudanças de gênero de outros componentes
  useEffect(() => {
    const handleGenreChange = (e: CustomEvent) => {
      if (e.detail?.genre) {
        console.log('🎬 Gênero alterado via evento:', e.detail.genre);
      }
    };
    window.addEventListener('genreChanged', handleGenreChange as EventListener);
    return () => {
      window.removeEventListener('genreChanged', handleGenreChange as EventListener);
    };
  }, []);

  // 🎯 Posicionar no vídeo específico quando vindo de coleções ou links diretos
  useEffect(() => {
    if (!targetVideoId || videos.length === 0) return;
    const videoIndex = videos.findIndex(v => v.id === targetVideoId);
    console.log('🎯 Procurando vídeo:', targetVideoId, 'Encontrado no índice:', videoIndex);
    if (videoIndex >= 0) {
      console.log('✅ Posicionando no vídeo:', videoIndex);
      setCurrentVideoIndex(videoIndex);
      // Scroll do carousel para o vídeo específico
      if (emblaApi) {
        emblaApi.scrollTo(videoIndex);
      }
      // Limpar parâmetro da URL após posicionar
      setSearchParams({});
    }
  }, [targetVideoId, videos, emblaApi, setSearchParams]);

  // 🎯 Abrir perfil quando vindo de /app?profile=... OU via state (URL amigável)
  useEffect(() => {
    const profileToOpen = targetProfileId || stateProfileId;
    if (!profileToOpen || loading) return;
    
    console.log('👤 Abrindo perfil via URL:', profileToOpen, 'friendlyUrl:', friendlyUrl);
    
    // Chamar goToModelVideo para abrir o perfil
    goToModelVideo(profileToOpen);
    
    // Se veio de URL amigável, restaurar ela na barra de endereços
    if (friendlyUrl) {
      window.history.replaceState({}, '', friendlyUrl);
    } else {
      // Limpar parâmetro da URL se não tinha URL amigável
      setSearchParams({});
    }
  }, [targetProfileId, stateProfileId, loading]);

  // 🔄 LÓGICA: Detectar fim do ciclo e aplicar refresh pendente (novos vídeos do admin)
  useEffect(() => {
    if (!pendingRefresh) return;
    // Quando há refresh pendente (novo vídeo adicionado pelo admin),
    // recarregar o feed completo ao chegar no fim dos vídeos atuais
    const realVideos = videos.filter(v => !v.id.startsWith('promo-'));
    const isNearEnd = currentVideoIndex >= realVideos.length - 3;
    if (isNearEnd) {
      console.log('🔄 Aplicando refresh pendente - novos vídeos do admin detectados...');
      setTimeout(() => {
        initializeFeed();
        setPendingRefresh(false);
      }, 1000);
    }
  }, [pendingRefresh, currentVideoIndex, videos, initializeFeed]);

  // Remover função de organização complexa - usar abordagem mais simples

  // 📱 NOVA LÓGICA: Carregar próximo bloco de vídeos (simplificado)
  const loadMoreVideos = useCallback(async () => {
    if (isLoadingMore || allAvailableVideos.length === 0) {
      return;
    }
    try {
      setIsLoadingMore(true);
      console.log(`🔄 Carregando mais vídeos... Página: ${currentPage + 1}`);

      // Pegar vídeos reais (sem promos) já no feed
      const realVideosInFeed = videos.filter(v => !v.id.startsWith('promo-'));
      const realCount = realVideosInFeed.length;

      // 🆕 CARREGAR MEMÓRIA DE VÍDEOS JÁ ASSISTIDOS
      let watchedVideoIds = new Set<string>();
      try {
        const memoryRaw = localStorage.getItem('intelligent_feed_memory');
        if (memoryRaw) {
          const memory = JSON.parse(memoryRaw);
          watchedVideoIds = new Set(memory.videos_vistos || []);
        }
      } catch {}

      // IDs originais já no feed (para evitar duplicatas reais)
      const idsInFeed = new Set(realVideosInFeed.map(v => (v as any)._originalId || v.id));

      // Priorizar vídeos NÃO assistidos e NÃO no feed
      const unwatched = allAvailableVideos.filter(v => 
        !watchedVideoIds.has(v.id) && !idsInFeed.has(v.id)
      );

      let nextBlock: any[];
      if (unwatched.length >= VIDEOS_PER_BLOCK) {
        // Temos vídeos não-assistidos suficientes
        nextBlock = unwatched.slice(0, VIDEOS_PER_BLOCK).map((v, i) => ({
          ...v,
          id: `${v.id}-block-${currentPage}-${i}`,
          _originalId: v.id,
        }));
      } else {
        // Não há suficientes — usar não-assistidos + ciclar os já assistidos
        const watched = allAvailableVideos.filter(v => 
          watchedVideoIds.has(v.id) && !idsInFeed.has(v.id)
        );
        // Embaralhar assistidos para variedade
        const shuffledWatched = [...watched].sort(() => Math.random() - 0.5);
        const combined = [...unwatched, ...shuffledWatched].slice(0, VIDEOS_PER_BLOCK);
        nextBlock = combined.map((v, i) => ({
          ...v,
          id: `${v.id}-block-${currentPage}-${i}`,
          _originalId: v.id,
        }));
      }

      // Adicionar ao feed (promos serão reinjetadas pelo useEffect)
      setVideos(prev => {
        const withoutPromos = prev.filter(v => !v.id.startsWith('promo-'));
        return [...withoutPromos, ...nextBlock];
      });
      setCurrentPage(prev => prev + 1);
      setHasMoreVideos(true);
      console.log(`✅ Bloco adicionado: ${nextBlock.length} vídeos (${unwatched.length} não-assistidos disponíveis)`);
    } catch (error) {
      console.error('❌ Erro ao carregar mais vídeos:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, allAvailableVideos, videos, currentPage, VIDEOS_PER_BLOCK]);

  // 📱 Carregamento automático infinito quando próximo do fim
  useEffect(() => {
    const shouldLoadMore = currentVideoIndex >= videos.length - 10;

    if (shouldLoadMore && !isLoadingMore && videos.length > 0 && allAvailableVideos.length > 0) {
      console.log('🔄 AUTO-LOAD INFINITO: Carregando mais vídeos...', {
        currentVideoIndex,
        videosLength: videos.length,
      });
      loadMoreVideos();
    }
  }, [currentVideoIndex, videos.length, isLoadingMore, allAvailableVideos.length, loadMoreVideos]);

  // Abrir vídeo selecionado de um perfil na tela principal
  const openSelectedVideo = async (videoId: string) => {
    try {
      const {
        data: vData,
        error: vErr
      } = await supabase.from('videos').select('*').eq('id', videoId).single();
      if (vErr || !vData) return;
      const {
        data: model,
        error: mErr
      } = await supabase.from('models').select('*').eq('id', vData.model_id).single();
      if (mErr) console.warn('Model not found for video:', videoId);
      const normalizeUrl = (u: string) => {
        const raw = (u || '').trim();
        if (!raw) return '';
        if (!/^https?:\/\//i.test(raw) && /^[\w.-]+\.[\w.-]+/.test(raw)) {
          return `https://${raw}`;
        }
        return raw;
      };
      const enrichedVideo: any = {
        ...vData,
        video_url: normalizeUrl(vData.video_url || ''),
        user_id: vData.model_id || '',
        music_name: vData.title || `Som original - ${model?.username || model?.name || 'Autor'}`,
        user: model ? {
          id: model.id,
          username: model.username || model.name || 'Usuário',
          avatar_url: model.avatar_url || '',
          followers_count: model.followers_count || 0,
          following_count: 0,
          is_online: model.is_live || false,
          created_at: model.created_at || ''
        } : {
          id: vData.model_id || '',
          username: vData.title || 'Usuário',
          avatar_url: '',
          followers_count: 0,
          following_count: 0,
          is_online: false,
          created_at: ''
        }
      };
      const modelId = enrichedVideo.user?.id;
      const idx = videos.findIndex(v => (v as any).user?.id === modelId);
      if (idx >= 0) {
        const arr = [...videos];
        arr[idx] = enrichedVideo;
        setVideos(arr);
        emblaApi?.scrollTo(idx);
        setCurrentVideoIndex(idx);
      } else {
        const arr = [enrichedVideo, ...videos];
        setVideos(arr);
        emblaApi?.scrollTo(0);
        setCurrentVideoIndex(0);
      }
      setShowProfile(false);
    } catch (e) {
      console.error('Erro ao abrir vídeo selecionado:', e);
    }
  };
  // 🔗 Handler para fechar perfil e restaurar URL /app
  const handleCloseProfile = useCallback(() => {
    console.log('❌ Fechando perfil');
    setShowProfile(false);
    // Restaurar URL para /app
    if (window.location.pathname !== '/app') {
      window.history.replaceState({}, '', '/app');
    }
  }, []);

  const goToHome = () => {
    console.log('🏠 Voltando para a tela inicial');
    setShowProfile(false);
    setCurrentVideoIndex(0);
    emblaApi?.scrollTo(0);
    // Restaurar URL para /app
    if (window.location.pathname !== '/app') {
      window.history.replaceState({}, '', '/app');
    }
  };
  const backToCurrentVideo = () => {
    console.log('🏠 Voltando para onde parou a visualização');
    setShowProfile(false);
    setShowComments(false);
    setShowSearch(false);
    setShowLive(false);
    // Restaurar URL para /app
    if (window.location.pathname !== '/app') {
      window.history.replaceState({}, '', '/app');
    }
    // Mantém o vídeo atual sem mudar o índice
  };
  const loadComments = useCallback(async (videoId: string) => {
    try {
      console.log('💬 LOADING COMMENTS for video:', videoId);

      // ✅ Buscar comentários sem JOIN problemático
      const {
        data: commentsData,
        error
      } = await supabase.from('comments').select('*').eq('video_id', videoId).order('created_at', {
        ascending: false
      });
      if (error) {
        console.error('❌ Error loading comments:', error);
        if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.log('📝 Comments table não existe, usando array vazio...');
          setComments([]);
          return;
        }
        throw error;
      }
      console.log('💬 Comments loaded:', commentsData?.length || 0);

      // ✅ Buscar dados dos usuários separadamente
      const userIds = [...new Set((commentsData || []).map(c => c.user_id))];
      const {
        data: profilesData
      } = await supabase.from('profiles').select('id, name, email').in('id', userIds);
      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

      // Transform the data to match the Comment interface
      const transformedComments = (commentsData || []).map((comment: any) => {
        const profile = profilesMap.get(comment.user_id);

        // ✅ Buscar avatar do localStorage ou usar padrão
        const avatarUrl = localStorage.getItem(`avatar_${comment.user_id}`) || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png';
        return {
          id: comment.id,
          text: comment.content || comment.text || '',
          user_id: comment.user_id,
          video_id: comment.video_id,
          likes_count: comment.likes_count || 0,
          created_at: comment.created_at,
          user: {
            username: profile?.name || profile?.email?.split('@')[0] || `User ${comment.user_id?.slice(0, 8)}`,
            avatar_url: avatarUrl
          }
        };
      });
      setComments(transformedComments);
      console.log('✅ Comments transformados e prontos:', transformedComments.length);
    } catch (error) {
      console.error('❌ Error loading comments:', error);
      setComments([]);
    }
  }, []);
  const checkIfLiked = async (videoId: string) => {
    try {
      // ✅ Usar ID correto: autenticado se logado, anônimo se não
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      const currentUserId = user?.id || localStorage.getItem('anonymous_user_id') || (() => {
        const newId = crypto.randomUUID();
        localStorage.setItem('anonymous_user_id', newId);
        return newId;
      })();
      console.log('🔍 CHECKING IF LIKED:');
      console.log('🔍 Video ID:', videoId);
      console.log('🔍 User ID:', currentUserId);

      // Check if user has an active like for this video in database
      const {
        data,
        error
      } = await supabase.from('likes').select('id, is_active').eq('user_id', currentUserId).eq('video_id', videoId).eq('is_active', true).maybeSingle();
      if (error) {
        console.error('❌ Error checking like status:', error);
        if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.log('📝 Likes table não existe, usando localStorage...');
          const liked = localStorage.getItem(`liked_${videoId}`);
          setIsLiked(liked === 'true');
          return;
        }
        setIsLiked(false);
        return;
      }
      const liked = data ? true : false;
      console.log('🔍 IS LIKED:', liked);
      setIsLiked(liked);
      // Also update localStorage for consistency
      if (videoId) {
        localStorage.setItem(`liked_${videoId}`, String(liked));
      }
    } catch (error) {
      console.error('Error in checkIfLiked:', error);
      // Fallback to localStorage
      const liked = localStorage.getItem(`liked_${videoId}`);
      setIsLiked(liked === 'true');
    }
  };
  const checkIfFollowing = async (modelId: string) => {
    try {
      console.log('🔍 VERIFICANDO STATUS DE SEGUIR:', modelId);

      // ✅ USAR ID DO USUÁRIO AUTENTICADO se estiver logado
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      const userId = user?.id || localStorage.getItem('anonymous_user_id') || (() => {
        const newId = crypto.randomUUID();
        localStorage.setItem('anonymous_user_id', newId);
        return newId;
      })();
      console.log('🔍 User ID:', userId, user ? '(autenticado)' : '(anônimo)');

      // 1. Verificar no localStorage primeiro (mais rápido)
      const followKey = `follow_${userId}_${modelId}`;
      const localStatus = localStorage.getItem(followKey);
      if (localStatus === 'true') {
        console.log('✅ IS FOLLOWING (localStorage): true');
        setFollowingModels(prev => ({
          ...prev,
          [modelId]: true
        }));
        return;
      }

      // 2. Verificar no banco de dados
      const {
        data,
        error
      } = await supabase.from('model_followers').select('id').eq('user_id', userId).eq('model_id', modelId).eq('is_active', true).maybeSingle();
      if (error) {
        console.error('❌ Error checking if following:', error);
        setFollowingModels(prev => ({
          ...prev,
          [modelId]: false
        }));
        return;
      }
      const following = data ? true : false;
      console.log('🔍 IS FOLLOWING (database):', following);

      // Sincronizar com localStorage
      if (following) {
        localStorage.setItem(followKey, 'true');
      }
      setFollowingModels(prev => ({
        ...prev,
        [modelId]: following
      }));
    } catch (error) {
      console.error('Error in checkIfFollowing:', error);
      setFollowingModels(prev => ({
        ...prev,
        [modelId]: false
      }));
    }
  };
  const toggleLike = async () => {
    if (!currentVideo) return;
    console.log('🔥 TOGGLE LIKE - Iniciando para vídeo:', currentVideo.id);

    // ✅ Usar ID correto: autenticado se logado, anônimo se não
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    const currentUserId = user?.id || localStorage.getItem('anonymous_user_id') || (() => {
      const newId = crypto.randomUUID();
      localStorage.setItem('anonymous_user_id', newId);
      return newId;
    })();
    console.log('🔥 TOGGLE LIKE - User ID:', currentUserId, user ? '(autenticado)' : '(anônimo)');
    try {
      // Primeiro, verificar se já existe like para este usuário/vídeo
      const {
        data: existingLike,
        error: checkError
      } = await supabase
        .from('likes')
        .select('id, is_active')
        .eq('user_id', currentUserId)
        .eq('video_id', currentVideo.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar like existente:', checkError);
        throw checkError;
      }

      console.log('🔍 VERIFICAÇÃO: Like existente:', existingLike);
      let newLikedState = true;
      let didPersistNewLike = false;

      if (existingLike?.is_active) {
        // ✅ Regra de negócio: curtida não pode ser removida no segundo clique
        newLikedState = true;
      } else if (existingLike && !existingLike.is_active) {
        // Reativar curtida antiga
        const {
          error: updateError
        } = await supabase
          .from('likes')
          .update({ is_active: true })
          .eq('id', existingLike.id);

        if (updateError) throw updateError;
        didPersistNewLike = true;
        console.log(`✅ LIKE REATIVADO - ID: ${existingLike.id}`);
      } else {
        // Criar nova curtida
        const {
          error: insertError
        } = await supabase
          .from('likes')
          .insert({
            user_id: currentUserId,
            video_id: currentVideo.id,
            // ✅ Para vídeos de criadores, model_id deve ser null (evita FK violation)
            model_id: currentVideo.creator_id ? null : currentVideo.model_id || null,
            is_active: true,
            ip_address: null,
            user_agent: navigator.userAgent
          });

        if (insertError) {
          console.error('❌ Error inserting like:', insertError);
          // Se erro for de coluna não existir, tentar inserção mais simples
          if (insertError.message?.includes('column') || insertError.code === '42703') {
            console.log('🔧 Tentando inserção simplificada...');
            const {
              error: simpleError
            } = await supabase
              .from('likes')
              .insert({
                user_id: currentUserId,
                video_id: currentVideo.id,
                is_active: true
              });

            if (simpleError) throw simpleError;
          } else {
            throw insertError;
          }
        }

        didPersistNewLike = true;
        console.log('✅ LIKE CRIADO com sucesso');
      }

      // Atualizar estado local (sempre curtido)
      setIsLiked(newLikedState);
      if (currentVideo.id) {
        localStorage.setItem(`liked_${currentVideo.id}`, 'true');
      }

      // Registrar analytics apenas quando houve nova persistência de curtida
      const userId = currentVideo.user?.id || currentVideo.model_id || '';
      const modelId = currentVideo.model_id || userId;
      if (didPersistNewLike && userId) {
        await trackLike(currentVideo.id, userId, true);
        ensureInteractedModel(userId);
        await checkAndTrackAction('like', currentVideo.id, userId);

        // 🧠 FEED INTELIGENTE: Marcar modelo/criador como favorito ao dar like
        if (markModelAsFavorite) {
          markModelAsFavorite(userId);
        }

        // 🎯 TRACKING: Registrar interesse forte por like
        if (currentUser?.id) {
          const entityId = currentVideo.creator_id || currentVideo.model_id || userId;
          trackStrongInterest(currentUser.id, entityId, 'like', (currentVideo as any).tags);
        }
      }

      // Fonte da verdade: total de likes ativos no banco
      const { count: liveLikesCount, error: countError } = await supabase
        .from('likes')
        .select('id', { count: 'exact', head: true })
        .eq('video_id', currentVideo.id)
        .eq('is_active', true);

      if (countError) throw countError;

      const newCount = Math.max(0, liveLikesCount || 0);

      const { error } = await supabase
        .from('videos')
        .update({ likes_count: newCount })
        .eq('id', currentVideo.id);

      if (error) throw error;

      // Update local state
      setVideos(prev => prev.map(video => video.id === currentVideo.id ? {
        ...video,
        likes_count: newCount
      } : video));

      if (didPersistNewLike) {
        // Add like explosion animation apenas quando a curtida foi gravada agora
        createLikeExplosion();
      }

      console.log('✅ LIKE processado! Count atual:', newCount);
    } catch (error) {
      console.error('❌ TOGGLE LIKE - Erro:', error);
      // Silenciar erro de like para o usuário
    }
  };
  const createLikeExplosion = () => {
    const heart = document.createElement('div');
    heart.innerHTML = '❤️';
    heart.className = 'like-explosion-heart';
    heart.style.left = Math.random() * window.innerWidth + 'px';
    heart.style.top = Math.random() * window.innerHeight + 'px';
    document.body.appendChild(heart);
    setTimeout(() => {
      document.body.removeChild(heart);
    }, 1200);
  };
  const addComment = async (text: string) => {
    if (!currentVideo || !text.trim()) return;
    console.log('💬 ADD COMMENT - Iniciando para vídeo:', currentVideo.id);
    try {
      // ✅ Usar ID correto: autenticado se logado, anônimo se não
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      const currentUserId = user?.id || localStorage.getItem('anonymous_user_id') || (() => {
        const newId = crypto.randomUUID();
        localStorage.setItem('anonymous_user_id', newId);
        return newId;
      })();
      console.log('💬 ADD COMMENT - User ID:', currentUserId, user ? '(autenticado)' : '(anônimo)');
      console.log('💬 ADD COMMENT - Inserindo:', {
        text: text.trim(),
        user_id: currentUserId,
        video_id: currentVideo.id
      });
      const {
        error
      } = await supabase.from('comments').insert({
        content: text.trim(),
        user_id: currentUserId,
        video_id: currentVideo.id,
        // ✅ Para vídeos de criadores, model_id deve ser null (evita FK violation)
        model_id: currentVideo.creator_id ? null : currentVideo.model_id || null,
        likes_count: 0,
        ip_address: null,
        user_agent: navigator.userAgent
      });
      if (error) {
        console.error('❌ Error inserting comment:', error);

        // 🔧 Se falhar por RLS, tentar inserção simplificada
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          console.log('🔧 Tentando inserção simplificada devido a RLS...');
          await supabase.from('comments').insert({
            content: text.trim(),
            user_id: currentUserId,
            video_id: currentVideo.id
          });
          console.log('✅ Comentário inserido em modo simplificado');
        } else {
          throw error;
        }
      } else {
        console.log('✅ Comment inserted successfully');
      }

      // Recarregar comentários para mostrar o novo com dados atualizados
      await loadComments(currentVideo.id);

      // ✨ IMPORTANTE: Registrar no sistema de analytics
      await trackComment(currentVideo.id, currentVideo.user?.id || '');
      await checkAndTrackAction('comment', currentVideo.id, currentVideo.user_id);

      // Update video comments count
      const newCount = currentVideo.comments_count + 1;
      await supabase.from('videos').update({
        comments_count: newCount
      }).eq('id', currentVideo.id);
      setVideos(prev => prev.map(video => video.id === currentVideo.id ? {
        ...video,
        comments_count: newCount
      } : video));
      console.log('✅ ADD COMMENT - Ação completa! Novo count:', newCount);

      // ✨ Forçar reload dos comentários para garantir sincronização  
      await loadComments(currentVideo.id);
      toast({
        title: "Comentário adicionado!",
        description: "Seu comentário foi publicado"
      });
    } catch (error) {
      console.error('❌ ADD COMMENT - Erro:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o comentário",
        variant: "destructive"
      });
    }
  };
  const shareVideo = async () => {
    if (!currentVideo) return;
    console.log('📤 SHARE VIDEO - Iniciando para vídeo:', currentVideo.id);
    try {
      // ✅ Usar ID correto: autenticado se logado, anônimo se não
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      const currentUserId = user?.id || localStorage.getItem('anonymous_user_id') || (() => {
        const newId = crypto.randomUUID();
        localStorage.setItem('anonymous_user_id', newId);
        return newId;
      })();
      console.log('📤 SHARE VIDEO - User ID:', currentUserId, user ? '(autenticado)' : '(anônimo)');

      // Temporarily increment shares_count until shares table types are updated
      const {
        data: videoData
      } = await supabase.from('videos').select('shares_count').eq('id', currentVideo.id).single();
      const currentShares = videoData?.shares_count || 0;
      const {
        error: shareError
      } = await supabase.from('videos').update({
        shares_count: currentShares + 1
      }).eq('id', currentVideo.id);
      if (shareError) {
        console.warn('❌ Error registering share (continuing anyway):', shareError);
        // Continue with share functionality even if DB insert fails
      } else {
        console.log('✅ SHARE registrado no banco de dados');
      }

      // ✨ IMPORTANTE: Registrar no sistema de analytics
      await trackShare(currentVideo.id, currentVideo.user?.id || '');
      await checkAndTrackAction('share', currentVideo.id, currentVideo.user_id);

      // Use Web Share API for real sharing with fallback
      if (navigator.share) {
        try {
          await navigator.share({
            title: currentVideo.title,
            text: currentVideo.description,
            url: `${window.location.origin}/app?video=${currentVideo.id}`
          });
        } catch (shareError) {
          console.log('Web Share cancelled or failed:', shareError);
          // Fallback to clipboard if Web Share fails
          await navigator.clipboard.writeText(`${window.location.origin}/app?video=${currentVideo.id}`);
          toast({
            title: "Link copiado!",
            description: "Link do vídeo copiado para a área de transferência"
          });
        }
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/app?video=${currentVideo.id}`);
        toast({
          title: "Link copiado!",
          description: "Link do vídeo copiado para a área de transferência"
        });
      }

      // Update share count
      const newCount = currentVideo.shares_count + 1;
      await supabase.from('videos').update({
        shares_count: newCount
      }).eq('id', currentVideo.id);
      setVideos(prev => prev.map(video => video.id === currentVideo.id ? {
        ...video,
        shares_count: newCount
      } : video));
      console.log('✅ SHARE VIDEO - Ação completa! Novo count:', newCount);
    } catch (error) {
      console.error('❌ SHARE VIDEO - Erro:', error);
      toast({
        title: "Erro",
        description: "Não foi possível compartilhar o vídeo",
        variant: "destructive"
      });
    }
  };
  const followModel = async () => {
    console.log('🔥 SEGUIR: Função followModel CHAMADA!');
    if (!currentVideo) {
      console.log('❌ SEGUIR: Nenhum vídeo atual');
      return;
    }
    const currentIsFollowing = followingModels[currentVideo.user.id] || false;
    const isCreator = !!currentVideo.creator_id;
    console.log('🔍 SEGUIR: Status atual:', {
      userId: currentVideo.user.id,
      username: currentVideo.user.username,
      isFollowing: currentIsFollowing,
      isCreator,
      creatorId: currentVideo.creator_id,
      modelId: currentVideo.model_id
    });
    if (currentIsFollowing) {
      console.log('⚠️ SEGUIR: Já está seguindo');
      toast({
        title: `Você já segue ${currentVideo.user.username}`,
        description: "Você já está seguindo este perfil",
        duration: 3000
      });
      return;
    }
    console.log(`✅ SEGUIR: Iniciando processo - ${isCreator ? 'CRIADOR' : 'MODELO'}`);
    try {
      // ✅ USAR ID DO USUÁRIO AUTENTICADO se estiver logado
      const {
        data: {
          user: authUser
        }
      } = await supabase.auth.getUser();
      const userId = authUser?.id || localStorage.getItem('anonymous_user_id') || (() => {
        const newId = crypto.randomUUID();
        localStorage.setItem('anonymous_user_id', newId);
        return newId;
      })();
      console.log('🆔 SEGUIR: User ID:', userId, authUser ? '(autenticado)' : '(anônimo)');

      // Atualizar estado local IMEDIATAMENTE
      console.log('💾 SEGUIR: Atualizando estado local...');
      setFollowingModels(prev => ({
        ...prev,
        [currentVideo.user.id]: true
      }));

      // Obter dados do usuário autenticado para nome/email
      const userName = authUser?.user_metadata?.full_name || authUser?.email || 'Usuário';
      const userEmail = authUser?.email || '';
      console.log('👤 SEGUIR: Usuário:', userName, userEmail);

      // DIFERENCIAÇÃO: Criador vs Modelo
      if (isCreator) {
        // É um CRIADOR → usar tabela user_follows
        console.log('🎨 SEGUIR CRIADOR: Inserindo em user_follows...');
        const {
          error: followError
        } = await (supabase as any).from('user_follows').upsert({
          follower_id: userId,
          following_id: currentVideo.creator_id,
          follower_name: userName,
          follower_email: userEmail,
          is_active: true
        }, {
          onConflict: 'follower_id,following_id'
        });
        if (followError) {
          console.error('❌ SEGUIR CRIADOR: Erro no banco:', followError);
        } else {
          console.log('✅ SEGUIR CRIADOR: Inserido em user_follows');
        }
      } else {
        // É um MODELO → usar tabela model_followers
        console.log('👤 SEGUIR MODELO: Inserindo em model_followers...');
        const {
          error: followError
        } = await supabase.from('model_followers').upsert({
          user_id: userId,
          model_id: currentVideo.model_id || currentVideo.user.id,
          user_name: userName,
          user_email: userEmail,
          is_active: true
        }, {
          onConflict: 'user_id,model_id'
        });
        if (followError) {
          console.error('❌ SEGUIR MODELO: Erro no banco:', followError);
        } else {
          console.log('✅ SEGUIR MODELO: Inserido em model_followers');
        }
      }

      // Salvar no localStorage
      const followKey = `follow_${userId}_${currentVideo.user.id}`;
      localStorage.setItem(followKey, 'true');
      console.log('💾 SEGUIR: Salvo no localStorage:', followKey);

      // 📊 REGISTRAR AÇÃO NO PAINEL ADMIN
      console.log('📊 SEGUIR: Registrando no analytics...');
      await trackFollow(currentVideo.user.id);

      // Atualizar contador localmente
      setVideos(prev => prev.map(video => video.user.id === currentVideo.user.id ? {
        ...video,
        user: {
          ...video.user,
          followers_count: video.user.followers_count + 1
        }
      } : video));
      console.log('✅✅✅ SEGUIR: Processo concluído com SUCESSO!');
      toast({
        title: `✅ Você está seguindo ${currentVideo.user.username}!`,
        description: "Agora você receberá atualizações dos novos conteúdos",
        duration: 4000
      });
    } catch (error) {
      console.error('❌❌❌ SEGUIR: Erro no processo:', error);

      // Reverter estado local em caso de erro
      setFollowingModels(prev => ({
        ...prev,
        [currentVideo.user.id]: false
      }));
      toast({
        title: "❌ Erro ao seguir",
        description: "Não foi possível seguir a modelo. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  const nextVideo = useCallback(() => {
    if (emblaApi) {
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      } else {
        emblaApi.scrollTo(0);
        setCurrentVideoIndex(0);
      }
    } else {
      if (currentVideoIndex < videos.length - 1) {
        setCurrentVideoIndex(currentVideoIndex + 1);
      } else {
        setCurrentVideoIndex(0);
      }
    }
  }, [emblaApi, currentVideoIndex, videos.length]);
  const prevVideo = useCallback(() => {
    if (emblaApi) {
      if (emblaApi.canScrollPrev()) {
        emblaApi.scrollPrev();
      }
    } else {
      if (currentVideoIndex > 0) {
        setCurrentVideoIndex(currentVideoIndex - 1);
      }
    }
  }, [emblaApi, currentVideoIndex]);
  const goToModelVideo = async (modelId: string) => {
    console.log('🔍 Buscando vídeo do perfil:', modelId);

    // Primeiro tentar encontrar nos vídeos já carregados
    const modelVideoIndex = videos.findIndex(video => video.user.id === modelId || video.model_id === modelId || video.creator_id === modelId);
    if (modelVideoIndex !== -1) {
      console.log('✅ Perfil encontrado nos vídeos carregados, indo para índice:', modelVideoIndex);
      setCurrentVideoIndex(modelVideoIndex);
      emblaApi?.scrollTo(modelVideoIndex);
      setShowProfile(true);
      return;
    }

    // Verificar se é um criador primeiro
    try {
      console.log('🔍 Verificando se é criador...');
      const {
        data: creatorCheck
      } = await supabase.from('user_roles' as any).select('user_id').eq('user_id', modelId).eq('role', 'creator').maybeSingle();
      const isCreator = !!creatorCheck;
      console.log('🎯 É criador?', isCreator);
      if (isCreator) {
        // Buscar perfil do criador
        console.log('🔄 Carregando perfil do criador...');
        const {
          data: creatorProfile,
          error: profileError
        } = await (supabase as any).from('profiles').select('*').eq('id', modelId).single();
        if (profileError || !creatorProfile) {
          console.error('❌ Perfil do criador não encontrado:', profileError);
          return;
        }

        // Buscar vídeos do criador
        console.log('🔄 Carregando vídeos do criador...');
        const {
          data: videoData,
          error: videoError
        } = await (supabase as any).from('videos').select('*').eq('creator_id', modelId).eq('is_active', true).limit(1);
        if (!videoData || videoData.length === 0) {
          console.log('ℹ️ Nenhum vídeo ativo encontrado para o criador');
          toast({ title: 'Este criador ainda não publicou vídeos', variant: 'destructive' });
          return;
        }

        // Transformar o primeiro vídeo encontrado
        console.log('✅ Vídeo do criador encontrado');
        const video = videoData[0];
        const profile = creatorProfile as any;
        const enrichedVideo = {
          ...video,
          title: video.title || `Vídeo ${video.id.slice(0, 8)}`,
          description: video.description || '',
          user_id: modelId,
          creator_id: modelId,
          music_name: video.title || `Som original - ${profile.name || profile.username || 'Criador'}`,
          visibility: (video.visibility === 'premium' ? 'premium' : 'public') as 'public' | 'premium',
          likes_count: video.likes_count || 0,
          comments_count: video.comments_count || 0,
          shares_count: video.shares_count || 0,
          views_count: video.views_count || 0,
          is_active: true,
          created_at: video.created_at,
          user: {
            id: profile.id,
            username: profile.username || profile.name || 'Criador',
            avatar_url: profile.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png',
            followers_count: 0,
            following_count: 0,
            is_online: false,
            created_at: profile.created_at || new Date().toISOString(),
            bio: profile.bio || ''
          }
        };

        // Adicionar o vídeo no início da lista
        const newVideos = [enrichedVideo, ...videos];
        setVideos(newVideos as Video[]);
        setCurrentVideoIndex(0);
        emblaApi?.scrollTo(0);
        setShowProfile(true);
        console.log('✅ Vídeo do criador carregado e perfil aberto');
        return;
      }

      // Se não é criador, buscar como modelo
      console.log('🔄 Carregando como modelo...');
      const {
        data: modelData,
        error: modelError
      } = await supabase.from('models').select('*').eq('id', modelId).single();
      if (modelError || !modelData) {
        console.error('❌ Modelo não encontrada:', modelError);
        toast({ title: 'Modelo não encontrada', variant: 'destructive' });
        return;
      }

      // Buscar vídeo na tabela videos
      const {
        data: videoData,
        error: videoError
      } = await supabase.from('videos').select('*').eq('model_id', modelId).eq('is_active', true).limit(1);

      // Se não encontrou em videos, buscar em posts_agendados
      if (!videoData || videoData.length === 0) {
        console.log('🔍 Buscando em posts agendados...');
        const {
          data: scheduledPosts,
          error: scheduledError
        } = await supabase.from('posts_agendados').select('*').eq('modelo_id', modelId).eq('status', 'publicado').limit(1);
        if (scheduledPosts && scheduledPosts.length > 0) {
          const post = scheduledPosts[0];
          const normalizeUrl = (u: string) => {
            const raw = (u || '').trim();
            if (!raw) return '';
            if (!/^https?:\/\//i.test(raw) && /^[\w.-]+\.[\w.-]+/.test(raw)) {
              return `https://${raw}`;
            }
            return raw;
          };
          const enrichedVideo = {
            id: `scheduled-${post.id}`,
            video_url: normalizeUrl(post.conteudo_url || ''),
            title: post.titulo || 'Post Agendado',
            description: post.descricao || '',
            user_id: modelId,
            model_id: modelId,
            music_name: post.titulo || `Som original - ${modelData?.username}`,
            visibility: 'public' as const,
            likes_count: 0,
            comments_count: 0,
            shares_count: 0,
            views_count: 0,
            is_active: true,
            created_at: post.data_publicacao || post.created_at,
            user: {
              id: modelData.id,
              username: modelData.username,
              avatar_url: modelData.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png',
              followers_count: modelData.followers_count || 0,
              following_count: 0,
              is_online: modelData.is_live || false,
              created_at: modelData.created_at || new Date().toISOString(),
              bio: modelData.bio || ''
            }
          };
          const newVideos = [enrichedVideo, ...videos];
          setVideos(newVideos as Video[]);
          setCurrentVideoIndex(0);
          emblaApi?.scrollTo(0);
          setShowProfile(true);
          console.log('✅ Post agendado carregado e perfil aberto');
          return;
        }

        // Se não encontrou em posts agendados, buscar em posts_principais
        console.log('🔍 Buscando em posts principais...');
        const {
          data: mainPosts,
          error: mainError
        } = await supabase.from('posts_principais').select('*').eq('modelo_id', modelId).limit(1);
        if (mainPosts && mainPosts.length > 0) {
          const post = mainPosts[0];
          const normalizeUrl = (u: string) => {
            const raw = (u || '').trim();
            if (!raw) return '';
            if (!/^https?:\/\//i.test(raw) && /^[\w.-]+\.[\w.-]+/.test(raw)) {
              return `https://${raw}`;
            }
            return raw;
          };
          const enrichedVideo = {
            id: `main-${post.id}`,
            video_url: normalizeUrl(post.conteudo_url || ''),
            title: post.titulo || 'Post Principal',
            description: post.descricao || '',
            user_id: modelId,
            model_id: modelId,
            music_name: post.titulo || `Som original - ${modelData?.username}`,
            visibility: 'public' as const,
            likes_count: 0,
            comments_count: 0,
            shares_count: 0,
            views_count: 0,
            is_active: true,
            created_at: post.created_at,
            user: {
              id: modelData.id,
              username: modelData.username,
              avatar_url: modelData.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png',
              followers_count: modelData.followers_count || 0,
              following_count: 0,
              is_online: modelData.is_live || false,
              created_at: modelData.created_at || new Date().toISOString(),
              bio: modelData.bio || ''
            }
          };
          const newVideos = [enrichedVideo, ...videos];
          setVideos(newVideos as Video[]);
          setCurrentVideoIndex(0);
          emblaApi?.scrollTo(0);
          setShowProfile(true);
          console.log('✅ Post principal carregado e perfil aberto');
          return;
        }

        // Mesmo sem vídeo, abrir perfil da modelo com vídeo placeholder
        console.log('ℹ️ Nenhum vídeo encontrado, abrindo perfil da modelo sem vídeo');
        const placeholderVideo = {
          id: `placeholder-${modelId}`,
          video_url: '',
          title: modelData?.name || modelData?.username || 'Modelo',
          description: '',
          user_id: modelId,
          model_id: modelId,
          music_name: `${modelData?.username || 'Modelo'}`,
          visibility: 'public' as const,
          likes_count: 0,
          comments_count: 0,
          shares_count: 0,
          views_count: 0,
          is_active: true,
          created_at: modelData?.created_at || new Date().toISOString(),
          user: {
            id: modelData.id,
            username: modelData.username,
            avatar_url: modelData.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png',
            followers_count: modelData.followers_count || 0,
            following_count: 0,
            is_online: modelData.is_live || false,
            created_at: modelData.created_at || new Date().toISOString(),
            bio: modelData.bio || ''
          }
        };
        const newVideos = [placeholderVideo, ...videos];
        setVideos(newVideos as Video[]);
        setCurrentVideoIndex(0);
        emblaApi?.scrollTo(0);
        setShowProfile(true);
        console.log('✅ Perfil da modelo aberto (sem vídeo)');
        return;
      }

      // Transformar o primeiro vídeo encontrado da tabela videos
      console.log('✅ Vídeo encontrado na tabela videos');
      const video = videoData[0];
      const enrichedVideo = {
        ...video,
        title: video.title || `Vídeo ${video.id.slice(0, 8)}`,
        description: video.description || '',
        user_id: modelId,
        model_id: modelId,
        music_name: video.title || `Som original - ${modelData?.username}`,
        visibility: (video.visibility === 'premium' ? 'premium' : 'public') as 'public' | 'premium',
        likes_count: video.likes_count || 0,
        comments_count: video.comments_count || 0,
        shares_count: video.shares_count || 0,
        views_count: video.views_count || 0,
        is_active: true,
        created_at: video.created_at,
        user: {
          id: modelData.id,
          username: modelData.username,
          avatar_url: modelData.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png',
          followers_count: modelData.followers_count || 0,
          following_count: 0,
          is_online: modelData.is_live || false,
          created_at: modelData.created_at || new Date().toISOString(),
          bio: modelData.bio || ''
        }
      };

      // Adicionar o vídeo no início da lista
      const newVideos = [enrichedVideo, ...videos];
      setVideos(newVideos as Video[]);
      setCurrentVideoIndex(0);
      emblaApi?.scrollTo(0);
      setShowProfile(true);
      console.log('✅ Vídeo da modelo carregado e perfil aberto');
    } catch (error) {
      console.error('❌ Erro ao carregar vídeo da modelo:', error);
    }
  };
  const handleBlockVideo = () => {
    if (!currentVideo) {
      console.log('❌ Nenhum vídeo atual para bloquear');
      return;
    }
    console.log('🔒 Bloqueando vídeo:', currentVideo.title);
    console.log('🔒 User:', currentVideo.user.username);

    // Redireciona para página de assinatura premium
    navigate('/subscribe');
  };
  const handleFullscreen = () => {
    if (!currentVideo) return;
    console.log('📺 handleFullscreen chamado');

    // Capturar tempo atual do vídeo
    const videoElement = document.querySelector('video') as HTMLVideoElement;
    if (videoElement) {
      setFullscreenVideoTime(videoElement.currentTime);
      console.log('📺 Tempo capturado:', videoElement.currentTime);
    }
    setShowFullscreen(true);
    console.log('📺 showFullscreen definido como true');
  };
  const handleCloseFullscreen = () => {
    console.log('📺 handleCloseFullscreen chamado');
    setShowFullscreen(false);
    console.log('📺 showFullscreen definido como false');
  };

  // (onSelect handler already registered above)

  // Keyboard navigation for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isMobile && !showProfile && !showComments && !showChat && !showSearch && !showLive) {
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            prevVideo();
            break;
          case 'ArrowDown':
            e.preventDefault();
            nextVideo();
            break;
          case ' ':
            e.preventDefault();
            setIsPlaying(!isPlaying);
            break;
        }
      }
    };

    // Mouse wheel for desktop
    const handleWheel = (e: WheelEvent) => {
      if (!isMobile && !showProfile && !showComments && !showChat && !showSearch && !showLive) {
        e.preventDefault();
        if (e.deltaY > 0) {
          nextVideo();
        } else {
          prevVideo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, {
      passive: false
    });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [isMobile, isPlaying, nextVideo, prevVideo, showProfile, showComments, showChat, showSearch, showLive]);

  // Remove old touch gestures - now handled by Embla

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Carregando vídeos...</p>
        </div>
      </div>;
  }
  if (!currentVideo || videos.length === 0) {
    console.log('🚫 RENDER: Nenhum vídeo disponível');
    console.log('🚫 RENDER: videos.length:', videos.length);
    console.log('🚫 RENDER: currentVideoIndex:', currentVideoIndex);
    console.log('🚫 RENDER: currentVideo:', currentVideo);
    console.log('🚫 RENDER: selectedGenre:', selectedGenre);

    // Verifica se é filtro por gênero ou realmente sem vídeos
    const isGenreFiltered = selectedGenre && selectedGenre !== 'Todos';
    const currentGenreData = genres.find(g => g.name === selectedGenre);
    return <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center px-6 max-w-sm">
          {isGenreFiltered ? <>
              {/* Mensagem de "Vídeos em Breve" para gênero filtrado */}
              <div className="text-6xl mb-4">{currentGenreData?.icon || '🎬'}</div>
              <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-teal-400 to-yellow-400 bg-clip-text text-transparent">
                Vídeos em Breve
              </h2>
              <p className="text-gray-400 mb-6">
                Ainda não há vídeos de <span className="font-semibold text-white">"{selectedGenre}"</span> disponíveis.
              </p>
              <div className="space-y-3">
                <Button onClick={() => setSelectedGenre('Todos')} className="w-full bg-gradient-to-r from-teal-500 to-yellow-500 hover:from-teal-600 hover:to-yellow-600 text-black font-semibold">
                  <Film className="w-4 h-4 mr-2" />
                  Ver Todos os Vídeos
                </Button>
                <p className="text-xs text-gray-500">
                  Novos vídeos são adicionados diariamente
                </p>
              </div>
            </> : <>
              {/* Mensagem padrão sem vídeos */}
              <p className="text-xl mb-4">Nenhum vídeo disponível</p>
              <p className="text-gray-400 mb-4">Aguarde novos conteúdos!</p>
              <Button onClick={initializeFeed} className="bg-primary hover:bg-primary/80">
                Recarregar
              </Button>
            </>}
        </div>
      </div>;
  }
  console.log('✅ RENDER: Renderizando vídeo');
  console.log('✅ RENDER: currentVideo:', currentVideo?.title);
  console.log('✅ RENDER: currentVideoIndex:', currentVideoIndex);
  console.log('✅ RENDER: videos.length:', videos.length);

  // Mobile version with vertical swiper
  if (isMobile) {
    return <div className="relative w-full h-screen bg-white overflow-hidden [&::-webkit-scrollbar]:hidden [-webkit-scrollbar:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        
        {/* Top Bar Mobile - Nova barra com ícones */}
        <div className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4" style={{
        background: 'transparent'
      }}>
          {/* Menu - Esquerda */}
          <div className="flex items-center gap-2">
            <CategoryMenu onOpenLive={() => setShowLiveList(true)} onSelectModel={modelId => goToModelVideo(modelId)} onExit={async () => {
            try {
              sessionStorage.setItem('logging_out', 'true');
              await supabase.auth.signOut();
              navigate('/auth', {
                replace: true
              });
              setTimeout(() => {
                sessionStorage.removeItem('logging_out');
              }, 500);
            } catch (error) {
              console.error('Erro ao fazer logout:', error);
              sessionStorage.removeItem('logging_out');
              navigate('/auth', {
                replace: true
              });
            }
          }} />
          </div>
          
          {/* Logo removida do mobile - exibida apenas no desktop */}
          
          {/* Ícones - Direita */}
          <div className="flex items-center gap-2">
            {/* Search/Lupa */}
            <button onClick={() => setShowSearch(true)} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/40 transition-colors" title="Pesquisar">
              <Search className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Bonus Gift - Mantém o componente original para a funcionalidade */}
        <div className="hidden">
          <BonusGift isMobile={true} />
        </div>

        {import.meta.env.DEV && <button onClick={() => {
        localStorage.removeItem('ageVerification');
        console.log('🧪 TESTE: Verificação removida, recarregue a página');
        toast({
          title: "Teste de Verificação",
          description: "Recarregue a página para ver o popup novamente"
        });
      }} className="hidden md:block fixed top-4 right-4 z-30 px-3 py-1 bg-red-500/80 backdrop-blur-sm rounded-full text-white text-xs hover:bg-red-600/80 transition-colors">
            🧪 Reset +18
          </button>}

        {/* Side Menu - Mobile positioning - Só aparece na tela principal */}
        {!showProfile && !showChat && <div className="fixed top-20 right-3 z-[9999] pointer-events-auto">
            <SideMenu video={currentVideo} isLiked={isLiked} isMuted={isMuted} isPlaying={isPlaying} volume={volume} isFollowing={followingModels[currentVideo?.user?.id] || false} onToggleLike={() => {
          console.log('Mobile like clicked via SideMenu');
          toggleLike();
        }} onToggleSound={() => {
          console.log('Mobile sound toggle clicked via SideMenu');
          setIsMuted(!isMuted);
        }} onVolumeChange={setVolume} onTogglePlay={() => {
          console.log('Mobile play toggle clicked via SideMenu');
          setIsPlaying(!isPlaying);
        }} onToggleFollow={() => {
          console.log('Mobile follow clicked via SideMenu');
          followModel();
        }} onOpenComments={async () => {
          console.log('Mobile comments clicked via SideMenu');
          await checkAndTrackAction('comment', currentVideo?.id, currentVideo?.user?.id);
          await trackComment(currentVideo?.id || '', currentVideo?.user?.id || '');
          setShowComments(true);
        }} onOpenProfile={async () => {
          console.log('Mobile profile clicked via SideMenu');
          await checkAndTrackAction('profile_view', currentVideo?.id, currentVideo?.user?.id);
          await trackFollow(currentVideo?.user?.id || '');
          setShowProfile(true);
        }} onOpenLive={() => {
          console.log('Mobile live clicked via SideMenu');
          setShowLiveList(true);
        }} onBlockVideo={undefined} onFullscreen={handleFullscreen} onShare={shareVideo} />
          </div>}

        {/* Barra de Navegação Inferior - Estilo TikTok */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-black border-t border-gray-800 flex items-center justify-around px-2 z-[60] pb-safe">
          <button onClick={backToCurrentVideo} className="flex flex-col items-center justify-center flex-1 text-white hover:text-gray-300 transition-colors">
            <Home className="w-7 h-7 mb-0.5" strokeWidth={1.5} />
            <span className="text-xs">Início</span>
          </button>

          <button onClick={() => navigate('/explore')} className="flex flex-col items-center justify-center flex-1 text-white hover:text-gray-300 transition-colors">
            <Compass className="w-7 h-7 mb-0.5" strokeWidth={1.5} />
            <span className="text-xs">Explorar</span>
          </button>

          <button onClick={() => setShowVideoCallList(true)} className="flex items-center justify-center w-12 h-9 bg-white rounded-lg shadow-lg -mt-2">
            <Plus className="w-8 h-8 text-black" strokeWidth={2.5} />
          </button>

          <button onClick={() => navigate('/marketplace')} className="flex flex-col items-center justify-center flex-1 text-white hover:text-gray-300 transition-colors">
            <ShoppingBag className="w-7 h-7 mb-0.5" strokeWidth={1.5} />
            <span className="text-xs">Marketplace</span>
          </button>

          <button onClick={() => navigate('/profile')} className="flex flex-col items-center justify-center flex-1 text-white hover:text-gray-300 transition-colors">
            <User className="w-7 h-7 mb-0.5" strokeWidth={1.5} />
            <span className="text-xs">Perfil</span>
          </button>
        </div>

        {/* Vertical Carousel Container */}
        <div className="embla h-screen" ref={emblaRef}>
          <div className="embla__container h-full flex flex-col">
            {videos.map((video, index) => {
              const isPromoVideo = video.id.startsWith('promo-');
              return (
                <div key={video.id} className="embla__slide flex-shrink-0 w-full relative" style={{ height: '100dvh' }}>
                  <VideoPlayer ref={index === currentVideoIndex ? videoRef : null} video={video} isPlaying={isPlaying && index === currentVideoIndex} isMuted={isMuted} volume={volume} onNext={nextVideo} onPrevious={prevVideo} onDoubleClick={toggleLike} onTogglePlay={() => setIsPlaying(!isPlaying)} />
                  
                  {/* Bottom Info - only show for current video */}
                  {index === currentVideoIndex && <BottomInfo video={video} isNew={isVideoNew(video)} isPlaying={isPlaying} isPremium={video.visibility === 'premium'} isPrivate={(video as any).visibility === 'private'} />}

                   {/* Logo COCONUDI centralizada (mobile) */}
                   {index === currentVideoIndex && (
                     <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30">
                       <img src={coconudiWatermark} alt="COCONUDI" className="w-7 h-7 object-contain opacity-60 drop-shadow-lg" />
                     </div>
                   )}

                   {/* Badge "Patrocinado" alinhado à ESQUERDA (mobile) - abaixo da top bar */}
                   {index === currentVideoIndex && isPromoVideo && (
                     <div className="absolute top-16 left-3 z-30">
                       <span className="bg-pink-500/80 backdrop-blur-sm text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-lg">
                         Patrocinado
                       </span>
                     </div>
                   )}

                   {/* Badge "NOVO" alinhado à ESQUERDA (mobile) - abaixo da top bar */}
                   {index === currentVideoIndex && isVideoNew(video) && (
                     <div className="absolute left-3 z-30" style={{ top: isPromoVideo ? '5.5rem' : '4rem' }}>
                       <span className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-lg animate-pulse flex items-center gap-1">
                         <span className="text-xs">✨</span>
                         <span>NOVO</span>
                       </span>
                     </div>
                   )}

                   {/* Promo overlay: description + CTA + banner */}
                   {index === currentVideoIndex && isPromoVideo && (
                     <div className="absolute bottom-36 left-0 right-16 z-20 px-4 space-y-2">
                       {/* Description */}
                       {(video as any)._promoDescription && (
                         <p className="text-white/90 text-sm drop-shadow-lg line-clamp-2">
                           {(video as any)._promoDescription}
                         </p>
                       )}
                       {/* CTA Button */}
                       {(video as any)._promoCtaText && (video as any)._promoCtaLink && (
                         <button
                           onClick={() => window.open((video as any)._promoCtaLink, '_blank', 'noopener,noreferrer')}
                           className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-2.5 rounded-lg shadow-lg text-sm"
                         >
                           {(video as any)._promoCtaText}
                         </button>
                       )}
                       {/* Banner */}
                       {(video as any)._promoBannerUrl && (
                         <div 
                           className="w-full rounded-lg overflow-hidden shadow-lg cursor-pointer"
                           onClick={() => (video as any)._promoCtaLink && window.open((video as any)._promoCtaLink, '_blank', 'noopener,noreferrer')}
                         >
                           <img
                             src={(video as any)._promoBannerUrl}
                             alt="Banner"
                             className="w-full h-auto object-cover max-h-20"
                             onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                           />
                         </div>
                       )}
                     </div>
                   )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Hidden preloader for next video (speeds up decode/start) */}
        {videos[currentVideoIndex + 1]?.video_url && <video src={videos[currentVideoIndex + 1].video_url} preload="auto" muted playsInline style={{
        display: 'none'
      }} />}

        {/* Profile Screen */}
        <ProfileScreen user={currentVideo.user} isOpen={showProfile} onClose={handleCloseProfile} onGoHome={goToHome} isChatActive={!!chatActiveMap[currentVideo.creator_id || currentVideo.model_id || currentVideo.user.id]} onVideoSelect={videoId => {
        openSelectedVideo(videoId);
      }} onOpenChat={() => {
        handleCloseProfile();
        setShowChat(true);
      }} />

        {/* Chat Screen */}
        <ChatScreen isOpen={showChat} onClose={() => {
        setShowChat(false);
        setChatEntity(null);
      }} modelName={chatEntity?.name || currentVideo.user.username} modelAvatar={chatEntity?.avatar || currentVideo.user.avatar_url} entityId={chatEntity?.id || currentVideo.creator_id || currentVideo.model_id || currentVideo.user.id} isCreator={chatEntity?.isCreator || !!currentVideo.creator_id} />

        {/* Comments Screen */}
        <CommentsScreen comments={comments} isOpen={showComments} onClose={() => setShowComments(false)} onAddComment={addComment} videoId={currentVideo?.id} onReloadComments={() => currentVideo?.id && loadComments(currentVideo.id)} />
        
        {/* Search Modal */}
        <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} onSelectModel={modelId => {
        goToModelVideo(modelId);
        setShowSearch(false);
      }} />

        {/* Video Chamada Popup */}
        <VideoCallPopup isOpen={showLive} onClose={() => setShowLive(false)} activeModel={activeVideoCallModel} />
        <VideoCallListPopup isOpen={showVideoCallList} onClose={() => setShowVideoCallList(false)} />
        <LiveListPopup isOpen={showLiveList} onClose={() => setShowLiveList(false)} />

        {/* Action Tracker */}
        <ActionTracker onActionAttempt={async (actionType, userName) => {
        return await handleActionAttempt(actionType, userName);
      }} />

        {/* Promo Popup - Anúncios de Live/Vídeo Chamada */}
        <PromoPopup />
      </div>;
  }

  // Desktop version (TikTok-like desktop layout)
  return <div className="min-h-screen bg-white text-foreground">
      {/* Desktop Header */}
      <div className="sticky top-0 z-[60] flex items-center justify-between px-6 py-3 border-b border-white/10 backdrop-blur-sm bg-gray-900">
        {/* Logo e botão voltar à esquerda */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (showProfile) {
                backToCurrentVideo();
                return;
              }
              navigate('/');
            }}
            title={showProfile ? 'Voltar ao feed' : 'Voltar ao início'}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 hover:scale-110"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div 
            className="flex items-center justify-center w-[50px] h-[50px] rounded-full overflow-hidden bg-transparent cursor-pointer hover:scale-105 transition-transform"
            onClick={() => {
              setCurrentVideoIndex(0);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            title="Ir para o início"
          >
            <img src={coconudiLogo} alt="Coconudi" className="w-[50px] h-[50px] object-contain" />
          </div>
        </div>
        
        {/* Logo Centralizada */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <img 
            src={coconudiHeaderLogo} 
            alt="CocoNudi Logo" 
            className="h-14 w-auto object-contain drop-shadow-lg"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
            }}
          />
        </div>
        
        {/* Controles à direita */}
        <div className="flex items-center space-x-3">
          {/* Indicador de Gênero Selecionado */}
          {selectedGenre && selectedGenre !== 'Todos' && (
            <button 
              onClick={() => setSelectedGenre('Todos')} 
              className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors" 
              title="Clique para ver todos os gêneros"
            >
              <span className="text-sm">{genres.find(g => g.name === selectedGenre)?.icon || '🎬'}</span>
              <span className="text-sm font-medium text-white">{selectedGenre}</span>
              <span className="text-xs text-white/60">×</span>
            </button>
          )}
          <button 
            onClick={() => setShowSearch(true)} 
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors" 
            title="Pesquisar"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bonus Gift Component - Hidden, just for functionality */}
      <div className="hidden">
        <BonusGift isMobile={false} />
      </div>
      
      {/* Desktop Main Content with Sidebar */}
      <div className="flex">
        {/* Left Sidebar Menu */}
        <div className="w-64 bg-black border-r border-gray-800 min-h-[calc(100vh-73px)] overflow-y-auto relative z-10">
          <div className="py-6 relative z-20">
            {/* Header do Usuário - Desktop */}
            <UserMenuHeader />
            
            <div className="space-y-1 mt-4" style={{
            pointerEvents: 'auto'
          }}>
              <button onClick={() => setShowVideoCallList(true)} className="w-full flex items-center px-6 py-3 text-white hover:bg-white/10 transition-colors">
                <span className="relative inline-flex items-center justify-center mr-3">
                  <span className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" />
                  <Phone className="w-5 h-5 text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.8)] animate-[vibrate_0.3s_linear_infinite]" strokeWidth={1.5} />
                </span>
                <span>Vídeo Chamada</span>
              </button>
              <button onClick={() => {
                setShowLiveList(true);
              }} className="w-full flex items-center px-6 py-3 text-white hover:bg-white/10 transition-colors">
                <span className="relative inline-flex items-center justify-center mr-3">
                  <span className="absolute inset-0 rounded-full bg-red-400/20 animate-ping" />
                  <Radio className="w-5 h-5 text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.8)] animate-[vibrate_0.3s_linear_infinite]" strokeWidth={1.5} />
                </span>
                <span>Live</span>
              </button>
              <button onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              console.log('👥 SEGUINDO: Botão clicado, navegando para /following');
              window.location.href = '/following';
            }} className="w-full flex items-center px-6 py-3 text-white hover:bg-white/10 transition-colors cursor-pointer" type="button">
                <Users className="w-5 h-5 mr-3" />
                <span>Seguindo</span>
              </button>
              <button onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🛍️ Clicou Market-Place - Navegando...');
              navigate('/marketplace');
            }} className="w-full flex items-center px-6 py-3 text-white hover:bg-white/10 transition-colors cursor-pointer">
                <ShoppingBag className="w-5 h-5 mr-3" />
                <span>Marketplace</span>
              </button>
              <button onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              console.log('📍 Clicou Negócios Locais - Navegando...');
              window.location.href = '/local-business';
            }} className="w-full flex items-center px-6 py-3 text-white hover:bg-white/10 transition-colors cursor-pointer relative z-50" style={{
              pointerEvents: 'auto'
            }}>
                <MapPin className="w-5 h-5 mr-3" />
                <span>Negócios Locais</span>
              </button>
              <button onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              console.log('📚 Clicou Coleções - Navegando...');
              window.location.href = '/collections';
            }} className="w-full flex items-center px-6 py-3 text-white hover:bg-white/10 transition-colors cursor-pointer relative z-50" style={{
              pointerEvents: 'auto'
            }}>
                <BookmarkPlus className="w-5 h-5 mr-3" />
                <span>Coleções</span>
              </button>
              
              {/* Seletor de Gênero - Desktop */}
              <div className="px-2 py-2 border-t border-white/10 mt-2">
                <p className="text-xs text-gray-400 mb-2 px-4">Filtrar por Gênero</p>
                <GenreSelector onGenreSelect={genre => {
                console.log('🎬 Gênero selecionado (desktop):', genre);
              }} showLabel={false} triggerClassName="w-full justify-start px-4 py-2.5 text-white hover:bg-white/10 rounded-lg cursor-pointer" />
              </div>
              
              {!isPremium && <button onClick={() => {
              console.log('👑 Botão VIP clicado - Navegando para /subscribe');
              navigate('/subscribe');
            }} className="w-full flex items-center px-6 py-3 text-white hover:bg-white/10 transition-colors">
                  <Crown className="w-5 h-5 mr-3 text-amber-400" />
                  <span className="text-amber-400 font-medium">Seja VIP</span>
                </button>}
              {isCreator === true && creatorLoading === false && <button onClick={() => {
              console.log('🎯 Botão Creator Studio clicado - Navegando para /creator-studio');
              navigate('/creator-studio');
            }} className="w-full flex items-center px-6 py-3 text-white hover:bg-white/10 transition-colors">
                  <Sparkles className="w-5 h-5 mr-3" />
                  <span>Estudio do Criador </span>
                </button>}
              <button onClick={() => {
              console.log('🚪 Botão Sair clicado (Desktop) - abrindo AlertDialog');
              setShowLogoutAlert(true);
            }} className="w-full flex items-center px-6 py-3 text-white hover:bg-white/10 transition-colors">
                <LogOut className="w-5 h-5 mr-3" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>

        {/* Video Content Area */}
        <div className="flex-1 flex justify-center items-start pt-6 px-4">
        <div className="flex max-w-7xl w-full gap-4">
          {/* Video Container */}
          <div className="flex-1 max-w-md mx-auto relative pr-24 md:pr-28 lg:pr-32 xl:pr-36">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-[9/16] max-h-[80vh]">
              <VideoPlayer ref={videoRef} video={currentVideo} isPlaying={isPlaying} isMuted={isMuted} volume={volume} onNext={nextVideo} onPrevious={prevVideo} onDoubleClick={toggleLike} onTogglePlay={() => setIsPlaying(!isPlaying)} />

              {/* Desktop: Logo + NOVO + Patrocinado na MESMA LINHA */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
                {/* Badge NOVO à esquerda */}
                {isVideoNew(currentVideo) && (
                  <span className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-lg animate-pulse flex items-center gap-1">
                    <span className="text-xs">✨</span>
                    <span>NOVO</span>
                  </span>
                )}

                {/* Logo centralizada */}
                <img src={coconudiWatermark} alt="COCONUDI" className="w-7 h-7 object-contain opacity-60 drop-shadow-lg" />

                {/* Badge Patrocinado à direita */}
                {currentVideo?.id.startsWith('promo-') && (
                  <span className="bg-pink-500/80 backdrop-blur-sm text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-lg">
                    Patrocinado
                  </span>
                )}
              </div>

              {/* Desktop Footer - Avatar e Nome da modelo */}
              <div className="absolute bottom-4 left-4 right-4 z-20">
                {/* Promo overlay for desktop */}
                {currentVideo?.id.startsWith('promo-') && (
                   <>
                     <div className="space-y-2 mb-3">
                       {(currentVideo as any)._promoDescription && (
                         <p className="text-white/90 text-sm drop-shadow-lg line-clamp-2">
                           {(currentVideo as any)._promoDescription}
                         </p>
                       )}
                       {(currentVideo as any)._promoCtaText && (currentVideo as any)._promoCtaLink && (
                         <button
                           onClick={() => window.open((currentVideo as any)._promoCtaLink, '_blank', 'noopener,noreferrer')}
                           className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-2 rounded-lg shadow-lg text-sm"
                         >
                           {(currentVideo as any)._promoCtaText}
                         </button>
                       )}
                       {(currentVideo as any)._promoBannerUrl && (
                         <div 
                           className="w-full rounded-lg overflow-hidden shadow-lg cursor-pointer"
                           onClick={() => (currentVideo as any)._promoCtaLink && window.open((currentVideo as any)._promoCtaLink, '_blank', 'noopener,noreferrer')}
                         >
                           <img
                             src={(currentVideo as any)._promoBannerUrl}
                             alt="Banner"
                             className="w-full h-auto object-cover max-h-20"
                             onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                           />
                         </div>
                       )}
                     </div>
                   </>
                 )}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/50 shadow-lg">
                    <img src={currentVideo?.user?.avatar_url || '/placeholder.svg'} alt={currentVideo?.user?.username || 'Modelo'} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-white font-semibold text-lg drop-shadow-lg">
                    {currentVideo?.user?.username || 'Modelo'}
                  </p>
                </div>
              </div>

              {/* Desktop Navigation Arrows */}
              <div className="absolute top-1/2 left-6 transform -translate-y-1/2 z-20">
                <Button variant="ghost" size="sm" onClick={prevVideo} disabled={currentVideoIndex === 0} className="bg-black/50 hover:bg-black/70 text-white border border-white/20 backdrop-blur-sm rounded-full w-8 h-8 p-0 disabled:opacity-50">
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </div>

              <div className="absolute top-1/2 right-2 md:right-4 lg:right-6 transform -translate-y-1/2 z-20">
                <Button variant="ghost" size="sm" onClick={nextVideo} disabled={currentVideoIndex === videos.length - 1} className="bg-black/50 hover:bg-black/70 text-white border border-white/20 backdrop-blur-sm rounded-full w-8 h-8 p-0 disabled:opacity-50">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Desktop Side Menu - FORA do overflow-hidden, posicionado à direita */}
            {!showProfile && !showChat && (
              <div className="absolute top-4 -right-2 md:right-0 flex flex-col space-y-4 z-30">
                <SideMenu video={currentVideo} isLiked={isLiked} isMuted={isMuted} isPlaying={isPlaying} volume={volume} isFollowing={followingModels[currentVideo?.user?.id] || false} onToggleLike={() => {
                  console.log('Desktop like clicked');
                  toggleLike();
                }} onToggleSound={() => {
                  console.log('Desktop sound toggle clicked');
                  setIsMuted(!isMuted);
                }} onVolumeChange={setVolume} onTogglePlay={() => {
                  console.log('Desktop play toggle clicked');
                  setIsPlaying(!isPlaying);
                }} onToggleFollow={() => {
                  console.log('Desktop follow clicked');
                  followModel();
                }} onOpenComments={async () => {
                  console.log('Desktop comments clicked');
                  await checkAndTrackAction('comment', currentVideo?.id, currentVideo?.user?.id);
                  await trackComment(currentVideo?.id || '', currentVideo?.user?.id || '');
                  setShowComments(true);
                }} onOpenProfile={async () => {
                  console.log('Desktop profile clicked');
                  await checkAndTrackAction('profile_view', currentVideo?.id, currentVideo?.user?.id);
                  await trackFollow(currentVideo?.user?.id || '');
                  setShowProfile(true);
                }} onOpenLive={() => {
                  console.log('Desktop live clicked');
                  setShowLiveList(true);
                }} onBlockVideo={undefined} onFullscreen={handleFullscreen} onOpenChat={currentVideo && chatActiveMap[currentVideo.creator_id || currentVideo.model_id || currentVideo.user.id] ? () => {
                  console.log('Desktop chat clicked');
                  setChatEntity({
                    name: currentVideo.user.username,
                    avatar: currentVideo.user.avatar_url,
                    id: currentVideo.creator_id || currentVideo.model_id || currentVideo.user.id,
                    isCreator: !!currentVideo.creator_id
                  });
                  setShowChat(true);
                } : undefined} isChatOnline={currentVideo ? chatOnlineMap[currentVideo.creator_id || currentVideo.model_id || currentVideo.user.id] || false : false} onExit={async () => {
                  try {
                    sessionStorage.setItem('logging_out', 'true');
                    await supabase.auth.signOut();
                    navigate('/auth', { replace: true });
                    setTimeout(() => { sessionStorage.removeItem('logging_out'); }, 500);
                  } catch (error) {
                    console.error('Erro ao fazer logout:', error);
                    sessionStorage.removeItem('logging_out');
                    navigate('/auth', { replace: true });
                  }
                }} onShare={shareVideo} />
              </div>
            )}

            {/* Desktop Video Info Below */}
            <div className="mt-4 px-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Seção de perfil do modelo - oculta no desktop */}
                  
                  {/* Desktop Action Buttons - Funcionais */}
                  <div className="flex items-center space-x-4 mt-4">
                    <Button variant="ghost" size="sm" onClick={toggleLike} className={`text-sm transition-all duration-200 ${isLiked ? 'text-red-500 scale-110' : 'text-gray-700 hover:text-red-400'}`}>
                      <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                      {currentVideo.likes_count}
                    </Button>
                    
                    <Button variant="ghost" size="sm" onClick={async () => {
                      await checkAndTrackAction('comment', currentVideo?.id, currentVideo?.user?.id);
                      await trackComment(currentVideo?.id || '', currentVideo?.user?.id || '');
                      setShowComments(true);
                    }} className="text-gray-700 hover:text-blue-400 text-sm transition-colors">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {currentVideo.comments_count}
                    </Button>
                    
                    <Button variant="ghost" size="sm" onClick={shareVideo} className="text-gray-700 hover:text-yellow-400 text-sm transition-colors">
                      <img src={iconShare} alt="Share" className="h-4 w-4 mr-2" />
                      {currentVideo.shares_count}
                    </Button>
                  </div>
                  
                   <h3 className="text-lg font-medium text-gray-700 mb-1 mt-4">{currentVideo.title}</h3>
                   <p className="text-gray-600 text-sm leading-relaxed mb-3">{currentVideo.description}</p>
                   
                   {/* Music Info - Clicável (Desktop) */}
                   <div onClick={() => {
                    const authorUrl = currentVideo.user?.posting_panel_url || `https://www.google.com/search?q=${encodeURIComponent(currentVideo.user?.username || '')}`;
                    const url = /^(https?:)?\/\//i.test(authorUrl) ? authorUrl : `https://${authorUrl}`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity active:scale-95 p-2 rounded-lg hover:bg-gray-100">
                     <VinylRecord isPlaying={isPlaying && !isMuted} hasMusic={true} />
                     <div className="flex items-center gap-1">
                       <Music className="w-3 h-3 text-gray-600 animate-pulse" />
                       <span className="text-gray-600 text-sm font-medium">
                         {currentVideo.music_name || 'Som original'}
                       </span>
                       <span className="text-gray-500 text-xs">
                         • {currentVideo.user?.username || 'Autor'}
                       </span>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </div>

            {/* Right Sidebar - Destaque e Anuncios */}
            <div className="hidden xl:block w-72 2xl:w-80">
              <ScrollArea className="h-screen pb-20">
                <div className="space-y-4 pr-2">
                  
                  <AdCarousel location="feed" />
                  <ModelCarousel title="Novas Modelos" icon="✨" direction="ltr" carouselIndex={1} onSelectModel={modelId => {
                  goToModelVideo(modelId);
                }} />
                  <MarketplaceCarousel />
                  <LocalBusinessCarousel />
                </div>
              </ScrollArea>
            </div>

         </div>
        </div>
       </div>

      {/* Desktop Profile Screen */}
      <ProfileScreen user={currentVideo.user} onVideoSelect={videoId => {
      openSelectedVideo(videoId);
    }} isOpen={showProfile} onClose={handleCloseProfile} onGoHome={goToHome} isChatActive={!!chatActiveMap[currentVideo.creator_id || currentVideo.model_id || currentVideo.user.id]} onOpenChat={() => {
      handleCloseProfile();
      setShowChat(true);
    }} />

      {/* Desktop Chat Screen */}
      <ChatScreen isOpen={showChat} onClose={() => {
      setShowChat(false);
      setChatEntity(null);
    }} modelName={chatEntity?.name || currentVideo.user.username} modelAvatar={chatEntity?.avatar || currentVideo.user.avatar_url} entityId={chatEntity?.id || currentVideo.creator_id || currentVideo.model_id || currentVideo.user.id} isCreator={chatEntity?.isCreator || !!currentVideo.creator_id} />

      {/* Desktop Comments Screen */}
      <CommentsScreen comments={comments} isOpen={showComments} onClose={() => setShowComments(false)} onAddComment={addComment} videoId={currentVideo?.id} onReloadComments={() => currentVideo?.id && loadComments(currentVideo.id)} />

      {/* Desktop Search Modal */}
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} onSelectModel={modelId => {
      goToModelVideo(modelId);
      setShowSearch(false);
    }} />

      {/* Desktop Video Chamada Popup */}
      <VideoCallPopup isOpen={showLive} onClose={() => setShowLive(false)} activeModel={activeVideoCallModel} />
      <VideoCallListPopup isOpen={showVideoCallList} onClose={() => setShowVideoCallList(false)} />
      <LiveListPopup isOpen={showLiveList} onClose={() => setShowLiveList(false)} />
      
      {/* Age Verification Modal */}
      <AgeVerificationModal open={showAgeVerification} onClose={() => {
      console.log('🔍 AGE VERIFICATION: Fechando modal e iniciando reprodução');
      setShowAgeVerification(false);
      // Força reprodução após fechar o modal
      setTimeout(() => {
        console.log('▶️ Iniciando reprodução automática após verificação');
        setIsPlaying(true);
      }, 300);
    }} />
      
      {/* Desktop Action Tracker */}
      <ActionTracker onActionAttempt={async (actionType, userName) => {
      return await handleActionAttempt(actionType, userName);
    }} />

      {/* Fullscreen Video Modal */}
      <FullscreenVideoModal videoUrl={currentVideo?.video_url || ''} isOpen={showFullscreen} onClose={handleCloseFullscreen} currentTime={fullscreenVideoTime} />
      
      {/* Logout Alert Dialog (Desktop) */}
      <AlertDialog open={showLogoutAlert} onOpenChange={setShowLogoutAlert}>
        <AlertDialogContent className="bg-gradient-to-br from-gray-900 to-black border border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-xl">Sair da conta</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Tem certeza que deseja sair? Você precisará fazer login novamente para acessar sua conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600 border-gray-600">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
            try {
              sessionStorage.setItem('logging_out', 'true');
              const {
                error
              } = await supabase.auth.signOut();
              if (error) throw error;
              setShowLogoutAlert(false);
              toast({
                title: 'Logout realizado',
                description: 'Você saiu da sua conta com sucesso'
              });
              navigate('/auth', {
                replace: true
              });
            } catch (error) {
              console.error('Erro ao fazer logout:', error);
              sessionStorage.removeItem('logging_out');
              navigate('/auth', {
                replace: true
              });
            }
          }} className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800">
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Verification Indicator - Realtime VIP Activation */}
      <PaymentVerificationIndicator 
        userEmail={authUser?.email || undefined}
        userId={authUser?.id || undefined}
        onVIPActivated={() => {
          console.log('🎉 VIP ativado! Atualizando status...');
          checkPremiumStatus();
        }}
      />

      {/* Promo Popup - Anúncios de Live/Vídeo Chamada */}
      <PromoPopup />
    </div>;
};