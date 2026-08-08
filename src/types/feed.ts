// Types para o sistema de feed inteligente

export interface VideoFeedItem {
  video_id: string;
  modelo_id: string;
  url_bunny: string;
  data_postagem: string;
  popularidade: number;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  likes_count: number;
  views_count: number;
  comments_count: number;
}

export interface UserMemory {
  videos_vistos: string[];
  modelos_vistas: string[];
  modelos_favoritas: string[];
  ultimo_video_modelo: Record<string, string>;
  sessao_atual: string;
  ultima_atualizacao: string;
}

export interface VideoScore {
  video: VideoFeedItem;
  score: number;
  reason: 'novo' | 'favorito' | 'aleatorio';
  breakdown: {
    novidade: number;
    afinidade: number;
    popularidade: number;
    aleatoriedade: number;
  };
}

export interface FeedResponse {
  videos: Array<{
    video_id: string;
    modelo_id: string;
    url_bunny: string;
    reason: 'novo' | 'favorito' | 'aleatorio';
    score: number;
  }>;
  mix: {
    novos: number;
    favoritos: number;
    aleatorios: number;
  };
}

export interface FeedConfig {
  maxVideos: number;
  mixRatio: {
    novos: number;
    favoritos: number;
    aleatorios: number;
  };
  scoreWeights: {
    novidade: number;
    afinidade: number;
    popularidade: number;
    aleatoriedade: number;
  };
  novidadeDays: number;
}
