import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVideoActions } from '@/hooks/useVideoActions';
import { VideoPlayer } from '@/components/tiktok/VideoPlayer';
import { SideMenu } from '@/components/tiktok/SideMenu';
import { BottomInfo } from '@/components/tiktok/BottomInfo';
import { ProfileScreen } from '@/components/tiktok/ProfileScreen';
import { CommentsScreen } from '@/components/tiktok/CommentsScreen';
import { ChatScreen } from '@/components/tiktok/ChatScreen';
import { BonusGift } from '@/components/tiktok/BonusGift';
import { VinylRecord } from '@/components/tiktok/VinylRecord';
import { ActionTracker, useActionTracker } from '@/components/tiktok/ActionTracker';
import { useAppAnalytics } from '@/hooks/useAppAnalytics';
import { VideoPreviewModal } from '@/components/admin/VideoPreviewModal';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Heart, MessageCircle, User, Search, ChevronUp, ChevronDown, Gift, Radio, Home, Video, Users, ShoppingBag, MapPin, BookmarkPlus, CreditCard, Sparkles, LogOut, Plus, Share2, Music, Grid, Compass } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { SearchModal } from '@/components/tiktok/SearchModal';
import { LiveModal } from '@/components/tiktok/LiveModal';
import { PremiumModal } from '@/components/tiktok/PremiumModal';
import { AgeVerificationModal } from '@/components/tiktok/AgeVerificationModal';
import { CategoryMenu } from '@/components/tiktok/CategoryMenu';
import useEmblaCarousel from 'embla-carousel-react';
import { VideoCarousel } from '@/components/ui/video-carousel';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { FeaturedSection } from '@/components/tiktok/FeaturedSection';
import { AdCarousel } from '@/components/tiktok/AdCarousel';
import { ModelCarousel } from '@/components/tiktok/ModelCarousel';
import { FullscreenVideoModal } from '@/components/tiktok/FullscreenVideoModal';
import iconHome from '@/assets/icon-home.png';
import iconNavigation from '@/assets/icon-navigation.png';
import iconMarketplace from '@/assets/icon-marketplace.png';
import iconShare from '@/assets/icon-share.png';
import coconudiLogo from '@/assets/coconudi-logo-new.png';
import headerBackground from '@/assets/header-background.png';
// Feed inteligente desativado temporariamente
// import { useIntelligentFeed } from '@/hooks/useIntelligentFeed';
// import { IntelligentFeedIndicator } from '@/components/tiktok/IntelligentFeedIndicator';



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
  updated_at?: string; // Adicionado para nova lógica
  model_id?: string;   // Adicionado para associação com modelos
  user: {
    id: string;
    username: string;
    avatar_url: string;
    followers_count: number;
    following_count: number;
    is_online: boolean;
    created_at: string;
    bio?: string; // Adicionado para dados do modelo
    posting_panel_url?: string; // Link personalizado premium
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
  
  // 🧠 FEED INTELIGENTE DESATIVADO TEMPORARIAMENTE (causando loop)
  // const { 
  //   videos: intelligentVideos, 
  //   loading: intelligentLoading,
  //   currentFeed,
  //   refreshFeed: refreshIntelligentFeed,
  //   markVideoAsWatched,
  //   markModelAsFavorite,
  //   getUserMemory
  // } = useIntelligentFeed();
  
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [preloadedVideos, setPreloadedVideos] = useState<Set<number>>(new Set());
  const [followingModels, setFollowingModels] = useState<Record<string, boolean>>({});
  const [isMuted, setIsMuted] = useState(false); // Iniciar COM SOM
  const [isPlaying, setIsPlaying] = useState(true); // Inicia reproduzindo
  const [loading, setLoading] = useState(true);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  
  // 🔐 CONTADOR DE VÍDEOS PARA LOGIN
  const [videosWatched, setVideosWatched] = useState(() => {
    const saved = localStorage.getItem('videosWatched');
    const count = saved ? parseInt(saved, 10) : 0;
    console.log('🔐 INICIALIZANDO CONTADOR DE VÍDEOS:', count);
    return count;
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 SESSÃO:', !!session?.user);
      setCurrentUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔐 MUDANÇA DE AUTH:', { event: _event, user: !!session?.user });
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
  
  // 📱 NOVA LÓGICA: Estados para feed infinito em blocos
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const [allAvailableVideos, setAllAvailableVideos] = useState<Video[]>([]);
  const [usedModelIds, setUsedModelIds] = useState<Set<string>>(new Set());
  const VIDEOS_PER_BLOCK = 50; // Aumentado de 10 para 50 para carregar mais vídeos por vez
  const [showSearch, setShowSearch] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [selectedVideoForPreview, setSelectedVideoForPreview] = useState<any>(null);
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
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { checkAndTrackAction } = useActionTracker();
  const { trackLike, trackComment, trackShare, trackView, trackFollow } = useAppAnalytics();
  console.log('🎯 DEBUG: Importações do useAppAnalytics:', { trackLike, trackComment, trackShare, trackView, trackFollow });
  const { isPremium, isContentUnlocked, checkPremiumStatus } = usePremiumStatus();
  const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Verifica se um vídeo é novo (criado após a última sessão)
  const isVideoNew = (video: Video): boolean => {
    try {
      const lastSession = localStorage.getItem('last_app_session');
      if (!lastSession) return false;
      
      const videoDate = new Date(video.created_at).getTime();
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
  
  // Carousel otimizado para todas as plataformas
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    axis: 'y',
    loop: false,
    dragFree: false,
    containScroll: 'trimSnaps',
    duration: 20,
  });
  
  // Debug do emblaApi
  useEffect(() => {
    console.log('🎪 EMBLA API:', {
      exists: !!emblaApi,
      canScrollNext: emblaApi?.canScrollNext(),
      selectedSnap: emblaApi?.selectedScrollSnap()
    });
  }, [emblaApi]);

  const currentVideo = videos.length > 0 ? videos[currentVideoIndex] : null;

  console.log('✅ RENDER: Renderizando vídeo');
  console.log('✅ RENDER: currentVideo:', currentVideo?.id || 'null');
  console.log('🔍 DEBUG PREMIUM: posting_panel_url:', currentVideo?.user?.posting_panel_url || 'NÃO CONFIGURADO');
  console.log('✅ RENDER: currentVideoIndex:', currentVideoIndex);
  console.log('✅ RENDER: videos.length:', videos.length);
  console.log('✅ RENDER: videos[currentVideoIndex]:', videos[currentVideoIndex]?.id || 'undefined');

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
    console.log('🎪 SETUP: Configurando listener do emblaApi', {
      emblaApiExists: !!emblaApi,
      videosWatched,
      currentUser: !!currentUser
    });
    
    if (!emblaApi) return;

    const onSelect = () => {
      console.log('🎪 ON SELECT DISPARADO!');
      
      const newIndex = emblaApi.selectedScrollSnap();
      console.log('📊 DEBUG LOGIN:', {
        newIndex,
        currentVideoIndex,
        currentUser: !!currentUser,
        videosWatched,
        isForward: newIndex > currentVideoIndex
      });
      
      if (newIndex !== currentVideoIndex) {
        console.log('📹 Mudando de vídeo:', currentVideoIndex, '→', newIndex);
        setCurrentVideoIndex(newIndex);
        
        // 🔐 INCREMENTA CONTADOR SE USUÁRIO NÃO ESTIVER LOGADO
        if (!currentUser && newIndex > currentVideoIndex) {
          const newCount = videosWatched + 1;
          console.log('🔐 INCREMENTANDO CONTADOR:', { 
            anterior: videosWatched, 
            novo: newCount,
            deveRedirecionar: newCount >= 5
          });
          
          setVideosWatched(newCount);
          localStorage.setItem('videosWatched', newCount.toString());
          
          // Redireciona para /auth após 5 vídeos
          if (newCount >= 5) {
            console.log('🚨 REDIRECIONANDO PARA /AUTH!');
            localStorage.setItem('requiresLogin', 'true');
            localStorage.setItem('returnTo', '/app');
            navigate('/auth');
          }
        } else {
          console.log('⏭️ NÃO INCREMENTOU:', {
            motivo: currentUser ? 'usuário logado' : 'navegação para trás',
            currentUser: !!currentUser,
            newIndex,
            currentVideoIndex
          });
        }
      } else {
        console.log('📹 Mesmo vídeo, não mudou');
      }
    };

    console.log('🎪 Registrando listener onSelect');
    emblaApi.on('select', onSelect);
    
    return () => {
      console.log('🎪 Removendo listener onSelect');
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, currentVideoIndex, currentUser, videosWatched, navigate]);

  // 🔐 Bloqueia interações do Embla quando redirecionado para login
  useEffect(() => {
    const requiresLogin = localStorage.getItem('requiresLogin');
    if (requiresLogin === 'true' && !currentUser) {
      console.log('🚫 Login obrigatório - redirecionando para /auth');
      navigate('/auth');
    }
  }, [currentUser, navigate]);

  // Preload adjacent videos for faster navigation
  useEffect(() => {
    if (videos.length === 0) return;

    const preloadVideo = (index: number) => {
      if (index < 0 || index >= videos.length || preloadedVideos.has(index)) return;
      
      const video = videos[index];
      if (video?.video_url) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'video';
        link.href = video.video_url;
        link.type = 'video/mp4';
        document.head.appendChild(link);
        
        setPreloadedVideos(prev => new Set(prev).add(index));
        
        // Clean up after 30 seconds
        setTimeout(() => {
          if (document.head.contains(link)) {
            document.head.removeChild(link);
          }
        }, 30000);
      }
    };

    // Preload next 2 and previous 1 videos
    preloadVideo(currentVideoIndex + 1);
    preloadVideo(currentVideoIndex + 2);
    preloadVideo(currentVideoIndex - 1);
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
      const evt = new CustomEvent('ageModalOpenChange', { detail: { open: showAgeVerification } });
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
        toast({ title, description });
        lastToastTime = now;
      }
    };
    
    // Canal consolidado para todas as mudanças importantes
    const adminChannel = supabase
      .channel('admin-app-sync')
      .on(
         'postgres_changes',
        { event: '*', schema: 'public', table: 'videos' },
        (payload) => {
          console.log('🎬 ADMIN → APP: Mudança em vídeos:', payload.eventType);
          if (payload.eventType === 'INSERT') {
            showToast("📱 Novo Conteúdo!", "Vídeo adicionado pelo admin");
            // Sinalizar atualização pendente para aplicar no fim do ciclo
            setPendingRefresh(true);
          }
        }
      )
      .on(
         'postgres_changes',
        { event: '*', schema: 'public', table: 'models' },
        (payload) => {
          console.log('👤 ADMIN → APP: Mudança em modelos:', payload.eventType);
          if (payload.eventType === 'INSERT') {
            showToast("👤 Novo Modelo!", "Perfil adicionado pelo admin");
            // Sinalizar atualização pendente para aplicar no fim do ciclo
            setPendingRefresh(true);
          }
        }
      )
      .on(
         'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts_principais' },
        (payload) => {
          console.log('🏠 ADMIN → APP: Novo post na tela principal');
          showToast("🏠 Novo Post!", "Conteúdo adicionado na tela principal");
        }
      )
      .subscribe();

    // Cleanup ao desmontar
    return () => {
      console.log('🔌 Removendo canal de comunicação admin-app...');
      supabase.removeChannel(adminChannel);
    };
  }, []); // REMOVIDO currentVideo da dependência para evitar loop

  useEffect(() => {
    console.log('🔍 DEBUG: useEffect disparado com currentVideo:', currentVideo?.id);
    console.log('🔍 DEBUG: trackView disponível:', typeof trackView);
    
    const registerView = async () => {
      if (currentVideo && currentVideo.id) {
        console.log('📹 REGISTRANDO VIEW para vídeo:', currentVideo.id);
        try {
          const userId = currentVideo.user?.id || currentVideo.model_id || '';
          
          if (userId) {
            await trackView(currentVideo.id, userId);
            ensureInteractedModel(userId);
            
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
    const now = new Date().toISOString();
    const lastSession = localStorage.getItem('last_app_session');
    if (!lastSession) {
      // Primeira vez no app - marca timestamp de 24h atrás para mostrar vídeos recentes
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      localStorage.setItem('last_app_session', oneDayAgo);
    }
    
    initializeFeed();
    
    // Atualizar timestamp ao fechar/sair
    return () => {
      localStorage.setItem('last_app_session', new Date().toISOString());
    };
  }, []); // Executar apenas uma vez na montagem

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
      const cacheKey = 'initial_feed';
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
      
      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 60000) { // Cache valid for 1 minute
          const cachedData = JSON.parse(cached);
          console.log(`✅ Feed carregado do cache (${cachedData.length} vídeos)`);
          setVideos(cachedData);
          setCurrentVideoIndex(0);
          setLoading(false);
          return;
        }
      }
      
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
      
      const { data: postsAgendados, error: postsError } = await supabase
        .from('posts_agendados')
        .select(`
          *,
          modelo:models(*)
        `)
        .eq('status', 'publicado')
        .gte('data_publicacao', today.toISOString())
        .order('data_publicacao', { ascending: false });

      const { data: postsPrincipais, error: principaisError } = await supabase
        .from('posts_principais')
        .select(`
          *,
          modelo:models(*)
        `)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (postsError) console.warn('⚠️ Erro ao carregar posts agendados:', postsError);
      if (principaisError) console.warn('⚠️ Erro ao carregar posts principais:', principaisError);

      // Carregar todos os vídeos disponíveis
      console.log('📋 Carregando catálogo de vídeos...');
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (videosError) {
        console.error('❌ Erro ao carregar vídeos:', videosError);
        throw videosError;
      }

      const { data: modelsData, error: modelsError } = await supabase
        .from('models')
        .select('*')
        .eq('is_active', true);

      if (modelsError && (modelsError as any).code !== 'PGRST116') {
        console.warn('⚠️ Erro ao carregar modelos:', modelsError);
      }

      console.log(`📊 Dados carregados: ${videosData?.length || 0} vídeos, ${modelsData?.length || 0} modelos, ${(postsAgendados?.length || 0) + (postsPrincipais?.length || 0)} posts recentes`);

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

      const interactedModelIds: Set<string> = new Set<string>(
        (() => {
          try {
            const raw = localStorage.getItem('interacted_model_ids');
            if (!raw) return [] as string[];
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
          } catch {
            return [] as string[];
          }
        })()
      );

      // 🎯 Processar posts agendados recentes como prioridade
      const processedScheduledPosts = (postsAgendados || [])
        .filter((post) => !viewedPosts.has(`scheduled-${post.id}`)) // 🆕 Filtrar já visualizados
        .map((post) => {
          const model = post.modelo || modelsData?.find((m: any) => m.id === post.modelo_id);
          const contentUrl = normalizeUrl(post.conteudo_url || '');
          
          if (!contentUrl || (!isValidVideoUrl(contentUrl) && !contentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
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
            isHighlighted: true, // 🆕 Marcar como destaque
            created_at: post.data_publicacao || post.created_at,
            user: model ? {
              id: model.id || post.modelo_id || 'unknown',
              username: model.username || model.name || 'Usuário',
              avatar_url: model.avatar_url || '',
              followers_count: model.followers_count || 0,
              following_count: 0,
              is_online: model.is_live || false,
              bio: model.bio || '',
              posting_panel_url: model.posting_panel_url || '',
              created_at: model.created_at || '',
            } : {
              id: post.modelo_id || 'unknown',
              username: post.modelo_username || 'Usuário',
              avatar_url: '',
              followers_count: 0,
              following_count: 0,
              is_online: false,
              bio: '',
              created_at: '',
            }
          } as any;
        })
        .filter(Boolean);

      const processedMainPosts = (postsPrincipais || [])
        .filter((post) => !viewedPosts.has(`main-${post.id}`)) // 🆕 Filtrar já visualizados
        .map((post) => {
          const model = post.modelo || modelsData?.find((m: any) => m.id === post.modelo_id);
          const contentUrl = normalizeUrl(post.conteudo_url || '');
          
          if (!contentUrl || (!isValidVideoUrl(contentUrl) && !contentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
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
            isHighlighted: true, // 🆕 Marcar como destaque
            created_at: post.created_at,
            user: model ? {
              id: model.id || post.modelo_id || 'unknown',
              username: model.username || model.name || 'Usuário',
              avatar_url: model.avatar_url || '',
              followers_count: model.followers_count || 0,
              following_count: 0,
              is_online: model.is_live || false,
              bio: model.bio || '',
              posting_panel_url: model.posting_panel_url || '',
              created_at: model.created_at || '',
            } : {
              id: post.modelo_id || 'unknown',
              username: post.modelo_username || 'Usuário',
              avatar_url: '',
              followers_count: 0,
              following_count: 0,
              is_online: false,
              bio: '',
              created_at: '',
            }
          } as any;
        })
        .filter(Boolean);

      // Normalizar e enriquecer vídeos válidos do catálogo
      const validVideos = (videosData || [])
        .map((v) => ({ ...v, video_url: normalizeUrl(v.video_url || '') }))
        .filter((v) => {
          const isValid = isValidVideoUrl(v.video_url);
          if (!isValid && v.video_url) {
            console.warn(`🚫 URL inválida filtrada: ${v.video_url}`);
          }
          return isValid;
        })
        .map((video) => {
          const model = modelsData?.find((m: any) => m.id === video.model_id);
          return {
            ...video,
            user_id: video.model_id || '',
            music_name: video.title || `Som original - ${model?.username || model?.name || 'Autor'}`,
            visibility: (video.visibility as 'public' | 'premium') || 'public',
            source: 'catalog_video',
            user: model
              ? {
                  id: model.id,
                  username: model.username || model.name || 'Usuário',
                  avatar_url: model.avatar_url || '',
                  followers_count: model.followers_count || 0,
                  following_count: 0,
                  is_online: model.is_live || false,
                  bio: model.bio || '',
                  posting_panel_url: model.posting_panel_url || '',
                  created_at: model.created_at || '',
                }
              : {
                  id: video.model_id || '',
                  username: video.title || 'Usuário',
                  avatar_url: '',
                  followers_count: 0,
                  following_count: 0,
                  is_online: false,
                  bio: '',
                  created_at: '',
                },
          } as any;
        });

      console.log(`✅ Conteúdo processado: ${processedScheduledPosts.length} posts agendados, ${processedMainPosts.length} posts principais, ${validVideos.length} vídeos válidos`);

      const allContent = [...processedScheduledPosts, ...processedMainPosts, ...validVideos];
      
      if (allContent.length > 0) {
        // 🌟 PRIORIDADE MÁXIMA: Posts agendados recentes sempre no topo
        const recentPosts = [...processedScheduledPosts, ...processedMainPosts]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        console.log(`🌟 ${recentPosts.length} posts agendados/principais serão destacados no início`);

        // 1) Organizar vídeos do catálogo por modelo e preparar filas internas
        const videosByModel: Record<string, any[]> = {};
        validVideos.forEach((v: any) => {
          const mid = v.user?.id || v.model_id || '';
          if (!mid) return;
          if (!videosByModel[mid]) videosByModel[mid] = [];
          videosByModel[mid].push(v);
        });

        // Ordenar fila de cada modelo: hoje primeiro, depois mais recentes
        Object.keys(videosByModel).forEach((mid) => {
          videosByModel[mid].sort((a, b) => {
            const aToday = isToday(a.created_at);
            const bToday = isToday(b.created_at);
            if (aToday !== bToday) return aToday ? -1 : 1;
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bTime - aTime;
          });
        });

        // 2) Definir ordem dos modelos (prioriza quem tem vídeos de hoje e com interação)
        const modelIdsWithVideos = Object.keys(videosByModel);
        const modelScores: Record<string, number> = {};
        modelIdsWithVideos.forEach((mid) => {
          const queue = videosByModel[mid] || [];
          const hasToday = queue.some((v) => isToday(v.created_at));
          const interacted = interactedModelIds.has(mid);
          const modelInfo = modelsData?.find((m: any) => m.id === mid);
          let score = 0;
          if (hasToday) score += 1000;
          if (interacted) score += 500;
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

        // 🎯 SEQUÊNCIA FINAL: Posts recentes primeiro + vídeos rotativos + repetir quando acabar
        const ordered: any[] = [
          ...recentPosts,  // Posts agendados recentes sempre no topo
          ...catalogVideos // Vídeos do catálogo em rotação
        ];

        // 4) Definir estados (carregamento em blocos)
        const firstBlock = ordered.slice(0, VIDEOS_PER_BLOCK);
        setAllAvailableVideos(ordered as any);
        setVideos(firstBlock as any);
        setCurrentVideoIndex(0);
        setCurrentPage(1);
        setHasMoreVideos(ordered.length > VIDEOS_PER_BLOCK);
        setModelOrder(orderedModels);
        setCycleSize(orderedModels.length);

        console.log(`🎯 Feed organizado: ${recentPosts.length} posts recentes + ${catalogVideos.length} vídeos rotativos = ${ordered.length} total. Exibindo primeiros ${firstBlock.length}.`);
        
        // Cache the results for faster subsequent loads
        sessionStorage.setItem('initial_feed', JSON.stringify(firstBlock));
        sessionStorage.setItem('initial_feed_time', Date.now().toString());
      } else {
        console.warn('⚠️ Nenhum conteúdo válido encontrado - criando exemplo');
        const exampleData = createExampleData();
        setVideos(exampleData as any);
        setAllAvailableVideos(exampleData as any);
        setHasMoreVideos(false);
      }
      
    } catch (error) {
      console.error('❌ Erro ao inicializar feed:', error);
      setVideos([]);
      setAllAvailableVideos([]);
      setHasMoreVideos(false);
    } finally {
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
    }
  }, []);

  // Simplificar - não precisamos mais desta função separada

  // useEffect para inicializar o feed
  useEffect(() => {
    console.log('🚀 INICIALIZANDO APLICATIVO - Carregando dados...');
    initializeFeed();
  }, []); // Executar apenas uma vez na montagem

  // 🔄 LÓGICA ESPECIAL: Detectar fim do ciclo e recarregar com conteúdo atualizado
  useEffect(() => {
    if (!pendingRefresh || allAvailableVideos.length === 0) return;
    
    // Quando chegar no último vídeo, reiniciar com conteúdo atualizado
    const isLastVideo = currentVideoIndex >= allAvailableVideos.length - 1;
    if (isLastVideo) {
      console.log('🔄 Fim do ciclo detectado - recarregando com conteúdo atualizado...');
      setTimeout(() => {
        initializeFeed();
        setPendingRefresh(false);
      }, 1000); // Pequeno delay para não interromper a visualização
    }
  }, [pendingRefresh, currentVideoIndex, allAvailableVideos.length, initializeFeed]);
  
  // Auto-reload quando acabar os vídeos (volta para o início com atualizações)
  useEffect(() => {
    if (videos.length === 0 || allAvailableVideos.length === 0) return;
    
    const isEndOfContent = currentVideoIndex >= allAvailableVideos.length - 2;
    if (isEndOfContent && !isLoadingMore) {
      console.log('🎬 Chegando ao fim - preparando próximo ciclo com atualizações...');
      setPendingRefresh(true);
    }
  }, [currentVideoIndex, allAvailableVideos.length, videos.length, isLoadingMore]);

  // Remover função de organização complexa - usar abordagem mais simples
  
  // 📱 NOVA LÓGICA: Carregar próximo bloco de vídeos (simplificado)
  const loadMoreVideos = useCallback(async () => {
    if (isLoadingMore || !hasMoreVideos || allAvailableVideos.length === 0) {
      console.log('🚫 Não pode carregar mais:', { isLoadingMore, hasMoreVideos, allAvailableCount: allAvailableVideos.length });
      return;
    }
    
    try {
      setIsLoadingMore(true);
      console.log(`🔄 Carregando mais vídeos... Página: ${currentPage + 1}`, {
        videosCarregados: videos.length,
        videosDisponiveis: allAvailableVideos.length
      });

      // Filtrar vídeos ainda não carregados
      const unusedVideos = allAvailableVideos.filter(v => 
        !videos.some(existing => existing.id === v.id)
      );

      console.log(`📊 Vídeos ainda não usados: ${unusedVideos.length}`);

      if (unusedVideos.length === 0) {
        console.log('🔄 Fim do conteúdo - recarregando com atualizações...');
        setHasMoreVideos(false);
        // Recarregar feed automaticamente para buscar novos posts agendados
        setTimeout(() => {
          console.log('🎬 Reiniciando ciclo com conteúdo atualizado...');
          initializeFeed();
        }, 2000);
        return;
      }

      // Pegar próximo bloco
      const nextBlock = unusedVideos.slice(0, VIDEOS_PER_BLOCK);
      
      if (nextBlock.length === 0) {
        console.log('⚠️ Bloco vazio - finalizando');
        setHasMoreVideos(false);
        return;
      }

      // Adicionar ao feed
      setVideos(prev => [...prev, ...nextBlock]);
      setCurrentPage(prev => prev + 1);
      setHasMoreVideos(unusedVideos.length > VIDEOS_PER_BLOCK);
      
      console.log(`✅ Bloco adicionado: ${nextBlock.length} vídeos. Total agora: ${videos.length + nextBlock.length}/${allAvailableVideos.length}`);

    } catch (error) {
      console.error('❌ Erro ao carregar mais vídeos:', error);
      setHasMoreVideos(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreVideos, allAvailableVideos, videos, currentPage, VIDEOS_PER_BLOCK, initializeFeed]);
  
  // 📱 NOVA LÓGICA: Carregamento automático quando próximo do fim
  useEffect(() => {
    const shouldLoadMore = currentVideoIndex >= videos.length - 10; // Carrega quando faltam 10 vídeos
    
    if (shouldLoadMore && !isLoadingMore && hasMoreVideos && videos.length > 0) {
      console.log('🔄 AUTO-LOAD: Carregando mais vídeos automaticamente...', {
        currentVideoIndex,
        videosLength: videos.length,
        allAvailableLength: allAvailableVideos.length,
        hasMoreVideos
      });
      loadMoreVideos();
    }
  }, [currentVideoIndex, videos.length, isLoadingMore, hasMoreVideos, allAvailableVideos.length, loadMoreVideos]);
  
  // Abrir vídeo selecionado de um perfil na tela principal
  const openSelectedVideo = async (videoId: string) => {
    try {
      const { data: vData, error: vErr } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single();
      if (vErr || !vData) return;

      const { data: model, error: mErr } = await supabase
        .from('models')
        .select('*')
        .eq('id', vData.model_id)
        .single();
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

  const goToHome = () => {
    console.log('🏠 Voltando para a tela inicial');
    setShowProfile(false);
    setCurrentVideoIndex(0);
    emblaApi?.scrollTo(0);
  };

  const backToCurrentVideo = () => {
    console.log('🏠 Voltando para onde parou a visualização');
    setShowProfile(false);
    setShowComments(false);
    setShowSearch(false);
    setShowLive(false);
    setShowPremium(false);
    // Mantém o vídeo atual sem mudar o índice
  };

  const loadComments = async (videoId: string) => {
    try {
      console.log('💬 LOADING COMMENTS for video:', videoId);
      
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

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
      
      // Transform the data to match the Comment interface
      const transformedComments = (commentsData || []).map((comment: any) => ({
        id: comment.id,
        text: comment.content || comment.text || '',
        user_id: comment.user_id,
        video_id: comment.video_id,
        likes_count: comment.likes_count || 0,
        created_at: comment.created_at,
        user: {
          username: comment.username || `User ${comment.user_id?.slice(0, 8)}`,
          avatar_url: comment.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'
        }
      }));

      setComments(transformedComments);
    } catch (error) {
      console.error('❌ Error loading comments:', error);
      setComments([]);
    }
  };

  const checkIfLiked = async (videoId: string) => {
    try {
      // Use consistent user ID from session
      const currentUserId = localStorage.getItem('session_user_id') || (() => {
        const newId = crypto.randomUUID();
        localStorage.setItem('session_user_id', newId);
        return newId;
      })();
      
      console.log('🔍 CHECKING IF LIKED:');
      console.log('🔍 Video ID:', videoId);
      console.log('🔍 User ID:', currentUserId);
      
      // Check if user has an active like for this video in database
      const { data, error } = await supabase
        .from('likes')
        .select('id, is_active')
        .eq('user_id', currentUserId)
        .eq('video_id', videoId)
        .eq('is_active', true)
        .maybeSingle();
      
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
      // Use consistent user ID from session
      const currentUserId = sessionStorage.getItem('user_id') || (() => {
        const newId = crypto.randomUUID();
        sessionStorage.setItem('user_id', newId);
        return newId;
      })();
      
      console.log('🔍 CHECKING IF FOLLOWING:');
      console.log('🔍 Model ID:', modelId);
      console.log('🔍 User ID:', currentUserId);
      
      const { data, error } = await supabase
        .from('model_followers')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('model_id', modelId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('❌ Error checking if following:', error);
        setFollowingModels(prev => ({
          ...prev,
          [modelId]: false
        }));
        return;
      }
      
      const following = data ? true : false;
      console.log('🔍 IS FOLLOWING:', following);
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

    // Use a consistent user ID for the session
    const currentUserId = localStorage.getItem('session_user_id') || (() => {
      const newId = crypto.randomUUID();
      localStorage.setItem('session_user_id', newId);
      return newId;
    })();

    try {
      // Primeiro, verificar se já existe um like ativo
      const { data: existingLike, error: checkError } = await supabase
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

      let newLikedState = false;
      let likeAction = '';

      if (existingLike) {
        // Se existe, toggle do estado is_active
        newLikedState = !existingLike.is_active;
        likeAction = newLikedState ? 'REATIVAR' : 'DESATIVAR';
        
        const { error: updateError } = await supabase
          .from('likes')
          .update({ is_active: newLikedState })
          .eq('id', existingLike.id);

        if (updateError) throw updateError;
        
        console.log(`✅ LIKE ${likeAction} - ID: ${existingLike.id}`);
      } else {
        // Se não existe, criar novo like
        newLikedState = true;
        likeAction = 'CRIAR';
        
        const { error: insertError } = await supabase
          .from('likes')
          .insert({
            user_id: currentUserId,
            video_id: currentVideo.id,
            model_id: currentVideo.user?.id || currentVideo.user_id || null,
            is_active: true,
            ip_address: null,
            user_agent: navigator.userAgent
          });
        
        if (insertError) {
          console.error('❌ Error inserting like:', insertError);
          // Se erro for de coluna não existir, tentar inserção mais simples
          if (insertError.message?.includes('column') || insertError.code === '42703') {
            console.log('🔧 Tentando inserção simplificada...');
            const { error: simpleError } = await supabase
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

        console.log('✅ LIKE CRIADO com sucesso');
      }

      // Atualizar estado local
      setIsLiked(newLikedState);
      if (currentVideo.id) {
        localStorage.setItem(`liked_${currentVideo.id}`, String(newLikedState));
      }

      // ✨ IMPORTANTE: Registrar no sistema de analytics
      const userId = currentVideo.user?.id || currentVideo.model_id || '';
      const modelId = currentVideo.model_id || userId;
      
      if (userId) {
        await trackLike(currentVideo.id, userId, newLikedState);
        ensureInteractedModel(userId);
        await checkAndTrackAction('like', currentVideo.id, userId);
        
        // markModelAsFavorite desativado temporariamente
      }

      // Update video likes count
      const newCount = Math.max(0, currentVideo.likes_count + (newLikedState ? 1 : -1));
      
      const { error } = await supabase
        .from('videos')
        .update({ likes_count: newCount })
        .eq('id', currentVideo.id);

      if (error) throw error;

      // Update local state
      setVideos(prev => prev.map(video => 
        video.id === currentVideo.id 
          ? { ...video, likes_count: newCount }
          : video
      ));

      if (newLikedState) {
        // Add like explosion animation
        createLikeExplosion();
      }

      console.log('✅ TOGGLE LIKE - Ação completa! Novo count:', newCount);

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
      // Use consistent user ID from session (same as likes)
      const currentUserId = localStorage.getItem('session_user_id') || (() => {
        const newId = crypto.randomUUID();
        localStorage.setItem('session_user_id', newId);
        return newId;
      })();

      // In a real app, you'd have a current user
      const mockUser = {
        id: currentUserId,
        username: 'Visitante',
        avatar_url: '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'
      };

      console.log('💬 ADD COMMENT - Inserindo:', { text: text.trim(), user_id: currentUserId, video_id: currentVideo.id });

      const { data, error } = await supabase
        .from('comments')
        .insert({
          content: text.trim(),
          user_id: currentUserId,
          video_id: currentVideo.id,
          model_id: currentVideo.user.id,
          likes_count: 0,
          ip_address: null,
          user_agent: navigator.userAgent
        })
        .select('*')
        .single();

      if (error) {
        console.error('❌ Error inserting comment:', error);
        
        // 🔧 Se falhar por RLS, criar comentário local e tentar inserção simplificada
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          console.log('🔧 Tentando inserção simplificada devido a RLS...');
          
          const mockComment = {
            id: crypto.randomUUID(),
            text: text.trim(),
            user_id: currentUserId,
            video_id: currentVideo.id,
            created_at: new Date().toISOString(),
            likes_count: 0,
            user: mockUser
          };
          
          // Adicionar comentário localmente
          setComments(prev => [mockComment, ...prev]);
          
          // Tentar inserção simplificada em background
          try {
            await supabase
              .from('comments')
              .insert({
                content: text.trim(),
                user_id: currentUserId,
                video_id: currentVideo.id
              });
            console.log('✅ Comentário inserido em modo simplificado');
          } catch (bgError) {
            console.warn('⚠️ Falha na inserção em background:', bgError);
          }
        } else {
          throw error;
        }
      } else {
        console.log('✅ Comment inserted successfully:', data);
        
        // Adicionar comentário com dados do servidor
        const newComment = {
          id: data.id,
          text: data.content,
          user_id: data.user_id,
          video_id: data.video_id,
          likes_count: data.likes_count || 0,
          created_at: data.created_at,
          user: mockUser
        };
        setComments(prev => [newComment, ...prev]);
      }

      console.log('✅ Comment inserted successfully:', data);

      // ✨ IMPORTANTE: Registrar no sistema de analytics
      await trackComment(currentVideo.id, currentVideo.user?.id || '');
      await checkAndTrackAction('comment', currentVideo.id, currentVideo.user_id);

      // Add comment to local state with transformed format - ADD TO BEGINNING
      const newComment = {
        id: data.id,
        text: data.content,
        user_id: data.user_id,
        video_id: data.video_id,
        likes_count: data.likes_count,
        created_at: data.created_at,
        user: {
          username: mockUser.username,
          avatar_url: mockUser.avatar_url
        }
      };

      console.log('💬 ADD COMMENT - Adicionando ao estado local:', newComment);

      // Prepend to comments list so new comment appears first
      setComments(prev => {
        const updatedComments = [newComment, ...prev];
        console.log('💬 Updated comments list:', updatedComments);
        return updatedComments;
      });

      // Update video comments count
      const newCount = currentVideo.comments_count + 1;
      await supabase
        .from('videos')
        .update({ comments_count: newCount })
        .eq('id', currentVideo.id);

      setVideos(prev => prev.map(video => 
        video.id === currentVideo.id 
          ? { ...video, comments_count: newCount }
          : video
      ));

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
      // Use consistent user ID
      const currentUserId = localStorage.getItem('session_user_id') || (() => {
        const newId = crypto.randomUUID();
        localStorage.setItem('session_user_id', newId);
        return newId;
      })();

      // Temporarily increment shares_count until shares table types are updated
      const { data: videoData } = await supabase
        .from('videos')
        .select('shares_count')
        .eq('id', currentVideo.id)
        .single();
      
      const currentShares = videoData?.shares_count || 0;
      const { error: shareError } = await supabase
        .from('videos')
        .update({ shares_count: currentShares + 1 })
        .eq('id', currentVideo.id);

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
      await supabase
        .from('videos')
        .update({ shares_count: newCount })
        .eq('id', currentVideo.id);

      setVideos(prev => prev.map(video => 
        video.id === currentVideo.id 
          ? { ...video, shares_count: newCount }
          : video
      ));

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
    if (!currentVideo) return;
    
    const currentIsFollowing = followingModels[currentVideo.user.id] || false;
    if (currentIsFollowing) return;

    console.log('🔔 SEGUIR: Iniciando follow modelo', currentVideo.user.id);

    try {
      // Usar ID de sessão anônima (mesmo sistema do FollowingPage)
      let userId = localStorage.getItem('anonymous_user_id');
      if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem('anonymous_user_id', userId);
      }

      // Atualizar estado local IMEDIATAMENTE
      setFollowingModels(prev => ({
        ...prev,
        [currentVideo.user.id]: true
      }));

      // Obter dados do usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();

      // Inserção direta no banco de dados
      const { error: followError } = await supabase
        .from('model_followers')
        .upsert({
          user_id: userId,
          model_id: currentVideo.user.id,
          user_name: user?.user_metadata?.full_name || user?.email || 'Usuário',
          user_email: user?.email || '',
          is_active: true
        }, {
          onConflict: 'user_id,model_id'
        });

      if (followError) {
        console.warn('⚠️ Erro no banco ao seguir:', followError);
        // Não bloquear o usuário - manter o estado local
      }

      // Salvar no localStorage para persistência
      const followKey = `follow_${userId}_${currentVideo.user.id}`;
      localStorage.setItem(followKey, 'true');
      
      // 📊 REGISTRAR AÇÃO NO PAINEL ADMIN
      await trackFollow(currentVideo.user.id);
      
      // Atualizar contador localmente
      setVideos(prev => prev.map(video => 
        video.user.id === currentVideo.user.id
          ? { 
              ...video, 
              user: { 
                ...video.user, 
                followers_count: video.user.followers_count + 1 
              }
            }
          : video
      ));

      console.log('✅ SEGUIR: Processo concluído com sucesso!');
      toast({
        title: `Você está seguindo ${currentVideo.user.username}!`,
        description: "Agora você receberá atualizações dos novos conteúdos",
        duration: 4000,
      });

    } catch (error) {
      console.error('Error following model:', error);
      toast({
        title: "Erro",
        description: "Não foi possível seguir a modelo",
        variant: "destructive"
      });
    }
  };

  const nextVideo = useCallback(() => {
    console.log('⬇️ NAVEGAÇÃO: Próximo vídeo solicitado');
    console.log(`⬇️ NAVEGAÇÃO: Vídeo atual: ${currentVideoIndex + 1}/${videos.length}`);
    
    if (emblaApi && isMobile) {
      console.log('⬇️ NAVEGAÇÃO: Usando Embla (mobile)');
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      } else {
        console.log('🔁 FIM DA LISTA (mobile) → Voltando ao topo');
        emblaApi.scrollTo(0);
      }
    } else {
      const nextIndex = currentVideoIndex + 1;
      if (nextIndex < videos.length) {
        console.log(`⬇️ NAVEGAÇÃO: Indo para vídeo ${nextIndex + 1}/${videos.length} (desktop)`);
        setCurrentVideoIndex(nextIndex);
        
        // 🔐 INCREMENTA CONTADOR NO DESKTOP TAMBÉM
        if (!currentUser) {
          const newCount = videosWatched + 1;
          console.log('🔐 DESKTOP - INCREMENTANDO CONTADOR:', { 
            anterior: videosWatched, 
            novo: newCount,
            deveRedirecionar: newCount >= 5
          });
          
          setVideosWatched(newCount);
          localStorage.setItem('videosWatched', newCount.toString());
          
          // Redireciona para /auth após 5 vídeos
          if (newCount >= 5) {
            console.log('🚨 DESKTOP - REDIRECIONANDO PARA /AUTH!');
            localStorage.setItem('requiresLogin', 'true');
            localStorage.setItem('returnTo', '/app');
            navigate('/auth');
          }
        }
      } else if (videos.length > 0) {
        console.log('🔁 FIM DA LISTA (desktop) → Voltando ao topo');
        setCurrentVideoIndex(0);
      }
    }
  }, [emblaApi, isMobile, currentVideoIndex, videos.length, currentUser, videosWatched, navigate]);

  const prevVideo = useCallback(() => {
    console.log('⬆️ NAVEGAÇÃO: Vídeo anterior solicitado');
    console.log(`⬆️ NAVEGAÇÃO: Vídeo atual: ${currentVideoIndex + 1}/${videos.length}`);
    
    if (emblaApi && isMobile) {
      console.log('⬆️ NAVEGAÇÃO: Usando Embla (mobile)');
      if (emblaApi.canScrollPrev()) {
        emblaApi.scrollPrev();
      }
    } else {
      if (currentVideoIndex > 0) {
        const prevIndex = currentVideoIndex - 1;
        console.log(`⬆️ NAVEGAÇÃO: Indo para vídeo ${prevIndex + 1}/${videos.length} (desktop)`);
        setCurrentVideoIndex(prevIndex);
      }
    }
  }, [emblaApi, isMobile, currentVideoIndex, videos.length]);

  const goToModelVideo = async (modelId: string) => {
    console.log('🔍 Buscando vídeo da modelo:', modelId);
    
    // Primeiro tentar encontrar nos vídeos já carregados
    const modelVideoIndex = videos.findIndex(video => 
      video.user.id === modelId || video.model_id === modelId
    );
    if (modelVideoIndex !== -1) {
      console.log('✅ Modelo encontrada nos vídeos carregados, indo para índice:', modelVideoIndex);
      setCurrentVideoIndex(modelVideoIndex);
      emblaApi?.scrollTo(modelVideoIndex);
      setShowProfile(true);
      return;
    }
    
    // Se não encontrou, carregar vídeos da modelo do banco
    try {
      console.log('🔄 Carregando vídeos da modelo do banco...');
      const { data: modelData, error: modelError } = await supabase
        .from('models')
        .select('*')
        .eq('id', modelId)
        .single();

      if (modelError || !modelData) {
        console.error('❌ Modelo não encontrada:', modelError);
        return;
      }

      // Buscar vídeo na tabela videos
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('model_id', modelId)
        .eq('is_active', true)
        .limit(1);

      // Se não encontrou em videos, buscar em posts_agendados
      if (!videoData || videoData.length === 0) {
        console.log('🔍 Buscando em posts agendados...');
        const { data: scheduledPosts, error: scheduledError } = await supabase
          .from('posts_agendados')
          .select('*')
          .eq('modelo_id', modelId)
          .eq('status', 'publicado')
          .limit(1);

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
        const { data: mainPosts, error: mainError } = await supabase
          .from('posts_principais')
          .select('*')
          .eq('modelo_id', modelId)
          .limit(1);

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

        // Continuar sem exibir erro se não encontrar conteúdo
        console.log('ℹ️ Nenhum conteúdo adicional encontrado para a modelo');
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
    
    // Prepare content data for preview modal
    const contentData = {
      id: currentVideo.id,
      displayName: currentVideo.user.username,
      avatarUrl: currentVideo.user.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png',
      platform: 'premium', // Define como premium para mostrar o modal
      views: currentVideo.views_count,
      likes: currentVideo.likes_count
    };
    
    console.log('🔒 Content data:', contentData);
    
    setSelectedVideoForPreview(contentData);
    setShowVideoPreview(true);
    
    console.log('🔒 Modal deve estar aberto agora');
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

  // Embla carousel event listeners
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setCurrentVideoIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on('select', onSelect);
    onSelect(); // Set initial index

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  // Keyboard navigation for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isMobile && !showProfile && !showComments && !showSearch && !showLive && !showVideoPreview) {
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
      if (!isMobile && !showProfile && !showComments && !showSearch && !showLive && !showVideoPreview) {
        e.preventDefault();
        if (e.deltaY > 0) {
          nextVideo();
        } else {
          prevVideo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [isMobile, isPlaying, nextVideo, prevVideo, showProfile, showComments, showSearch, showLive, showVideoPreview]);

  // Remove old touch gestures - now handled by Embla

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Carregando vídeos...</p>
        </div>
      </div>
    );
  }

  if (!currentVideo || videos.length === 0) {
    console.log('🚫 RENDER: Nenhum vídeo disponível');
    console.log('🚫 RENDER: videos.length:', videos.length);
    console.log('🚫 RENDER: currentVideoIndex:', currentVideoIndex);
    console.log('🚫 RENDER: currentVideo:', currentVideo);
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Nenhum vídeo disponível</p>
          <p className="text-gray-400">Aguarde novos conteúdos!</p>
          <Button 
            onClick={initializeFeed} 
            className="mt-4 bg-primary hover:bg-primary/80"
          >
            Recarregar
          </Button>
        </div>
      </div>
    );
  }

  console.log('✅ RENDER: Renderizando vídeo');
  console.log('✅ RENDER: currentVideo:', currentVideo?.title);
  console.log('✅ RENDER: currentVideoIndex:', currentVideoIndex);
  console.log('✅ RENDER: videos.length:', videos.length);

  // Mobile version with vertical swiper
  if (isMobile) {
    return (
      <div className="relative w-full h-screen bg-white overflow-hidden [&::-webkit-scrollbar]:hidden [-webkit-scrollbar:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        
        {/* Top Bar Mobile - Nova barra com ícones */}
        <div 
          className="fixed top-0 left-0 right-0 z-40 h-14 opacity-50 backdrop-blur-sm flex items-center justify-between px-4"
          style={{ 
            background: 'linear-gradient(to bottom, #33ebeb, #33eba3, #d4e633, #f7b833)'
          }}
        >
          {/* Menu - Esquerda */}
          <div className="flex items-center gap-2">
            <CategoryMenu
              onOpenLive={() => setShowLive(true)}
              onSelectModel={(modelId) => goToModelVideo(modelId)}
              onExit={async () => {
                try {
                  sessionStorage.setItem('logging_out', 'true');
                  await supabase.auth.signOut();
                  navigate('/auth', { replace: true });
                  setTimeout(() => {
                    sessionStorage.removeItem('logging_out');
                  }, 500);
                } catch (error) {
                  console.error('Erro ao fazer logout:', error);
                  sessionStorage.removeItem('logging_out');
                  navigate('/auth', { replace: true });
                }
              }}
            />
          </div>
          
          {/* Ícones - Direita */}
          <div className="flex items-center gap-2">
            {/* Search/Lupa */}
            <button
              onClick={() => setShowSearch(true)}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-black hover:bg-white/30 transition-colors"
              title="Pesquisar"
            >
              <Search className="w-5 h-5 text-black" />
            </button>
          </div>
        </div>

        {/* Bonus Gift - Mantém o componente original para a funcionalidade */}
        <div className="hidden">
          <BonusGift isMobile={true} />
        </div>

        {import.meta.env.DEV && (
          <button
            onClick={() => {
              localStorage.removeItem('ageVerification');
              console.log('🧪 TESTE: Verificação removida, recarregue a página');
              toast({
                title: "Teste de Verificação",
                description: "Recarregue a página para ver o popup novamente"
              });
            }}
            className="hidden md:block fixed top-4 right-4 z-30 px-3 py-1 bg-red-500/80 backdrop-blur-sm rounded-full text-white text-xs hover:bg-red-600/80 transition-colors"
          >
            🧪 Reset +18
          </button>
        )}

        {/* Side Menu - Mobile positioning - Só aparece na tela principal */}
        {!showProfile && !showChat && (
          <div className="fixed bottom-32 right-3 z-[9999] pointer-events-auto">
            <SideMenu
              video={currentVideo}
              isLiked={isLiked}
              isMuted={isMuted}
              isPlaying={isPlaying}
              isFollowing={followingModels[currentVideo?.user?.id] || false}
              onToggleLike={() => {
                console.log('Mobile like clicked via SideMenu');
                toggleLike();
              }}
              onToggleSound={() => {
                console.log('Mobile sound toggle clicked via SideMenu'); 
                setIsMuted(!isMuted);
              }}
              onTogglePlay={() => {
                console.log('Mobile play toggle clicked via SideMenu');
                setIsPlaying(!isPlaying);
              }}
              onToggleFollow={() => {
                console.log('Mobile follow clicked via SideMenu');
                followModel();
              }}
              onOpenComments={async () => {
                console.log('Mobile comments clicked via SideMenu');
                await checkAndTrackAction('comment', currentVideo?.id, currentVideo?.user?.id);
                await trackComment(currentVideo?.id || '', currentVideo?.user?.id || '');
                setShowComments(true);
              }}
              onOpenProfile={async () => {
                console.log('Mobile profile clicked via SideMenu');
                await checkAndTrackAction('profile_view', currentVideo?.id, currentVideo?.user?.id);
                await trackFollow(currentVideo?.user?.id || '');
                setShowProfile(true);
              }}
              onOpenLive={() => {
                console.log('Mobile live clicked via SideMenu');
                setShowLive(true);
              }}
              onBlockVideo={undefined}
              onOpenPremium={() => {
                console.log('Mobile premium clicked via SideMenu');
                if (currentVideo?.user?.posting_panel_url) {
                  const raw = currentVideo.user.posting_panel_url;
                  const url = /^(https?:)?\/\//i.test(raw || '') ? (raw as string) : `https://${raw}`;
                  window.open(url, '_blank');
                  toast({
                    title: "Abrindo página premium",
                    description: `Redirecionando para ${currentVideo.user.username}`
                  });
                }
              }}
              onFullscreen={handleFullscreen}
            />
          </div>
        )}

        {/* Barra de Navegação Inferior - Estilo TikTok */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-black border-t border-gray-800 flex items-center justify-around px-2 z-[60] pb-safe">
          <button 
            onClick={backToCurrentVideo}
            className="flex flex-col items-center justify-center flex-1 text-white hover:text-gray-300 transition-colors"
          >
            <Home className="w-7 h-7 mb-0.5" strokeWidth={1.5} />
            <span className="text-xs">Início</span>
          </button>

          <button 
            onClick={() => navigate('/explore')}
            className="flex flex-col items-center justify-center flex-1 text-white hover:text-gray-300 transition-colors"
          >
            <Compass className="w-7 h-7 mb-0.5" strokeWidth={1.5} />
            <span className="text-xs">Explorar</span>
          </button>

          <button 
            onClick={() => setShowLive(true)}
            className="flex items-center justify-center w-12 h-9 bg-white rounded-lg shadow-lg -mt-2"
          >
            <Plus className="w-8 h-8 text-black" strokeWidth={2.5} />
          </button>

          <button 
            onClick={() => console.log('Marketplace')}
            className="flex flex-col items-center justify-center flex-1 text-white hover:text-gray-300 transition-colors"
          >
            <ShoppingBag className="w-7 h-7 mb-0.5" strokeWidth={1.5} />
            <span className="text-xs">Marketplace</span>
          </button>

          <button 
            onClick={() => setShowChat(true)}
            className="flex flex-col items-center justify-center flex-1 text-white hover:text-gray-300 transition-colors relative"
          >
            <MessageCircle className="w-7 h-7 mb-0.5" strokeWidth={1.5} />
            <span className="text-xs">Chat</span>
            {/* Indicador de ativo */}
            <div className="absolute bottom-0 w-1 h-1 bg-white rounded-full"></div>
          </button>
        </div>

        {/* Vertical Carousel Container */}
        <div className="embla h-screen" ref={emblaRef}>
          <div className="embla__container h-full flex flex-col">
            {videos.map((video, index) => (
              <div key={video.id} className="embla__slide flex-shrink-0 w-full h-screen relative">
                {/* Um vídeo por modelo em sequência linear */}
                <VideoPlayer
                  ref={index === currentVideoIndex ? videoRef : null}
                  video={video}
                  isPlaying={isPlaying && index === currentVideoIndex}
                  isMuted={isMuted}
                  onNext={nextVideo}
                  onPrevious={prevVideo}
                  onDoubleClick={toggleLike}
                  onTogglePlay={() => setIsPlaying(!isPlaying)}
                />
                
                {/* Bottom Info - only show for current video */}
                {index === currentVideoIndex && (
                  <BottomInfo 
                    video={video} 
                    isNew={isVideoNew(video)} 
                    isPlaying={isPlaying}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Hidden preloader for next video (speeds up decode/start) */}
        {videos[currentVideoIndex + 1]?.video_url && (
          <video
            src={videos[currentVideoIndex + 1].video_url}
            preload="auto"
            muted
            playsInline
            style={{ display: 'none' }}
          />
        )}

        {/* Profile Screen */}
        <ProfileScreen
          user={currentVideo.user}
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
          onGoHome={goToHome}
          onVideoSelect={(videoId) => {
            openSelectedVideo(videoId);
          }}
          onOpenChat={() => {
            setShowProfile(false);
            setShowChat(true);
          }}
        />

        {/* Chat Screen */}
        <ChatScreen
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          modelName={currentVideo.user.username}
          modelAvatar={currentVideo.user.avatar_url}
        />

        {/* Comments Screen */}
        <CommentsScreen
          comments={comments}
          isOpen={showComments}
          onClose={() => setShowComments(false)}
          onAddComment={addComment}
        />
        
        {/* Search Modal */}
        <SearchModal
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          onSelectModel={(modelId) => {
            goToModelVideo(modelId);
            setShowSearch(false);
          }}
        />

        {/* Live Modal */}
        <LiveModal
          isOpen={showLive}
          onClose={() => setShowLive(false)}
          onSelectModel={goToModelVideo}
        />

        {/* Action Tracker */}
        <ActionTracker 
          onActionAttempt={async (actionType, userName) => {
            return await handleActionAttempt(actionType, userName);
          }}
        />

        {/* Video Preview Modal (Premium Content) */}
        <VideoPreviewModal
          isOpen={showVideoPreview}
          onClose={() => setShowVideoPreview(false)}
          content={selectedVideoForPreview}
        />
      </div>
    );
  }

  // Desktop version (TikTok-like desktop layout)
  return (
    <div className="min-h-screen bg-white text-foreground">
      {/* Desktop Header */}
      <div 
        className="sticky top-0 z-[60] flex items-center justify-between px-6 py-4 border-b border-green-200"
        style={{ 
          background: 'linear-gradient(to bottom, #33ebeb, #33eba3, #d4e633, #f7b833)'
        }}
      >
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (showProfile || showSearch || showLive || showPremium) {
                // Se estiver em alguma modal/tela, fecha ela
                setShowProfile(false);
                setShowSearch(false);
                setShowLive(false);
                setShowPremium(false);
              } else {
                // Se estiver na tela principal, volta ao primeiro vídeo
                goToHome();
              }
            }}
            className="bg-transparent hover:bg-white/10 text-black border border-black"
          >
            <ArrowLeft className="h-4 w-4 mr-2 text-black" />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center justify-center w-[80px] h-[80px] rounded-full overflow-hidden bg-transparent">
                <img 
                  src={coconudiLogo} 
                  alt="Coconudi" 
                  className="w-[80px] h-[80px] object-contain"
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-black">Coconudi</h1>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(true)}
            className="text-black hover:bg-white/10"
          >
            <Search className="h-4 w-4 text-black" />
          </Button>
        </div>
      </div>

      {/* Bonus Gift Component - Hidden, just for functionality */}
      <div className="hidden">
        <BonusGift isMobile={false} />
      </div>
      
      {/* Desktop Main Content with Sidebar */}
      <div className="flex">
        {/* Left Sidebar Menu */}
        <div className="w-64 bg-black border-r border-gray-800 min-h-[calc(100vh-73px)] overflow-y-auto">
          <div className="py-6">
            <div className="space-y-1">
              <button
                onClick={() => setShowLive(true)}
                className="w-full flex items-center px-6 py-3 text-white hover:bg-white/10 transition-colors"
              >
                <Video className="w-5 h-5 mr-3" />
                <span>Live</span>
              </button>
              <button
                onClick={() => navigate('/following')}
                className="w-full flex items-center px-6 py-3 text-white hover:bg-white/10 transition-colors"
              >
                <Users className="w-5 h-5 mr-3" />
                <span>Seguindo</span>
              </button>
              <button
                onClick={() => navigate('/marketplace')}
                className="w-full flex items-center px-6 py-3 text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-5 h-5 mr-3" />
                <span>Market-Place</span>
              </button>
              <button
                onClick={() => navigate('/local-business')}
                className="w-full flex items-center px-6 py-3 text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <MapPin className="w-5 h-5 mr-3" />
                <span>Negócios Locais</span>
              </button>
              <button
                onClick={() => navigate('/collections')}
                className="w-full flex items-center px-6 py-3 text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <BookmarkPlus className="w-5 h-5 mr-3" />
                <span>Coleções</span>
              </button>
              <button
                onClick={() => navigate('/subscriptions')}
                className="w-full flex items-center px-6 py-3 text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <CreditCard className="w-5 h-5 mr-3" />
                <span>Assinaturas</span>
              </button>
              <button
                onClick={() => {
                  console.log('🎯 Botão Sou Criador clicado - Navegando para /creator-application');
                  navigate('/creator-application');
                }}
                className="w-full flex items-center px-6 py-3 text-white hover:bg-white/10 transition-colors"
              >
                <Sparkles className="w-5 h-5 mr-3" />
                <span>Sou Criador</span>
              </button>
              <button
                onClick={async () => {
                  try {
                    sessionStorage.setItem('logging_out', 'true');
                    await supabase.auth.signOut();
                    navigate('/auth', { replace: true });
                    setTimeout(() => {
                      sessionStorage.removeItem('logging_out');
                    }, 500);
                    toast({
                      title: 'Logout realizado',
                      description: 'Você saiu da sua conta com sucesso',
                    });
                  } catch (error) {
                    console.error('Erro ao fazer logout:', error);
                    sessionStorage.removeItem('logging_out');
                    navigate('/auth', { replace: true });
                  }
                }}
                className="w-full flex items-center px-6 py-3 text-white hover:bg-white/10 transition-colors"
              >
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
              {/* Um vídeo por modelo em sequência linear */}
              <VideoPlayer
                ref={videoRef}
                video={currentVideo}
                isPlaying={isPlaying}
                isMuted={isMuted}
                onNext={nextVideo}
                onPrevious={prevVideo}
                onDoubleClick={toggleLike}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
              />


              {/* Desktop Navigation Arrows - movidos mais para dentro */}
              <div className="absolute top-1/2 left-6 transform -translate-y-1/2 z-20">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevVideo}
                  disabled={currentVideoIndex === 0}
                  className="bg-black/50 hover:bg-black/70 text-white border border-white/20 backdrop-blur-sm rounded-full w-8 h-8 p-0 disabled:opacity-50"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="absolute top-1/2 right-2 md:right-4 lg:right-6 transform -translate-y-1/2 z-20">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={nextVideo}
                  disabled={currentVideoIndex === videos.length - 1}
                  className="bg-black/50 hover:bg-black/70 text-white border border-white/20 backdrop-blur-sm rounded-full w-8 h-8 p-0 disabled:opacity-50"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>

              {/* Desktop Controls Overlay */}
              <div className="absolute bottom-4 left-4 right-4 z-20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="bg-black/50 hover:bg-black/70 text-white border border-white/20 backdrop-blur-sm"
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMuted(!isMuted)}
                      className="bg-black/50 hover:bg-black/70 text-white border border-white/20 backdrop-blur-sm"
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

              {/* 🆕 Badge "Novo" para vídeos recém-adicionados */}
              {isVideoNew(currentVideo) && (
                <div className="absolute top-4 left-4 z-30 bg-gradient-to-r from-red-500 to-pink-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse flex items-center gap-1.5">
                  <span className="text-base">✨</span>
                  <span>NOVO</span>
                </div>
              )}

              {/* Desktop Side Menu - Só aparece na tela principal */}
              {!showProfile && !showChat && (
                <div className="absolute inset-y-0 right-1 md:right-3 lg:right-5 xl:right-6 flex flex-col justify-center space-y-4 z-30 max-h-[calc(100vh-140px)] overflow-y-auto py-6">
                  <SideMenu
                    video={currentVideo}
                    isLiked={isLiked}
                    isMuted={isMuted}
                    isPlaying={isPlaying}
                    isFollowing={followingModels[currentVideo?.user?.id] || false}
                    onToggleLike={() => {
                      console.log('Desktop like clicked');
                      toggleLike();
                    }}
                    onToggleSound={() => {
                      console.log('Desktop sound toggle clicked');
                      setIsMuted(!isMuted);
                    }}
                    onTogglePlay={() => {
                      console.log('Desktop play toggle clicked');
                      setIsPlaying(!isPlaying);
                    }}
                    onToggleFollow={() => {
                      console.log('Desktop follow clicked');
                      followModel();
                    }}
                    onOpenComments={async () => {
                      console.log('Desktop comments clicked');
                      await checkAndTrackAction('comment', currentVideo?.id, currentVideo?.user?.id);
                      await trackComment(currentVideo?.id || '', currentVideo?.user?.id || '');
                      setShowComments(true);
                    }}
                    onOpenProfile={async () => {
                      console.log('Desktop profile clicked');
                      await checkAndTrackAction('profile_view', currentVideo?.id, currentVideo?.user?.id);
                      await trackFollow(currentVideo?.user?.id || '');
                      setShowProfile(true);
                    }}
                    onOpenLive={() => {
                      console.log('Desktop live clicked');
                      setShowLive(true);
                    }}
                    onBlockVideo={undefined}
                    onOpenPremium={() => {
                      console.log('Desktop premium clicked');
                      if (currentVideo?.user?.posting_panel_url) {
                        const raw = currentVideo.user.posting_panel_url;
                        const url = /^(https?:)?\/\//i.test(raw || '') ? (raw as string) : `https://${raw}`;
                        window.open(url, '_blank');
                        toast({
                          title: "Abrindo página premium",
                          description: `Redirecionando para ${currentVideo.user.username}`
                        });
                      } else {
                        toast({
                          title: "Link não configurado",
                          description: "Esta modelo ainda não tem link premium configurado",
                          variant: "destructive"
                        });
                      }
                    }}
                    onFullscreen={handleFullscreen}
                    onOpenChat={() => {
                      console.log('Desktop chat clicked');
                      setShowChat(true);
                    }}
                    onExit={async () => {
                      try {
                        sessionStorage.setItem('logging_out', 'true');
                        await supabase.auth.signOut();
                        navigate('/auth', { replace: true });
                        setTimeout(() => {
                          sessionStorage.removeItem('logging_out');
                        }, 500);
                      } catch (error) {
                        console.error('Erro ao fazer logout:', error);
                        sessionStorage.removeItem('logging_out');
                        navigate('/auth', { replace: true });
                      }
                    }}
                  />
                </div>
              )}

            {/* Desktop Video Info Below */}
            <div className="mt-4 px-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div 
                      className="w-10 h-10 rounded-full overflow-hidden shrink-0 cursor-pointer border-2 border-gray-300"
                      onClick={() => {
                        if (checkAndTrackAction('profile_view')) {
                          trackFollow(currentVideo.user.id);
                          setShowProfile(true);
                        }
                      }}
                    >
                      <img
                        src={currentVideo.user.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'}
                        alt={currentVideo.user.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">{currentVideo.user.username}</p>
                      <p className="text-gray-600 text-sm">{currentVideo.user.followers_count} seguidores</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                       onClick={() => {
                         const currentIsFollowing = followingModels[currentVideo?.user?.id] || false;
                         console.log('🔥 BOTÃO SEGUIR CLICADO!', {
                           currentVideo: currentVideo?.user?.username,
                           currentIsFollowing,
                           modelId: currentVideo?.user?.id
                         });
                         followModel();
                       }}
                       disabled={followingModels[currentVideo?.user?.id] || false}
                       className={(followingModels[currentVideo?.user?.id] || false)
                         ? "border-green-500 text-green-500 bg-green-500/10" 
                         : "border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                       }
                     >
                        {(followingModels[currentVideo?.user?.id] || false) ? 'Seguindo' : 'Seguir'}
                     </Button>
                  </div>
                  
                  {/* Desktop Action Buttons - Funcionais */}
                  <div className="flex items-center space-x-4 mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleLike}
                      className={`text-sm transition-all duration-200 ${isLiked ? 'text-red-500 scale-110' : 'text-gray-700 hover:text-red-400'}`}
                    >
                      <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                      {currentVideo.likes_count}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await checkAndTrackAction('comment', currentVideo?.id, currentVideo?.user?.id);
                        await trackComment(currentVideo?.id || '', currentVideo?.user?.id || '');
                        setShowComments(true);
                      }}
                      className="text-gray-700 hover:text-blue-400 text-sm transition-colors"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {currentVideo.comments_count}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={shareVideo}
                      className="text-gray-700 hover:text-yellow-400 text-sm transition-colors"
                    >
                      <img src={iconShare} alt="Share" className="h-4 w-4 mr-2" />
                      {currentVideo.shares_count}
                    </Button>
                  </div>
                  
                   <h3 className="text-lg font-medium text-gray-700 mb-1 mt-4">{currentVideo.title}</h3>
                   <p className="text-gray-600 text-sm leading-relaxed mb-3">{currentVideo.description}</p>
                   
                   {/* Music Info - Clicável (Desktop) */}
                   <div 
                     onClick={() => {
                       const authorUrl = currentVideo.user?.posting_panel_url || `https://www.google.com/search?q=${encodeURIComponent(currentVideo.user?.username || '')}`;
                       const url = /^(https?:)?\/\//i.test(authorUrl) ? authorUrl : `https://${authorUrl}`;
                       window.open(url, '_blank', 'noopener,noreferrer');
                     }}
                     className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity active:scale-95 p-2 rounded-lg hover:bg-gray-100"
                   >
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
            <div className="hidden xl:block w-80 space-y-4">
              <FeaturedSection />
              <AdCarousel />
              <ModelCarousel 
                title="Novas Modelos" 
                icon="✨"
                direction="ltr"
                carouselIndex={1}
                onSelectModel={(modelId) => {
                  goToModelVideo(modelId);
                }}
              />
            </div>

         </div>
        </div>
       </div>

      {/* Desktop Profile Screen */}
      <ProfileScreen
        user={{
          id: currentVideo.user.id,
          username: currentVideo.user.username,
          avatar_url: currentVideo.user.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png',
          followers_count: currentVideo.user.followers_count || 0,
          following_count: currentVideo.user.following_count || 0,
          is_online: currentVideo.user.is_online || false,
          created_at: currentVideo.user.created_at || new Date().toISOString()
        }}
        onVideoSelect={(videoId) => {
          openSelectedVideo(videoId);
        }}
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        onGoHome={goToHome}
        onOpenChat={() => {
          setShowProfile(false);
          setShowChat(true);
        }}
      />

      {/* Desktop Chat Screen */}
      <ChatScreen
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        modelName={currentVideo.user.username}
        modelAvatar={currentVideo.user.avatar_url}
      />

      {/* Desktop Comments Screen */}
      <CommentsScreen
        comments={comments}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        onAddComment={addComment}
      />

      {/* Desktop Search Modal */}
      <SearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelectModel={(modelId) => {
          goToModelVideo(modelId);
          setShowSearch(false);
        }}
      />

      {/* Desktop Live Modal */}
      <LiveModal
        isOpen={showLive}
        onClose={() => setShowLive(false)}
        onSelectModel={goToModelVideo}
      />

      {/* Premium Modal */}
      <PremiumModal
        isOpen={showPremium}
        onClose={() => setShowPremium(false)}
      />
      
      {/* Age Verification Modal */}
      <AgeVerificationModal
        open={showAgeVerification}
        onClose={() => {
          console.log('🔍 AGE VERIFICATION: Fechando modal e iniciando reprodução');
          setShowAgeVerification(false);
          // Força reprodução após fechar o modal
          setTimeout(() => {
            console.log('▶️ Iniciando reprodução automática após verificação');
            setIsPlaying(true);
          }, 300);
        }}
      />
      
      {/* Desktop Action Tracker */}
      <ActionTracker
        onActionAttempt={async (actionType, userName) => {
          return await handleActionAttempt(actionType, userName);
        }}
      />

      {/* Video Preview Modal (Premium Content) */}
      <VideoPreviewModal
        isOpen={showVideoPreview}
        onClose={() => setShowVideoPreview(false)}
        content={selectedVideoForPreview}
      />

      {/* Fullscreen Video Modal */}
      <FullscreenVideoModal
        videoUrl={currentVideo?.video_url || ''}
        isOpen={showFullscreen}
        onClose={handleCloseFullscreen}
        currentTime={fullscreenVideoTime}
      />
    </div>
  );
};