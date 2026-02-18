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
    novos: 0.4,      // 40% vídeos novos
    favoritos: 0.3,  // 30% modelos favoritas
    aleatorios: 0.3  // 30% aleatórios
  },
  scoreWeights: {
    novidade: 0.4,
    afinidade: 0.3,
    popularidade: 0.2,
    aleatoriedade: 0.1
  },
  novidadeDays: 7
};

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
        // 🆕 PRESERVAR videos_vistos entre sessões para evitar repetição
        // Apenas resetar modelos_vistas para variar a ordem, mas NUNCA limpar videos_vistos
        const timeSinceLastUpdate = Date.now() - new Date(memory.ultima_atualizacao).getTime();
        const isNewSession = timeSinceLastUpdate > 30 * 60 * 1000; // 30 minutos
        
        if (isNewSession) {
          return {
            ...memory,
            modelos_vistas: [], // Reset para variar ordem
            sessao_atual: sessionId.current,
            ultima_atualizacao: new Date().toISOString()
            // 🆕 videos_vistos PRESERVADO - não limpa mais
          };
        }
        return memory;
      }
    } catch (error) {
      console.error('❌ Erro ao carregar memória:', error);
    }
    
    // Memória inicial
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
      console.error('❌ Erro ao salvar memória:', error);
    }
  }, []);

  // ============= CARREGAR VÍDEOS DA BUNNY.NET =============
  const loadVideosFromBunny = useCallback(async (): Promise<VideoFeedItem[]> => {
    try {
      console.log('📦 Carregando vídeos da Bunny.net...');
      
      // Carregar vídeos do banco (TODOS os vídeos ativos, de modelos E criadores)
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (videosError) {
        console.error('❌ Erro ao buscar vídeos:', videosError);
        throw videosError;
      }
      
      console.log(`✅ ${videosData?.length || 0} vídeos encontrados no banco`);
      console.log('📊 Vídeos por tipo:', {
        comModelId: videosData?.filter((v: any) => v.model_id).length || 0,
        comCreatorId: videosData?.filter((v: any) => v.creator_id).length || 0,
        semDono: videosData?.filter((v: any) => !v.model_id && !v.creator_id).length || 0
      });

      // Transformar para formato VideoFeedItem
      const feedItems: VideoFeedItem[] = (videosData || []).map((video: any) => {
        // Priorizar creator_id sobre model_id para identificação
        const ownerId = video.creator_id || video.model_id || 'unknown';
        
        return {
          video_id: video.id,
          modelo_id: ownerId,
          url_bunny: video.video_url,
          data_postagem: video.created_at,
          popularidade: calculatePopularity(video),
          thumbnail_url: video.thumbnail_url,
          title: video.title,
          description: video.description,
          likes_count: video.likes_count || 0,
          views_count: video.views_count || 0,
          comments_count: video.comments_count || 0
        };
      });

      console.log(`✅ ${feedItems.length} vídeos transformados para o feed`);
      console.log('🎬 Primeiros 3 vídeos:', feedItems.slice(0, 3).map(v => ({
        id: v.video_id,
        owner: v.modelo_id,
        title: v.title
      })));
      
      return feedItems;
    } catch (error) {
      console.error('❌ Erro ao carregar vídeos:', error);
      return [];
    }
  }, []);

  // ============= CÁLCULO DE SCORE =============
  const calculateScore = useCallback((
    video: VideoFeedItem,
    memory: UserMemory
  ): VideoScore => {
    const now = Date.now();
    const videoDate = new Date(video.data_postagem).getTime();
    const daysSincePost = (now - videoDate) / (1000 * 60 * 60 * 24);
    
    // 1. NOVIDADE (0-100)
    const novidade = daysSincePost <= finalConfig.novidadeDays
      ? Math.max(0, 100 - (daysSincePost / finalConfig.novidadeDays * 100))
      : 0;
    
    // 2. AFINIDADE (0-100)
    const isFavorite = memory.modelos_favoritas.includes(video.modelo_id);
    const wasViewed = memory.modelos_vistas.includes(video.modelo_id);
    const afinidade = isFavorite ? 100 : (wasViewed ? 50 : 0);
    
    // 3. POPULARIDADE (0-100)
    const maxLikes = 1000; // Normalizar baseado em máximo esperado
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
    } else if (isFavorite) {
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
    console.log('🧠 Gerando feed inteligente...');
    
    const allVideos = await loadVideosFromBunny();
    const memory = getUserMemory();
    
    // Filtrar vídeos já vistos
    const unseenVideos = allVideos.filter(v => 
      !memory.videos_vistos.includes(v.video_id)
    );
    
    if (unseenVideos.length === 0) {
      console.log('⚠️ Todos os vídeos foram vistos, resetando memória...');
      memory.videos_vistos = [];
      saveUserMemory(memory);
      return generateFeed();
    }
    
    // Calcular scores
    const scoredVideos = unseenVideos.map(v => calculateScore(v, memory));
    
    // Separar por categoria
    const novos = scoredVideos.filter(v => v.reason === 'novo');
    const favoritos = scoredVideos.filter(v => v.reason === 'favorito');
    const aleatorios = scoredVideos.filter(v => v.reason === 'aleatorio');
    
    // Ordenar por score
    novos.sort((a, b) => b.score - a.score);
    favoritos.sort((a, b) => b.score - a.score);
    aleatorios.sort((a, b) => b.score - a.score);
    
    // Calcular quantidade por categoria
    const totalSlots = Math.min(finalConfig.maxVideos, unseenVideos.length);
    const novosCount = Math.floor(totalSlots * finalConfig.mixRatio.novos);
    const favoritosCount = Math.floor(totalSlots * finalConfig.mixRatio.favoritos);
    const aleatoriosCount = totalSlots - novosCount - favoritosCount;
    
    // Selecionar vídeos
    const selectedNovos = novos.slice(0, novosCount);
    const selectedFavoritos = favoritos.slice(0, favoritosCount);
    const selectedAleatorios = aleatorios.slice(0, aleatoriosCount);
    
    // Combinar e embaralhar respeitando rotatividade de modelos
    let finalSelection = [
      ...selectedNovos,
      ...selectedFavoritos,
      ...selectedAleatorios
    ];
    
    // Reorganizar para evitar modelos consecutivas
    finalSelection = avoidConsecutiveModels(finalSelection, memory);
    
    const response: FeedResponse = {
      videos: finalSelection.map(sv => ({
        video_id: sv.video.video_id,
        modelo_id: sv.video.modelo_id,
        url_bunny: sv.video.url_bunny,
        reason: sv.reason,
        score: Math.round(sv.score)
      })),
      mix: {
        novos: selectedNovos.length,
        favoritos: selectedFavoritos.length,
        aleatorios: selectedAleatorios.length
      }
    };
    
    console.log('✅ Feed gerado:', response.mix);
    return response;
  }, [loadVideosFromBunny, getUserMemory, calculateScore, saveUserMemory, finalConfig]);

  // ============= EVITAR MODELOS CONSECUTIVAS =============
  const avoidConsecutiveModels = (
    videos: VideoScore[],
    memory: UserMemory
  ): VideoScore[] => {
    const result: VideoScore[] = [];
    const available = [...videos];
    const recentModels = new Set<string>();
    
    while (available.length > 0 && result.length < finalConfig.maxVideos) {
      // Encontrar próximo vídeo de modelo diferente
      const nextIndex = available.findIndex(v => 
        !recentModels.has(v.video.modelo_id)
      );
      
      if (nextIndex === -1) {
        // Todos os vídeos restantes são de modelos recentes
        recentModels.clear();
        continue;
      }
      
      const selected = available.splice(nextIndex, 1)[0];
      result.push(selected);
      
      // Adicionar à lista de recentes (manter últimas 3)
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
    
    // Adicionar às listas
    if (!memory.videos_vistos.includes(videoId)) {
      memory.videos_vistos.push(videoId);
    }
    
    if (!memory.modelos_vistas.includes(modeloId)) {
      memory.modelos_vistas.push(modeloId);
    }
    
    memory.ultimo_video_modelo[modeloId] = videoId;
    memory.ultima_atualizacao = new Date().toISOString();
    
    // 🆕 Aumentar limite para suportar catálogos grandes (3000+ vídeos)
    // Só limpa quando TODOS os vídeos foram vistos (reset automático acontece no feed)
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
      console.log(`⭐ Modelo ${modeloId} adicionada aos favoritos`);
    }
  }, [getUserMemory, saveUserMemory]);

  // ============= ATUALIZAR FEED =============
  const refreshFeed = useCallback(async () => {
    console.log('🔄 Atualizando feed...');
    setLoading(true);
    
    try {
      const newFeed = await generateFeed();
      setCurrentFeed(newFeed);
      
      // Carregar vídeos completos APENAS UMA VEZ
      const videoIds = newFeed.videos.map(v => v.video_id);
      const { data: fullVideos } = await supabase
        .from('videos')
        .select('*')
        .in('id', videoIds);
      
      if (fullVideos) {
        // Ordenar conforme o feed
        const orderedVideos = videoIds
          .map(id => fullVideos.find((v: any) => v.id === id))
          .filter(Boolean);
        
        setVideos(orderedVideos as any);
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar feed:', error);
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
    
    // Monitorar mudanças em tempo real (sem auto-refresh para evitar loops)
    const channel = supabase
      .channel('feed-updates')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'videos' },
        () => {
          console.log('🔔 Novos vídeos detectados');
          // Não atualizar automaticamente para evitar loops
        }
      )
      .subscribe();
    
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []); // REMOVIDO refreshFeed das dependências para evitar loop

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
