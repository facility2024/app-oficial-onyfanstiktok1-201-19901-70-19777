import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Users, Sparkles, Star, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useFollowsRealtime } from "@/hooks/useFollowsRealtime";

interface FollowedEntity {
  id: string;
  name: string;
  username?: string;
  avatar_url: string;
  followers_count: number;
  entity_type: 'model' | 'creator';
  followed_at: string;
}

type FilterType = 'all' | 'models' | 'creators';

export default function FollowingPage() {
  const navigate = useNavigate();
  const [entities, setEntities] = useState<FollowedEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [userId, setUserId] = useState<string | null>(null);

  const loadFollowedEntities = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Faça login para ver quem você segue");
        navigate("/auth");
        return;
      }

      // Atualizar userId para real-time
      setUserId(user.id);

      // Buscar TODOS os IDs possíveis: autenticado + localStorage + sessionStorage
      const anonymousIdLocal = localStorage.getItem('anonymous_user_id');
      const anonymousIdSession = sessionStorage.getItem('anonymous_user_id');
      
      const userIds = [user.id];
      if (anonymousIdLocal && anonymousIdLocal !== user.id) {
        userIds.push(anonymousIdLocal);
      }
      if (anonymousIdSession && anonymousIdSession !== user.id && anonymousIdSession !== anonymousIdLocal) {
        userIds.push(anonymousIdSession);
      }

      console.log('🔐 User ID (auth):', user.id);
      console.log('🆔 Anonymous ID (localStorage):', anonymousIdLocal);
      console.log('🆔 Anonymous ID (sessionStorage):', anonymousIdSession);
      console.log('🔍 Buscando follows com IDs:', userIds);

      let allEntities: FollowedEntity[] = [];

      // 1️⃣ Buscar modelos seguidas (com ambos IDs)
      const { data: modelFollows, error: modelError } = await supabase
        .from('model_followers')
        .select('model_id')
        .in('user_id', userIds)
        .eq('is_active', true);

      console.log('🌟 Model follows:', modelFollows, 'Error:', modelError);

      if (modelFollows && modelFollows.length > 0) {
        const modelIds = modelFollows.map(f => f.model_id);
        console.log('🎯 Model IDs:', modelIds);
        
        const { data: modelsData } = await supabase
          .from('models')
          .select('id, username, avatar_url, followers_count')
          .in('id', modelIds);

        if (modelsData) {
          const modelEntities: FollowedEntity[] = modelsData.map(model => ({
            id: model.id,
            name: model.username,
            username: model.username,
            avatar_url: model.avatar_url || '/placeholder.svg',
            followers_count: model.followers_count || 0,
            entity_type: 'model' as const,
            followed_at: new Date().toISOString()
          }));
          
          allEntities = [...allEntities, ...modelEntities];
        }
      }

      // 2️⃣ Buscar criadores seguidos (com ambos IDs)
      const { data: creatorFollows, error: followError } = await (supabase as any)
        .from('user_follows')
        .select('following_id, followed_at')
        .in('follower_id', userIds)
        .eq('is_active', true);

      console.log('📊 Creator follows:', creatorFollows, 'Error:', followError);

      if (creatorFollows && creatorFollows.length > 0) {
        const creatorIds = creatorFollows.map((f: any) => f.following_id);
        console.log('🎯 Creator IDs:', creatorIds);
        
        const { data: creatorsData } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url')
          .in('id', creatorIds);

        if (creatorsData) {
          const creatorEntities: FollowedEntity[] = creatorsData.map((creator: any) => ({
            id: creator.id,
            name: creator.name || creator.email?.split('@')[0] || 'Criador',
            username: creator.name || creator.email?.split('@')[0],
            avatar_url: creator.avatar_url || '/placeholder.svg',
            followers_count: 0,
            entity_type: 'creator' as const,
            followed_at: new Date().toISOString()
          }));
          
          allEntities = [...allEntities, ...creatorEntities];
        }
      }

      setEntities(allEntities);
    } catch (error) {
      console.error("Erro ao carregar seguidos:", error);
      toast.error("Erro ao carregar lista de seguidos");
    } finally {
      setLoading(false);
    }
  };

  // Real-time sync
  const { followChanges, isConnected } = useFollowsRealtime(userId, loadFollowedEntities);

  useEffect(() => {
    loadFollowedEntities();
  }, []);

  // Recarregar quando houver mudanças real-time
  useEffect(() => {
    if (followChanges.length > 0) {
      console.log('🔄 Recarregando follows devido a mudanças real-time');
      loadFollowedEntities();
    }
  }, [followChanges]);

  const handleEntityClick = (entity: FollowedEntity) => {
    // Navegar para o perfil - funciona tanto para modelos quanto criadores
    navigate(`/app?profile=${entity.id}`);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredEntities = entities.filter(entity => {
    if (filter === 'all') return true;
    if (filter === 'models') return entity.entity_type === 'model';
    if (filter === 'creators') return entity.entity_type === 'creator';
    return true;
  });

  const counts = {
    all: entities.length,
    models: entities.filter(e => e.entity_type === 'model').length,
    creators: entities.filter(e => e.entity_type === 'creator').length
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-lg border-b border-white/10" style={{
        background: 'linear-gradient(to right, rgba(124, 179, 66, 0.95) 0%, rgba(85, 139, 47, 0.95) 35%, rgba(196, 132, 46, 0.95) 70%, rgba(139, 69, 19, 0.95) 100%)'
      }}>
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="hover:bg-white/20 text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Users className="h-5 w-5" />
                  Seguindo
                </h1>
                <p className="text-sm text-white/80">
                  {counts.all} {counts.all === 1 ? 'pessoa' : 'pessoas'}
                </p>
              </div>
              
              {/* Indicador de sincronização real-time */}
              {isConnected && (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  <Wifi className="h-3 w-3 mr-1" />
                  Ao vivo
                </Badge>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-4">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className="flex-1"
            >
              Todos ({counts.all})
            </Button>
            <Button
              variant={filter === 'models' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('models')}
              className="flex-1"
            >
              Modelos ({counts.models})
            </Button>
            <Button
              variant={filter === 'creators' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('creators')}
              className="flex-1"
            >
              Criadores ({counts.creators})
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Card key={i} className="overflow-hidden bg-gray-900/50 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredEntities.length === 0 ? (
          <Card className="border-dashed bg-gray-900/50 border-white/10">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white">
                {filter === 'all' 
                  ? 'Nenhuma pessoa seguida ainda'
                  : filter === 'models'
                  ? 'Nenhuma modelo seguida ainda'
                  : 'Nenhum criador seguido ainda'}
              </h3>
              <p className="text-sm text-gray-400 text-center mb-4">
                Explore conteúdos e comece a seguir seus favoritos
              </p>
              <Button onClick={() => navigate('/app')}>
                Explorar Agora
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredEntities.map(entity => (
              <Card
                key={entity.id}
                className="overflow-hidden bg-gray-900/50 border-white/10 hover:bg-gray-800/50 transition-colors cursor-pointer"
                onClick={() => handleEntityClick(entity)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <Avatar className="h-16 w-16 border-2 border-primary/20">
                      <AvatarImage src={entity.avatar_url} alt={entity.name} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-lg font-bold">
                        {getInitials(entity.name)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate text-white">
                          {entity.name}
                        </h3>
                        {entity.entity_type === 'creator' ? (
                          <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Criador
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                            <Star className="h-3 w-3 mr-1" />
                            Modelo
                          </Badge>
                        )}
                      </div>
                      {entity.username && (
                        <p className="text-sm text-gray-400 truncate">
                          @{entity.username}
                        </p>
                      )}
                      {entity.followers_count > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          {entity.followers_count.toLocaleString('pt-BR')} seguidores
                        </p>
                      )}
                    </div>

                    {/* Action */}
                    <Button variant="outline" size="sm">
                      Ver Perfil
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
