
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
  onOpenChat?: () => void;
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

export const ProfileScreen = ({ user, isOpen, onClose, onVideoSelect, onGoHome, onOpenChat }: ProfileScreenProps) => {
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
      // Load in parallel for faster initial render
      Promise.all([
        loadModelContent(),
        checkFollowingStatus()
      ]);
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
      
      // Check cache first for faster loading
      const cacheKey = `profile_${user.id}`;
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
      
      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 30000) { // Cache valid for 30 seconds
          const cachedData = JSON.parse(cached);
          console.log('✅ Conteúdo carregado do cache');
          setContents(cachedData.contents);
          setPanelUrl(cachedData.panelUrl);
          setLoading(false);
          return;
        }
      }
      
      // Load model data and videos in parallel for faster performance
      const [modelDataResult, videosDataResult, imagesDataResult] = await Promise.all([
        supabase
          .from('models')
          .select('posting_panel_url')
          .eq('id', user.id)
          .single(),
        
        supabase
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
          .order('created_at', { ascending: false })
          .limit(5),
        
        new Promise((resolve) => {
          const modelImages = getModelImages(user.id);
          resolve({ data: modelImages.map(img => ({
            id: img,
            image_url: img,
            title: 'Foto',
            likes_count: 0,
            views_count: 0,
            created_at: new Date().toISOString(),
            is_active: true
          }))});
        })
      ]);

      const modelData = modelDataResult.data;
      const modelError = modelDataResult.error;
      const videosData = videosDataResult.data;
      const videosError = videosDataResult.error;
      const imagesData = (imagesDataResult as any).data;

      if (modelError) {
        console.warn('Erro ao carregar dados do modelo:', modelError);
      } else {
        setPanelUrl(modelData?.posting_panel_url || null);
      }

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
      
      // Cache the results for faster subsequent loads
      sessionStorage.setItem(cacheKey, JSON.stringify({
        contents: allContent,
        panelUrl: modelData?.posting_panel_url || null
      }));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
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

      // Salvar no localStorage para persistência
      const followKey = `follow_${userId}_${user.id}`;
      localStorage.setItem(followKey, 'true');

      // Inserir diretamente na tabela model_followers
      const { error } = await supabase
        .from('model_followers')
        .upsert({
          user_id: userId,
          model_id: user.id,
          user_name: 'Usuário',
          user_email: 'usuario@app.com',
          is_active: true
        }, {
          onConflict: 'user_id,model_id'
        });

      if (error) {
        console.warn('⚠️ Erro ao salvar no banco (mas mantendo estado local):', error);
      } else {
        console.log('✅ PROFILE SEGUIR: Seguindo modelo com sucesso!');
      }
      
      toast.success(`Seguindo @${user.username}`);
      
    } catch (error) {
      console.error('❌ PROFILE SEGUIR: Erro:', error);
      // Manter o estado como seguindo (já salvou no localStorage)
      toast.success(`Seguindo @${user.username}`);
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
          <div className="mx-auto w-full max-w-4xl px-3 lg:px-6">
          {/* Profile Header */}
          <div className="p-6 text-white border-b border-white/10 max-w-2xl mx-auto">
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
          <div className="p-3 max-w-4xl mx-auto">
            <h4 className="text-white font-semibold mb-3 text-base">
              Postagens ({contents.length})
            </h4>
            
            {contents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-white/60">
                <div className="text-3xl mb-2">📱</div>
                <p className="text-sm">Nenhum conteúdo disponível</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-w-2xl mx-auto">
                {contents.map((content) => (
                  <div 
                    key={content.id} 
                    className={`relative bg-black rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform active:scale-95 shadow-lg ${
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
                            loop
                            playsInline
                            autoPlay
                            preload="metadata"
                            poster={content.thumbnail_url}
                            onError={(e) => {
                              // Fallback para thumbnail se o vídeo falhar
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                parent.innerHTML = `<img src="${content.thumbnail_url}" alt="${content.title}" class="w-full h-full object-cover" />`;
                              }
                            }}
                          />
                          {/* Ícone de play apenas como indicativo */}
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="bg-black/40 rounded-full p-3">
                              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
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
            <div className="mt-6 border-t border-white/10 pt-6 max-w-2xl mx-auto">
              <h3 className="text-white text-sm font-semibold mb-4">Mais informações</h3>
              
              {/* Chat Button */}
              <div className="flex justify-center mb-6">
                <button 
                  onClick={() => {
                    console.log('Chat button clicked');
                    if (onOpenChat) {
                      onOpenChat();
                    }
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-full text-sm hover:from-green-600 hover:to-emerald-700 transition-all animate-pulse font-semibold shadow-lg"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  Conversar
                </button>
              </div>

              {/* Seção de Assinatura */}
              <div className="bg-muted/5 border border-white/10 rounded-xl p-4 mb-4">
                <h4 className="text-white/60 text-xs uppercase font-semibold mb-3">ASSINATURA</h4>
                
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#00D5FF] font-bold text-sm">JÁ SOU ASSINANTE</span>
                  <span className="text-[#00D5FF] font-bold text-sm">$4.50 por 31 dias</span>
                </div>

                <div className="flex items-center justify-between text-white/60 text-xs">
                  <span>Renove por $15 /mês</span>
                  <span>dez 1, 2025</span>
                </div>
              </div>

              {/* Pacotes de Assinatura */}
              <div className="bg-muted/5 border border-white/10 rounded-xl p-4">
                <button 
                  className="w-full flex items-center justify-between text-white/60 text-xs uppercase font-semibold mb-3"
                  onClick={() => {/* Toggle accordion */}}
                >
                  PACOTES DE ASSINATURA
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <div className="space-y-2">
                  <button className="w-full bg-[#00D5FF] hover:bg-[#00B8E0] text-black font-bold py-3 px-4 rounded-full flex items-center justify-between transition-colors">
                    <span>3 MESES (15off)</span>
                    <span>$38.25 total</span>
                  </button>

                  <button className="w-full bg-[#00D5FF]/80 hover:bg-[#00D5FF] text-black font-bold py-3 px-4 rounded-full flex items-center justify-between transition-colors">
                    <span>6 MESES (20off)</span>
                    <span>$72.00 total</span>
                  </button>

                  <button className="w-full bg-[#00D5FF]/60 hover:bg-[#00D5FF] text-black font-bold py-3 px-4 rounded-full flex items-center justify-between transition-colors">
                    <span>12 MESES (25off)</span>
                    <span>$135.00 total</span>
                  </button>
                </div>
              </div>

              {/* Footer Links */}
              <div className="flex items-center justify-center gap-3 mt-4 text-white/40 text-xs">
                <a href="#" className="hover:text-white/60 transition-colors">Privacy</a>
                <span>•</span>
                <a href="#" className="hover:text-white/60 transition-colors">Cookie Notice</a>
                <span>•</span>
                <a href="#" className="hover:text-white/60 transition-colors">Terms of Service</a>
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
