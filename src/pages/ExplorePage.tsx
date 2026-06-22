import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Eye, ChevronLeft, Home, Compass, TrendingUp, User, MoreHorizontal, Play, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CategoryMenu } from "@/components/tiktok/CategoryMenu";
import { FullscreenVideoModal } from "@/components/tiktok/FullscreenVideoModal";
import { toast } from "sonner";
import coconudiLogo from '@/assets/coconudi-logo-new.png';

interface ExploreVideo {
  id: string;
  video_url: string;
  thumbnail_url: string;
  title: string;
  likes_count: number;
  views_count: number;
  comments_count: number;
  shares_count: number;
  model_id?: string;
  creator_id?: string;
  owner_name: string;
  owner_avatar: string;
  owner_username?: string;
  created_at: string;
  is_creator: boolean;
}

const DEFAULT_AVATAR = "/default-avatar.svg";

const ExplorePage = () => {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("explore");
  const [videos, setVideos] = useState<ExploreVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "creators" | "models">("all");
  const [fullscreenVideo, setFullscreenVideo] = useState<{ url: string; time: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadVideos();
  }, [filter]);

  const loadVideos = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('videos')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter === "creators") {
        query = query.not('creator_id', 'is', null) as any;
      } else if (filter === "models") {
        query = query.not('model_id', 'is', null) as any;
      }

      const { data: videosData, error } = await query;
      if (error) throw error;

      if (!videosData || videosData.length === 0) {
        setVideos([]);
        return;
      }

      // Coletar IDs únicos em lote (evita N+1)
      const creatorIds = Array.from(
        new Set(videosData.map((v: any) => v.creator_id).filter(Boolean))
      );
      const modelIds = Array.from(
        new Set(videosData.map((v: any) => v.model_id).filter(Boolean))
      );

      const [profilesRes, modelsRes] = await Promise.all([
        creatorIds.length
          ? supabase.from('profiles').select('id, name, email, avatar_url').in('id', creatorIds)
          : Promise.resolve({ data: [] as any[] }),
        modelIds.length
          ? supabase.from('models').select('id, name, username, avatar_url').in('id', modelIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const profilesMap = new Map(
        (profilesRes.data || []).map((p: any) => [p.id, p])
      );
      const modelsMap = new Map(
        (modelsRes.data || []).map((m: any) => [m.id, m])
      );

      const enrichedVideos: ExploreVideo[] = videosData.map((video: any) => {
        let ownerName = "Desconhecido";
        let ownerAvatar = DEFAULT_AVATAR;
        let ownerUsername = "";
        let isCreator = false;

        if (video.creator_id && profilesMap.has(video.creator_id)) {
          const profile: any = profilesMap.get(video.creator_id);
          ownerName = profile.name || profile.email?.split('@')[0] || "Criador";
          ownerAvatar = profile.avatar_url || DEFAULT_AVATAR;
          ownerUsername = profile.name || "";
          isCreator = true;
        } else if (video.model_id && modelsMap.has(video.model_id)) {
          const model: any = modelsMap.get(video.model_id);
          ownerName = model.name || model.username || "Modelo";
          ownerAvatar = model.avatar_url || DEFAULT_AVATAR;
          ownerUsername = model.username || model.name || "";
          isCreator = false;
        }

        return {
          id: video.id,
          video_url: video.video_url,
          thumbnail_url: video.thumbnail_url || "/placeholder.svg",
          title: video.title || video.description || "",
          likes_count: video.likes_count || 0,
          views_count: video.views_count || 0,
          comments_count: video.comments_count || 0,
          shares_count: video.shares_count || 0,
          model_id: video.model_id,
          creator_id: video.creator_id,
          owner_name: ownerName,
          owner_avatar: ownerAvatar,
          owner_username: ownerUsername,
          created_at: video.created_at,
          is_creator: isCreator,
        };
      });

      setVideos(enrichedVideos);
    } catch (error) {
      console.error("Erro ao carregar vídeos:", error);
      toast.error("Erro ao carregar vídeos");
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (video: ExploreVideo) => {
    setFullscreenVideo({ url: video.video_url, time: 0 });
  };

  const handleProfileClick = (video: ExploreVideo) => {
    if (video.is_creator && video.creator_id) {
      navigate(`/profile/${video.creator_id}`);
    } else {
      // Navegar para o feed com o modelo selecionado
      navigate('/app', { state: { selectedModelId: video.model_id } });
    }
  };

  // Filtrar vídeos por busca
  const filteredVideos = videos.filter(video => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      video.title?.toLowerCase().includes(query) ||
      video.owner_name?.toLowerCase().includes(query) ||
      video.owner_username?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Menu Lateral - Apenas Desktop */}
      <div className="hidden md:block">
        <CategoryMenu />
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col">
        {/* Header Mobile */}
        <div className="md:hidden sticky top-0 z-40 bg-gradient-to-r from-[rgba(124,179,66,0.95)] via-[rgba(196,132,46,0.95)] to-[rgba(139,69,19,0.95)] backdrop-blur-md border-b border-white/10">
          <div className="flex items-center justify-between p-3 gap-2">
            {/* Botão Voltar */}
            <button 
              onClick={() => navigate('/app')}
              className="text-white hover:text-white/80 transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            {/* Campo de Busca */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/20 text-white placeholder-white/60 rounded-full pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-white/60 hover:text-white" />
                </button>
              )}
            </div>
            
            {/* Logo */}
            <img 
              src={coconudiLogo} 
              alt="CocoNudi" 
              className="h-8 w-auto flex-shrink-0"
            />
          </div>
        </div>

        {/* Header Desktop */}
        <div className="hidden md:block sticky top-0 z-40 bg-gradient-to-r from-[rgba(124,179,66,0.95)] via-[rgba(196,132,46,0.95)] to-[rgba(139,69,19,0.95)] backdrop-blur-md border-b border-white/10">
          <div className="flex items-center justify-between p-4 gap-4">
            {/* Botão Voltar */}
            <button 
              onClick={() => navigate('/app')}
              className="text-white hover:text-white/80 transition-colors flex items-center gap-2 flex-shrink-0"
            >
              <Home className="w-5 h-5" />
              <span>Voltar</span>
            </button>
            
            {/* Campo de Busca Expandido */}
            <div className="flex-1 max-w-xl relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
              <input
                type="text"
                placeholder="Buscar vídeos, modelos, criadores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/20 text-white placeholder-white/60 rounded-full pl-12 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  <X className="w-5 h-5 text-white/60 hover:text-white" />
                </button>
              )}
            </div>
            
            {/* Logo */}
            <img 
              src={coconudiLogo} 
              alt="CocoNudi" 
              className="h-10 w-auto flex-shrink-0"
            />
          </div>
        </div>

        {/* Filtros */}
        <div className="sticky top-[57px] md:top-[73px] z-30 bg-black/80 backdrop-blur-md border-b border-white/10 p-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                filter === "all"
                  ? "bg-gradient-to-r from-[#7CB342] to-[#C4842E] text-white font-semibold"
                  : "bg-gray-800 text-white hover:bg-gray-700"
              }`}
            >
              Todos ({videos.length})
            </button>
            <button
              onClick={() => setFilter("creators")}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                filter === "creators"
                  ? "bg-gradient-to-r from-[#7CB342] to-[#C4842E] text-white font-semibold"
                  : "bg-gray-800 text-white hover:bg-gray-700"
              }`}
            >
              ✨ Criadores
            </button>
            <button
              onClick={() => setFilter("models")}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                filter === "models"
                  ? "bg-gradient-to-r from-[#7CB342] to-[#C4842E] text-white font-semibold"
                  : "bg-gray-800 text-white hover:bg-gray-700"
              }`}
            >
              Modelos
            </button>
          </div>
        </div>

        {/* Grid de Vídeos */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full"></div>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400">
                {searchQuery ? "Nenhum resultado encontrado" : "Nenhum vídeo encontrado"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 p-1">
              {filteredVideos.map((video) => (
                <div 
                  key={video.id}
                  className="relative group overflow-hidden bg-gray-900 aspect-[3/4]"
                >
                  {/* Vídeo com Preview */}
                  <video
                    src={video.video_url}
                    poster={video.thumbnail_url}
                    className="w-full h-full object-cover cursor-pointer"
                    muted
                    loop
                    playsInline
                    onMouseEnter={(e) => {
                      const p = e.currentTarget.play();
                      if (p && typeof p.catch === 'function') p.catch(() => {});
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                    onClick={() => handleVideoClick(video)}
                  />

                  {/* Play Icon Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
                    <div className="bg-black/30 rounded-full p-3 backdrop-blur-sm">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                  </div>
                  
                  {/* Overlay com estatísticas - Desktop hover */}
                  <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Info do criador/modelo */}
                    <div 
                      className="absolute top-2 left-2 flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProfileClick(video);
                      }}
                    >
                      <img 
                        src={video.owner_avatar} 
                        alt={video.owner_name}
                        className="w-7 h-7 rounded-full border-2 border-white"
                      />
                      <div className="text-white">
                        <p className="text-xs font-semibold leading-tight">{video.owner_name}</p>
                        {video.is_creator && (
                          <span className="text-[10px] text-purple-300">✨ Criador</span>
                        )}
                      </div>
                    </div>

                    {/* Estatísticas */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 space-y-1">
                      {video.title && (
                        <p className="text-white text-xs font-medium line-clamp-2">
                          {video.title}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-white text-xs">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>{video.views_count >= 1000 ? `${(video.views_count / 1000).toFixed(1)}k` : video.views_count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          <span>{video.likes_count >= 1000 ? `${(video.likes_count / 1000).toFixed(1)}k` : video.likes_count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          <span>{video.comments_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats - Mobile (sempre visível) */}
                  <div className="md:hidden absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                    <div className="flex items-center gap-2 text-white text-xs">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{video.views_count >= 1000 ? `${(video.views_count / 1000).toFixed(1)}k` : video.views_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        <span>{video.likes_count >= 1000 ? `${(video.likes_count / 1000).toFixed(1)}k` : video.likes_count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation removida conforme solicitado */}

      {/* Modal de Vídeo em Tela Cheia */}
      {fullscreenVideo && (
        <FullscreenVideoModal
          videoUrl={fullscreenVideo.url}
          currentTime={fullscreenVideo.time}
          isOpen={!!fullscreenVideo}
          onClose={() => setFullscreenVideo(null)}
        />
      )}
    </div>
  );
};

export default ExplorePage;
