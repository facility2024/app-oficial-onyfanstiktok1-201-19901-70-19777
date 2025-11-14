
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

            {/* Informações Detalhadas da Modelo */}
            <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-white/50 text-xs mb-1">Local</p>
                  <p className="text-white font-medium">São Paulo, Brasil</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs mb-1">Idade</p>
                  <p className="text-white font-medium">23 anos</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs mb-1">Altura</p>
                  <p className="text-white font-medium">1,68m</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs mb-1">Signo</p>
                  <p className="text-white font-medium">Escorpião ♏</p>
                </div>
              </div>
              
              <div className="pt-3 border-t border-white/10">
                <p className="text-white/50 text-xs mb-2">Sobre mim</p>
                <p className="text-white/90 text-sm leading-relaxed">
                  Criadora de conteúdo exclusivo. Aqui você encontra o melhor conteúdo especial para você! 💕✨
                </p>
              </div>

              <div className="pt-3 border-t border-white/10">
                <p className="text-white/50 text-xs mb-2">Interesses</p>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-white/10 text-white px-3 py-1 rounded-full text-xs">Fitness 💪</span>
                  <span className="bg-white/10 text-white px-3 py-1 rounded-full text-xs">Moda 👗</span>
                  <span className="bg-white/10 text-white px-3 py-1 rounded-full text-xs">Viagens ✈️</span>
                  <span className="bg-white/10 text-white px-3 py-1 rounded-full text-xs">Fotografia 📸</span>
                </div>
              </div>
            </div>

            {/* Links Sociais */}
            <div className="mt-4">
              <h3 className="text-[#00D5FF] text-base font-semibold mb-3">Redes Sociais</h3>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <a 
                  href={`https://tiktok.com/@${user.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white/10 text-white px-4 py-2.5 rounded-full text-sm hover:bg-white/20 transition-colors border border-white/20"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                  </svg>
                  TikTok
                </a>
                
                <a 
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white/10 text-white px-4 py-2.5 rounded-full text-sm hover:bg-white/20 transition-colors border border-white/20"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121L7.531 13.92l-2.967-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                  </svg>
                  Telegram
                </a>
                
                <a 
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white/10 text-white px-4 py-2.5 rounded-full text-sm hover:bg-white/20 transition-colors border border-white/20"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
                  </svg>
                  Facebook
                </a>

                <a 
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white/10 text-white px-4 py-2.5 rounded-full text-sm hover:bg-white/20 transition-colors border border-white/20"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  Instagram
                </a>
              </div>
            </div>

            {/* Seção de Assinatura */}
            <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-5">
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
            <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-white/50 text-xs uppercase font-semibold tracking-wide">PACOTES DE ASSINATURA</h4>
                <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              <div className="space-y-3">
                <button className="w-full bg-[#00D5FF] hover:bg-[#00C2E8] text-black font-bold py-3.5 px-5 rounded-full flex items-center justify-between transition-all shadow-lg shadow-[#00D5FF]/20">
                  <span className="text-sm">3 MESES (15% off)</span>
                  <span className="text-sm">$38.25 total</span>
                </button>

                <button className="w-full bg-white/10 hover:bg-white/15 text-white font-semibold py-3.5 px-5 rounded-full flex items-center justify-between transition-all border border-white/20">
                  <span className="text-sm">6 MESES (20% off)</span>
                  <span className="text-sm">$72.00 total</span>
                </button>

                <button className="w-full bg-white/10 hover:bg-white/15 text-white font-semibold py-3.5 px-5 rounded-full flex items-center justify-between transition-all border border-white/20">
                  <span className="text-sm">12 MESES (25% off)</span>
                  <span className="text-sm">$135.00 total</span>
                </button>
              </div>
            </div>

            {/* Footer Links */}
            <div className="flex items-center justify-center gap-3 mt-4 text-white/30 text-xs">
              <a href="#" className="hover:text-white/50 transition-colors">Privacy</a>
              <span>•</span>
              <a href="#" className="hover:text-white/50 transition-colors">Cookie Notice</a>
              <span>•</span>
              <a href="#" className="hover:text-white/50 transition-colors">Terms of Service</a>
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
