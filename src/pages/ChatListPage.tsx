import { useState, useEffect } from 'react';
import { DEFAULT_AVATAR } from '@/constants/defaultAvatar';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Search, Loader2, MessageCircle, Bot, User } from 'lucide-react';

interface EntityWithChat {
  id: string;
  name: string;
  avatar_url: string | null;
  is_online: boolean;
  has_active_chat: boolean;
  type: 'model' | 'creator';
}

export default function ChatListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entities, setEntities] = useState<EntityWithChat[]>([]);
  const [filteredEntities, setFilteredEntities] = useState<EntityWithChat[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'models' | 'creators'>('all');

  useEffect(() => {
    fetchEntitiesWithChat();
  }, []);

  useEffect(() => {
    filterEntities();
  }, [search, entities, activeTab]);

  const fetchEntitiesWithChat = async () => {
    setLoading(true);
    try {
      const allEntities: EntityWithChat[] = [];

      // Buscar modelos com chat panels
      const { data: models, error: modelsError } = await supabase
        .from('models')
        .select('id, name, avatar_url')
        .order('name');

      if (modelsError) throw modelsError;

      // Buscar chat panels de modelos
      const { data: modelPanels, error: modelPanelsError } = await supabase
        .from('model_chat_panels' as any)
        .select('model_id, is_active, is_online')
        .not('model_id', 'is', null);

      if (modelPanelsError) {
        console.log('Tabela pode não existir:', modelPanelsError);
      }

      // Mapear modelos com status de chat
      const modelPanelMap = new Map(
        (modelPanels as any[])?.map((p: any) => [p.model_id, { is_active: p.is_active, is_online: p.is_online }]) || []
      );

      models?.forEach(model => {
        const panel = modelPanelMap.get(model.id);
        if (panel?.is_active) {
          allEntities.push({
            id: model.id,
            name: model.name,
            avatar_url: model.avatar_url,
            is_online: panel.is_online || false,
            has_active_chat: true,
            type: 'model'
          });
        }
      });

      // Buscar criadores com chat panels
      const { data: creatorPanels, error: creatorPanelsError } = await supabase
        .from('model_chat_panels' as any)
        .select('creator_id, is_active, is_online')
        .not('creator_id', 'is', null);

      if (!creatorPanelsError && creatorPanels && creatorPanels.length > 0) {
        const activeCreatorIds = (creatorPanels as any[])
          .filter((p: any) => p.is_active && p.creator_id)
          .map((p: any) => p.creator_id);

        if (activeCreatorIds.length > 0) {
          const { data: creators, error: creatorsError } = await supabase
            .from('profiles')
            .select('id, name, email, avatar_url')
            .in('id', activeCreatorIds);

          if (!creatorsError && creators) {
            const creatorPanelMap = new Map(
              (creatorPanels as any[])?.map((p: any) => [p.creator_id, { is_active: p.is_active, is_online: p.is_online }]) || []
            );

            (creators as any[])?.forEach((creator: any) => {
              const panel = creatorPanelMap.get(creator.id);
              if (panel?.is_active) {
                allEntities.push({
                  id: creator.id,
                  name: creator.name || creator.email || 'Criador',
                  avatar_url: creator.avatar_url,
                  is_online: panel.is_online || false,
                  has_active_chat: true,
                  type: 'creator'
                });
              }
            });
          }
        }
      }

      // Ordenar: online primeiro, depois alfabético
      allEntities.sort((a, b) => {
        if (a.is_online !== b.is_online) {
          return a.is_online ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      setEntities(allEntities);

    } catch (error) {
      console.error('Erro ao buscar entidades:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os chats',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterEntities = () => {
    let filtered = entities;

    if (activeTab === 'models') {
      filtered = filtered.filter(e => e.type === 'model');
    } else if (activeTab === 'creators') {
      filtered = filtered.filter(e => e.type === 'creator');
    }

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(searchLower)
      );
    }

    setFilteredEntities(filtered);
  };

  const openChat = (entity: EntityWithChat) => {
    const url = entity.type === 'creator' 
      ? `/chat/${entity.id}?type=creator`
      : `/chat/${entity.id}`;
    navigate(url);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  const modelCount = entities.filter(e => e.type === 'model').length;
  const creatorCount = entities.filter(e => e.type === 'creator').length;

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[rgba(0,245,212,0.95)] via-[rgba(191,234,124,0.95)] to-[rgba(255,217,61,0.95)] p-4">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app')}
            className="text-black hover:bg-black/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-black">Chat IA</h1>
            <p className="text-sm text-black/70">
              Converse com modelos e criadores
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-10 bg-white/20 border-white/30 text-black placeholder:text-black/50"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
        <div className="px-4 pt-4">
          <TabsList className="bg-gray-800 w-full">
            <TabsTrigger value="all" className="flex-1 data-[state=active]:bg-gray-700">
              Todos ({entities.length})
            </TabsTrigger>
            <TabsTrigger value="models" className="flex-1 data-[state=active]:bg-gray-700">
              <Bot className="w-4 h-4 mr-1" />
              Modelos ({modelCount})
            </TabsTrigger>
            <TabsTrigger value="creators" className="flex-1 data-[state=active]:bg-gray-700">
              <User className="w-4 h-4 mr-1" />
              Criadores ({creatorCount})
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredEntities.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>
                {search 
                  ? 'Nenhum resultado encontrado' 
                  : 'Nenhum chat disponível no momento'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntities.map((entity) => (
                <Card
                  key={`${entity.type}_${entity.id}`}
                  className="bg-gray-900/50 border-gray-700 cursor-pointer hover:bg-gray-800/50 transition-colors"
                  onClick={() => openChat(entity)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={entity.avatar_url || DEFAULT_AVATAR}
                          alt={entity.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-700"
                          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                        />
                        {entity.is_online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate flex items-center gap-2">
                          {entity.name}
                          {entity.type === 'creator' && (
                            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                              Criador
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-400">
                          {entity.is_online ? '🟢 Online' : '🔴 Offline'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                      >
                        Conversar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
