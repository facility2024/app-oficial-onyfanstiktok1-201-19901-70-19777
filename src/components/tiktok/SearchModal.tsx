import { DEFAULT_AVATAR } from '@/constants/defaultAvatar';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { searchProfiles } from '@/services/profileSearch';
import { X, Search } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  username: string;
  avatar_url: string;
  followers_count: number;
  is_live: boolean;
  is_verified: boolean;
  is_creator?: boolean; // Flag para identificar criadores
}

interface VideoResult {
  id: string;
  title: string;
  owner: string;
  ownerId: string | null;
  thumbnail_url: string | null;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModel: (modelId: string) => void;
  onSelectVideo?: (videoId: string, ownerId?: string | null) => void;
}

export const SearchModal = ({ isOpen, onClose, onSelectModel, onSelectVideo }: SearchModalProps) => {
  const [models, setModels] = useState<Model[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoResults, setVideoResults] = useState<VideoResult[]>([]);
  const [globalResults, setGlobalResults] = useState<Model[]>([]);

  // 🔎 Busca de vídeos por título, descrição ou ID (completo/parcial)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!isOpen || q.length < 2) {
      setVideoResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
        let query = (supabase as any)
          .from('videos')
          .select('id, title, description, thumbnail_url, model_id, creator_id')
          .eq('is_active', true)
            .is('deleted_at', null)
          .limit(20);

        query = isUuid
          ? query.eq('id', q)
          : query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

        const { data } = await query;
        let rows = (data || []) as any[];

        // Busca por trecho de ID (ex.: db6255ba)
        if (rows.length === 0 && /^[0-9a-f]{4,}$/i.test(q)) {
          const { data: allIds } = await (supabase as any)
            .from('videos')
            .select('id, title, description, thumbnail_url, model_id, creator_id')
            .eq('is_active', true)
            .is('deleted_at', null)
            .limit(1000);
          rows = (allIds || []).filter((v: any) => String(v.id).toLowerCase().includes(q.toLowerCase()));
        }

        const modelIds = Array.from(new Set(rows.map((v) => v.model_id).filter(Boolean)));
        const creatorIds = Array.from(new Set(rows.map((v) => v.creator_id).filter(Boolean)));
        const nameById: Record<string, string> = {};

        if (modelIds.length) {
          const { data: ms } = await (supabase as any).from('models').select('id, name, username').in('id', modelIds);
          (ms || []).forEach((m: any) => { nameById[m.id] = m.name || m.username || 'Modelo'; });
        }
        if (creatorIds.length) {
          const { data: ps } = await (supabase as any).from('public_profiles').select('id, name, username').in('id', creatorIds);
          (ps || []).forEach((p: any) => { nameById[p.id] = p.name || p.username || 'Criadora'; });
        }

        setVideoResults(
          rows.slice(0, 20).map((v: any) => {
            const ownerId = v.creator_id || v.model_id || null;
            return {
              id: v.id,
              title: v.title || v.description?.slice(0, 50) || `Vídeo ${String(v.id).slice(0, 8)}`,
              owner: (ownerId && nameById[ownerId]) || 'Perfil',
              ownerId,
              thumbnail_url: v.thumbnail_url || null,
            };
          })
        );
      } catch (e) {
        console.warn('Erro na busca de vídeos:', e);
        setVideoResults([]);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, isOpen]);


  useEffect(() => {
    if (isOpen) {
      loadModels();
    }
  }, [isOpen]);

  const loadModels = async () => {
    setLoading(true);
    try {
      // Buscar modelos
      const { data: modelsData, error: modelsError } = await supabase
        .from('models')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });


      if (modelsError) throw modelsError;

      // 🧹 Buscar IDs de modelos que TÊM vídeo ativo (paginado — evita limite de 1000)
      const fetchAllIds = async (column: 'model_id' | 'creator_id'): Promise<Set<string>> => {
        const set = new Set<string>();
        const PAGE = 1000;
        for (let offset = 0; offset < 50000; offset += PAGE) {
          const { data, error } = await supabase
            .from('videos')
            .select(column)
            .eq('is_active', true)
            .is('deleted_at', null)
            .not(column, 'is', null)
            .range(offset, offset + PAGE - 1);
          if (error) break;
          (data || []).forEach((r: any) => { if (r[column]) set.add(r[column]); });
          if (!data || data.length < PAGE) break;
        }
        return set;
      };

      const modelsWithVideoSet = await fetchAllIds('model_id');


      // 🔥 Buscar painéis de chat para verificar status online
      const { data: chatPanelsData, error: chatPanelsError } = await supabase
        .from('model_chat_panels' as any)
        .select('model_id, is_online');

      if (chatPanelsError) {
        console.warn('⚠️ Erro ao carregar painéis de chat:', chatPanelsError);
      }

      const chatPanelsMap: Record<string, boolean> = {};
      (chatPanelsData as any[])?.forEach((panel: any) => {
        chatPanelsMap[panel.model_id] = panel.is_online;
      });

      // Atualizar modelos com status online do chat panel + filtrar sem vídeo
      const modelsWithChatStatus = (modelsData || [])
        .filter((m: any) => modelsWithVideoSet.has(m.id))
        .map((m: any) => ({
          ...m,
          followers_count: m.followers_count ?? 0,
          is_live: chatPanelsMap[m.id] || false,
          is_verified: m.is_verified ?? false,
        }));


      // 🔥 Buscar criadores diretamente pelos vídeos ativos (fonte da verdade, paginado)
      const creatorIdsSet = await fetchAllIds('creator_id');

      let creatorsData: any[] = [];
      if (creatorIdsSet.size > 0) {
        const creatorIds = Array.from(creatorIdsSet);
        const { data: creatorsProfiles, error: creatorsError } = await supabase
          .from('profiles')
          .select('id, name, username, email, avatar_url, bio')
          .in('id', creatorIds);

        if (creatorsError) {
          console.error('Error loading creator profiles:', creatorsError);
        }

        creatorsData = creatorsProfiles || [];
      }
      console.log('📋 Criadores encontrados:', creatorsData.length);

      // Transformar criadores para formato Model
      const creators = (creatorsData || []).map((c: any) => {
        const displayName = c.name && c.name !== c.email
          ? c.name
          : (c.email?.split('@')[0] || 'Criador');
        
        return {
          id: c.id,
          name: displayName,
          username: c.username || displayName,

          avatar_url: c.avatar_url || DEFAULT_AVATAR,
          followers_count: 0,
          is_live: false,
          is_verified: true,
          is_creator: true
        };
      });

      // Combinar modelos + criadores
      setModels([...modelsWithChatStatus, ...creators]);
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🔎 Busca GLOBAL de perfis (mesmo serviço do painel Engajamento)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!isOpen || q.length < 1) {
      setGlobalResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const profiles = await searchProfiles(q, { limit: 30 });
        setGlobalResults(
          profiles.map((p) => ({
            id: p.id,
            name: p.name,
            username: p.username || p.name,
            avatar_url: p.avatar_url || DEFAULT_AVATAR,
            followers_count: 0,
            is_live: false,
            is_verified: p.source === 'creator',
            is_creator: p.source === 'creator',
          }))
        );
      } catch (e) {
        console.warn('Erro na busca global de perfis:', e);
        setGlobalResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isOpen]);

  const filteredModels = useMemo(() => {
    const raw = searchQuery.trim();
    if (!raw) return models;

    const query = raw.toLowerCase().replace(/^@+/, '');
    const local = models.filter((model) => {
      const name = (model.name || '').toLowerCase();
      const username = (model.username || '').toLowerCase();
      return name.includes(query) || username.includes(query) || model.id.toLowerCase().includes(query) ||
        query.split(/\s+/).some(word => name.includes(word) || username.includes(word));
    });

    // Mescla com os resultados globais (perfis que não estavam na lista local)
    const seen = new Set(local.map((m) => m.id));
    const extras = globalResults.filter((g) => !seen.has(g.id));
    return [...local, ...extras];
  }, [models, searchQuery, globalResults]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-white text-xl font-semibold">Descobrir Modelos</h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
            <input
              type="text"
              placeholder="Pesquisar modelo, vídeo ou ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 text-white placeholder-white/50 rounded-full pl-10 pr-4 py-3 border border-white/20 focus:border-white/40 focus:outline-none"
            />
          </div>
        </div>

        {/* Resultados de vídeos */}
        {videoResults.length > 0 && (
          <div className="px-4 pb-3">
            <p className="text-white/60 text-xs font-semibold mb-2 uppercase tracking-wide">Vídeos encontrados</p>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
              {videoResults.map((v) => (
                <div
                  key={v.id}
                  onClick={() => {
                    if (onSelectVideo) onSelectVideo(v.id, v.ownerId);
                    else if (v.ownerId) onSelectModel(v.ownerId);
                    onClose();
                  }}
                  className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="w-12 h-16 rounded-md bg-white/10 overflow-hidden shrink-0">
                    {v.thumbnail_url && (
                      <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-semibold truncate">{v.title}</p>
                    <p className="text-white/60 text-xs truncate">{v.owner}</p>
                    <p className="text-white/40 text-[10px] font-mono truncate">{v.id}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Models List */}
        <div className="flex-1 overflow-y-auto md:overflow-y-scroll px-4" onWheel={(e) => e.stopPropagation()}>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredModels.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-12 text-white/60">
                  <Search className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhum resultado encontrado</p>
                  <p className="text-sm mt-1">Tente buscar por outro nome</p>
                </div>
              )}
              {filteredModels.map((model) => (
                <div
                  key={model.id}
                  onClick={() => {
                    console.log('🔍 Modelo clicada:', model.name, model.id);
                    onSelectModel(model.id);
                    onClose();
                  }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="relative">
                    <img
                      src={model.avatar_url || DEFAULT_AVATAR}
                      onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                      alt={model.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {model.is_live && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse border-2 border-black"></div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold">{model.name}</h3>
                      {model.is_creator && (
                        <div className="bg-purple-500 px-2 py-0.5 rounded-full text-xs font-semibold text-white">
                          ✨ Criador
                        </div>
                      )}
                      {model.is_verified && !model.is_creator && (
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                    <p className="text-white/60 text-sm">@{model.username}</p>
                    <p className="text-white/50 text-xs">
                      {(model.followers_count || 0).toLocaleString()} seguidores
                    </p>
                  </div>

                  {model.is_live && (
                    <div className="bg-red-500 px-2 py-1 rounded-full text-xs font-semibold text-white">
                      AO VIVO
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};