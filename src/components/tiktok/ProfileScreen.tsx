import { DEFAULT_AVATAR } from '@/constants/defaultAvatar';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User } from '@/types/database';
import { X, ArrowLeft, Heart, Crown, Sparkles, Share2, Phone, Radio, Images, Music } from 'lucide-react';
import { ImageViewer } from '@/components/ui/image-viewer';
import { ProfileVideoModal } from './ProfileVideoModal';
import { MediaCarouselPlayer } from './MediaCarouselPlayer';
import { useCreatorFollow } from '@/hooks/useCreatorFollow';
import { useModelSubscription, DEFAULT_BENEFITS } from '@/hooks/useModelSubscription';
import { useNavigate } from 'react-router-dom';
import { toBunnyStreamEmbedUrl } from '@/utils/bunnyStream';
import { ModelSubscriptionOverlay } from '@/components/tiktok/ModelSubscriptionOverlay';


interface ProfileScreenProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onVideoSelect?: (videoId: string) => void;
  onGoHome?: () => void;
  onOpenChat?: () => void;
  isChatActive?: boolean;
}

type ContentTab = 'public' | 'private';

interface ModelContent {
  id: string;
  title: string;
  thumbnail_url: string;
  video_url?: string;
  image_url?: string;
  type: 'video' | 'image' | 'carousel';
  images?: string[];
  audio_url?: string | null;
  likes_count: number;
  views_count: number;
  created_at: string;
  visibility?: 'public' | 'premium' | 'private';
}

interface ModelImage {
  id: string;
  url: string;
  title: string;
  likes_count: number;
  views_count: number;
  created_at: string;
}

