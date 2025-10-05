
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types/database';
import { X, ArrowLeft, Heart } from 'lucide-react';
import { ImageViewer } from '@/components/ui/image-viewer';

interface ProfileScreenProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onVideoSelect?: (videoId: string) => void;
  onGoHome?: () => void;
}

interface ModelContent {
  id: string;
  title: string;
  thumbnail_url: string;
  video_url?: string;
  image_url?: string;
  type: 'video' | 'image';
  likes_count: number;
  views_count: number;
  created_at: string;
}

interface ModelImage {
  id: string;
  url: string;
  title: string;
  likes_count: number;
  views_count: number;
  created_at: string;
}

export const ProfileScreen = ({ user, isOpen, onClose, onVideoSelect, onGoHome }: ProfileScreenProps) => {
  const [contents, setContents] = useState<ModelContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [viewerName, setViewerName] = useState('Você');
  const [panelUrl, setPanelUrl] = useState<string | null>(null);
  const [showMyContent, setShowMyContent] = useState(false);
  const [myContentImages, setMyContentImages] = useState<string[]>([]);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentImageArray, setCurrentImageArray] = useState<string[]>([]);
  
  useEffect(() => {
    if (isOpen && user.id) {
      loadModelContent();
      checkFollowingStatus();
    }
  }, [isOpen, user.id]);

  // Verificar se o usuário já está seguindo a modelo
  const checkFollowingStatus = async () => {
    try {
      // Sempre resetar estado ao checar
      setIsFollowing(false);

      const userId = sessionStorage.getItem('user_id');
      if (!userId) return;

      const { data, error } = await supabase
        .from('model_followers')
        .select('is_active')
        .eq('user_id', userId)
        .eq('model_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.warn('checkFollowingStatus error:', error);
        return;
      }

      setIsFollowing(!!data);
    } catch (error) {
      // Em qualquer falha, garantir estado como não seguindo
      setIsFollowing(false);
    }
  };

  // Load viewer name from localStorage (fallback to "Você")
  useEffect(() => {
    const name = localStorage.getItem('viewer_name');
    if (name) setViewerName(name);
  }, [isOpen]);

  const loadModelContent = async () => {
    setLoading(true);
    try {
      console.log('Loading content for user:', user.id, user.username);
      
      // Carregar dados do modelo (incluindo posting_panel_url)
      const { data: modelData, error: modelError } = await supabase
        .from('models')
        .select('posting_panel_url')
        .eq('id', user.id)
        .single();

      if (modelError) {
        console.warn('Erro ao carregar dados do modelo:', modelError);
      } else {
        setPanelUrl(modelData?.posting_panel_url || null);
      }
      
      // Carregar vídeos
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          description,
          video_url,
          thumbnail_url,
          likes_count,
          views_count,
          created_at,
          is_active,
          model_id
        `)
        .eq('model_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (videosError) {
        console.error('Supabase error:', videosError);
        throw videosError;
      }

      console.log('Videos data received:', videosData);

      // Transformar vídeos para o formato de conteúdo
      const transformedVideos = videosData?.map(item => ({
        id: item.id,
        title: item.title || `Vídeo ${item.id?.slice(0, 8)}`,
        thumbnail_url: item.thumbnail_url || item.video_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png',
        video_url: item.video_url,
        type: 'video' as const,
        likes_count: item.likes_count || 0,
        views_count: item.views_count || 0,
        created_at: item.created_at
      })) || [];

      // Buscar imagens específicas da modelo (usando localStorage como cache temporário)
      const modelImages = getModelImages(user.id);
      
      // Transformar imagens para o formato de conteúdo
      const transformedImages = modelImages.map((image, index) => ({
        id: `image-${user.id}-${index}`,
        title: `Foto ${index + 1}`,
        thumbnail_url: image.url,
        image_url: image.url,
        type: 'image' as const,
        likes_count: Math.floor(Math.random() * 100),
        views_count: Math.floor(Math.random() * 1000),
        created_at: new Date().toISOString()
      }));

      // Combinar vídeos e imagens
      const allContent = [...transformedImages, ...transformedVideos].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log('All content (videos + images):', allContent);
      setContents(allContent);
    } catch (error) {
      console.error('Error loading model content:', error);
      setContents([]);
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar imagens específicas da modelo do localStorage
  const getModelImages = (modelId: string): ModelImage[] => {
    try {
      const storedContent = localStorage.getItem(`model_${modelId}_content`);
      if (storedContent) {
        const parsedContent = JSON.parse(storedContent);
        if (parsedContent.imageUrls && Array.isArray(parsedContent.imageUrls)) {
          return parsedContent.imageUrls.map((url: string, index: number) => ({
            id: `${modelId}-img-${index}`,
            url,
            title: `Imagem ${index + 1}`,
            likes_count: Math.floor(Math.random() * 100),
            views_count: Math.floor(Math.random() * 1000),
            created_at: new Date().toISOString()
          }));
        }
      }
    } catch (error) {
      console.error('Error getting model images:', error);
    }
    return [];
  };

  // Função para carregar imagens do painel de postagem
  const loadMyContentImages = async () => {
    try {
      console.log('🔍 Carregando imagens para modelo:', user.id, user.username);

      // Buscar posts da tabela posts_principais (posts publicados automaticamente)
      const { data: mainPostsData, error: mainError } = await supabase
        .from('posts_principais')
        .select('*')
        .eq('modelo_id', user.id)
        .order('created_at', { ascending: false });

      // Buscar todos os posts agendados da modelo (publicados e agendados)
      const { data: scheduledPostsData, error: scheduledError } = await supabase
        .from('posts_agendados')
        .select('*')
        .eq('modelo_id', user.id)
        .order('created_at', { ascending: false });

      if (mainError) {
        console.error('❌ Erro ao carregar posts principais:', mainError);
      }
      
      if (scheduledError) {
        console.error('❌ Erro ao carregar posts agendados:', scheduledError);
      }

      console.log('📊 Posts principais encontrados:', mainPostsData?.length || 0);
      console.log('📊 Posts agendados encontrados:', scheduledPostsData?.length || 0);

      // Combinar todos os posts
      const allPosts = [
        ...(mainPostsData || []),
        ...(scheduledPostsData || [])
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Extrair todas as URLs de imagens
      const allImages: string[] = [];
      allPosts.forEach(post => {
        console.log('🔍 Processando post:', post);
        
        // Para posts_agendados (verificar campos 'imagens' e 'conteudo_url')
        if ('imagens' in post && post.imagens && Array.isArray(post.imagens)) {
          console.log('📸 Imagens encontradas no campo imagens:', post.imagens);
          allImages.push(...post.imagens);
        } else if ('conteudo_url' in post && post.conteudo_url) {
          console.log('📸 Imagem encontrada no campo conteudo_url:', post.conteudo_url);
          allImages.push(post.conteudo_url);
        }
        
        // Para posts_principais (com campo 'conteudo_url')
        if ('tipo_conteudo' in post && post.tipo_conteudo === 'imagem' && post.conteudo_url) {
          console.log('📸 Imagem principal encontrada:', post.conteudo_url);
          if (!allImages.includes(post.conteudo_url)) {
            allImages.push(post.conteudo_url);
          }
        }
      });

      console.log('✅ Posts carregados do painel:', allPosts.length);
      console.log('✅ Imagens extraídas:', allImages);
      setMyContentImages(allImages);
    } catch (error) {
      console.error('❌ Erro ao carregar conteúdo da modelo:', error);
    }
  };

  const followModel = async () => {
    if (isFollowing) return;

    console.log('🔔 PROFILE SEGUIR: Iniciando processo de seguir modelo', {
      modelId: user.id,
      modelName: user.username,
      isFollowing: isFollowing
    });

    try {
      // Verificar primeiro se já está seguindo
      let userId = sessionStorage.getItem('user_id');
      if (!userId) {
        userId = crypto.randomUUID();
        sessionStorage.setItem('user_id', userId);
        console.log('🔔 PROFILE SEGUIR: Novo userId criado:', userId);
      } else {
        console.log('🔔 PROFILE SEGUIR: UserId existente:', userId);
      }

      // Verificar se já está seguindo
      const { data: existingFollow } = await supabase
        .from('model_followers')
        .select('*')
        .eq('user_id', userId)
        .eq('model_id', user.id)
        .eq('is_active', true)
        .single();

      if (existingFollow) {
        console.log('🔔 PROFILE SEGUIR: Usuário já segue esta modelo');
        setIsFollowing(true);
        return;
      }
      
      const userData = {
        id: userId,
        name: 'Usuário Visitante',
        email: 'usuario@exemplo.com'
      };

      console.log('🔔 PROFILE SEGUIR: Inserindo dados no banco:', {
        user_id: userData.id,
        model_id: user.id,
        user_name: userData.name,
        user_email: userData.email,
        is_active: true,
        modelo_nome: user.username
      });

      const { error } = await supabase
        .from('model_followers')
        .insert({
          user_id: userData.id,
          model_id: user.id,
          user_name: userData.name,
          user_email: userData.email,
          is_active: true
        });

      if (error) {
        console.log('❌ PROFILE SEGUIR: Erro ao inserir:', error);
        // Se erro for de duplicate key, significa que já está seguindo
        if (error.code === '23505') {
          console.log('🔔 PROFILE SEGUIR: Usuário já segue, atualizando para ativo');
          // Atualizar para ativo caso já exista mas inativo
          await supabase
            .from('model_followers')
            .update({ is_active: true })
            .match({ 
              user_id: userData.id, 
              model_id: user.id 
            });
        } else {
          throw error;
        }
      } else {
        console.log('✅ PROFILE SEGUIR: Dados inseridos com sucesso!');
      }

      // Marcar como seguindo imediatamente na UI
      setIsFollowing(true);
      
      // Aguardar um pouco e recarregar dados da modelo para ter a contagem correta
      setTimeout(async () => {
        try {
          const { data: updatedModel } = await supabase
            .from('models')
            .select('followers_count')
            .eq('id', user.id)
            .single();
          
          if (updatedModel) {
            user.followers_count = updatedModel.followers_count;
            console.log('✅ Contagem de seguidores recarregada:', user.followers_count);
            // Forçar re-render da tela para mostrar o novo valor
            window.dispatchEvent(new Event('resize'));
          }
        } catch (error) {
          console.error('❌ Erro ao recarregar contagem:', error);
        }
      }, 500);
      console.log('🔔 PROFILE SEGUIR: Processo concluído com sucesso!');

    } catch (error) {
      console.error('❌ PROFILE SEGUIR: Erro geral:', error);
    }
  };


if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 transform transition-transform duration-300 ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`}>
      {/* Background overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Sliding panel */}
      <div className={`absolute right-0 top-0 h-full w-full bg-black transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } flex flex-col`}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/90 backdrop-blur-sm sticky top-0 z-10">
          <button
            onClick={onGoHome || onClose}
            className="text-white text-xl w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-white text-lg font-semibold">{user.username}</h2>
          <button
            onClick={onClose}
            className="text-white/70 text-xl w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] px-3 lg:px-6">
          {/* Profile Header */}
          <div className="p-6 text-white border-b border-white/10">
            <div className="flex items-center gap-4 mb-4">
              <img
                src={user.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'}
                alt="Profile"
                className="w-20 h-20 rounded-full border-2 border-white/20 object-cover"
              />
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-1">@{user.username}</h3>
                <div className="text-sm text-white/70 mb-2">
                  {(user.followers_count || 0).toLocaleString()} seguidores
                </div>
                
                {/* Link para painel de postagem */}
                {user.posting_panel_url && (
                  <div className="mb-2">
                    <a 
                      href={user.posting_panel_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs bg-gradient-to-r from-blue-500 to-purple-500 px-2 py-1 rounded-full text-white hover:from-blue-600 hover:to-purple-600 transition-colors"
                    >
                      📊 Painel de Postagem
                    </a>
                  </div>
                )}
                
                {/* Link do painel enviado - exibir quando existe no panelUrl */}
                {panelUrl && (
                  <div className="mb-2">
                    <a 
                      href={panelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-1 rounded-full text-white hover:from-purple-600 hover:to-pink-600 transition-colors"
                    >
                      🔗 Link Enviado
                    </a>
                  </div>
                )}
                
                {isFollowing && (
                  <div className="text-xs text-green-400 mb-2">
                    ✓ {viewerName}, você está seguindo @{user.username}
                  </div>
                )}
                {user.is_online && (
                  <div className="inline-flex items-center gap-1 bg-gradient-to-r from-red-500 to-pink-500 px-2 py-1 rounded-full text-xs font-medium">
                    🔴 AO VIVO
                  </div>
                )}
              </div>
            </div>

            {user.bio && (
              <p className="text-white/90 text-sm leading-relaxed mb-4">
                {user.bio}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  console.log('🔥 PROFILE BOTÃO SEGUIR CLICADO!', {
                    currentUser: user?.username,
                    isFollowing,
                    modelId: user?.id
                  });
                  followModel();
                }}
                className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 py-2 px-4 rounded-full font-semibold text-white text-sm"
                aria-pressed={isFollowing}
                aria-label={isFollowing ? `Deixar de seguir ${user.username}` : `Seguir ${user.username}`}
              >
                {isFollowing ? 'Seguindo' : 'Seguir'}
              </button>
            </div>

            {panelUrl && (
              <div className="mt-3">
                <button
                  onClick={() => {
                    setShowMyContent(!showMyContent);
                    if (!showMyContent) {
                      loadMyContentImages();
                    }
                  }}
                  className="inline-flex items-center gap-2 text-xs bg-gradient-to-r from-pink-500 to-red-500 px-3 py-1.5 rounded-full text-white hover:from-pink-600 hover:to-red-600 transition-colors"
                >
                  <Heart className="w-3 h-3" />
                  Meus Conteúdos
                </button>
              </div>
            )}

            {/* Seção Meus Conteúdos - Só aparece quando ativo */}
            {showMyContent && (
              <div className="mt-4 p-3 border-t border-white/10">
                <h4 className="text-white font-semibold mb-3 text-base flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500" />
                  Meus Conteúdos ({myContentImages.length})
                </h4>
                
                {myContentImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-white/60">
                    <div className="text-3xl mb-2">💖</div>
                    <p className="text-sm">Nenhum conteúdo exclusivo disponível</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {myContentImages.map((imageUrl, index) => (
                      <div 
                        key={index}
                        className="relative bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform active:scale-95 shadow-lg aspect-square"
                        onClick={() => {
                          setCurrentImageArray(myContentImages);
                          setCurrentImageIndex(index);
                          setImageViewerOpen(true);
                        }}
                      >
                        <img
                          src={imageUrl}
                          alt={`Conteúdo ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png';
                          }}
                        />
                        
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                        
                        {/* Heart icon overlay */}
                        <div className="absolute top-2 right-2 bg-pink-500/80 rounded-full p-1">
                          <Heart className="w-3 h-3 text-white fill-white" />
                        </div>
                        
                        {/* Hover overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 bg-pink-500/80 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <Heart className="w-6 h-6 text-white fill-white" />
                          </div>
                        </div>
                        
                        {/* Number overlay */}
                        <div className="absolute bottom-1 left-1">
                          <div className="bg-black/70 rounded-full px-2 py-1">
                            <span className="text-white text-xs font-medium">{index + 1}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content Grid - Formato TikTok/Instagram */}
          <div className="p-3">
            <h4 className="text-white font-semibold mb-3 text-base">
              Postagens ({contents.length})
            </h4>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : contents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-white/60">
                <div className="text-3xl mb-2">📱</div>
                <p className="text-sm">Nenhum conteúdo disponível</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9 gap-1 md:gap-1 p-1 md:p-2">
                {contents.map((content) => (
                  <div 
                    key={content.id} 
                    className={`relative bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform active:scale-95 shadow-lg ${
                      content.type === 'image' ? 'aspect-square' : 'aspect-[9/16]'
                    }`}
                    onClick={() => {
                      if (content.type === 'video') {
                        onVideoSelect?.(content.id);
                        onClose();
                      } else {
                        // Para imagens, abrir o visualizador
                        const imageContents = contents.filter(c => c.type === 'image');
                        const imageUrls = imageContents.map(c => c.image_url || c.thumbnail_url);
                        const currentImageIndex = imageContents.findIndex(c => c.id === content.id);
                        setCurrentImageArray(imageUrls);
                        setCurrentImageIndex(currentImageIndex);
                        setImageViewerOpen(true);
                      }
                    }}
                  >
                    {/* Thumbnail/Content Preview */}
                    <div className="w-full h-full relative">
                      {content.type === 'video' ? (
                        <>
                          <video
                            src={content.video_url}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                            poster={content.thumbnail_url}
                            onLoadedMetadata={(e) => {
                              const video = e.currentTarget;
                              video.currentTime = 1;
                            }}
                          />
                          {/* Video play icon */}
                          <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
                            <div className="w-4 h-4 text-white flex items-center justify-center">
                              <div className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent ml-0.5"></div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <img
                            src={content.image_url || content.thumbnail_url}
                            alt={content.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png';
                            }}
                          />
                          {/* Image gallery icon */}
                          <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
                            <div className="w-4 h-4 text-white flex items-center justify-center">
                              <div className="w-3 h-3 border border-white rounded-sm opacity-80"></div>
                            </div>
                          </div>
                        </>
                      )}
                      
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                      
                      {/* Hover overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center backdrop-blur-sm">
                          {content.type === 'video' ? (
                            <div className="w-0 h-0 border-l-[10px] border-l-black border-y-[7px] border-y-transparent ml-1"></div>
                          ) : (
                            <div className="w-6 h-6 border-2 border-black rounded opacity-80"></div>
                          )}
                        </div>
                      </div>
                      
                      {/* Stats overlay */}
                      <div className="absolute bottom-1 left-1 right-1">
                        <div className="flex items-center justify-between text-white text-xs">
                          <div className="flex items-center gap-1 bg-black/70 rounded-full px-2 py-1">
                            <span className="text-red-400">❤️</span>
                            <span className="text-[10px] font-medium">{content.likes_count > 1000 ? `${(content.likes_count/1000).toFixed(1)}k` : content.likes_count}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-black/70 rounded-full px-2 py-1">
                            <span className="text-blue-400">👁️</span>
                            <span className="text-[10px] font-medium">{content.views_count > 1000 ? `${(content.views_count/1000).toFixed(1)}k` : content.views_count}</span>
                          </div>
                        </div>
                      </div>

                      {/* Title overlay */}
                      <div className="absolute top-1 left-1 right-8">
                        <div className="bg-black/50 rounded px-2 py-1">
                          <p className="text-white text-[10px] font-medium truncate">{content.title}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Image Viewer */}
      <ImageViewer
        images={currentImageArray}
        currentIndex={currentImageIndex}
        isOpen={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        onIndexChange={setCurrentImageIndex}
      />
    </div>
  );
};
