
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

      // Primeiro verificar no localStorage (mais rápido)
      const followKey = `follow_${userId}_${user.id}`;
      const localFollow = localStorage.getItem(followKey);
      
      if (localFollow === 'true') {
        setIsFollowing(true);
        console.log('✅ Following encontrado no localStorage');
        return;
      }

      // Se não encontrou no localStorage, verificar no Supabase
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

      if (data) {
        setIsFollowing(true);
        // Sincronizar com localStorage
        localStorage.setItem(followKey, 'true');
      }
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
        thumbnail_url: item.thumbnail_url || item.video_url || '/placeholder.svg',
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

    console.log('🔔 PROFILE SEGUIR: Iniciando processo de seguir modelo', user.id);

    try {
      // Usar ID de sessão anônima (não requer login)
      let userId = sessionStorage.getItem('user_id');
      if (!userId) {
        userId = crypto.randomUUID();
        sessionStorage.setItem('user_id', userId);
      }

      // Atualizar estado local IMEDIATAMENTE
      setIsFollowing(true);

      // Chamar Edge Function pública para seguir
      const { error } = await supabase.functions.invoke('follow-model', {
        body: {
          user_id: userId,
          model_id: user.id,
          is_active: true
        }
      });

      if (error) {
        console.error('❌ Erro ao seguir modelo:', error);
        setIsFollowing(false);
        toast.error('Erro ao seguir modelo. Tente novamente.');
        return;
      }

      // Salvar no localStorage para persistência
      const followKey = `follow_${userId}_${user.id}`;
      localStorage.setItem(followKey, 'true');

          console.log('✅ PROFILE SEGUIR: Seguindo modelo com sucesso!');
      
    } catch (error) {
      console.error('❌ PROFILE SEGUIR: Erro:', error);
      setIsFollowing(false);
      toast.error('Não foi possível seguir agora. Tente novamente.');
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
                src={user.avatar_url || '/placeholder.svg'}
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
                            e.currentTarget.src = '/placeholder.svg';
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
            
            {contents.length === 0 ? (
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
                              e.currentTarget.src = '/placeholder.svg';
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

            {/* Seção de Mais Informações */}
            <div className="mt-6 border-t border-white/10 pt-6 max-w-2xl">
              <h3 className="text-[#00D5FF] text-base font-semibold mb-4">Mais informações</h3>
              
              {/* Links Sociais */}
              <div className="flex flex-wrap gap-2 mb-6">
                <a 
                  href={`https://tiktok.com/@${user.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white/10 text-white px-4 py-2.5 rounded-full text-sm hover:bg-white/20 transition-colors border border-white/20"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                  </svg>
                  Tiktok
                </a>
                
                <a 
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white/10 text-white px-4 py-2.5 rounded-full text-sm hover:bg-white/20 transition-colors border border-white/20"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 3.764 3.659.403.03.823.074 1.169.239.27.119.404.314.404.538 0 .449-.63.899-1.664.899-1.139 0-2.848-.778-4.542-2.068-1.798-1.364-3.011-3.015-3.746-4.078l-.003-.015c-.164-.254-.314-.524-.479-.793l-.074-.135c-.12-.214-.269-.42-.419-.643-.3-.42-.645-.93-1.033-1.364-.164-.179-.27-.345-.27-.479 0-.09.044-.149.104-.149.075 0 .225.029.375.074.104.03.269.074.389.074.06 0 .149-.015.209-.074.165-.135.24-.494.24-.793 0-.645-.39-1.139-1.063-1.139-.12 0-.314.03-.479.074-.194.06-.449.135-.674.135-.239 0-.419-.06-.554-.164-.314-.254-.554-.689-.554-1.139 0-.374.136-.778.376-1.123.27-.404.72-.659 1.213-.659.06 0 .12 0 .165.015.27.029.494.135.674.314.164.165.225.375.225.614 0 .179-.045.375-.12.524-.045.075-.09.149-.12.224-.03.044-.045.089-.06.119.015.029.06.074.165.074.27 0 .734-.135 1.198-.404.494-.285 1.139-.734 1.693-1.213.12-.104.269-.194.434-.254.239-.09.494-.135.764-.135zm-2.008 10.238c-.165-.12-.3-.239-.419-.359-.239-.239-.42-.524-.614-.793-.329-.449-.704-.958-1.123-1.378-.225-.224-.449-.434-.674-.629-.3-.254-.614-.479-.943-.674-.18-.104-.375-.194-.569-.254-.375-.119-.778-.179-1.198-.179-1.079 0-2.008.524-2.488 1.408-.15.285-.225.614-.225.958 0 .479.135.943.36 1.363.225.404.554.764.943 1.033.225.149.479.269.749.344.209.06.434.104.674.104.314 0 .629-.06.913-.165.375-.135.704-.344.958-.614.18-.194.329-.419.434-.659.12-.254.18-.539.18-.823 0-.27-.06-.524-.165-.749-.105-.224-.255-.419-.42-.584z"/>
                  </svg>
                  Snapchat
                </a>

                <a 
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white/10 text-white px-4 py-2.5 rounded-full text-sm hover:bg-white/20 transition-colors border border-white/20"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  X
                </a>

                <a 
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white/10 text-white px-4 py-2.5 rounded-full text-sm hover:bg-white/20 transition-colors border border-white/20"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726-1.53.406-3.045.61-4.516.61-2.265 0-4.463-.427-6.59-1.278-2.067-.826-3.93-1.972-5.593-3.44-.1-.088-.148-.173-.148-.256 0-.063.023-.12.068-.18zm3.202-5.456c-.39 0-.71-.18-.96-.538-.25-.36-.375-.79-.375-1.29 0-.516.128-.952.387-1.31.258-.36.578-.538.96-.538.376 0 .7.18.96.538.257.36.387.795.387 1.31s-.13.93-.387 1.29c-.26.36-.584.538-.96.538zm15.506 0c-.376 0-.7-.18-.96-.538-.257-.36-.387-.795-.387-1.29 0-.516.13-.952.387-1.31.26-.36.584-.538.96-.538.39 0 .71.18.96.538.258.36.387.795.387 1.31s-.13.93-.387 1.29c-.25.36-.57.538-.96.538z"/>
                  </svg>
                  Amazon
                </a>
              </div>

              {/* Seção de Assinatura */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
                <h4 className="text-white/50 text-xs uppercase font-semibold mb-4 tracking-wide">ASSINATURA</h4>
                
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
                  <span className="text-[#00D5FF] font-bold text-base">JÁ SOU ASSINANTE</span>
                  <span className="text-[#00D5FF] font-bold text-base">$4.50 por 31 dias</span>
                </div>

                <div className="flex items-center justify-between text-white/50 text-xs">
                  <span>Renove por $15 /mês</span>
                  <span>dez 1, 2025</span>
                </div>
              </div>

              {/* Pacotes de Assinatura */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white/50 text-xs uppercase font-semibold tracking-wide">PACOTES DE ASSINATURA</h4>
                  <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <div className="space-y-3">
                  <button className="w-full bg-[#00D5FF] hover:bg-[#00C2E8] text-black font-bold py-3.5 px-5 rounded-full flex items-center justify-between transition-all shadow-lg shadow-[#00D5FF]/20">
                    <span className="text-sm">3 MESES (15off)</span>
                    <span className="text-sm">$38.25 total</span>
                  </button>

                  <button className="w-full bg-white/10 hover:bg-white/15 text-white font-semibold py-3.5 px-5 rounded-full flex items-center justify-between transition-all border border-white/20">
                    <span className="text-sm">6 MESES (20off)</span>
                    <span className="text-sm">$72.00 total</span>
                  </button>

                  <button className="w-full bg-white/10 hover:bg-white/15 text-white font-semibold py-3.5 px-5 rounded-full flex items-center justify-between transition-all border border-white/20">
                    <span className="text-sm">12 MESES (25off)</span>
                    <span className="text-sm">$135.00 total</span>
                  </button>
                </div>
              </div>

              {/* Footer Links */}
              <div className="flex items-center justify-center gap-3 mt-6 text-white/30 text-xs">
                <a href="#" className="hover:text-white/50 transition-colors">Privacy</a>
                <span>•</span>
                <a href="#" className="hover:text-white/50 transition-colors">Cookie Notice</a>
                <span>•</span>
                <a href="#" className="hover:text-white/50 transition-colors">Terms of Service</a>
              </div>
            </div>
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
