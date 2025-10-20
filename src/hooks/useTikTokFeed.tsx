import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VideoItem {
  id: string;
  model_id: string;
  video_url: string;
  thumbnail_url: string;
  title: string;
  description: string;
  likes_count: number;
  views_count: number;
  comments_count: number;
  created_at: string;
  duration?: string;
}

interface ModelQueue {
  [modelId: string]: string[]; // videoIds
}

interface UserState {
  recent_videos: string[]; // últimos 200 vídeos vistos
  featured_seen: string[]; // vídeos de destaque já exibidos
  model_queues: ModelQueue; // filas por modelo
  last_model_shown: string | null; // para evitar consecutivos
  session_id: string;
  last_updated: string;
}

const FEATURED_WINDOW_HOURS = 3;
const FEATURED_PLAY_TIME = 60; // segundos
const RECENT_HISTORY_SIZE = 200;
const PREFETCH_COUNT = 3;
const AVOID_REPEAT_HOURS = 24;

export const useTikTokFeed = () => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const sessionId = useRef(generateSessionId());
  const prefetchedVideos = useRef<Set<string>>(new Set());

  // ============= ESTADO DO USUÁRIO (localStorage) =============
  const getUserState = useCallback((): UserState => {
    try {
      const stored = localStorage.getItem('tiktok_feed_state');
      if (stored) {
        const state = JSON.parse(stored);
        // Verificar se é nova sessão
        const lastUpdate = new Date(state.last_updated).getTime();
        const isNewSession = Date.now() - lastUpdate > 5 * 60 * 1000; // 5min
        
        if (isNewSession) {
          console.log('🔄 Nova sessão detectada');
          return {
            ...state,
            session_id: sessionId.current,
            last_updated: new Date().toISOString(),
          };
        }
        return state;
      }
    } catch (error) {
      console.error('❌ Erro ao carregar estado:', error);
    }
    
    return {
      recent_videos: [],
      featured_seen: [],
      model_queues: {},
      last_model_shown: null,
      session_id: sessionId.current,
      last_updated: new Date().toISOString(),
    };
  }, []);

  const saveUserState = useCallback((state: UserState) => {
    try {
      state.last_updated = new Date().toISOString();
      localStorage.setItem('tiktok_feed_state', JSON.stringify(state));
    } catch (error) {
      console.error('❌ Erro ao salvar estado:', error);
    }
  }, []);

  // ============= BUSCAR VÍDEOS EM JANELA DE DESTAQUE =============
  const getFeaturedVideos = useCallback(async (): Promise<VideoItem[]> => {
    const now = new Date();
    const featuredWindowStart = new Date(now.getTime() - FEATURED_WINDOW_HOURS * 60 * 60 * 1000);
    
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('is_active', true)
      .gte('created_at', featuredWindowStart.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar vídeos em destaque:', error);
      return [];
    }

    return (data || []).map(v => ({
      id: v.id,
      model_id: v.model_id || '',
      video_url: v.video_url,
      thumbnail_url: v.thumbnail_url || '',
      title: v.title || 'Vídeo sem título',
      description: v.description || '',
      likes_count: v.likes_count || 0,
      views_count: v.views_count || 0,
      comments_count: v.comments_count || 0,
      created_at: v.created_at,
      duration: v.duration,
    }));
  }, []);

  // ============= BUSCAR TODOS OS VÍDEOS ATIVOS =============
  const getAllVideos = useCallback(async (): Promise<VideoItem[]> => {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar vídeos:', error);
      return [];
    }

    return (data || []).map(v => ({
      id: v.id,
      model_id: v.model_id || '',
      video_url: v.video_url,
      thumbnail_url: v.thumbnail_url || '',
      title: v.title || 'Vídeo sem título',
      description: v.description || '',
      likes_count: v.likes_count || 0,
      views_count: v.views_count || 0,
      comments_count: v.comments_count || 0,
      created_at: v.created_at,
      duration: v.duration,
    }));
  }, []);

  // ============= REFILL MODEL QUEUE =============
  const refillModelQueue = useCallback((
    modelId: string, 
    allVideos: VideoItem[], 
    state: UserState
  ): string[] => {
    const modelVideos = allVideos.filter(v => v.model_id === modelId);
    
    // Remover vídeos já vistos recentemente (últimas 24h)
    const recentCutoff = new Date(Date.now() - AVOID_REPEAT_HOURS * 60 * 60 * 1000);
    const availableVideos = modelVideos.filter(v => {
      const videoIndex = state.recent_videos.indexOf(v.id);
      if (videoIndex === -1) return true;
      
      // Se está na lista recente, verificar se já passou tempo suficiente
      // (assumir que recent_videos é FIFO, últimos são mais recentes)
      return videoIndex < state.recent_videos.length - 50; // últimos 50 são muito recentes
    });

    // Shuffle para variedade
    const shuffled = [...availableVideos].sort(() => Math.random() - 0.5);
    return shuffled.map(v => v.id);
  }, []);

  // ============= BUILD USER QUEUE (Round-Robin) =============
  const buildUserQueue = useCallback((
    allVideos: VideoItem[], 
    state: UserState,
    excludeIds: string[] = []
  ): string[] => {
    const queue: string[] = [];
    const models = [...new Set(allVideos.map(v => v.model_id))];
    let hasRemaining = true;
    let iterations = 0;
    const maxIterations = 100; // segurança anti-loop

    while (hasRemaining && iterations < maxIterations && queue.length < 50) {
      hasRemaining = false;
      iterations++;

      for (const modelId of models) {
        // Evitar mesmo modelo consecutivo
        if (state.last_model_shown === modelId && queue.length > 0) {
          continue; // pular este modelo nesta iteração
        }

        // Buscar próximo vídeo da fila do modelo
        if (!state.model_queues[modelId] || state.model_queues[modelId].length === 0) {
          state.model_queues[modelId] = refillModelQueue(modelId, allVideos, state);
        }

        const videoId = state.model_queues[modelId].shift();
        if (videoId && !excludeIds.includes(videoId) && !state.recent_videos.includes(videoId)) {
          queue.push(videoId);
          state.last_model_shown = modelId;
          hasRemaining = true;
        }

        if (state.model_queues[modelId].length > 0) {
          hasRemaining = true;
        }
      }
    }

    return queue;
  }, [refillModelQueue]);

  // ============= INICIALIZAR FEED =============
  const initializeFeed = useCallback(async () => {
    console.log('🎬 Inicializando feed TikTok...');
    setLoading(true);

    try {
      const state = getUserState();
      const allVideos = await getAllVideos();
      
      if (allVideos.length === 0) {
        console.warn('⚠️ Nenhum vídeo disponível');
        setLoading(false);
        return;
      }

      // 1. VERIFICAR VÍDEOS EM DESTAQUE
      const featuredVideos = await getFeaturedVideos();
      const unseenFeatured = featuredVideos.find(v => 
        !state.featured_seen.includes(v.id) && !state.recent_videos.includes(v.id)
      );

      const finalQueue: string[] = [];

      if (unseenFeatured) {
        console.log('⭐ Vídeo em destaque encontrado:', unseenFeatured.title);
        finalQueue.push(unseenFeatured.id);
        state.featured_seen.push(unseenFeatured.id);
      }

      // 2. CONSTRUIR FILA ROTATIVA (excluindo o featured)
      const rotatingQueue = buildUserQueue(allVideos, state, finalQueue);
      finalQueue.push(...rotatingQueue);

      // 3. MONTAR VÍDEOS FINAIS
      const orderedVideos = finalQueue
        .map(id => allVideos.find(v => v.id === id))
        .filter(Boolean) as VideoItem[];

      setVideos(orderedVideos);
      setCurrentIndex(0);
      saveUserState(state);

      console.log(`✅ Feed inicializado com ${orderedVideos.length} vídeos`);
      if (unseenFeatured) {
        console.log(`⭐ Primeiro vídeo é destaque (${FEATURED_PLAY_TIME}s)`);
      }

      // PREFETCH dos próximos vídeos
      prefetchNextVideos(orderedVideos, 0);
    } catch (error) {
      console.error('❌ Erro ao inicializar feed:', error);
    } finally {
      setLoading(false);
    }
  }, [getUserState, getAllVideos, getFeaturedVideos, buildUserQueue, saveUserState]);

  // ============= PREFETCH =============
  const prefetchNextVideos = useCallback((videoList: VideoItem[], fromIndex: number) => {
    for (let i = 1; i <= PREFETCH_COUNT && fromIndex + i < videoList.length; i++) {
      const video = videoList[fromIndex + i];
      if (video && !prefetchedVideos.current.has(video.id)) {
        // Prefetch thumbnail
        const img = new Image();
        img.src = video.thumbnail_url;
        
        // Marcar como prefetched
        prefetchedVideos.current.add(video.id);
        console.log(`📥 Prefetch: ${video.title}`);
      }
    }
  }, []);

  // ============= MARCAR VÍDEO COMO VISTO =============
  const markVideoAsWatched = useCallback((videoId: string) => {
    const state = getUserState();
    
    if (!state.recent_videos.includes(videoId)) {
      state.recent_videos.push(videoId);
      
      // Limitar tamanho do histórico
      if (state.recent_videos.length > RECENT_HISTORY_SIZE) {
        state.recent_videos = state.recent_videos.slice(-RECENT_HISTORY_SIZE);
      }
      
      saveUserState(state);
      console.log(`✅ Vídeo marcado como visto: ${videoId}`);
    }
  }, [getUserState, saveUserState]);

  // ============= PRÓXIMO VÍDEO =============
  const goToNextVideo = useCallback(() => {
    if (currentIndex < videos.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      markVideoAsWatched(videos[currentIndex].id);
      prefetchNextVideos(videos, nextIndex);
      
      // Se estiver perto do fim, carregar mais vídeos
      if (nextIndex >= videos.length - 5) {
        console.log('🔄 Carregando mais vídeos...');
        loadMoreVideos();
      }
    }
  }, [currentIndex, videos, markVideoAsWatched, prefetchNextVideos]);

  // ============= VÍDEO ANTERIOR =============
  const goToPreviousVideo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  // ============= CARREGAR MAIS VÍDEOS =============
  const loadMoreVideos = useCallback(async () => {
    try {
      const state = getUserState();
      const allVideos = await getAllVideos();
      const newQueue = buildUserQueue(allVideos, state, videos.map(v => v.id));
      
      const newVideos = newQueue
        .map(id => allVideos.find(v => v.id === id))
        .filter(Boolean) as VideoItem[];

      if (newVideos.length > 0) {
        setVideos(prev => [...prev, ...newVideos]);
        saveUserState(state);
        console.log(`➕ ${newVideos.length} vídeos adicionados ao feed`);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar mais vídeos:', error);
    }
  }, [getUserState, getAllVideos, buildUserQueue, videos, saveUserState]);

  // ============= REFRESH FEED =============
  const refreshFeed = useCallback(async () => {
    console.log('🔄 Atualizando feed...');
    prefetchedVideos.current.clear();
    await initializeFeed();
  }, [initializeFeed]);

  // ============= INICIALIZAÇÃO =============
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (mounted) {
        await initializeFeed();
      }
    };

    init();

    // Listener para novos vídeos
    const channel = supabase
      .channel('new-videos')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'videos' },
        () => {
          console.log('🔔 Novo vídeo detectado');
          if (document.visibilityState === 'visible' && mounted) {
            setTimeout(() => {
              if (mounted) refreshFeed();
            }, 2000);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    videos,
    loading,
    currentIndex,
    currentVideo: videos[currentIndex] || null,
    goToNextVideo,
    goToPreviousVideo,
    markVideoAsWatched,
    refreshFeed,
    isFeatured: currentIndex === 0 && videos[0]?.id && !getUserState().recent_videos.includes(videos[0].id),
  };
};

// ============= UTILS =============
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
