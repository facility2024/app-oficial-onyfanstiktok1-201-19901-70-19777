import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  VideoFeedItem, 
  UserMemory, 
  VideoScore, 
  FeedResponse, 
  FeedConfig 
} from '@/types/feed';

const DEFAULT_CONFIG: FeedConfig = {
  maxVideos: 30,
  mixRatio: {
    novos: 0.4,
    favoritos: 0.3,
    aleatorios: 0.3
  },
  scoreWeights: {
    novidade: 0.3,
    afinidade: 0.3,
    popularidade: 0.15,
    aleatoriedade: 0.25
  },
  novidadeDays: 7
};

// Porcentagem de vídeos aleatórios para "exploração" (evitar bolha)
const EXPLORATION_RATIO = 0.12; // 12%

export const useIntelligentFeed = (config: Partial<FeedConfig> = {}) => {
  const finalConfig: FeedConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [videos, setVideos] = useState<VideoFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFeed, setCurrentFeed] = useState<FeedResponse | null>(null);
  const sessionId = useRef(generateSessionId());
  
  // ============= MEMÓRIA DO USUÁRIO =============
  const getUserMemory = useCallback((): UserMemory => {
    try {
      const stored = localStorage.getItem('intelligent_feed_memory');
      if (stored) {
        const memory = JSON.parse(stored);
        const timeSinceLastUpdate = Date.now() - new Date(memory.ultima_atualizacao).getTime();
        const isNewSession = timeSinceLastUpdate > 30 * 60 * 1000;
        
        if (isNewSession) {
          return {
            ...memory,
            modelos_vistas: [],
            sessao_atual: sessionId.current,
            ultima_atualizacao: new Date().toISOString()
          };
        }
        return memory;
      }
    } catch (error) {
      // Silencioso
    }
    
    return {
      videos_vistos: [],
      modelos_vistas: [],
      modelos_favoritas: [],
      ultimo_video_modelo: {},
      sessao_atual: sessionId.current,
      ultima_atualizacao: new Date().toISOString()
    };
  }, []);

  const saveUserMemory = useCallback((memory: UserMemory) => {
    try {
      localStorage.setItem('intelligent_feed_memory', JSON.stringify(memory));
    } catch (error) {
      // Silencioso
    }
  }, []);

  // ============= BUSCAR DADOS DO SUPABASE (Interesses + Preferências) =============
  const fetchUserRecommendationData = useCallback(async (userId: string | null) => {
    if (!userId) return { watchedVideoIds: [] as string[], strongInterests: [] as string[], tagPreferences: [] as { tag: string; score: number }[] };

    try {
      const [historyRes, interestsRes, prefsRes] = await Promise.all([
        supabase
          .from('historico_visualizacao')
          .select('video_id')
          .eq('user_id', userId)
          .order('watched_at', { ascending: false })
          .limit(1000),
        supabase
          .from('interesses_fortes')
          .select('modelo_id, score')
          .eq('user_id', userId)
          .order('score', { ascending: false })
          .limit(50),
        supabase
          .from('perfil_preferencias')
          .select('tag, score')
          .eq('user_id', userId)
          .order('score', { ascending: false })
          .limit(30),
      ]);

      return {
        watchedVideoIds: (historyRes.data || []).map((r: any) => r.video_id),
        strongInterests: (interestsRes.data || []).map((r: any) => r.modelo_id),
        tagPreferences: (prefsRes.data || []).map((r: any) => ({ tag: r.tag, score: r.score })),
      };
    } catch {
      return { watchedVideoIds: [], strongInterests: [], tagPreferences: [] };
    }
  }, []);

  // ============= CARREGAR VÍDEOS =============
  const loadVideosFromBunny = useCallback(async (): Promise<VideoFeedItem[]> => {
    try {
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;

      const feedItems: VideoFeedItem[] = (videosData || []).map((video: any) => {
        const ownerId = video.creator_id || video.model_id || 'unknown';
        
        return {
          video_id: video.id,
          modelo_id: ownerId,
          creator_id: video.creator_id || null,
          url_bunny: video.video_url,
          data_postagem: video.created_at,
          popularidade: calculatePopularity(video),
          thumbnail_url: video.thumbnail_url,
          title: video.title,
          description: video.description,
          likes_count: video.likes_count || 0,
          views_count: video.views_count || 0,
          comments_count: video.comments_count || 0,
          tags: video.tags || [],
        } as any;
      });

      return feedItems;
    } catch (error) {
      return [];
    }
  }, []);

  // ============= CÁLCULO DE SCORE EVOLUÍDO =============
  const calculateScore = useCallback((
    video: VideoFeedItem & { tags?: string[] },
    memory: UserMemory,
    strongInterests: string[],
    tagPreferences: { tag: string; score: number }[]
  ): VideoScore => {
    const now = Date.now();
    const videoDate = new Date(video.data_postagem).getTime();
    const daysSincePost = (now - videoDate) / (1000 * 60 * 60 * 24);
    
    // 1. NOVIDADE (0-100)
    const novidade = daysSincePost <= finalConfig.novidadeDays
      ? Math.max(0, 100 - (daysSincePost / finalConfig.novidadeDays * 100))
      : 0;
    
    // 2. AFINIDADE (0-100) - Agora usa interesses fortes do DB
    const isStrongInterest = strongInterests.includes(video.modelo_id);
    const isFavorite = memory.modelos_favoritas.includes(video.modelo_id);
    const wasViewed = memory.modelos_vistas.includes(video.modelo_id);
    let afinidade = 0;
    if (isStrongInterest) afinidade = 100;
    else if (isFavorite) afinidade = 80;
    else if (wasViewed) afinidade = 30;

    // 2b. BONUS POR TAGS - Verificar se as tags do vídeo combinam com preferências
    const videoTags = (video as any).tags || [];
    let tagBonus = 0;
    if (videoTags.length > 0 && tagPreferences.length > 0) {
      for (const vTag of videoTags) {
        const pref = tagPreferences.find(p => p.tag === vTag.toLowerCase());
        if (pref) {
          tagBonus += Math.min(20, pref.score / 2); // Max 20 pontos por tag
        }
      }
      tagBonus = Math.min(50, tagBonus); // Cap total de tags
    }
    afinidade = Math.min(100, afinidade + tagBonus);
    
    // 3. POPULARIDADE (0-100)
    const maxLikes = 1000;
    const maxViews = 10000;
    const popularidade = Math.min(100, 
      ((video.likes_count / maxLikes) * 50) + 
      ((video.views_count / maxViews) * 50)
    );
    
    // 4. ALEATORIEDADE (0-100)
    const aleatoriedade = Math.random() * 100;
    
    // SCORE FINAL
    const score = 
      (novidade * finalConfig.scoreWeights.novidade) +
      (afinidade * finalConfig.scoreWeights.afinidade) +
      (popularidade * finalConfig.scoreWeights.popularidade) +
      (aleatoriedade * finalConfig.scoreWeights.aleatoriedade);
    
    // CLASSIFICAR MOTIVO
    let reason: 'novo' | 'favorito' | 'aleatorio' = 'aleatorio';
    if (daysSincePost <= finalConfig.novidadeDays) {
      reason = 'novo';
    } else if (isStrongInterest || isFavorite) {
      reason = 'favorito';
    }
    
    return {
      video,
      score,
      reason,
      breakdown: { novidade, afinidade, popularidade, aleatoriedade }
    };
  }, [finalConfig]);

  // ============= GERAR FEED INTELIGENTE =============
  const generateFeed = useCallback(async (): Promise<FeedResponse> => {
    const allVideos = await loadVideosFromBunny();
    const memory = getUserMemory();
    
    // Buscar dados de recomendação do Supabase
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || null;
    const { watchedVideoIds, strongInterests, tagPreferences } = await fetchUserRecommendationData(userId);
    
    // Combinar vídeos vistos: localStorage + Supabase DB
    const allWatchedIds = new Set([
      ...memory.videos_vistos,
      ...watchedVideoIds
    ]);
    
    // Filtrar vídeos já vistos
    let unseenVideos = allVideos.filter(v => !allWatchedIds.has(v.video_id));
    
    if (unseenVideos.length === 0) {
      memory.videos_vistos = [];
      saveUserMemory(memory);
      unseenVideos = allVideos; // Usar todos se acabaram
    }
    
    // Calcular scores com dados de recomendação
    const scoredVideos = unseenVideos.map(v => calculateScore(v, memory, strongInterests, tagPreferences));
    
    // ============= PILAR 0: PINNED - Vídeos de criadores <24h no TOPO =============
    const DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const pinnedFresh = scoredVideos
      .filter(v => {
        const isCreator = !!(v.video as any).creator_id;
        const age = now - new Date(v.video.data_postagem).getTime();
        return isCreator && age <= DAY_MS;
      })
      .sort((a, b) =>
        new Date(b.video.data_postagem).getTime() -
        new Date(a.video.data_postagem).getTime()
      );
    const pinnedIds = new Set(pinnedFresh.map(v => v.video.video_id));
    const remainingScored = scoredVideos.filter(v => !pinnedIds.has(v.video.video_id));

    // ============= PILAR 1: Prioridade por Interesse Forte =============
    const interestVideos = remainingScored.filter(v => strongInterests.includes(v.video.modelo_id));
    const otherVideos = remainingScored.filter(v => !strongInterests.includes(v.video.modelo_id));
    
    interestVideos.sort((a, b) => b.score - a.score);
    otherVideos.sort((a, b) => b.score - a.score);
    
    // ============= PILAR 2: Regra de Exploração (12% aleatórios) =============
    const remainingSlots = Math.max(0, Math.min(finalConfig.maxVideos, remainingScored.length) );
    const explorationCount = Math.max(2, Math.floor(remainingSlots * EXPLORATION_RATIO));
    const interestCount = Math.min(interestVideos.length, Math.floor(remainingSlots * 0.4));
    const remainingCount = Math.max(0, remainingSlots - interestCount - explorationCount);
    
    const shuffledOthers = [...otherVideos].sort(() => Math.random() - 0.5);
    const explorationVideos = shuffledOthers.slice(0, explorationCount);
    const fillerVideos = otherVideos
      .filter(v => !explorationVideos.includes(v))
      .slice(0, remainingCount);
    
    // Combinar restante (sem pinned) e evitar modelos consecutivas
    const restCombined = [
      ...interestVideos.slice(0, interestCount),
      ...fillerVideos,
      ...explorationVideos,
    ];
    const restReordered = avoidConsecutiveModels(
      restCombined,
      memory,
      Math.max(0, finalConfig.maxVideos - pinnedFresh.length)
    );

    // Pinned SEMPRE no topo, sem passar por avoidConsecutiveModels
    let finalSelection = [...pinnedFresh, ...restReordered];
    
    // Categorizar para o indicador
    const novos = finalSelection.filter(v => v.reason === 'novo').length;
    const favoritos = finalSelection.filter(v => v.reason === 'favorito').length;
    const aleatorios = finalSelection.filter(v => v.reason === 'aleatorio').length;
    
    const response: FeedResponse = {
      videos: finalSelection.map(sv => ({
        video_id: sv.video.video_id,
        modelo_id: sv.video.modelo_id,
        url_bunny: sv.video.url_bunny,
        reason: sv.reason,
        score: Math.round(sv.score)
      })),
      mix: { novos, favoritos, aleatorios }
    };
    
    return response;
  }, [loadVideosFromBunny, getUserMemory, calculateScore, saveUserMemory, finalConfig, fetchUserRecommendationData]);

  // ============= EVITAR MODELOS CONSECUTIVAS =============
  const avoidConsecutiveModels = (
    videos: VideoScore[],
    memory: UserMemory,
    maxVideos: number
  ): VideoScore[] => {
    const result: VideoScore[] = [];
    const available = [...videos];
    const recentModels = new Set<string>();
    
    while (available.length > 0 && result.length < maxVideos) {
      const nextIndex = available.findIndex(v => 
        !recentModels.has(v.video.modelo_id)
      );
      
      if (nextIndex === -1) {
        recentModels.clear();
        continue;
      }
      
      const selected = available.splice(nextIndex, 1)[0];
      result.push(selected);
      
      recentModels.add(selected.video.modelo_id);
      if (recentModels.size > 3) {
        const firstModel = Array.from(recentModels)[0];
        recentModels.delete(firstModel);
      }
    }
    
    return result;
  };

  // ============= MARCAR VÍDEO COMO VISTO =============
  const markVideoAsWatched = useCallback((videoId: string, modeloId: string) => {
    const memory = getUserMemory();
    
    if (!memory.videos_vistos.includes(videoId)) {
      memory.videos_vistos.push(videoId);
    }
    
    if (!memory.modelos_vistas.includes(modeloId)) {
      memory.modelos_vistas.push(modeloId);
    }
    
    memory.ultimo_video_modelo[modeloId] = videoId;
    memory.ultima_atualizacao = new Date().toISOString();
    
    if (memory.videos_vistos.length > 5000) {
      memory.videos_vistos = memory.videos_vistos.slice(-3000);
    }
    
    saveUserMemory(memory);
  }, [getUserMemory, saveUserMemory]);

  // ============= MARCAR MODELO COMO FAVORITA =============
  const markModelAsFavorite = useCallback((modeloId: string) => {
    const memory = getUserMemory();
    
    if (!memory.modelos_favoritas.includes(modeloId)) {
      memory.modelos_favoritas.push(modeloId);
      memory.ultima_atualizacao = new Date().toISOString();
      saveUserMemory(memory);
    }
  }, [getUserMemory, saveUserMemory]);

  // ============= ATUALIZAR FEED =============
  const refreshFeed = useCallback(async () => {
    setLoading(true);
    
    try {
      const newFeed = await generateFeed();
      setCurrentFeed(newFeed);
      setVideos([]);
    } catch (error) {
      console.error('Erro ao atualizar feed:', error);
    } finally {
      setLoading(false);
    }
  }, [generateFeed]);

  // ============= INICIALIZAR =============
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      if (mounted) {
        await refreshFeed();
      }
    };
    
    init();
    
    const channel = supabase
      .channel('feed-updates')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'videos' },
        () => {
          // Novos vídeos detectados - não auto-refresh para evitar loops
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
    currentFeed,
    refreshFeed,
    markVideoAsWatched,
    markModelAsFavorite,
    getUserMemory
  };
};

// ============= UTILS =============
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function calculatePopularity(video: any): number {
  const likes = video.likes_count || 0;
  const views = video.views_count || 0;
  const comments = video.comments_count || 0;
  
  return likes + (views * 0.1) + (comments * 2);
}
