import { DEFAULT_AVATAR } from '@/constants/defaultAvatar';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { useCreatorRole, useAdminRole } from '@/hooks/useUserRoles';
import { Shield } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CategoryMenu } from '@/components/tiktok/CategoryMenu';
import { UserMenuHeader } from '@/components/tiktok/UserMenuHeader';
import useEmblaCarousel from 'embla-carousel-react';
import { VideoCarousel } from '@/components/ui/video-carousel';
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
import AdsGarotasTopModal from '@/components/tiktok/AdsGarotasTopModal';
import AdsLatinasModal from '@/components/tiktok/AdsLatinasModal';

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
  visibility?: 'public' | 'private';
  media_type?: 'video' | 'carousel';
  tipo_conteudo?: string;
  images?: string[];
  imagens?: string[];
  audio_url?: string | null;
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

interface ActivePromoPopup {
  displayName: string;
  description: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  ctaText: string | null;
  ctaLink: string | null;
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
  const { isAdmin } = useAdminRole();

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
  const { promotions, registerPromoView } = useFeedPromotions();

  // Flag para evitar loops de refresh
  const isRefreshingFeed = useRef(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const promoViewTrackedRef = useRef<Set<string>>(new Set());
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
  const isTogglingLikeRef = useRef(false);
  const [preloadedVideos, setPreloadedVideos] = useState<Set<number>>(new Set());
  const [followingModels, setFollowingModels] = useState<Record<string, boolean>>({});
  const [chatActiveMap, setChatActiveMap] = useState<Record<string, boolean>>({});
  const [currentChatStatus, setCurrentChatStatus] = useState<{ id: string; isActive: boolean; isOnline: boolean }>({
    id: '',
    isActive: false,
    isOnline: false,
  });
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
  const [showGarotasTopModal, setShowGarotasTopModal] = useState(false);
  const [showLatinasModal, setShowLatinasModal] = useState(false);
  const [activePromoPopup, setActivePromoPopup] = useState<ActivePromoPopup | null>(null);

  // Trava o scroll do body quando o popup está aberto (Android/iOS)
  useEffect(() => {
    if (!activePromoPopup) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
      touchAction: body.style.touchAction,
    };
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      body.style.touchAction = prev.touchAction;
      window.scrollTo(0, scrollY);
    };
  }, [activePromoPopup]);
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
  const scheduledSessionSelectionRef = useRef<Record<string, string>>({});
  const mainSessionSelectionRef = useRef<Record<string, string>>({});
  const SCHEDULED_QUEUE_KEY_PREFIX = 'sched_queue_';
  const MAIN_QUEUE_KEY_PREFIX = 'main_queue_';
  const SCHEDULED_VIEWED_KEY = 'viewed_highlight_posts';
  const HIGHLIGHT_NEW_WINDOW_MS = 12 * 60 * 60 * 1000;
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
  const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const isGarotasTopLink = useCallback((link?: string | null) => {
    if (!link) return false;
    return /ads\s*\/\s*garotas-top/i.test(link) || /\/ads\/garotas-top/i.test(link);
  }, []);

  const openExternalLink = useCallback((link?: string | null) => {
    if (!link) return;
    const normalizedLink = /^https?:\/\//i.test(link) || link.startsWith('/') ? link : `https://${link}`;

    try {
      const win = window.open(normalizedLink, '_blank', 'noopener,noreferrer');
      if (!win) window.location.href = normalizedLink;
    } catch {
      window.location.href = normalizedLink;
    }
  }, []);

  const handlePromoCtaLink = useCallback((videoOrLink?: any, event?: React.MouseEvent | React.PointerEvent) => {
    event?.preventDefault();
    event?.stopPropagation();

    const link = typeof videoOrLink === 'string' ? videoOrLink : videoOrLink?._promoCtaLink;
    const isPopupPromo = typeof videoOrLink !== 'string' && videoOrLink?._promoCtaMode === 'popup';

    if (link && isGarotasTopLink(link)) {
      setActivePromoPopup(null);
      setShowGarotasTopModal(true);
      return;
    }

    if (isPopupPromo) {
      setActivePromoPopup({
        displayName: videoOrLink.user?.username || videoOrLink.title || 'Promoção',
        description: videoOrLink._promoDescription || null,
        mediaUrl: videoOrLink._promoPopupMediaUrl || videoOrLink._promoBannerUrl || videoOrLink.thumbnail_url || null,
        mediaType: videoOrLink._promoPopupMediaType || null,
        ctaText: videoOrLink._promoPopupCtaText || 'Ver Mais',
        ctaLink: videoOrLink._promoPopupCtaLink || link || null,
      });
      return;
    }

    if (!link) return;

    openExternalLink(link);
  }, [isGarotasTopLink, openExternalLink]);

  // Verifica se um vídeo é novo
  const isVideoNew = (video: Video): boolean => {
    try {
      const videoDate = new Date(video.created_at).getTime();
      const isHighlightedVideo = (video as any).isHighlighted || (video as any).source === 'scheduled_post' || (video as any).source === 'main_post' || (video as any).isNewModel;

      // Posts novos/agendados ficam com badge NOVO por 12 horas
      if (isHighlightedVideo) {
        return videoDate > Date.now() - HIGHLIGHT_NEW_WINDOW_MS;
      }

      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
      if (videoDate > twoHoursAgo) return true;

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
    const currentVideo = displayVideos[currentVideoIndex];
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

  // 📢 Montagem estável do feed com promos, sem reescrever o estado base de vídeos
  const displayVideos = useMemo(() => {
    if (videos.length === 0) return [] as Video[];
    if (promotions.length === 0) return videos;

    const adminInterval = Math.max(
      1,
      Math.min(...promotions.map(p => p.position_interval || 5))
    );

    const result: Video[] = [];
    let lastPromoId: string | null = null;

    videos.forEach((video, index) => {
      result.push(video);

      if ((index + 1) % adminInterval !== 0) return;

      const slotIndex = Math.floor((index + 1) / adminInterval) - 1;
      let selectedPromo = promotions[slotIndex % promotions.length];

      if (promotions.length > 1 && selectedPromo.id === lastPromoId) {
        selectedPromo = promotions[(slotIndex + 1) % promotions.length];
      }

      lastPromoId = selectedPromo.id;

      result.push({
        id: `promo-${selectedPromo.id}-slot-${slotIndex}`,
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
        created_at: selectedPromo.updated_at || selectedPromo.created_at || new Date().toISOString(),
        user: {
          id: `promo-${selectedPromo.id}`,
          username: selectedPromo.display_name,
          avatar_url: selectedPromo.avatar_url || DEFAULT_AVATAR,
          followers_count: 0,
          following_count: 0,
          is_online: false,
          created_at: selectedPromo.created_at || new Date().toISOString(),
          bio: selectedPromo.description || '',
          posting_panel_url: selectedPromo.cta_link || undefined,
        },
        ...( {
          _promoCtaText: selectedPromo.cta_text || (selectedPromo as any).popup_cta_text || null,
          _promoCtaLink: selectedPromo.cta_mode === 'popup'
            ? (selectedPromo.cta_link || (selectedPromo as any).popup_cta_link || (selectedPromo as any).popup_url || null)
            : (selectedPromo.cta_link || (selectedPromo as any).popup_cta_link || (selectedPromo as any).popup_url || null),
          _promoCtaMode: selectedPromo.cta_mode || 'link',
          _promoPopupMediaUrl: selectedPromo.popup_media_url || null,
          _promoPopupMediaType: selectedPromo.popup_media_type || null,
          _promoPopupCtaText: selectedPromo.popup_cta_text || null,
          _promoPopupCtaLink: selectedPromo.popup_cta_link || null,
          _promoBannerUrl: selectedPromo.banner_url || null,
          _promoDescription: selectedPromo.description || null,
        } as any),
      } as Video);
    });

    return result;
  }, [videos, promotions]);

  useEffect(() => {
    if (displayVideos.length === 0) return;
    if (currentVideoIndex < displayVideos.length) return;
    setCurrentVideoIndex(displayVideos.length - 1);
  }, [currentVideoIndex, displayVideos.length]);

  const defaultUser: any = { id: 'unknown', username: 'Usuário', avatar_url: DEFAULT_AVATAR, followers_count: 0, following_count: 0, is_online: false, created_at: new Date().toISOString(), posting_panel_url: '' };
  const rawCurrentVideo = displayVideos.length > 0 ? displayVideos[currentVideoIndex] : null;
  const currentVideo = rawCurrentVideo ? { ...rawCurrentVideo, user: rawCurrentVideo.user || defaultUser } : null;

  // 🎯 Registra exibição de promo (cap diário conforme daily_frequency)
  useEffect(() => {
    const vid = currentVideo as any;
    if (!vid?.id || typeof vid.id !== 'string' || !vid.id.startsWith('promo-')) return;
    // extrai id real: "promo-<uuid>-slot-<n>"
    const match = vid.id.match(/^promo-([0-9a-f-]{36})/i);
    const promoId = match?.[1];
    if (!promoId) return;
    // dedup por slot na sessão (evita contar re-render do mesmo slide)
    if (promoViewTrackedRef.current.has(vid.id)) return;
    promoViewTrackedRef.current.add(vid.id);
    registerPromoView(promoId);
  }, [currentVideo, registerPromoView]);
  const getVideoDataId = (video?: any): string => String(video?._originalId || video?.id || '').replace(/-block-\d+-\d+$/, '');
  const isValidUUID = (value?: string | null): boolean =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
  const isPersistedVideoId = (videoId?: string | null): boolean => isValidUUID(videoId);
  const getChatTarget = useCallback((video?: any) => {
    const creatorId = video?.creator_id;
    const modelId = video?.model_id;
    const fallbackUserId = video?.user?.id;
    const id = creatorId || modelId || (isValidUUID(fallbackUserId) ? fallbackUserId : '');
    return {
      id,
      isCreator: Boolean(creatorId),
    };
  }, []);
  const currentChatTarget = getChatTarget(currentVideo);
  const isCurrentChatActive = Boolean(
    currentChatTarget.id &&
    (currentChatStatus.id === currentChatTarget.id
      ? currentChatStatus.isActive
      : chatActiveMap[currentChatTarget.id] === true || currentVideo?.user?.is_online === true)
  );
  const isCurrentChatOnline = Boolean(
    currentChatTarget.id &&
    (currentChatStatus.id === currentChatTarget.id
      ? currentChatStatus.isOnline
      : chatOnlineMap[currentChatTarget.id] === true || currentVideo?.user?.is_online === true)
  );
  const openCurrentVideoChat = useCallback(() => {
    if (!currentChatTarget.id || !isValidUUID(currentChatTarget.id)) return;
    navigate(`/chat/${currentChatTarget.id}${currentChatTarget.isCreator ? '?type=creator' : ''}`);
  }, [currentChatTarget.id, currentChatTarget.isCreator, navigate]);

  useEffect(() => {
    if (!currentChatTarget.id || !isValidUUID(currentChatTarget.id)) {
      setCurrentChatStatus({ id: '', isActive: false, isOnline: false });
      return;
    }

    let cancelled = false;
    setCurrentChatStatus({ id: currentChatTarget.id, isActive: false, isOnline: false });

    const loadCurrentChatStatus = async () => {
      try {
        const { data, error } = await (supabase as any).rpc('get_chat_panel_config', {
          p_entity_id: currentChatTarget.id,
          p_entity_type: currentChatTarget.isCreator ? 'creator' : 'model',
        });

        if (cancelled) return;

        if (error) {
          console.warn('⚠️ Erro ao carregar status do chat ativo:', error);
          return;
        }

        const config = data || {};
        const nextStatus = {
          id: currentChatTarget.id,
          isActive: config.is_active === true,
          isOnline: config.is_online === true,
        };
        setCurrentChatStatus(nextStatus);
        setChatActiveMap(prev => ({
          ...prev,
          [currentChatTarget.id]: nextStatus.isActive,
        }));
        setChatOnlineMap(prev => ({
          ...prev,
          [currentChatTarget.id]: nextStatus.isOnline,
        }));
      } catch (error) {
        if (!cancelled) console.warn('⚠️ Erro ao verificar chat ativo:', error);
      }
    };

    loadCurrentChatStatus();

    return () => {
      cancelled = true;
    };
  }, [currentChatTarget.id, currentChatTarget.isCreator]);

  useEffect(() => {
    if (!displayVideos.length) return;
    const links: HTMLLinkElement[] = [];
    try {
      const url = new URL(displayVideos[0].video_url);
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
  }, [displayVideos]);

  // Update video when carousel slides
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const newIndex = emblaApi.selectedScrollSnap();
      if (newIndex === currentVideoIndex) return;

      // 🎯 TRACKING: Calcular duração do vídeo anterior e registrar skip/interesse
      if (currentUser?.id && lastTrackedVideoRef.current) {
        const watchDuration = Math.floor((Date.now() - videoWatchStartRef.current) / 1000);
        const prevVideo = displayVideos[currentVideoIndex];

        if (prevVideo && !prevVideo.id.startsWith('promo-') && isPersistedVideoId(lastTrackedVideoRef.current)) {
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

      const watchedVideo = displayVideos[newIndex];
      const watchedVideoId = watchedVideo ? ((watchedVideo as any)._originalId || watchedVideo.id) : '';
      const isPromoVideo = watchedVideo?.id.startsWith('promo-');

      // 🧠 FEED INTELIGENTE: Marcar vídeo real como assistido
      if (watchedVideo && markVideoAsWatched && !isPromoVideo) {
        const entityId = watchedVideo.creator_id || watchedVideo.model_id || watchedVideo.user?.id;
        if (entityId && watchedVideoId) {
          markVideoAsWatched(watchedVideoId, entityId);
        }
      }

      // 🎯 TRACKING: Registrar visualização no DB após 3s (via timer)
      if (currentUser?.id && watchedVideo && !isPromoVideo && isPersistedVideoId(watchedVideoId)) {
        lastTrackedVideoRef.current = watchedVideoId;
        setTimeout(() => {
          if (lastTrackedVideoRef.current === watchedVideoId && isPersistedVideoId(watchedVideoId)) {
            trackVideoEngagement(watchedVideoId, currentUser.id);
          }
        }, 3000);
      } else {
        lastTrackedVideoRef.current = '';
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
    };

    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [
    emblaApi,
    currentVideoIndex,
    currentUser,
    displayVideos,
    markVideoAsWatched,
    navigate,
    trackSkip,
    trackStrongInterest,
    trackVideoEngagement,
    updateWatchDuration,
    videosWatched,
  ]);

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
    if (displayVideos.length === 0) return;
    const preloadVideo = (index: number) => {
      if (index < 0 || index >= displayVideos.length || preloadedVideos.has(index)) return;
      const video = displayVideos[index];
      if (video?.video_url && !video.id.startsWith('promo-')) {
        // Usar preload link para os próximos vídeos
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'video';
        link.href = video.video_url;
        link.type = 'video/mp4';
        document.head.appendChild(link);
        setPreloadedVideos(prev => new Set(prev).add(index));

        // Buffered preload: criar elemento de vídeo oculto para os 2 próximos
        if (index <= currentVideoIndex + 2) {
          const hiddenVideo = document.createElement('video');
          hiddenVideo.src = video.video_url;
          hiddenVideo.preload = 'auto';
          hiddenVideo.muted = true;
          hiddenVideo.style.display = 'none';
          document.body.appendChild(hiddenVideo);
          setTimeout(() => {
            if (document.body.contains(hiddenVideo)) {
              document.body.removeChild(hiddenVideo);
            }
          }, 15000);
        }

        // Clean up link after 60 seconds
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
  }, [currentVideoIndex, displayVideos, preloadedVideos]);

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
      } else if (payload.eventType === 'UPDATE') {
        // 🔄 Atualização em tempo real do feed quando criador edita o vídeo
        const updated: any = payload.new;
        if (!updated?.id) return;
        setVideos(prev => prev.map((v: any) => {
          if (v.id !== updated.id) return v;
          return {
            ...v,
            title: updated.title ?? v.title,
            description: updated.description ?? v.description,
            video_url: updated.video_url ?? v.video_url,
            thumbnail_url: updated.thumbnail_url ?? v.thumbnail_url,
            visibility: updated.visibility ?? v.visibility,
            is_active: updated.is_active ?? v.is_active,
            is_featured: updated.is_featured ?? v.is_featured,
            genres: updated.genres ?? v.genres,
          };
        }));
      } else if (payload.eventType === 'DELETE') {
        const removed: any = payload.old;
        if (!removed?.id) return;
        setVideos(prev => prev.filter((v: any) => v.id !== removed.id));
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
        avatar_url: matched.model_avatar || DEFAULT_AVATAR,
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
      if (currentVideo && currentVideo.id && !currentVideo.id.startsWith('promo-')) {
        const trackingId = (currentVideo as any)._originalId || currentVideo.id;
        console.log('📹 REGISTRANDO VIEW para vídeo:', trackingId);

        try {
          const userId = currentVideo.user?.id || currentVideo.model_id || '';
          const isCreator = !!currentVideo.creator_id;

          if (userId) {
            await trackView(trackingId, userId, isCreator);
            ensureInteractedModel(userId);

            if (markVideoAsWatched) {
              markVideoAsWatched(trackingId, userId);
            }

            if ((currentVideo as any).isHighlighted) {
              try {
                const stored = localStorage.getItem(SCHEDULED_VIEWED_KEY);
                const viewedSet = new Set(stored ? JSON.parse(stored) : []);
                const isFirstHighlightView = !viewedSet.has(trackingId);

                viewedSet.add(trackingId);
                localStorage.setItem(SCHEDULED_VIEWED_KEY, JSON.stringify([...viewedSet]));

                if (
                  isFirstHighlightView &&
                  (currentVideo as any).source === 'scheduled_post' &&
                  typeof (currentVideo as any).scheduled_next_queue_index === 'number' &&
                  userId
                ) {
                  localStorage.setItem(
                    `${SCHEDULED_QUEUE_KEY_PREFIX}${userId}`,
                    String((currentVideo as any).scheduled_next_queue_index)
                  );
                }

                console.log('✨ Post em destaque marcado como visualizado:', trackingId);
              } catch (error) {
                console.warn('⚠️ Erro ao salvar post visualizado:', error);
              }
            }

            console.log('✅ VIEW registrada com sucesso!');
          }
        } catch (error: any) {
          if (error?.code !== '23505' && !String(error?.message || '').includes('duplicate'))
            console.error('❌ Erro ao registrar view:', error);
        }
      }
    };

    if (currentVideo) {
      const currentVideoDataId = (currentVideo as any)._originalId || currentVideo.id;
      checkIfLiked(currentVideoDataId);
      checkIfFollowing(currentVideo.user.id);
      registerView();
    }
  }, [currentVideo, markVideoAsWatched, trackView]);

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
          post_agendado:posts_agendados(*),
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
          thumbnail_url: m.avatar_url || DEFAULT_AVATAR,
          model_id: m.id,
          visibility: 'public',
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
            thumbnail_url: m.avatar_url || DEFAULT_AVATAR,
            model_id: m.id,
            creator_id: null,
            visibility: 'public',
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
      const isImageUrl = (u: string) => /\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(u || '');
      const isAudioUrl = (u: string) => /\.(mp3|wav|m4a|aac|ogg)(\?.*)?$/i.test(u || '');
      const normalizeImages = (value: any): string[] => {
        if (!Array.isArray(value)) return [];
        return value.map((url) => normalizeUrl(String(url || ''))).filter(Boolean);
      };
      const INVALID_DOMAINS = ['example.com', 'localhost', '127.0.0.1', 'test.com'];
      const isValidVideoUrl = (u: string) => {
        if (!/^https?:\/\//i.test(u)) return false;
        try {
          const parsed = new URL(u);
          if (INVALID_DOMAINS.includes(parsed.hostname)) return false;
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

      // 🎯 Processar posts agendados: 1 vídeo por modelo por acesso ao feed
      // O próximo da fila só entra após novo acesso/reload, sem empilhar vários vídeos do mesmo perfil
      const scheduledPostsByModel: Record<string, any[]> = {};
      (postsAgendados || []).forEach(post => {
        const mid = post.modelo_id || 'unknown';
        if (!scheduledPostsByModel[mid]) scheduledPostsByModel[mid] = [];
        scheduledPostsByModel[mid].push(post);
      });

      const buildScheduledVideo = (post: any, model: any, contentUrl: string, nextQueueIndex: number) => {
        const isCarouselPost = post.tipo_conteudo === 'carrossel' || post.tipo_conteudo === 'image';
        const carouselImages = normalizeImages(post.imagens);
        return ({
        id: `scheduled-${post.id}`,
        video_url: contentUrl,
        thumbnail_url: carouselImages[0] || contentUrl,
        title: post.titulo || 'Conteúdo Agendado',
        user_id: post.modelo_id || 'unknown',
        model_id: post.modelo_id || 'unknown',
        music_name: 'Novo Conteúdo',
        media_type: isCarouselPost ? 'carousel' : 'video',
        tipo_conteudo: post.tipo_conteudo,
        images: carouselImages,
        imagens: carouselImages,
        audio_url: post.audio_url || null,
        botoes: (post as any).botoes || [],
        description: post.descricao || '',
        visibility: 'public' as const,
        source: 'scheduled_post',
        isHighlighted: true,
        scheduled_post_id: post.id,
        scheduled_next_queue_index: nextQueueIndex,
        created_at: post.data_publicacao || post.created_at,
        user: model ? {
          id: model.id || post.modelo_id || 'unknown',
          username: model.username || model.name || 'Usuário',
          avatar_url: model.avatar_url || DEFAULT_AVATAR,
          followers_count: model.followers_count || 0,
          following_count: 0,
          is_online: chatPanelsMap[model.id] || false,
          bio: model.bio || '',
          posting_panel_url: model.posting_panel_url || '',
          created_at: model.created_at || ''
        } : {
          id: post.modelo_id || 'unknown',
          username: post.modelo_username || 'Usuário',
          avatar_url: DEFAULT_AVATAR,
          followers_count: 0,
          following_count: 0,
          is_online: false,
          bio: '',
          created_at: ''
        }
        });
      };

      const getScheduledQueueIndex = (modelId: string): number => {
        try {
          const raw = localStorage.getItem(`${SCHEDULED_QUEUE_KEY_PREFIX}${modelId}`);
          return raw ? parseInt(raw, 10) : 0;
        } catch {
          return 0;
        }
      };

      const processedScheduledPosts: any[] = [];
      Object.entries(scheduledPostsByModel).forEach(([mid, posts]) => {
        posts.sort((a, b) => new Date(a.data_publicacao || a.created_at).getTime() - new Date(b.data_publicacao || b.created_at).getTime());

        const sessionSelectedPostId = scheduledSessionSelectionRef.current[mid];
        let selectedPost = sessionSelectedPostId ? posts.find(post => post.id === sessionSelectedPostId) : undefined;
        let selectedIndex = selectedPost ? posts.findIndex(post => post.id === sessionSelectedPostId) : -1;

        if (!selectedPost) {
          let queueIdx = getScheduledQueueIndex(mid);
          if (queueIdx >= posts.length) queueIdx = 0;

          for (let attempt = 0; attempt < posts.length; attempt++) {
            const idx = (queueIdx + attempt) % posts.length;
            const candidate = posts[idx];
            const candidateImages = normalizeImages(candidate.imagens);
            const candidateUrl = normalizeUrl(candidate.conteudo_url || candidateImages[0] || '');
            const isCarouselPost = candidate.tipo_conteudo === 'carrossel' || candidate.tipo_conteudo === 'image';

            if (!candidateUrl || (!isCarouselPost && !isValidVideoUrl(candidateUrl))) {
              continue;
            }

            if (isCarouselPost && candidateImages.length === 0 && !isImageUrl(candidateUrl)) {
              continue;
            }

            selectedPost = candidate;
            selectedIndex = idx;
            break;
          }
        }

        if (!selectedPost || selectedIndex === -1) return;

        const model = selectedPost.modelo || modelsData?.find((m: any) => m.id === selectedPost.modelo_id);
        const selectedImages = normalizeImages(selectedPost.imagens);
        const contentUrl = normalizeUrl(selectedPost.conteudo_url || selectedImages[0] || '');
        const isCarouselPost = selectedPost.tipo_conteudo === 'carrossel' || selectedPost.tipo_conteudo === 'image';
        if (!contentUrl || (!isCarouselPost && !isValidVideoUrl(contentUrl))) {
          return;
        }

        if (isCarouselPost && selectedImages.length === 0 && !isImageUrl(contentUrl)) {
          return;
        }

        processedScheduledPosts.push(
          buildScheduledVideo(selectedPost, model, contentUrl, (selectedIndex + 1) % posts.length)
        );
        scheduledSessionSelectionRef.current[mid] = selectedPost.id;
      });

      const processedMainPosts = (postsPrincipais || []).filter(post => !viewedPosts.has(`main-${post.id}`))
      .map(post => {
        const model = post.modelo || modelsData?.find((m: any) => m.id === post.modelo_id);
        const scheduledSource = (post as any).post_agendado || {};
        const isCarouselPost = post.tipo_conteudo === 'carrossel' || post.tipo_conteudo === 'image';
        const carouselImages = normalizeImages(scheduledSource.imagens || (post as any).imagens);
        const contentUrl = normalizeUrl(post.conteudo_url || carouselImages[0] || '');
        if (!contentUrl || (!isCarouselPost && !isValidVideoUrl(contentUrl))) {
          return null;
        }

        if (isCarouselPost && carouselImages.length === 0 && !isImageUrl(contentUrl)) {
          return null;
        }
        return {
          id: `main-${post.id}`,
          video_url: contentUrl,
          thumbnail_url: carouselImages[0] || contentUrl,
          title: post.titulo || 'Novo Conteúdo',
          user_id: post.modelo_id || 'unknown',
          model_id: post.modelo_id || 'unknown',
          music_name: 'Novo Conteúdo',
          media_type: isCarouselPost ? 'carousel' : 'video',
          tipo_conteudo: post.tipo_conteudo,
          images: carouselImages,
          imagens: carouselImages,
          audio_url: scheduledSource.audio_url || (post as any).audio_url || null,
          botoes: (scheduledSource as any)?.botoes || (post as any)?.botoes || [],
          description: (post as any).descricao || scheduledSource.descricao || '',
          visibility: 'public' as const,
          source: 'main_post',
          isHighlighted: true,
          created_at: post.created_at,
          user: model ? {
            id: model.id || post.modelo_id || 'unknown',
            username: model.username || model.name || 'Usuário',
            avatar_url: model.avatar_url || DEFAULT_AVATAR,
            followers_count: model.followers_count || 0,
            following_count: 0,
            is_online: chatPanelsMap[model.id] || false,
            bio: model.bio || '',
            posting_panel_url: model.posting_panel_url || '',
            created_at: model.created_at || ''
          } : {
            id: post.modelo_id || 'unknown',
            username: post.modelo_username || 'Usuário',
            avatar_url: DEFAULT_AVATAR,
            followers_count: 0,
            following_count: 0,
            is_online: false,
            bio: '',
            created_at: ''
          }
        } as any;
      }).filter(Boolean);

      const publishedScheduledVideoKeys = new Set(
        (postsAgendados || [])
          .map((post: any) => {
            const contentUrl = normalizeUrl(post.conteudo_url || '');
            return post.modelo_id && contentUrl ? `${post.modelo_id}::${contentUrl}` : null;
          })
          .filter(Boolean)
      );

      // Normalizar e enriquecer vídeos válidos do catálogo
      const validVideos = (videosData || []).map(v => ({
        ...v,
        video_url: normalizeUrl(v.video_url || '')
      })).filter(v => {
        if (isImageUrl(v.video_url) || isAudioUrl(v.video_url)) {
          console.warn(`🚫 Mídia de carrossel/áudio filtrada da tabela videos: ${v.video_url}`);
          return false;
        }

        const isValid = isValidVideoUrl(v.video_url);
        if (!isValid && v.video_url) {
          console.warn(`🚫 URL inválida filtrada: ${v.video_url}`);
          return false;
        }

        const scheduledVideoKey = v.model_id ? `${v.model_id}::${v.video_url}` : null;
        if (scheduledVideoKey && publishedScheduledVideoKeys.has(scheduledVideoKey)) {
          return false;
        }

        return true;
      });

      // Deduplicar vídeos por video_url (manter apenas o primeiro de cada URL)
      const seenUrls = new Set<string>();
      const deduplicatedVideos = validVideos.filter((v: any) => {
        if (!v.video_url) return false;
        const key = v.video_url.toLowerCase();
        if (seenUrls.has(key)) return false;
        seenUrls.add(key);
        return true;
      });

      const enrichedVideos = deduplicatedVideos.map((video: any) => {
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
            avatar_url: owner.avatar_url || DEFAULT_AVATAR,
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
          visibility: video.visibility as 'public' | 'private' || 'public',
          source: 'catalog_video',
          user: ownerData ? {
            id: ownerData.id,
            username: ownerData.username || ownerData.name || 'Usuário',
            avatar_url: ownerData.avatar_url || DEFAULT_AVATAR,
            followers_count: ownerData.followers_count || 0,
            following_count: 0,
            is_online: ownerData.is_live || false,
            bio: ownerData.bio || '',
            posting_panel_url: ownerData.posting_panel_url || '',
            created_at: ownerData.created_at || ''
          } : {
            id: video.creator_id || video.model_id || '',
            username: video.creator_id ? 'Criador' : 'Modelo',
            avatar_url: DEFAULT_AVATAR,
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
      const allContent = [...processedScheduledPosts, ...processedMainPosts, ...enrichedVideos];
      if (allContent.length > 0) {
        console.log(`🌟 ${processedScheduledPosts.length + processedMainPosts.length} conteúdos prioritários serão distribuídos sem repetir influencer no mesmo ciclo`);

        const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
        const newModelIds = new Set<string>();
        (modelsData || []).forEach((m: any) => {
          const createdAt = new Date(m.created_at).getTime();
          if (createdAt > fortyEightHoursAgo) {
            newModelIds.add(m.id);
            console.log(`🌟 Modelo nova detectada: ${m.name || m.username} (criada ${new Date(m.created_at).toLocaleString()})`);
          }
        });

        const normalizeStoredVideoId = (id: string) => String(id).replace(/-block-\d+-\d+$/, '');
        let watchedVideoIds = new Set<string>();
        try {
          const memoryRaw = localStorage.getItem('intelligent_feed_memory');
          if (memoryRaw) {
            const memory = JSON.parse(memoryRaw);
            watchedVideoIds = new Set((memory.videos_vistos || []).map((id: string) => normalizeStoredVideoId(id)));
          }
        } catch {}
        console.log(`👁️ ${watchedVideoIds.size} vídeos já assistidos pelo usuário`);

        const getContentOwnerId = (item: any) => item.creator_id || item.model_id || item.user?.id || item.user_id || '';
        const getContentPriority = (item: any, ownerId: string) => {
          let score = 0;
          if (item.source === 'scheduled_post') score += 4000;
          else if (item.source === 'main_post') score += 3000;
          if (newModelIds.has(ownerId) || item.isNewModel) score += 2000;
          if (item.isHighlighted) score += 1000;
          if (isToday(item.created_at)) score += 500;
          if (interactedModelIds.has(ownerId)) score += 250;
          return score;
        };

        const contentByOwner: Record<string, any[]> = {};
        const uniqueContentKeys = new Set<string>();

        allContent.forEach((item: any) => {
          const ownerId = getContentOwnerId(item);
          if (!ownerId) return;

          const originalId = (item as any)._originalId || item.id;
          const normalizedVideoUrl = normalizeUrl(item.video_url || '');
          const dedupeKey = `${ownerId}::${normalizedVideoUrl || originalId}`;

          if (uniqueContentKeys.has(dedupeKey)) return;
          uniqueContentKeys.add(dedupeKey);

          const normalizedItem = {
            ...item,
            _originalId: originalId,
            isNewModel: Boolean(item.isNewModel || newModelIds.has(ownerId)),
          };

          if (!contentByOwner[ownerId]) {
            contentByOwner[ownerId] = [];
          }

          contentByOwner[ownerId].push(normalizedItem);
        });

        Object.entries(contentByOwner).forEach(([ownerId, queue]) => {
          queue.sort((a, b) => {
            const priorityDiff = getContentPriority(b, ownerId) - getContentPriority(a, ownerId);
            if (priorityDiff !== 0) return priorityDiff;

            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bTime - aTime;
          });
        });

        const orderedOwners = Object.keys(contentByOwner).sort((a, b) => {
          const aTop = contentByOwner[a]?.[0];
          const bTop = contentByOwner[b]?.[0];
          const scoreDiff = (bTop ? getContentPriority(bTop, b) : 0) - (aTop ? getContentPriority(aTop, a) : 0);
          if (scoreDiff !== 0) return scoreDiff;

          const aTime = aTop?.created_at ? new Date(aTop.created_at).getTime() : 0;
          const bTime = bTop?.created_at ? new Date(bTop.created_at).getTime() : 0;
          return bTime - aTime;
        });

        const catalogVideos: any[] = [];
        let remaining = true;
        while (remaining) {
          remaining = false;
          for (const ownerId of orderedOwners) {
            const queue = contentByOwner[ownerId];
            if (queue && queue.length > 0) {
              catalogVideos.push(queue.shift()!);
              remaining = true;
            }
          }
        }

        const unwatchedCatalog: any[] = [];
        const watchedCatalog: any[] = [];
        catalogVideos.forEach((video: any) => {
          const originalId = (video as any)._originalId || video.id;
          if (watchedVideoIds.has(originalId)) {
            watchedCatalog.push(video);
          } else {
            unwatchedCatalog.push(video);
          }
        });
        console.log(`📊 Feed: ${unwatchedCatalog.length} não-assistidos + ${watchedCatalog.length} já assistidos`);

        // 🆕 ANTI-REPETIÇÃO DO VÍDEO INICIAL:
        // 1) Excluir do topo o último "vídeo inicial" da sessão anterior
        // 2) Aplicar rotação suave baseada em hora para variar a entrada
        let rotatedUnwatched = [...unwatchedCatalog];
        try {
          const lastInitialId = localStorage.getItem('last_initial_video_id') || '';
          if (lastInitialId && rotatedUnwatched.length > 1) {
            const idx = rotatedUnwatched.findIndex(
              (v: any) => ((v as any)._originalId || v.id) === lastInitialId
            );
            if (idx === 0) {
              // move o vídeo inicial anterior para o fim da fila de não-assistidos
              const [prev] = rotatedUnwatched.splice(0, 1);
              rotatedUnwatched.push(prev);
            }
          }
          if (rotatedUnwatched.length > 2) {
            const offset = Math.floor(Date.now() / 3600000) % rotatedUnwatched.length;
            if (offset > 0) {
              rotatedUnwatched = [
                ...rotatedUnwatched.slice(offset),
                ...rotatedUnwatched.slice(0, offset),
              ];
            }
          }
        } catch {}

        const ordered: any[] = [...rotatedUnwatched, ...watchedCatalog];

        const firstBlock = ordered.slice(0, VIDEOS_PER_BLOCK);

        // Persistir o novo vídeo inicial para evitar repetição na próxima abertura
        try {
          const newInitial = firstBlock[0] as any;
          const newInitialId = newInitial ? (newInitial._originalId || newInitial.id) : '';
          if (newInitialId) {
            localStorage.setItem('last_initial_video_id', String(newInitialId));
          }
        } catch {}

        setAllAvailableVideos(ordered as any);
        setVideos(firstBlock as any);
        setCurrentVideoIndex(0);
        setCurrentPage(1);
        setHasMoreVideos(true);
        setModelOrder(orderedOwners);
        setCycleSize(orderedOwners.length);
        console.log(`🎯 Feed organizado: ${orderedOwners.length} influencers distribuídos sem repetição por ciclo. ${ordered.length} vídeos no total, exibindo os primeiros ${firstBlock.length}.`);

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

  // initializeFeed já é chamado no efeito de montagem acima para evitar corrida e reordenação duplicada.

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
        if (video.isHighlighted || video.source === 'scheduled_post' || video.source === 'main_post' || video.isNewModel) {
          return true;
        }
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

      // 🆕 CARREGAR MEMÓRIA DE VÍDEOS JÁ ASSISTIDOS
      let watchedVideoIds = new Set<string>();
      try {
        const memoryRaw = localStorage.getItem('intelligent_feed_memory');
        if (memoryRaw) {
          const memory = JSON.parse(memoryRaw);
          watchedVideoIds = new Set((memory.videos_vistos || []).map((id: string) => String(id).replace(/-block-\d+-\d+$/, '')));
        }
      } catch {}

      // IDs originais já no feed (para evitar duplicatas reais)
      const idsInFeed = new Set(realVideosInFeed.map(v => (v as any)._originalId || v.id));

      // Priorizar vídeos NÃO assistidos e NÃO no feed
      const unwatched = allAvailableVideos.filter(v => {
        const originalId = (v as any)._originalId || v.id;
        return !watchedVideoIds.has(originalId) && !idsInFeed.has(originalId);
      });

      let nextBlock: any[];
      if (unwatched.length >= VIDEOS_PER_BLOCK) {
        nextBlock = unwatched.slice(0, VIDEOS_PER_BLOCK).map((v, i) => {
          const originalId = (v as any)._originalId || v.id;
          return {
            ...v,
            id: `${originalId}-block-${currentPage}-${i}`,
            _originalId: originalId,
          };
        });
      } else {
        const watched = allAvailableVideos.filter(v => {
          const originalId = (v as any)._originalId || v.id;
          return watchedVideoIds.has(originalId) && !idsInFeed.has(originalId);
        });

        const shuffledWatched = [...watched].sort(() => Math.random() - 0.5);
        const combined = [...unwatched, ...shuffledWatched].slice(0, VIDEOS_PER_BLOCK);
        nextBlock = combined.map((v, i) => {
          const originalId = (v as any)._originalId || v.id;
          return {
            ...v,
            id: `${originalId}-block-${currentPage}-${i}`,
            _originalId: originalId,
          };
        });
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
  }, [allAvailableVideos, currentPage, isLoadingMore, videos, VIDEOS_PER_BLOCK]);

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
          avatar_url: model.avatar_url || DEFAULT_AVATAR,
          followers_count: model.followers_count || 0,
          following_count: 0,
          is_online: model.is_live || false,
          created_at: model.created_at || ''
        } : {
          id: vData.model_id || '',
          username: vData.title || 'Usuário',
          avatar_url: DEFAULT_AVATAR,
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
      const dataVideoId = String(videoId || '').replace(/-block-\d+-\d+$/, '');
      if (!isPersistedVideoId(dataVideoId)) {
        setComments([]);
        return;
      }

      // ✅ Buscar comentários sem JOIN problemático
      const {
        data: commentsData,
        error
      } = await supabase.from('comments').select('*').eq('video_id', dataVideoId).order('created_at', {
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
        const avatarUrl = localStorage.getItem(`avatar_${comment.user_id}`) || DEFAULT_AVATAR;
        return {
          id: comment.id,
          text: comment.content || comment.text || '',
          user_id: comment.user_id,
          video_id: comment.video_id,
          likes_count: comment.likes_count || 0,
          created_at: comment.created_at,
          user: {
            username: profile?.name || profile?.email?.split('@')[0] || `User ${comment.user_id?.slice(0, 8)}`,
            avatar_url: avatarUrl || DEFAULT_AVATAR
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
      const dataVideoId = String(videoId || '').replace(/-block-\d+-\d+$/, '');
      if (!isPersistedVideoId(dataVideoId)) {
        setIsLiked(localStorage.getItem(`liked_${dataVideoId}`) === 'true');
        return;
      }
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
      console.log('🔍 Video ID:', dataVideoId);
      console.log('🔍 User ID:', currentUserId);

      // Check if user has an active like for this video in database
      const {
        data,
        error
      } = await supabase.from('likes').select('id, is_active').eq('user_id', currentUserId).eq('video_id', dataVideoId).eq('is_active', true).maybeSingle();
      if (error) {
        console.error('❌ Error checking like status:', error);
        if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.log('📝 Likes table não existe, usando localStorage...');
          const liked = localStorage.getItem(`liked_${dataVideoId}`);
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
      if (dataVideoId) {
        localStorage.setItem(`liked_${dataVideoId}`, String(liked));
      }
    } catch (error) {
      console.error('Error in checkIfLiked:', error);
      // Fallback to localStorage
      const liked = localStorage.getItem(`liked_${String(videoId || '').replace(/-block-\d+-\d+$/, '')}`);
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
    if (isTogglingLikeRef.current) return;
    isTogglingLikeRef.current = true;
    const dataVideoId = getVideoDataId(currentVideo);
    console.log('🔥 TOGGLE LIKE - Iniciando para vídeo:', dataVideoId);

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
      if (!dataVideoId || dataVideoId.startsWith('promo-')) return;
      if (!isPersistedVideoId(dataVideoId)) {
        const wasLiked = localStorage.getItem(`liked_${dataVideoId}`) === 'true';
        setIsLiked(true);
        localStorage.setItem(`liked_${dataVideoId}`, 'true');
        if (!wasLiked) {
          setVideos(prev => prev.map(video => getVideoDataId(video) === dataVideoId ? {
            ...video,
            likes_count: Math.max(0, (video.likes_count || 0) + 1)
          } : video));
          createLikeExplosion();
        }
        return;
      }
      // Primeiro, verificar se já existe like para este usuário/vídeo
      const {
        data: existingLike,
        error: checkError
      } = await supabase
        .from('likes')
        .select('id, is_active')
        .eq('user_id', currentUserId)
        .eq('video_id', dataVideoId)
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
            video_id: dataVideoId,
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
                video_id: dataVideoId,
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
      if (dataVideoId) {
        localStorage.setItem(`liked_${dataVideoId}`, 'true');
      }

      // Registrar analytics apenas quando houve nova persistência de curtida
      const userId = currentVideo.user?.id || currentVideo.model_id || '';
      const modelId = currentVideo.model_id || userId;
      if (didPersistNewLike && userId) {
        await trackLike(dataVideoId, userId, true);
        ensureInteractedModel(userId);
        await checkAndTrackAction('like', dataVideoId, userId);

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
        .eq('video_id', dataVideoId)
        .eq('is_active', true);

      if (countError) throw countError;

      const newCount = Math.max(0, liveLikesCount || 0);

      const { error } = await supabase
        .from('videos')
        .update({ likes_count: newCount })
        .eq('id', dataVideoId);

      if (error) throw error;

      // Update local state
      setVideos(prev => prev.map(video => getVideoDataId(video) === dataVideoId ? {
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
    } finally {
      isTogglingLikeRef.current = false;
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
    // ✅ Normalizar ID: usar _originalId quando for vídeo sintético/promo/clone
    const realVideoId = String((currentVideo as any)?._originalId || currentVideo.id || '').replace(/-block-\d+-\d+$/, '');
    console.log('💬 ADD COMMENT - Iniciando para vídeo:', realVideoId);
    if (!isPersistedVideoId(realVideoId)) {
      const localComment: Comment = {
        id: `local-comment-${Date.now()}`,
        text: text.trim(),
        user_id: currentUser?.id || localStorage.getItem('anonymous_user_id') || 'anonymous',
        video_id: realVideoId,
        likes_count: 0,
        created_at: new Date().toISOString(),
        user: {
          username: profile?.full_name || profile?.username || 'Você',
          avatar_url: profile?.avatar_url || DEFAULT_AVATAR
        }
      };
      setComments(prev => [localComment, ...prev]);
      return;
    }
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
        video_id: realVideoId
      });
      const {
        error
      } = await supabase.from('comments').insert({
        content: text.trim(),
        user_id: currentUserId,
        video_id: realVideoId,
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
          const { error: error2 } = await supabase.from('comments').insert({
            content: text.trim(),
            user_id: currentUserId,
            video_id: realVideoId
          });
          if (error2) throw error2;
          console.log('✅ Comentário inserido em modo simplificado');
        } else {
          throw error;
        }
      } else {
        console.log('✅ Comment inserted successfully');
      }

      const activeVideoId = (currentVideo as any)?._originalId || currentVideo.id;

      // Recarregar comentários para mostrar o novo com dados atualizados
      await loadComments(activeVideoId);

      // ✨ IMPORTANTE: Registrar no sistema de analytics
      await trackComment(activeVideoId, currentVideo.user?.id || '');
      await checkAndTrackAction('comment', activeVideoId, currentVideo.user_id);

      // Update video comments count
      const newCount = currentVideo.comments_count + 1;
      await supabase.from('videos').update({
        comments_count: newCount
      }).eq('id', activeVideoId);
      setVideos(prev => prev.map(video => video.id === currentVideo.id ? {
        ...video,
        comments_count: newCount
      } : video));
      console.log('✅ ADD COMMENT - Ação completa! Novo count:', newCount);

      // ✨ Forçar reload dos comentários para garantir sincronização
      await loadComments(activeVideoId);
      toast({
        title: "Comentário adicionado!",
        description: "Seu comentário foi publicado"
      });

      // 🤖 AUTO-RESPOSTA DA MODELO (uma única vez por usuário+modelo)
      try {
        const AUTO_REPLY_TEXT = '🥰 oi meu amor, obrigado pelo comentário. 🤗 Aqui você vai ver tudo que as redes do TikTok e Instagram não mostram.';
        const ownerId = (currentVideo as any)?.creator_id || (currentVideo as any)?.model_id || currentVideo?.user?.id;
        const commenterId = currentUserId;
        if (ownerId && commenterId) {
          const autoKey = `autoreply_${ownerId}_${commenterId}`;
          if (!localStorage.getItem(autoKey)) {
            localStorage.setItem(autoKey, '1');
            setTimeout(() => {
              const modelName = currentVideo?.user?.username || 'Modelo';
              const modelAvatar = currentVideo?.user?.avatar_url || DEFAULT_AVATAR;
              const autoComment: Comment = {
                id: `autoreply-${ownerId}-${Date.now()}`,
                text: AUTO_REPLY_TEXT,
                user_id: ownerId,
                video_id: activeVideoId,
                likes_count: 0,
                created_at: new Date().toISOString(),
                user: { username: modelName, avatar_url: modelAvatar },
              } as any;
              setComments(prev => [autoComment, ...prev]);
            }, 4000);
          }
        }
      } catch (e) {
        console.warn('auto-reply falhou:', e);
      }
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
    const modelVideoIndex = videos.findIndex(video => video.user?.id === modelId || video.model_id === modelId || video.creator_id === modelId);
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
          visibility: (video.visibility === 'private' ? 'private' : 'public') as 'public' | 'private',
          likes_count: video.likes_count || 0,
          comments_count: video.comments_count || 0,
          shares_count: video.shares_count || 0,
          views_count: video.views_count || 0,
          is_active: true,
          created_at: video.created_at,
          user: {
            id: profile.id,
            username: profile.username || profile.name || 'Criador',
            avatar_url: profile.avatar_url || DEFAULT_AVATAR,
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
              avatar_url: modelData.avatar_url || DEFAULT_AVATAR,
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
              avatar_url: modelData.avatar_url || DEFAULT_AVATAR,
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
            avatar_url: modelData.avatar_url || DEFAULT_AVATAR,
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
        visibility: (video.visibility === 'private' ? 'private' : 'public') as 'public' | 'private',
        likes_count: video.likes_count || 0,
        comments_count: video.comments_count || 0,
        shares_count: video.shares_count || 0,
        views_count: video.views_count || 0,
        is_active: true,
        created_at: video.created_at,
        user: {
          id: modelData.id,
          username: modelData.username,
          avatar_url: modelData.avatar_url || DEFAULT_AVATAR,
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
    const isGenreFiltered = selectedGenre && selectedGenre !== 'Hétero';
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
                <Button onClick={() => setSelectedGenre('Hétero')} className="w-full bg-gradient-to-r from-teal-500 to-yellow-500 hover:from-teal-600 hover:to-yellow-600 text-black font-semibold">
                  <Film className="w-4 h-4 mr-2" />
                  Voltar ao Início
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
          
          

          
          
          {/* Ícones - Direita */}
          <div className="flex items-center gap-2">
            {false && isAdmin && (
              <button onClick={() => navigate('/admin')} className="w-10 h-10 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center hover:bg-primary transition-colors" title="Painel Admin">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </button>
            )}
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
        }} onBlockVideo={undefined} onFullscreen={handleFullscreen} onShare={shareVideo} onOpenChat={isCurrentChatActive ? openCurrentVideoChat : undefined} isChatOnline={isCurrentChatOnline} />
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


          <button onClick={() => navigate('/explore')} className="flex flex-col items-center justify-center flex-1 text-white hover:text-gray-300 transition-colors">
            <Compass className="w-7 h-7 mb-0.5" strokeWidth={1.5} />
            <span className="text-xs">Explorar</span>
          </button>

          <button onClick={() => navigate('/profile')} className="flex flex-col items-center justify-center flex-1 text-white hover:text-gray-300 transition-colors">
            <User className="w-7 h-7 mb-0.5" strokeWidth={1.5} />
            <span className="text-xs">Perfil</span>
          </button>
        </div>

        {/* Vertical Carousel Container */}
        <div className="embla h-screen" ref={emblaRef}>
          <div className="embla__container h-full flex flex-col">
            {displayVideos.map((video, index) => {
              const isPromoVideo = video.id.startsWith('promo-');
              return (
                <div key={video.id} className="embla__slide flex-shrink-0 w-full relative" style={{ height: '100dvh' }}>
                  <MemoizedVideoPlayer ref={index === currentVideoIndex ? videoRef : null} video={video} isPlaying={isPlaying && index === currentVideoIndex} isMuted={isMuted} volume={volume} onNext={nextVideo} onPrevious={prevVideo} onDoubleClick={toggleLike} onTogglePlay={() => setIsPlaying(!isPlaying)} />
                  
                  {/* Bottom Info - only show for current video */}
                  {index === currentVideoIndex && <BottomInfo video={video} isNew={isVideoNew(video)} isPlaying={isPlaying} isPrivate={(video as any).visibility === 'private'} />}

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

                   {/* NOVO badge é renderizado dentro de BottomInfo (evita duplicação) */}


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
                        {(video as any)._promoCtaText && ((video as any)._promoCtaLink || (video as any)._promoCtaMode === 'popup') && (
                         <button
                             onPointerUp={(e) => handlePromoCtaLink(video as any, e)}
                             onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                           className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-2.5 rounded-lg shadow-lg text-sm"
                         >
                           {(video as any)._promoCtaText}
                         </button>
                       )}
                       {/* Banner */}
                       {(video as any)._promoBannerUrl && (
                         <div 
                           className="w-full rounded-lg overflow-hidden shadow-lg cursor-pointer"
                             onPointerUp={(e) => handlePromoCtaLink(video as any, e)}
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
        {displayVideos[currentVideoIndex + 1]?.video_url && <video src={displayVideos[currentVideoIndex + 1].video_url} preload="auto" muted playsInline style={{
        display: 'none'
      }} />}

        {/* Profile Screen */}
        <ProfileScreen user={currentVideo.user} isOpen={showProfile} onClose={handleCloseProfile} onGoHome={goToHome} isChatActive={isCurrentChatActive} onVideoSelect={videoId => {
        openSelectedVideo(videoId);
      }} onOpenChat={() => {
        handleCloseProfile();
        setShowChat(true);
      }} />

        {/* Chat Screen */}
        <ChatScreen isOpen={showChat} onClose={() => {
        setShowChat(false);
        setChatEntity(null);
      }} modelName={chatEntity?.name || currentVideo.user.username} modelAvatar={chatEntity?.avatar || currentVideo.user.avatar_url || DEFAULT_AVATAR} entityId={chatEntity?.id || currentVideo.creator_id || currentVideo.model_id || currentVideo.user.id} isCreator={chatEntity?.isCreator || !!currentVideo.creator_id} />

        {/* Comments Screen */}
        <CommentsScreen comments={comments} isOpen={showComments} onClose={() => setShowComments(false)} onAddComment={addComment} videoId={((currentVideo as any)?._originalId || currentVideo?.id)} onReloadComments={() => currentVideo && loadComments(((currentVideo as any)._originalId || currentVideo.id))} />
        
        {/* Search Modal */}
        <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} onSelectModel={async modelId => {
        setShowSearch(false);
        await goToModelVideo(modelId);
        setShowProfile(false);
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
        <AdsGarotasTopModal open={showGarotasTopModal} onClose={() => setShowGarotasTopModal(false)} />
        <AdsLatinasModal open={showLatinasModal} onClose={() => setShowLatinasModal(false)} />
        {activePromoPopup && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overscroll-contain" style={{ touchAction: "none" }} onClick={() => setActivePromoPopup(null)} onTouchMove={(e) => e.preventDefault()}>
            <div className="relative bg-gray-950 rounded-2xl overflow-hidden max-w-sm w-full max-h-[85dvh] shadow-2xl border border-white/10" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setActivePromoPopup(null)}
                aria-label="Fechar"
                className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/70 flex items-center justify-center text-white"
              >
                ×
              </button>
              {activePromoPopup.mediaUrl && (
                <div className="w-full aspect-[9/16] max-h-[60dvh] bg-black">
                  {(activePromoPopup.mediaType || '').toLowerCase() === 'video' || /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?|$)/i.test(activePromoPopup.mediaUrl) ? (
                    <video src={activePromoPopup.mediaUrl} className="w-full h-full object-contain" controls autoPlay playsInline />
                  ) : (
                    <img src={activePromoPopup.mediaUrl} alt={activePromoPopup.displayName} className="w-full h-full object-contain" />
                  )}
                </div>
              )}
              <div className="p-4 space-y-3">
                <p className="text-white font-bold text-center text-lg">{activePromoPopup.displayName}</p>
                {activePromoPopup.description && <p className="text-gray-300 text-sm text-center">{activePromoPopup.description}</p>}
                {activePromoPopup.ctaText && activePromoPopup.ctaLink && (
                  <Button
                    type="button"
                    onClick={(e) => handlePromoCtaLink(activePromoPopup.ctaLink, e)}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg text-base"
                  >
                    {activePromoPopup.ctaText}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
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
          {selectedGenre && selectedGenre !== 'Hétero' && (
            <button 
              onClick={() => setSelectedGenre('Hétero')} 
              className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors" 
              title="Clique para voltar ao gênero padrão"
            >
              <span className="text-sm">{genres.find(g => g.name === selectedGenre)?.icon || '🎬'}</span>
              <span className="text-sm font-medium text-white">{selectedGenre}</span>
              <span className="text-xs text-white/60">×</span>
            </button>
          )}
          {false && isAdmin && (
            <button 
              onClick={() => navigate('/admin')} 
              className="w-10 h-10 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-primary transition-colors" 
              title="Painel Admin"
            >
              <Shield className="w-5 h-5" />
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
                        {(currentVideo as any)._promoCtaText && ((currentVideo as any)._promoCtaLink || (currentVideo as any)._promoCtaMode === 'popup') && (
                         <button
                             onPointerUp={(e) => handlePromoCtaLink(currentVideo as any, e)}
                             onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                           className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-2 rounded-lg shadow-lg text-sm"
                         >
                           {(currentVideo as any)._promoCtaText}
                         </button>
                       )}
                       {(currentVideo as any)._promoBannerUrl && (
                         <div 
                           className="w-full rounded-lg overflow-hidden shadow-lg cursor-pointer"
                             onPointerUp={(e) => handlePromoCtaLink(currentVideo as any, e)}
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
                    <img src={currentVideo?.user?.avatar_url || DEFAULT_AVATAR} alt={currentVideo?.user?.username || 'Modelo'} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }} />
                  </div>
                  <p className="text-white font-semibold text-lg drop-shadow-lg">
                    {currentVideo?.user?.username || 'Modelo'}
                  </p>
                </div>
              </div>

              {/* Desktop Navigation Arrows - ocultas em carrossel para não conflitar com setas laterais do carrossel */}
              {((currentVideo as any)?.media_type !== 'carousel' && (currentVideo as any)?.tipo_conteudo !== 'carrossel') && (
                <>
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
                </>
              )}
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
        }} onBlockVideo={undefined} onFullscreen={handleFullscreen} onOpenChat={isCurrentChatActive ? openCurrentVideoChat : undefined} isChatOnline={isCurrentChatOnline} onExit={async () => {
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
                     if (isGarotasTopLink(url)) {
                       setShowGarotasTopModal(true);
                       return;
                     }
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
    }} isOpen={showProfile} onClose={handleCloseProfile} onGoHome={goToHome} isChatActive={isCurrentChatActive} onOpenChat={() => {
      handleCloseProfile();
      setShowChat(true);
    }} />

      {/* Desktop Chat Screen */}
      <ChatScreen isOpen={showChat} onClose={() => {
      setShowChat(false);
      setChatEntity(null);
    }} modelName={chatEntity?.name || currentVideo.user.username} modelAvatar={chatEntity?.avatar || currentVideo.user.avatar_url || DEFAULT_AVATAR} entityId={chatEntity?.id || currentVideo.creator_id || currentVideo.model_id || currentVideo.user.id} isCreator={chatEntity?.isCreator || !!currentVideo.creator_id} />

      {/* Desktop Comments Screen */}
      <CommentsScreen comments={comments} isOpen={showComments} onClose={() => setShowComments(false)} onAddComment={addComment} videoId={((currentVideo as any)?._originalId || currentVideo?.id)} onReloadComments={() => currentVideo && loadComments(((currentVideo as any)._originalId || currentVideo.id))} />

      {/* Desktop Search Modal */}
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} onSelectModel={async modelId => {
      setShowSearch(false);
      await goToModelVideo(modelId);
      setShowProfile(false);
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

      {/* Payment Verification Indicator - Realtime private access activation */}
      <PaymentVerificationIndicator 
        userEmail={authUser?.email || undefined}
        userId={authUser?.id || undefined}
        onPrivateAccessActivated={() => {
          console.log('🎉 Conteúdo Privado ativado! Atualizando status...');
        }}
      />

      {/* Promo Popup - Anúncios de Live/Vídeo Chamada */}
      <PromoPopup />
      <AdsGarotasTopModal open={showGarotasTopModal} onClose={() => setShowGarotasTopModal(false)} />
      <AdsLatinasModal open={showLatinasModal} onClose={() => setShowLatinasModal(false)} />
      {activePromoPopup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overscroll-contain" style={{ touchAction: "none" }} onClick={() => setActivePromoPopup(null)} onTouchMove={(e) => e.preventDefault()}>
          <div className="relative bg-gray-950 rounded-2xl overflow-hidden max-w-sm w-full max-h-[85vh] shadow-2xl border border-white/10" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setActivePromoPopup(null)}
              aria-label="Fechar"
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/70 flex items-center justify-center text-white"
            >
              ×
            </button>
            {activePromoPopup.mediaUrl && (
              <div className="w-full aspect-[9/16] max-h-[60vh] bg-black">
                {(activePromoPopup.mediaType || '').toLowerCase() === 'video' || /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?|$)/i.test(activePromoPopup.mediaUrl) ? (
                  <video src={activePromoPopup.mediaUrl} className="w-full h-full object-contain" controls autoPlay playsInline />
                ) : (
                  <img src={activePromoPopup.mediaUrl} alt={activePromoPopup.displayName} className="w-full h-full object-contain" />
                )}
              </div>
            )}
            <div className="p-4 space-y-3">
              <p className="text-white font-bold text-center text-lg">{activePromoPopup.displayName}</p>
              {activePromoPopup.description && <p className="text-gray-300 text-sm text-center">{activePromoPopup.description}</p>}
              {activePromoPopup.ctaText && activePromoPopup.ctaLink && (
                <Button
                  type="button"
                  onClick={(e) => handlePromoCtaLink(activePromoPopup.ctaLink, e)}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg text-base"
                >
                  {activePromoPopup.ctaText}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>;
};