export const ProfileScreen = ({ user, isOpen, onClose, onVideoSelect, onGoHome, onOpenChat, isChatActive = false }: ProfileScreenProps) => {
  const [contents, setContents] = useState<ModelContent[]>([]);
  const [publicContents, setPublicContents] = useState<ModelContent[]>([]);
  const [privateContents, setPrivateContents] = useState<ModelContent[]>([]);
  const [showSubscribeOverlay, setShowSubscribeOverlay] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentTab>('public');
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [viewerName, setViewerName] = useState('Você');
  const [panelUrl, setPanelUrl] = useState<string | null>(null);
  const [showMyContent, setShowMyContent] = useState(false);
  const [myContentImages, setMyContentImages] = useState<string[]>([]);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentImageArray, setCurrentImageArray] = useState<string[]>([]);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoModalIndex, setVideoModalIndex] = useState(0);
  const [carouselModalContent, setCarouselModalContent] = useState<ModelContent | null>(null);
  const [privateVideoOpen, setPrivateVideoOpen] = useState(false);
  const [privateVideoList, setPrivateVideoList] = useState<Array<{ url: string; title?: string; thumbnail?: string }>>([]);
  const [privateVideoIndex, setPrivateVideoIndex] = useState(0);
  const [isCreator, setIsCreator] = useState(false);
  const [isFollowingCreator, setIsFollowingCreator] = useState(false);
  const [hideSubscriptionSection, setHideSubscriptionSection] = useState(false);
  const [profileVideoCallActive, setProfileVideoCallActive] = useState(false);
  const [profileVideoCallUrl, setProfileVideoCallUrl] = useState('');
  const [profileLiveActive, setProfileLiveActive] = useState(false);
  const [profileLiveUrl, setProfileLiveUrl] = useState('');
  const [freshAvatar, setFreshAvatar] = useState<string | null>(null);
  
  const { followCreator, checkIfFollowing: checkCreatorFollow } = useCreatorFollow();
  const navigate = useNavigate();
  
  // Hook para assinaturas individuais da modelo
  const { 
    plans: modelPlans, 
    subscription: modelSubscription, 
    loading: loadingPlans,
    isPremium,
    getDaysRemaining 
  } = useModelSubscription(user.id);
  
  useEffect(() => {
    setFreshAvatar(null);
    if (isOpen && user.id) {
      Promise.all([
        loadModelContent(),
        checkFollowingStatus(),
        checkCreatorStatus(),
        loadServiceStatus()
      ]);
      // Fetch fresh avatar from DB
      (async () => {
        const { data: model } = await supabase
          .from('models')
          .select('avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        if (model?.avatar_url) {
          setFreshAvatar(model.avatar_url);
        } else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .maybeSingle();
          if (profile?.avatar_url) {
            setFreshAvatar(profile.avatar_url);
          }
        }
      })();
    }
  }, [isOpen, user.id]);

  // Verificar se é um criador de conteúdo
  const checkCreatorStatus = async () => {
    try {
      const { data } = await supabase
        .from('user_roles' as any)
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'creator')
        .maybeSingle();
      
      const isUserCreator = !!data;
      setIsCreator(isUserCreator);
      
      if (isUserCreator) {
        const following = await checkCreatorFollow(user.id);
        setIsFollowingCreator(following);
      }
    } catch {
      // Silently fail
    }
  };

  // Sync em tempo real das curtidas dentro do perfil (grid)
  useEffect(() => {
    if (!isOpen || !user?.id) return;

    const applyLikeDelta = (videoId: string, delta: number) => {
      if (!videoId || !delta) return;

      const patch = (items: ModelContent[]) =>
        items.map((item) =>
          item.id === videoId
            ? { ...item, likes_count: Math.max(0, (item.likes_count || 0) + delta) }
            : item
        );

      setContents((prev) => patch(prev));
      setPublicContents((prev) => patch(prev));
      setPrivateContents((prev) => patch(prev));
    };

    const likesChannel = supabase
      .channel(`profile-likes-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'likes' },
        (payload) => {
          const like = payload.new as any;
          if (!like?.video_id || like?.is_active === false) return;
          applyLikeDelta(like.video_id, 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'likes' },
        (payload) => {
          const newLike = payload.new as any;
          const oldLike = payload.old as any;
          const targetVideoId = newLike?.video_id || oldLike?.video_id;
          if (!targetVideoId) return;

          if (oldLike?.is_active === false && newLike?.is_active === true) {
            applyLikeDelta(targetVideoId, 1);
          } else if (oldLike?.is_active === true && newLike?.is_active === false) {
            applyLikeDelta(targetVideoId, -1);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'likes' },
        (payload) => {
          const oldLike = payload.old as any;
          if (!oldLike?.video_id || oldLike?.is_active === false) return;
          applyLikeDelta(oldLike.video_id, -1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
    };
  }, [isOpen, user?.id]);

  // Carregar status de Vídeo Chamada e Live do perfil
  const loadServiceStatus = async () => {
    try {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('video_call_active, video_call_url, live_active, live_url')
        .eq('id', user.id)
        .maybeSingle();
      
      if (data) {
        setProfileVideoCallActive(data.video_call_active || false);
        setProfileVideoCallUrl(data.video_call_url || '');
        setProfileLiveActive(data.live_active || false);
        setProfileLiveUrl(data.live_url || '');
      }
    } catch {
      // Silently fail
    }
  };

  // Verificar se o usuário já está seguindo a modelo
  const checkFollowingStatus = async () => {
    try {
      setIsFollowing(false);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      const currentUserId = authUser?.id || localStorage.getItem('anonymous_user_id');
      if (!currentUserId) return;

      // user.id é o ID da modelo/criador do perfil (prop)
      const modelId = user.id;
      const followKey = `follow_${currentUserId}_${modelId}`;
      const localFollow = localStorage.getItem(followKey);
      
      if (localFollow === 'true') {
        setIsFollowing(true);
        return;
      }

      const { data, error } = await supabase
        .from('model_followers')
        .select('is_active')
        .eq('user_id', currentUserId)
        .eq('model_id', modelId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) return;

      if (data) {
        setIsFollowing(true);
        localStorage.setItem(followKey, 'true');
      }
    } catch (error) {
      setIsFollowing(false);
    }
  };

  // Real-time sync do follow status
  useEffect(() => {
    if (!user?.id) return;

    const currentUserId = localStorage.getItem('anonymous_user_id');
    if (!currentUserId) return;

    const channel = supabase
      .channel(`follow-status-${user.id}-${currentUserId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'model_followers',
        filter: `model_id=eq.${user.id}`
      }, (payload) => {
        const newData = payload.new as any;
        if (newData?.user_id === currentUserId) {
          setIsFollowing(newData?.is_active ?? false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Load viewer name from localStorage (fallback to "Você")
  useEffect(() => {
    const name = localStorage.getItem('viewer_name');
    if (name) setViewerName(name);
  }, [isOpen]);

  const loadModelContent = async () => {
    setLoading(true);
    try {
      const cacheKey = `profile_${user.id}`;
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
      
      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 30000) {
          const cachedData = JSON.parse(cached);
          const cachedContents = Array.isArray(cachedData.contents) ? cachedData.contents : [];
          setContents(cachedContents);
          setPublicContents(cachedData.publicContents || cachedContents.filter((v: ModelContent) => v.visibility === 'public' || !v.visibility));
          setPrivateContents(cachedData.privateContents || cachedContents.filter((v: ModelContent) => v.visibility && v.visibility !== 'public'));
          setPanelUrl(cachedData.panelUrl);
          // mantém dados em tela, mas continua buscando do banco para atualizar likes em tempo real
        }
      }
      
      const { data: creatorRole } = await (supabase as any)
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'creator')
        .maybeSingle();

      const isUserCreator = !!creatorRole;
      
      // 2️⃣ Load model data and videos in parallel for faster performance
      const [modelDataResult, videosDataResult, imagesDataResult, carouselDataResult] = await Promise.all([
        (supabase as any)
          .from('models')
          .select('posting_panel_url, hide_subscription_button')
          .eq('id', user.id)
          .single(),
        
        // 3️⃣ Buscar vídeos com base no tipo de usuário (criador ou modelo)
        (async () => {
          let videosQuery = (supabase as any)
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
              model_id,
              creator_id,
              visibility
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(50);

          // Aceitar tanto creator_id quanto model_id (independente de RLS em user_roles)
          videosQuery = videosQuery.or(`creator_id.eq.${user.id},model_id.eq.${user.id}`);


          return await videosQuery;
        })(),
        
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
        }),

        (supabase as any)
          .from('posts_agendados')
          .select('id, titulo, descricao, conteudo_url, imagens, audio_url, tipo_conteudo, data_publicacao, created_at, status, modelo_id')
          .eq('modelo_id', user.id)
          .eq('status', 'publicado')
          .in('tipo_conteudo', ['carrossel', 'image'])
          .order('data_publicacao', { ascending: false })
          .limit(50)
      ]);

      const modelData = modelDataResult.data;
      const modelError = modelDataResult.error;
      const videosData = videosDataResult.data;
      const videosError = videosDataResult.error;
      const imagesData = (imagesDataResult as any).data;
      const carouselData = (carouselDataResult as any).data || [];
      const carouselError = (carouselDataResult as any).error;

      if (!modelError && modelData) {
        setPanelUrl(modelData?.posting_panel_url || null);
        setHideSubscriptionSection(modelData?.hide_subscription_button || false);
      }

      if (videosError) {
        console.warn('⚠️ Erro ao carregar vídeos do perfil:', videosError);
      }

      if (carouselError) {
        console.warn('⚠️ Erro ao carregar carrosséis do perfil:', carouselError);
      }

      // Buscar likes reais por vídeo (fonte da verdade), para não depender de likes_count defasado
      const videoIds = (videosData || []).map((item: any) => item.id).filter(Boolean);
      const likesMap: Record<string, number> = {};

      if (videoIds.length > 0) {
        const { data: likesData } = await supabase
          .from('likes')
          .select('video_id')
          .in('video_id', videoIds)
          .eq('is_active', true);

        likesData?.forEach((like: any) => {
          if (!like.video_id) return;
          likesMap[like.video_id] = (likesMap[like.video_id] || 0) + 1;
        });
      }

      const isNonVideoMediaUrl = (url?: string) => /\.(jpg|jpeg|png|gif|webp|avif|mp3|wav|m4a|aac|ogg)(\?.*)?$/i.test(String(url || ''));

      // Transformar apenas vídeos reais da tabela videos para o formato de conteúdo
      const transformedVideos = (videosData || [])
        .filter((item: any) => Boolean(item.video_url) && !isNonVideoMediaUrl(item.video_url))
        .map(item => ({
        id: item.id,
        title: item.title || `Vídeo ${item.id?.slice(0, 8)}`,
        thumbnail_url: item.thumbnail_url || item.video_url || '/placeholder.svg',
        video_url: item.video_url,
        type: 'video' as const,
        likes_count: likesMap[item.id] ?? item.likes_count ?? 0,
        views_count: item.views_count || 0,
        created_at: item.created_at,
        visibility: (item.visibility || 'public') as 'public' | 'premium' | 'private'
      }));

      // Buscar imagens específicas da modelo (usando localStorage como cache temporário)
      const modelImages = getModelImages(user.id);
      
      // Transformar imagens para o formato de conteúdo (imagens são sempre públicas)
      const transformedImages = modelImages.map((image, index) => ({
        id: `image-${user.id}-${index}`,
        title: `Foto ${index + 1}`,
        thumbnail_url: image.url,
        image_url: image.url,
        type: 'image' as const,
        likes_count: Math.floor(Math.random() * 100),
        views_count: Math.floor(Math.random() * 1000),
        created_at: new Date().toISOString(),
        visibility: 'public' as const
      }));

      const transformedCarousels = (carouselData || [])
        .map((post: any) => {
          const images = Array.isArray(post.imagens)
            ? post.imagens.map((url: string) => String(url || '').trim()).filter(Boolean)
            : [];

          if (images.length === 0 && post.conteudo_url) {
            images.push(post.conteudo_url);
          }

          if (images.length === 0) return null;

          return {
            id: `carousel-${post.id}`,
            title: post.titulo || 'Carrossel',
            thumbnail_url: images[0],
            image_url: images[0],
            images,
            audio_url: post.audio_url || null,
            type: 'carousel' as const,
            likes_count: 0,
            views_count: 0,
            created_at: post.data_publicacao || post.created_at,
            visibility: 'public' as const,
          };
        })
        .filter(Boolean) as ModelContent[];

      // Combinar vídeos e imagens
      const allContent = [...transformedCarousels, ...transformedImages, ...transformedVideos].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Separar por visibilidade (qualquer não-pública é tratada como privada)
      const publicVideos = allContent.filter(v => v.visibility === 'public' || !v.visibility);
      const privateVideos = allContent.filter(v => v.visibility && v.visibility !== 'public');

      setContents(allContent);
      setPublicContents(publicVideos);
      setPrivateContents(privateVideos);
      
      // Cache the results for faster subsequent loads
      sessionStorage.setItem(cacheKey, JSON.stringify({
        contents: allContent,
        publicContents: publicVideos,
        privateContents: privateVideos,
        panelUrl: modelData?.posting_panel_url || null
      }));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
    } catch (error) {
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
    } catch {
      // Silently fail
    }
    return [];
  };

  // Função para carregar imagens do painel de postagem
  const loadMyContentImages = async () => {
    try {
      const { data: mainPostsData, error: mainError } = await supabase
        .from('posts_principais')
        .select('*')
        .eq('modelo_id', user.id)
        .order('created_at', { ascending: false });

      const { data: scheduledPostsData, error: scheduledError } = await supabase
        .from('posts_agendados')
        .select('*')
        .eq('modelo_id', user.id)
        .order('created_at', { ascending: false });

      if (mainError || scheduledError) return;

      const allPosts = [
        ...(mainPostsData || []),
        ...(scheduledPostsData || [])
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const allImages: string[] = [];
      allPosts.forEach(post => {
        if ('imagens' in post && post.imagens && Array.isArray(post.imagens)) {
          allImages.push(...post.imagens);
        } else if ('conteudo_url' in post && post.conteudo_url) {
          allImages.push(post.conteudo_url);
        }
        
        if ('tipo_conteudo' in post && post.tipo_conteudo === 'imagem' && post.conteudo_url) {
          if (!allImages.includes(post.conteudo_url)) {
            allImages.push(post.conteudo_url);
          }
        }
      });

      setMyContentImages(allImages);
    } catch {
      // Silently fail
    }
  };

  const followModel = async () => {
    if (isFollowing) return;

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      let userId = authUser?.id || localStorage.getItem('anonymous_user_id');
      
      if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem('anonymous_user_id', userId);
      }

      setIsFollowing(true);

      const followKey = `follow_${userId}_${user.id}`;
      localStorage.setItem(followKey, 'true');

      await supabase
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
      
      toast.success(`Seguindo @${user.username}`);
      
    } catch {
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
        {/* Header com Gradiente */}
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/60 backdrop-blur-sm sticky top-0 z-10">
          <button
            onClick={onClose}
            className="text-white text-xl w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-white text-lg font-semibold drop-shadow-md">@{user.username}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Gerar URL amigável usando username
                const formattedName = (user.username || '')
                  .toLowerCase()
                  .replace(/\s+/g, '-')
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '');
                const shareUrl = `${window.location.origin}/${formattedName}`;
                
                // Tentar usar Web Share API (mobile)
                if (navigator.share) {
                  navigator.share({
                    title: `@${user.username} no Coconudi`,
                    text: `Confira o perfil de @${user.username} no Coconudi! 🔥`,
                    url: shareUrl
                  }).catch(() => {
                    // Fallback: copiar para clipboard
                    navigator.clipboard.writeText(shareUrl);
                    toast.success('Link copiado!', { description: shareUrl });
                  });
                } else {
                  // Desktop: copiar para clipboard
                  navigator.clipboard.writeText(shareUrl);
                  toast.success('Link copiado!', { description: shareUrl });
                }
              }}
              className="text-white text-xl w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
              title="Compartilhar perfil"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="text-white text-xl w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Profile Content */}
        <div className="flex-1 overflow-y-auto bg-black">
          <div className="mx-auto w-full max-w-2xl">
            
            {/* Avatar Centralizado */}
            <div className="flex flex-col items-center pt-8 pb-4">
            <div className="w-24 h-24 rounded-full border-4 border-white shadow-2xl overflow-hidden">
                <img
                  src={freshAvatar || user.avatar_url || DEFAULT_AVATAR}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                />
              </div>
            </div>

            {/* Nome e Seguidores Centralizados */}
            <div className="text-center pb-4 px-4">
              <h3 className="text-white text-xl font-bold mb-1">@{user.username}</h3>
              <p className="text-white/60 text-sm">
                {(user.followers_count || 0).toLocaleString()} seguidores
              </p>
              {user.is_online && (
                <div className="inline-flex items-center gap-1 bg-gradient-to-r from-red-500 to-pink-500 px-3 py-1 rounded-full text-xs font-medium mt-2">
                  🔴 AO VIVO
                </div>
              )}
            </div>

            {/* Descrição em Card */}
              <div className="px-4 pb-4">
                <div className="bg-white/10 border border-white/20 rounded-lg p-4 backdrop-blur-sm">
                  <h4 className="text-center text-white/60 text-xs uppercase mb-2 font-semibold">Descrição</h4>
                  <p className="text-white text-sm text-center leading-relaxed">
                    {user.bio || "Sem descrição disponível"}
                  </p>
                </div>
              </div>

            {/* Seção de Assinatura Individual - Apenas para Criadoras de Conteúdo */}
            {isCreator && !hideSubscriptionSection && (loadingPlans || modelSubscription || modelPlans.length > 0) && (
            <div className="px-4 pb-6" data-subscription-section>
              {/* Status de assinatura da modelo */}
              {modelSubscription ? (
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-600/20 border border-green-500/50 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-center gap-2 text-green-400 font-semibold">
                    <Sparkles className="w-5 h-5" />
                    <span>Assinante de @{user.username}</span>
                  </div>
                  <p className="text-center text-green-400/70 text-xs mt-1">
                    {getDaysRemaining()} dias restantes
                  </p>
                </div>
              ) : (
                <>
                  {/* Badge de Promoção */}
                  <div className="flex justify-center mb-4">
                    <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold px-5 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                      <Crown className="w-3 h-3" /> ASSINE AGORA <Crown className="w-3 h-3" />
                    </span>
                  </div>
                  
                  {/* Planos Dinâmicos */}
                  <div className="space-y-3">
                    {loadingPlans ? (
                      <div className="flex justify-center py-4">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    ) : (
                      modelPlans.map((plan, index) => {
                        return (
                          <button
                            key={plan.id}
                            onClick={() => {
                              const params = new URLSearchParams();
                              params.set('model', user.id);
                              params.set('plan', plan.plan_type);
                              params.set('type', plan.model_type);
                              params.set('name', user.username || '');
                              navigate(`/checkout?${params.toString()}`);
                            }}
                            className="w-full relative overflow-hidden rounded-xl py-3.5 px-4 transition-all hover:scale-[1.02] active:scale-95 shadow-lg bg-gradient-to-r from-purple-500/40 to-purple-600/40 border-2 border-purple-400"
                          >
                            {/* Efeito de brilho deslizante */}
                            <div 
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer pointer-events-none" 
                              style={{ backgroundSize: '200% 100%' }} 
                            />
                            <div className="flex items-center justify-between relative z-10">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-500">
                                  <Crown className="w-4 h-4 text-white" />
                                </div>
                                <div className="text-left">
                                  <p className="text-white font-semibold capitalize">{plan.plan_type}</p>
                                  {plan.discount_label && (
                                    <span className="text-xs text-green-400">{plan.discount_label}</span>
                                  )}
                                </div>
                              </div>
                              <span className="text-lg font-bold text-white">
                                R$ {plan.price.toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Lista de Benefícios */}
                  <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-xs text-amber-400 font-semibold mb-2">✨ Benefícios incluídos:</p>
                    <ul className="space-y-1.5">
                      {(modelPlans[0]?.benefits || DEFAULT_BENEFITS).map((benefit, index) => (
                        <li key={index} className="flex items-center gap-2 text-xs text-white/80">
                          <span className="text-green-400">✓</span> {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
            )}


            {/* Botão de Seguir */}
            <div className="px-4 pb-4">
              {isCreator ? (
                <button
                  onClick={async () => {
                    const { data: creatorProfile } = await supabase
                      .from('profiles')
                      .select('email, name')
                      .eq('id', user.id)
                      .single();
                    
                    const success = await followCreator({
                      creatorId: user.id,
                      creatorName: user.username,
                      creatorEmail: creatorProfile?.email || user.username
                    });
                    if (success !== undefined) {
                      setIsFollowingCreator(success);
                    }
                  }}
                  className={`w-full px-6 py-3 rounded-full font-semibold transition-all ${
                    isFollowingCreator 
                      ? 'bg-gray-700 text-white' 
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                  }`}
                >
                  {isFollowingCreator ? '✓ Seguindo Criador' : '✨ Seguir Criador'}
                </button>
              ) : (
                <button
                  onClick={followModel}
                  disabled={isFollowing}
                  className={`w-full px-6 py-3 rounded-full font-semibold transition-all ${
                    isFollowing 
                      ? 'bg-gray-700 text-white cursor-not-allowed' 
                      : 'bg-gradient-to-r from-pink-500 to-red-500 text-white hover:from-pink-600 hover:to-red-600'
                  }`}
                >
                  {isFollowing ? '✓ Seguindo' : '❤️ Seguir'}
                </button>
              )}
            </div>

            {/* Botão Vídeo Chamada */}
            <div className="px-4 pb-2">
              <button
                onClick={async () => {
                  // Primeiro checar no perfil do criador
                  if (profileVideoCallActive && profileVideoCallUrl) {
                    window.open(profileVideoCallUrl, '_blank');
                    return;
                  }
                  // Fallback: checar na tabela video_call_models (admin)
                  try {
                    const { data, error } = await (supabase as any)
                      .from('video_call_models')
                      .select('id, redirect_url')
                      .eq('is_active', true)
                      .eq('selected_model_id', user.id)
                      .maybeSingle();
                    
                    if (!error && data && data.redirect_url) {
                      window.open(data.redirect_url, '_blank');
                    } else {
                      toast.info('📹 Esta modelo ainda não tem vídeo chamada disponível.');
                    }
                  } catch {
                    toast.info('📹 Esta modelo ainda não tem vídeo chamada disponível.');
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
              >
                <span className="relative inline-flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
                  <Phone className="w-5 h-5" />
                </span>
                📹 Vídeo Chamada
              </button>
            </div>

            {/* Botão Live */}
            <div className="px-4 pb-4">
              <button
                onClick={() => {
                  if (profileLiveActive && profileLiveUrl) {
                    window.open(profileLiveUrl, '_blank');
                  } else {
                    toast.info('🔴 Esta modelo não está com Live no momento.');
                  }
                }}
                className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold transition-all shadow-lg ${
                  profileLiveActive 
                    ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700' 
                    : 'bg-gray-700 text-white/60'
                }`}
              >
                <span className="relative inline-flex items-center justify-center">
                  {profileLiveActive && (
                    <span className="absolute inset-0 rounded-full bg-red-400/30 animate-ping" />
                  )}
                  <Radio className={`w-5 h-5 ${profileLiveActive ? 'text-white' : 'text-white/60'}`} />
                </span>
                🔴 Live {profileLiveActive && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full ml-1">AO VIVO</span>}
              </button>
            </div>

            {/* Links do Painel removidos - não exibir para usuários finais */}

            {/* Seção Meus Conteúdos */}
            {panelUrl && (
              <div className="px-4 pb-4">
                <button
                  onClick={() => {
                    setShowMyContent(!showMyContent);
                    if (!showMyContent) {
                      loadMyContentImages();
                    }
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 text-xs bg-gradient-to-r from-pink-500 to-red-500 px-3 py-2 rounded-full text-white hover:from-pink-600 hover:to-red-600 transition-colors shadow-lg"
                >
                  <Heart className="w-3 h-3" />
                  Meus Conteúdos
                </button>

                {showMyContent && (
                  <div className="mt-4 p-3 border-t border-white/10">
                    <h4 className="text-white font-semibold mb-3 text-base flex items-center gap-2">
                      <Heart className="w-4 h-4 text-pink-500" />
                      Meus Conteúdos ({myContentImages.length})
                    </h4>
                    
                    {myContentImages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-white/60">
                        <div className="text-3xl mb-2">💖</div>
                        <p className="text-sm">Nenhum conteúdo privado disponível</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1">
                        {myContentImages.map((imageUrl, index) => (
                          <div 
                            key={index}
                            className="relative bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform active:scale-95 shadow-lg aspect-square border border-white/20"
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
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                            <div className="absolute top-2 right-2 bg-pink-500/80 rounded-full p-1">
                              <Heart className="w-3 h-3 text-white fill-white" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sistema de Abas de Conteúdo */}
            <div className="px-4 pb-6">
              <div className="flex gap-1 mb-4 bg-white/5 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('public')}
                  className={`flex-1 py-2.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'public'
                      ? 'bg-white/20 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  🌐 Público ({publicContents.length})
                </button>
                <button
                  onClick={() => setActiveTab('private')}
                  className={`flex-1 py-2.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'private'
                      ? 'bg-purple-500/30 text-purple-400'
                      : 'text-white/60 hover:text-purple-400 hover:bg-purple-500/10'
                  }`}
                >
                  🔒 Privado ({privateContents.length})
                </button>
              </div>

              <p className="text-center text-white/50 text-xs mb-4">
                {activeTab === 'public' && 'Conteúdo disponível para todos'}
                {activeTab === 'private' && `Apenas para assinantes de @${user.username}`}
              </p>

              {(() => {
                const currentContents = activeTab === 'public' ? publicContents : privateContents;

                if (currentContents.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-8 text-white/60">
                      <div className="text-3xl mb-2">
                        {activeTab === 'public' ? '📱' : '🔒'}
                      </div>
                      <p className="text-sm">Nenhum conteúdo {activeTab === 'public' ? 'público' : 'privado'}</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-3 gap-1">
                    {currentContents.map((content) => {
                      const isPrivate = activeTab === 'private';
                      const isLocked = isPrivate && !isPremium;
                      const bunnyEmbedUrl = toBunnyStreamEmbedUrl(content.video_url, {
                        autoplay: false,
                        muted: true,
                        loop: true,
                        preload: false,
                        responsive: true,
                        compactControls: true,
                      });

                      return (
                        <div
                          key={content.id}
                          className={`relative bg-gray-900 aspect-square overflow-hidden cursor-pointer hover:scale-105 transition-transform active:scale-95 shadow-lg border border-white/20`}
                          onClick={() => {
                            if (isLocked) {
                              setShowSubscribeOverlay(true);
                              return;
                            }
                            if (content.type === 'video') {
                              // Abre popup com swipe esquerda/direita entre vídeos do perfil
                              const videoContents = currentContents.filter(c => c.type === 'video');
                              const idx = videoContents.findIndex(c => c.id === content.id);
                              setVideoModalIndex(idx >= 0 ? idx : 0);
                              setVideoModalOpen(true);
                            } else if (content.type === 'carousel') {
                              setCarouselModalContent(content);
                            } else {
                              const imageContents = currentContents.filter(c => c.type === 'image');
                              const imageUrls = imageContents.map(c => c.image_url || c.thumbnail_url);
                              const currentImageIdx = imageContents.findIndex(c => c.id === content.id);
                              setCurrentImageArray(imageUrls);
                              setCurrentImageIndex(currentImageIdx);
                              setImageViewerOpen(true);
                            }
                          }}
                        >
                          {content.type === 'video' ? (
                            <>
                              {bunnyEmbedUrl ? (
                                <iframe
                                  src={bunnyEmbedUrl}
                                  title={content.title}
                                  loading="lazy"
                                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                                  className={`w-full h-full border-0 pointer-events-none bg-black ${isLocked ? 'blur-2xl opacity-30' : ''}`}
                                />
                              ) : (
                                <video
                                  src={content.video_url}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  aria-label={content.title}
                                  className={`w-full h-full object-cover bg-black ${isLocked ? 'blur-2xl opacity-30' : ''}`}
                                />
                              )}
                              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <div className="bg-black/40 rounded-full p-2">
                                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                  </svg>
                                </div>
                              </div>
                            </>
                          ) : content.type === 'carousel' ? (
                            <div className="relative w-full h-full">
                              <img
                                src={content.thumbnail_url}
                                alt={content.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder.svg';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="bg-purple-600/85 rounded-full p-2 shadow-lg">
                                  <Images className="w-5 h-5 text-white" />
                                </div>
                              </div>
                              {content.audio_url && (
                                <div className="absolute top-2 left-2 bg-black/70 rounded-full p-1">
                                  <Music className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>
                          ) : (
                            <img
                              src={content.image_url || content.thumbnail_url}
                              alt={content.title}
                              className={`w-full h-full object-cover ${isLocked ? 'blur-lg' : ''}`}
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder.svg';
                              }}
                            />
                          )}

                          {isLocked && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                              <span className="text-2xl mb-1">🔒</span>
                              <span className="text-white/80 text-[10px] font-semibold">PRIVADO</span>
                            </div>
                          )}

                          {!isLocked && (
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          )}

                          {isPrivate && (
                            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-500/90 text-white">
                              🔒
                            </div>
                          )}


                          
                          {/* Label FOTO/VIDEO */}
                          {!isLocked && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center">
                              <div className="bg-black/70 backdrop-blur-sm rounded px-2 py-1">
                                <span className="text-white text-[10px] font-bold uppercase block">
                                  {content.type === 'video' ? 'VIDEO' : content.type === 'carousel' ? 'CARROSSEL' : 'FOTO'}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Stats overlay */}
                          {!isLocked && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 rounded-full px-2 py-0.5">
                              <span className="text-red-400">❤️</span>
                              <span className="text-white text-[9px] font-medium">
                                {content.likes_count > 1000 ? `${(content.likes_count/1000).toFixed(1)}k` : content.likes_count}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Seção de Mais Informações */}
            <div className="px-4 pb-6 border-t border-white/10 pt-6">
              {/* Chat Button - só aparece se chat ativo no painel */}
              {isChatActive && (
                <div className="flex justify-center mb-4">
                  <button 
                    onClick={() => {
                      console.log('Chat button clicked');
                      if (onOpenChat) {
                        onOpenChat();
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-full text-sm hover:from-green-600 hover:to-emerald-700 transition-all font-semibold shadow-lg"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    💬 Conversar
                  </button>
                </div>
              )}


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

      {/* Image Viewer */}
      <ImageViewer
        images={currentImageArray}
        currentIndex={currentImageIndex}
        isOpen={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        onIndexChange={setCurrentImageIndex}
      />

      {showSubscribeOverlay && (
        <ModelSubscriptionOverlay
          modelName={user.username || 'Criador'}
          modelAvatar={freshAvatar || user.avatar_url}
          plans={modelPlans}
          onClose={() => setShowSubscribeOverlay(false)}
        />
      )}

      {/* Popup de carrossel do perfil */}
      {carouselModalContent && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center">
          <button
            onClick={() => setCarouselModalContent(null)}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center"
            aria-label="Fechar carrossel"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="w-full max-w-md h-full max-h-screen aspect-[9/16] bg-black">
            <MediaCarouselPlayer
              images={carouselModalContent.images || [carouselModalContent.image_url || carouselModalContent.thumbnail_url].filter(Boolean)}
              audioUrl={carouselModalContent.audio_url}
              isPlaying={true}
              isMuted={false}
              volume={0.9}
              objectFit="contain"
            />
          </div>
        </div>
      )}

      {/* Popup de vídeos do perfil com swipe esquerda/direita */}
      <ProfileVideoModal
        videos={(activeTab === 'private' ? privateContents : publicContents)
          .filter(c => c.type === 'video')
          .map(c => ({ id: c.id, video_url: c.video_url, title: c.title }))}
        initialIndex={videoModalIndex}
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
      />

      {/* Private Video Popup - permanece dentro do perfil */}
      {privateVideoOpen && privateVideoList[privateVideoIndex] && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
          onClick={() => setPrivateVideoOpen(false)}
        >
          <button
            className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white"
            onClick={(e) => { e.stopPropagation(); setPrivateVideoOpen(false); }}
            aria-label="Fechar"
          >
            ✕
          </button>
          <div
            className="relative w-full h-full max-w-md mx-auto flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {toBunnyStreamEmbedUrl(privateVideoList[privateVideoIndex].url, {
              autoplay: true,
              muted: false,
              loop: true,
              preload: true,
              responsive: true,
            }) ? (
              <iframe
                key={privateVideoList[privateVideoIndex].url}
                src={toBunnyStreamEmbedUrl(privateVideoList[privateVideoIndex].url, {
                  autoplay: true,
                  muted: false,
                  loop: true,
                  preload: true,
                  responsive: true,
                }) || ''}
                title="Vídeo privado"
                loading="eager"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                className="w-full h-full border-0"
              />
            ) : (
              <video
                key={privateVideoList[privateVideoIndex].url}
                src={privateVideoList[privateVideoIndex].url}
                poster={privateVideoList[privateVideoIndex].thumbnail}
                className="w-full h-full object-contain"
                controls
                autoPlay
                playsInline
                preload="auto"
              />
            )}
            {privateVideoList.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white text-2xl"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPrivateVideoIndex((i) => (i - 1 + privateVideoList.length) % privateVideoList.length);
                  }}
                  aria-label="Anterior"
                >
                  ‹
                </button>
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white text-2xl"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPrivateVideoIndex((i) => (i + 1) % privateVideoList.length);
                  }}
                  aria-label="Próximo"
                >
                  ›
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-xs bg-black/50 px-3 py-1 rounded-full">
                  {privateVideoIndex + 1} / {privateVideoList.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
