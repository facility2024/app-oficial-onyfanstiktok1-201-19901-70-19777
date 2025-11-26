import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModel: (modelId: string) => void;
}

export const SearchModal = ({ isOpen, onClose, onSelectModel }: SearchModalProps) => {
  const [models, setModels] = useState<Model[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'creators' | 'models'>('all');

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
        .order('followers_count', { ascending: false });

      if (modelsError) throw modelsError;

      // Buscar criadores (via user_roles)
      const { data: creatorRoles, error: rolesError } = await (supabase as any)
        .from('user_roles')
        .select('user_id')
        .eq('role', 'creator');

      if (rolesError) {
        console.error('Error loading creator roles:', rolesError);
      }

      let creatorsData: any[] = [];
      if (creatorRoles && creatorRoles.length > 0) {
        const creatorIds = creatorRoles.map((r: any) => r.user_id);
        const { data: creatorsProfiles, error: creatorsError } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url, bio')
          .in('id', creatorIds);

        if (creatorsError) {
          console.error('Error loading creator profiles:', creatorsError);
        }
        
        creatorsData = creatorsProfiles || [];
      }

      // Transformar criadores para formato Model
      const creators = (creatorsData || []).map((c: any) => {
        const displayName = c.name && c.name !== c.email
          ? c.name
          : (c.email?.split('@')[0] || 'Criador');
        
        return {
          id: c.id,
          name: displayName,
          username: displayName,
          avatar_url: '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png', // Padrão até SQL executar
          followers_count: 0, // Padrão até SQL executar
          is_live: false,
          is_verified: true, // Criadores são verificados
          is_creator: true // Flag para identificar visualmente
        };
      });

      // Combinar modelos + criadores
      setModels([...(modelsData || []), ...creators]);
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredModels = models.filter(model => {
    // Aplicar filtro de tipo
    if (filterType === 'creators' && !model.is_creator) return false;
    if (filterType === 'models' && model.is_creator) return false;
    
    // Aplicar filtro de busca
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    const name = (model.name || '').toLowerCase();
    const username = (model.username || '').toLowerCase();
    
    return name.includes(query) || username.includes(query);
  });

  // Contar criadores e modelos
  const creatorsCount = models.filter(m => m.is_creator).length;
  const modelsCount = models.filter(m => !m.is_creator).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm">
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
              placeholder="Pesquisar modelos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 text-white placeholder-white/50 rounded-full pl-10 pr-4 py-3 border border-white/20 focus:border-white/40 focus:outline-none"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                filterType === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Todos ({models.length})
            </button>
            <button
              onClick={() => setFilterType('creators')}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                filterType === 'creators'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              ✨ Criadores ({creatorsCount})
            </button>
            <button
              onClick={() => setFilterType('models')}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                filterType === 'models'
                  ? 'bg-pink-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Modelos ({modelsCount})
            </button>
          </div>
        </div>

        {/* Models List */}
        <div className="flex-1 overflow-y-auto md:overflow-y-scroll px-4" onWheel={(e) => e.stopPropagation()}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="space-y-3">
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
                      src={model.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'}
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
                      {model.followers_count.toLocaleString()} seguidores
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