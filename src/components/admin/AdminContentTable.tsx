import React, { useState, useEffect } from 'react';
import { DEFAULT_AVATAR } from '@/constants/defaultAvatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Eye, EyeOff, Crown, Trash2, Globe, Play, Lock, Unlock, Bot } from 'lucide-react';
import { ContentModal } from './ContentModal';
import { LiveManagementModal } from './LiveManagementModal';
import { IntegrationsModal } from './IntegrationsModal';
import { OffersModal } from './OffersModal';
import { ModelChatPanelModal } from './ModelChatPanelModal';
import crownLogo from '@/assets/crown-logo.png';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const AdminContentTable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState(false);
  const [isOffersModalOpen, setIsOffersModalOpen] = useState(false);
  const [isChatPanelModalOpen, setIsChatPanelModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [editingContent, setEditingContent] = useState(null);
  const [contents, setContents] = useState([]);
  const [contentFilter, setContentFilter] = useState<'all' | 'creators' | 'models'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const fetchContents = async () => {
    try {
      // 1️⃣ Buscar todos os modelos da tabela models  
      const { data: modelsData } = await supabase
        .from('models')
        .select('*')
        .order('created_at', { ascending: false });

      // 2️⃣ Buscar criadores aprovados da tabela user_roles
      console.log('🔍 Iniciando busca de criadores...');
      
      const { data: userRolesData, error: rolesError } = await (supabase as any)
        .from('user_roles')
        .select('user_id, role, created_at')
        .eq('role', 'creator');

      console.log('📊 Resultado da query user_roles:', {
        data: userRolesData,
        error: rolesError,
        count: userRolesData?.length || 0
      });

      if (rolesError) {
        console.error('❌ Erro ao buscar user_roles:', rolesError);
        toast.error(`Erro RLS: ${rolesError.message}`);
      }

      // 3️⃣ Buscar perfis dos criadores
      let creatorsData: any[] = [];
      if (userRolesData && userRolesData.length > 0) {
        const creatorIds = userRolesData.map((r: any) => r.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', creatorIds);

        if (profilesError) {
          console.error('Erro ao buscar profiles:', profilesError);
        } else {
          // Combinar user_roles com profiles
          creatorsData = userRolesData.map((role: any) => {
            const profile = profilesData?.find((p: any) => p.id === role.user_id);
            return {
              user_id: role.user_id,
              created_at: role.created_at,
              profile
            };
          });
        }
      }

      // 4️⃣ Buscar vídeos da tabela videos
      const { data: videosData } = await supabase
        .from('videos')
        .select('*');

      // 5️⃣ Processar modelos existentes
      const modelContents = modelsData?.map(model => {
        const modelVideos = (videosData?.filter((v: any) => v.model_id === model.id) || [])
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latestVideo = modelVideos[0];
        
        return {
          id: model.id,
          modelId: model.id,
          videoId: latestVideo?.id,
          name: model.name || model.username || 'Usuário Anônimo',
          email: null,
          avatar: model.avatar_url || DEFAULT_AVATAR || crownLogo,
          platform: model.is_verified || (model.followers_count || 0) > 10000 ? 'premium' : 'standard',
          views: formatNumber(latestVideo?.views_count || 0),
          likes: formatNumber(model.likes_count || latestVideo?.likes_count || 0),
          schedule: new Date(model.created_at).toLocaleDateString('pt-BR'),
          status: model.is_active ? 'active' : 'inactive',
          videosCount: modelVideos.length,
          visibility: latestVideo?.visibility || 'public',
          isCreator: false
        };
      }) || [];

      // 6️⃣ Processar criadores cadastrados
      const creatorContents = creatorsData?.map((creator: any) => {
        const profile = creator.profile;
        const creatorVideos = (videosData?.filter((v: any) => v.model_id === creator.user_id) || [])
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latestVideo = creatorVideos[0];
        
        return {
          id: creator.user_id,
          modelId: creator.user_id,
          videoId: latestVideo?.id,
          name: profile?.name || profile?.email?.split('@')[0] || 'Criador',
          email: profile?.email,
          avatar: profile?.avatar_url || DEFAULT_AVATAR || crownLogo,
          platform: 'creator',
          views: formatNumber(latestVideo?.views_count || 0),
          likes: formatNumber(latestVideo?.likes_count || 0),
          schedule: new Date(creator.created_at).toLocaleDateString('pt-BR'),
          status: 'active',
          videosCount: creatorVideos.length,
          visibility: latestVideo?.visibility || 'public',
          isCreator: true
        };
      }) || [];

      // 7️⃣ Combinar criadores e modelos (criadores primeiro para destaque)
      const combinedContents = [...creatorContents, ...modelContents];
      setContents(combinedContents);

      console.log('📋 AdminContentTable - Dados carregados:', {
        models: modelsData?.length || 0,
        creators: creatorsData?.length || 0,
        videos: videosData?.length || 0,
        contents: combinedContents.length
      });

    } catch (error) {
      console.error('Erro ao buscar conteúdos:', error);
    }
  };

  useEffect(() => {
    fetchContents();
    
    const playNotificationSound = () => {
      try {
        const audio = new Audio('https://tiktokonyfans.b-cdn.net/material%20coconudi/som%20para%20admin.mp3');
        audio.volume = 0.6;
        audio.play().catch((err) => console.warn('Som não reproduzido:', err));
      } catch (e) {
        console.warn('Erro ao tocar som:', e);
      }
    };

    // Configurar realtime subscription para AdminContentTable
    const channel = supabase
      .channel('admin-content-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'videos'
        },
        (payload) => {
          console.log('🎬 AdminContentTable - Novo vídeo adicionado:', payload.new);
          playNotificationSound();
          fetchContents();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'videos'
        },
        (payload) => {
          console.log('📝 AdminContentTable - Vídeo atualizado:', payload.new);
          fetchContents();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'models'
        },
        (payload) => {
          console.log('👤 AdminContentTable - Novo modelo adicionado:', payload.new);
          playNotificationSound();
          fetchContents();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'models'
        },
        (payload) => {
          console.log('👤 AdminContentTable - Modelo atualizado:', payload.new);
          fetchContents();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_roles',
          filter: 'role=eq.creator'
        },
        (payload) => {
          console.log('✨ AdminContentTable - Novo criador aprovado:', payload.new);
          playNotificationSound();
          fetchContents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleStatus = async (id: string) => {
    try {
      const content = contents.find(c => c.id === id);
      const newStatus = content.status === 'active' ? false : true;
      
      // Atualizar status do modelo
      await supabase
        .from('models')
        .update({ is_active: newStatus })
        .eq('id', id);

      setContents(prev => prev.map(content => 
        content.id === id 
          ? { ...content, status: content.status === 'active' ? 'inactive' : 'active' }
          : content
      ));
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const deleteContent = async (id: string) => {
    const content = contents.find(c => c.id === id);
    if (!content) return;

    const confirmMsg = content.isCreator
      ? `⚠️ Excluir a CRIADORA "${content.name}"?\nIsso removerá a role de creator e todos os vídeos dela.\n\nDeseja continuar?`
      : `⚠️ Excluir a modelo "${content.name}" e todos os seus dados?\n\nEsta ação é IRREVERSÍVEL!`;

    if (!window.confirm(confirmMsg)) return;

    try {
      toast.loading('Excluindo...');

      if (content.isCreator) {
        // Para criadoras: usar edge function para limpeza completa (Auth + tabelas)
        const { data, error } = await supabase.functions.invoke('delete-creator', {
          body: { creator_id: id, email: content.email }
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Erro ao excluir criadora');

        toast.dismiss();
        toast.success(`✅ Criadora "${content.name}" removida completamente!`);
      } else {
        // Para modelos: usar a função RPC
        const { error } = await (supabase as any).rpc('admin_delete_model', {
          p_model_id: id
        });

        if (error) {
          console.error('❌ Erro RPC:', error);
          // Fallback manual
          await (supabase as any).from('videos').delete().eq('model_id', id);
          await (supabase as any).from('model_followers').delete().eq('model_id', id);
          await (supabase as any).from('model_chat_panels').delete().eq('model_id', id);
          await (supabase as any).from('models').delete().eq('id', id);
        }

        toast.dismiss();
        toast.success(`✅ Modelo "${content.name}" excluída permanentemente!`);
      }

      setContents(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      toast.dismiss();
      console.error('Erro ao deletar conteúdo:', error);
      toast.error('Erro ao excluir. Verifique o console.');
    }
  };

  // Atualiza a visibilidade do vídeo (public/premium)
  const setVideoVisibility = async (videoId: string | undefined, visibility: 'public' | 'premium') => {
    try {
      if (!videoId) {
        toast.error('Este conteúdo não possui vídeo para atualizar.');
        return;
      }
      const { error } = await supabase
        .from('videos')
        .update({ visibility })
        .eq('id', videoId);
      if (error) throw error;
      toast.success(`Visibilidade atualizada para ${visibility === 'public' ? 'Público' : 'Premium'}`);
      console.log(`✅ Visibilidade do vídeo ${videoId} definida para ${visibility}`);
    } catch (error) {
      console.error('Erro ao atualizar visibilidade do vídeo:', error);
      toast.error('Erro ao atualizar visibilidade do vídeo');
    }
  };

  // Alterna a visibilidade com base no estado atual do conteúdo
  const toggleVideoVisibility = async (content: any) => {
    try {
      if (!content?.videoId) {
        toast.error('Este conteúdo não possui vídeo para atualizar.');
        return;
      }
      const newVisibility: 'public' | 'premium' = content.visibility === 'public' ? 'premium' : 'public';
      await setVideoVisibility(content.videoId, newVisibility);
      setContents(prev => prev.map(c => c.id === content.id ? { ...c, visibility: newVisibility } : c));
    } catch (e) {
      // setVideoVisibility já trata erros/toasts
    }
  };
   const handleNewContent = async (newContent: any) => {
    try {
      console.log('🚀 ADMIN DEBUG: Salvando novo conteúdo:', newContent);
      
      if (editingContent) {
        // Update existing content in database first
        console.log('🔄 ADMIN DEBUG: Atualizando conteúdo existente:', editingContent.id, newContent);
        
        // Atualizar o modelo no banco
        const { error: modelUpdateError } = await supabase
          .from('models')
          .update({
            username: newContent.name,
            name: newContent.displayName || newContent.name,
            avatar_url: newContent.avatarUrl,
            bio: `Perfil de ${newContent.displayName || newContent.name}`,
            is_verified: newContent.platform === 'premium',
            category: newContent.platform === 'premium' ? 'premium' : 'standard'
          })
          .eq('id', editingContent.id);

        if (modelUpdateError) {
          console.error('❌ ADMIN DEBUG: Erro ao atualizar modelo:', modelUpdateError);
          throw modelUpdateError;
        }

        // NÃO apagar vídeos antigos — apenas adicionar novos conforme o modo escolhido
        // Carregar vídeos existentes do modelo para evitar duplicados
        const { data: existingVideos } = await supabase
          .from('videos')
          .select('id, video_url')
          .eq('model_id', editingContent.id);
        
        const existingSet = new Set((existingVideos || []).map((v: any) => (v.video_url || '').trim()));
        const mode = newContent.uploadMode || (newContent.videoUrl ? 'single' : 'list');
        let createdVideoId: string | null = null;

        if (mode === 'single' && newContent.videoUrl) {
          const url = (newContent.videoUrl as string).trim();
          if (!existingSet.has(url)) {
            const { data: insertedSingle, error: singleErr } = await supabase
              .from('videos')
              .insert({
                title: `${newContent.displayName || newContent.name} - Vídeo`,
                description: `Conteúdo de ${newContent.displayName || newContent.name}`,
                video_url: url,
                model_id: editingContent.id,
                is_active: true,
                upload_source: 'single'
              } as any)
              .select()
              .single();
            if (singleErr) {
              console.error('❌ ADMIN DEBUG: Erro ao criar vídeo único:', singleErr);
            } else {
              createdVideoId = insertedSingle?.id || null;
            }
          } else {
            createdVideoId = (existingVideos || []).find((v: any) => (v.video_url || '').trim() === url)?.id || null;
          }
        } else if (mode === 'list') {
          const urls: string[] = (Array.isArray(newContent.videoList) ? newContent.videoList : []).filter(Boolean);
          const uniqueNew = urls.filter((u) => !existingSet.has((u || '').trim()));
          if (uniqueNew.length > 0) {
            const rows = uniqueNew.map((url: string, idx: number) => ({
              title: `${newContent.displayName || newContent.name} - Vídeo ${idx + 1}`,
              description: `Conteúdo de ${newContent.displayName || newContent.name}`,
              video_url: url,
              model_id: editingContent.id,
              is_active: true,
              upload_source: 'list'
            }));
            const { data: insertedList, error: listErr } = await supabase
              .from('videos')
              .insert(rows as any)
              .select();
            if (listErr) {
              console.error('❌ ADMIN DEBUG: Erro ao criar vídeos da lista:', listErr);
            } else {
              createdVideoId = insertedList?.[0]?.id || null;
            }
          }
        }

        // Criar oferta se foi configurada
        if (newContent.offer) {
          const o = newContent.offer;
          // Se for lista de vídeos, associa a oferta ao MODELO (video_id = null) para valer para todos.
          // Se for vídeo único e houver createdVideoId, associa àquele vídeo.
          const linkToVideo = mode !== 'list' && createdVideoId ? createdVideoId : null;
          await supabase.from('offers').insert({
            model_id: editingContent.id,
            video_id: linkToVideo,
            title: o.title,
            description: o.description,
            image_url: o.image_url,
            button_text: o.button_text,
            button_color: o.button_color,
            button_effect: o.button_effect || 'none',
            button_link: o.button_link,
            ad_text: o.ad_text,
            ad_text_link: o.ad_text_link,
            start_at: o.start_at ? new Date(o.start_at).toISOString() : null,
            end_at: o.end_at ? new Date(o.end_at).toISOString() : null,
            duration_seconds: Number(o.duration_seconds) || 5,
            show_times: Number(o.show_times) || 1,
            is_active: true,
          });
        }

        // Atualizar UI apenas após sucesso no banco
        setContents(prev => prev.map(content => 
          content.id === editingContent.id ? { 
            ...newContent, 
            id: editingContent.id,
            avatar: newContent.avatarUrl || crownLogo,
            displayName: newContent.displayName || newContent.name
          } : content
        ));
        setEditingContent(null);
      } else {
        // ✅ CORRIGIDO: Salvar novo modelo no Supabase primeiro
        const { data: newModel, error: modelError } = await supabase
          .from('models')
          .insert({
            username: newContent.name,
            name: newContent.displayName || newContent.name,
            avatar_url: newContent.avatarUrl,
            bio: `Perfil de ${newContent.displayName || newContent.name}`,
            is_active: true,
            is_verified: newContent.platform === 'premium',
            category: newContent.platform === 'premium' ? 'premium' : 'standard'
          })
          .select()
          .single();

        if (modelError) {
          console.error('❌ ADMIN DEBUG: Erro ao criar modelo:', modelError);
          throw modelError;
        }

        console.log('✅ ADMIN DEBUG: Modelo criado com sucesso:', newModel);

        // Inserir vídeos conforme o modo escolhido
        let createdVideoId: string | null = null;
        const mode = newContent.uploadMode || (newContent.videoUrl ? 'single' : 'list');

        if (mode === 'single' && newContent.videoUrl) {
          const url = (newContent.videoUrl as string).trim();
          const { data: insertedSingle, error: singleErr } = await supabase
            .from('videos')
            .insert({
              title: `${newContent.displayName || newContent.name} - Vídeo`,
              description: `Conteúdo de ${newContent.displayName || newContent.name}`,
              video_url: url,
              model_id: newModel.id,
              is_active: true,
              upload_source: 'single'
            } as any)
            .select()
            .single();
          if (singleErr) {
            console.error('❌ ADMIN DEBUG: Erro ao criar vídeo único:', singleErr);
          } else {
            createdVideoId = insertedSingle?.id || null;
          }
        } else if (mode === 'list') {
          const urls: string[] = (Array.isArray(newContent.videoList) ? newContent.videoList : []).filter(Boolean);
          if (urls.length > 0) {
            const rows = urls.map((url: string, idx: number) => ({
              title: `${newContent.displayName || newContent.name} - Vídeo ${idx + 1}`,
              description: `Conteúdo de ${newContent.displayName || newContent.name}`,
              video_url: url,
              model_id: newModel.id,
              is_active: true,
              upload_source: 'list'
            }));
            const { data: insertedList, error: listErr } = await supabase
              .from('videos')
              .insert(rows as any)
              .select();
            if (listErr) {
              console.error('❌ ADMIN DEBUG: Erro ao criar vídeos da lista:', listErr);
            } else {
              createdVideoId = insertedList?.[0]?.id || null;
            }
          }
        }

        // Criar oferta se foi configurada
        if (newContent.offer) {
          const o = newContent.offer;
          // Se for lista de vídeos, cria oferta por MODELO (video_id = null). Vídeo único associa ao vídeo criado.
          const linkToVideo = mode !== 'list' && createdVideoId ? createdVideoId : null;
          await supabase.from('offers').insert({
            model_id: newModel.id,
            video_id: linkToVideo,
            title: o.title,
            description: o.description,
            image_url: o.image_url,
            button_text: o.button_text,
            button_color: o.button_color,
            button_effect: o.button_effect || 'none',
            button_link: o.button_link,
            ad_text: o.ad_text,
            ad_text_link: o.ad_text_link,
            start_at: o.start_at ? new Date(o.start_at).toISOString() : null,
            end_at: o.end_at ? new Date(o.end_at).toISOString() : null,
            duration_seconds: Number(o.duration_seconds) || 5,
            show_times: Number(o.show_times) || 1,
            is_active: true,
          });
        }

        // Atualizar UI apenas após sucesso no banco
        setContents(prev => [...prev, {
          ...newContent,
          avatar: newContent.avatarUrl || crownLogo,
          displayName: newContent.displayName || newContent.name
        }]);
        
        console.log('🎉 ADMIN DEBUG: Conteúdo salvo com sucesso no banco de dados!');
      }
    } catch (error) {
      console.error('❌ ADMIN DEBUG: Erro ao salvar conteúdo:', error);
    }
  };

  const handleEditContent = (content: any) => {
    setEditingContent(content);
    setIsModalOpen(true);
  };

  const handlePreviewContent = (content: any) => {
    setSelectedContent(content);
    // Preview removed - bonus_users system deprecated
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContent(null);
  };

  const handleOffersModal = (content: any) => {
    setSelectedContent(content);
    setIsOffersModalOpen(true);
  };

  // Filtrar conteúdos baseado no filtro e busca
  const filteredContents = contents.filter(content => {
    // Aplicar filtro de tipo
    if (contentFilter === 'creators' && !content.isCreator) return false;
    if (contentFilter === 'models' && content.isCreator) return false;
    
    // Aplicar busca por nome ou email
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchName = content.name?.toLowerCase().includes(search);
      const matchEmail = content.email?.toLowerCase().includes(search);
      return matchName || matchEmail;
    }
    
    return true;
  });

  console.log('🔥 AdminContentTable está sendo renderizado!');
  
  return (
    <>
      <Card className="bg-gradient-card border-border/50 relative z-10">
      <CardHeader className="flex flex-row justify-between items-center gap-4 p-4 relative z-20">
        <CardTitle className="text-lg font-semibold text-primary">
          Gerenciar Conteúdo
        </CardTitle>
        <div className="flex gap-2 shrink-0">
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-primary hover:shadow-glow text-primary-foreground font-medium px-4 py-2 relative z-30"
            size="default"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Novo Modelo
          </Button>
          <Button 
            onClick={() => setIsIntegrationsModalOpen(true)} 
            variant="outline"
            className="px-4 py-2 relative z-30"
            size="default"
          >
            <Globe className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Integrações</span>
            <span className="sm:hidden">Web</span>
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Barra de Filtros */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={contentFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setContentFilter('all')}
              size="sm"
            >
              🎬 Todos ({contents.length})
            </Button>
            <Button 
              variant={contentFilter === 'creators' ? 'default' : 'outline'}
              onClick={() => setContentFilter('creators')}
              className={contentFilter === 'creators' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              size="sm"
            >
              ✨ Apenas Criadores ({contents.filter(c => c.isCreator).length})
            </Button>
            <Button 
              variant={contentFilter === 'models' ? 'default' : 'outline'}
              onClick={() => setContentFilter('models')}
              size="sm"
            >
              👑 Apenas Modelos ({contents.filter(c => !c.isCreator).length})
            </Button>
          </div>
          
          {/* Input de Busca */}
          <input
            type="text"
            placeholder="🔍 Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-sm px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span className="hidden md:inline">Conteúdo</span>
                  <span className="hidden sm:inline md:hidden">Info</span>
                  <span className="sm:hidden">User</span>
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                  <div className="flex items-center">
                    <Crown className="w-3 h-3 mr-1 text-accent" />
                    <span className="hidden lg:inline">Plataforma</span>
                    <span className="lg:hidden">Plat.</span>
                  </div>
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Views</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  <span className="hidden lg:inline">Curtidas</span>
                  <span className="lg:hidden">Likes</span>
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                  <span className="hidden xl:inline">Horários</span>
                  <span className="xl:hidden">Hrs</span>
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {filteredContents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    {searchTerm 
                      ? `Nenhum resultado encontrado para "${searchTerm}"`
                      : contentFilter === 'creators'
                        ? 'Nenhum criador encontrado'
                        : contentFilter === 'models'
                          ? 'Nenhum modelo encontrado'
                          : 'Nenhum conteúdo encontrado'
                    }
                  </td>
                </tr>
              ) : (
                filteredContents.map((content) => (
                <tr key={content.id} className="hover:bg-card-hover transition-colors">
                  <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12">
                        <img 
                          src={content.avatar || DEFAULT_AVATAR} 
                          alt={`Avatar ${content.name}`} 
                          className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 rounded-full object-cover border-2 border-primary/30"
                          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                        />
                      </div>
                      <div className="ml-2 sm:ml-3">
                        <div className="text-xs sm:text-sm font-medium text-foreground leading-tight">
                          <span className="hidden md:inline">{content.name || 'Usuário'}</span>
                          <span className="hidden sm:inline md:hidden">{(content.name || 'Usuário').split(' ')[0]}</span>
                          <span className="sm:hidden">{((content.name || 'Usuário').split(' ')[0] || 'Usr').slice(0, 3)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground leading-tight">
                          {content.isCreator && content.email ? (
                            <span className="hidden lg:inline">📧 {content.email}</span>
                          ) : (
                            <span className="hidden lg:inline">ID: {content.id || 'N/A'}</span>
                          )}
                          <span className="hidden md:inline lg:hidden">{(content.id || 'N/A').slice(0, 15)}...</span>
                          <span className="hidden sm:inline md:hidden">{content.views || '0'} views</span>
                          <span className="sm:hidden">{content.views || '0'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                    <div className="flex items-center justify-center">
                      {content.isCreator ? (
                        <Badge variant="default" className="text-xs bg-purple-500 hover:bg-purple-600">
                          ✨ <span className="hidden lg:inline ml-1">Criador</span>
                        </Badge>
                      ) : (
                        <Badge variant={content.platform === 'premium' ? 'default' : 'secondary'} className="text-xs">
                          {content.platform === 'premium' ? (
                            <Crown className="w-3 h-3 mr-1" />
                          ) : null}
                          <span className="hidden lg:inline">{content.platform === 'premium' ? 'Premium' : 'Standard'}</span>
                          <span className="lg:hidden">{content.platform === 'premium' ? 'P' : 'S'}</span>
                        </Badge>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-foreground">
                    <span className="hidden sm:inline">{content.views || '0'}</span>
                    <span className="sm:hidden">{(content.views || '0').toString().replace('K', 'k')}</span>
                  </td>
                  
                  <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-foreground hidden md:table-cell">
                    {content.likes}
                  </td>
                  
                  <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap text-xs text-muted-foreground hidden lg:table-cell">
                    {content.schedule}
                  </td>
                  
                  <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap text-right text-xs font-medium">
                    <div className="flex items-center justify-end space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditContent(content)}
                        className="p-1 h-6 w-6 sm:h-8 sm:w-8 text-primary hover:text-primary hover:bg-primary/10"
                        title="Editar"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreviewContent(content)}
                        className="p-1 h-6 w-6 sm:h-8 sm:w-8 text-accent hover:text-accent hover:bg-accent/10"
                        title="Visualizar Preview"
                      >
                        <Play className="h-3 w-3" />
                      </Button>

                      {/* Visibilidade: Toggle Público/Premium */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleVideoVisibility(content)}
                        className={`p-1 h-6 w-6 sm:h-8 sm:w-8 ${
                          content.visibility === 'public'
                            ? 'text-success hover:text-success hover:bg-success/10'
                            : 'text-warning hover:text-warning hover:bg-warning/10'
                        }`}
                        title={content.videoId ? (content.visibility === 'public' ? 'Público (clique para Premium)' : 'Premium (clique para Público)') : 'Sem vídeo'}
                        disabled={!content.videoId}
                      >
                        {content.visibility === 'public' ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatus(content.id)}
                        className={`p-1 h-6 w-6 sm:h-8 sm:w-8 ${
                          content.status === 'active' 
                            ? 'text-success hover:text-success hover:bg-success/10' 
                            : 'text-muted-foreground hover:text-success hover:bg-success/10'
                        }`}
                        title={content.status === 'active' ? 'Bloquear Video' : 'Desbloquear Video'}
                      >
                        {content.status === 'active' ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          <Unlock className="h-3 w-3" />
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOffersModal(content)}
                        className="p-1 h-6 w-6 sm:h-8 sm:w-8 text-warning hover:text-warning hover:bg-warning/10"
                        title="Criar Oferta VIP"
                      >
                        <Crown className="h-3 w-3" />
                      </Button>
                      
                      {/* Botão de Chat IA - apenas para modelos, não criadores */}
                      {!content.isCreator && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedContent(content);
                            setIsChatPanelModalOpen(true);
                          }}
                          className="p-1 h-6 w-6 sm:h-8 sm:w-8 text-purple-400 hover:text-purple-400 hover:bg-purple-400/10"
                          title="Configurar Chat IA"
                        >
                          <Bot className="h-3 w-3" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteContent(content.id)}
                        className="p-1 h-6 w-6 sm:h-8 sm:w-8 text-destructive hover:text-destructive hover:bg-destructive/10 hidden sm:inline-flex"
                        title="Excluir"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
    
      <ContentModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onSubmit={handleNewContent}
        editingContent={editingContent}
        onOpenLiveManagement={() => {
          setIsModalOpen(false);
          setIsLiveModalOpen(true);
        }}
      />
      
      <LiveManagementModal
        isOpen={isLiveModalOpen}
        onClose={() => setIsLiveModalOpen(false)}
      />
      
      <IntegrationsModal
        isOpen={isIntegrationsModalOpen} 
        onClose={() => setIsIntegrationsModalOpen(false)} 
      />
      
      <OffersModal 
        isOpen={isOffersModalOpen} 
        onClose={() => setIsOffersModalOpen(false)} 
        selectedContent={selectedContent}
      />

      <ModelChatPanelModal
        isOpen={isChatPanelModalOpen}
        onClose={() => {
          setIsChatPanelModalOpen(false);
          setSelectedContent(null);
        }}
        modelId={selectedContent?.modelId || selectedContent?.id}
        modelName={selectedContent?.name || 'Modelo'}
        modelAvatar={selectedContent?.avatar || crownLogo}
      />
   </>
   );
};