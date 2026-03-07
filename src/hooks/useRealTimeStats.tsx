import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { detectLocation } from '@/utils/geolocation';
interface DeviceStats {
  desktop: number;
  mobile: number;
}

interface RealTimeStats {
  totalContent: number;
  totalLikes: number;
  totalComments: number;
  viewsToday: number;
  totalShares: number;
  totalFollowers: number;
  activeUsers: number;
  onlineUsersByState: { [state: string]: number };
  deviceStatsByState: { [state: string]: DeviceStats };
  totalDeviceStats: DeviceStats;
  totalOnlineUsers: number;
  totalViews: number;
  activeViews: number;
}

export const useRealTimeStats = () => {
  const [stats, setStats] = useState<RealTimeStats>({
    totalContent: 0,
    totalLikes: 0,
    totalComments: 0,
    viewsToday: 0,
    totalShares: 0,
    totalFollowers: 0,
    activeUsers: 0,
    onlineUsersByState: {},
    deviceStatsByState: {},
    totalDeviceStats: { desktop: 0, mobile: 0 },
    totalOnlineUsers: 0,
    totalViews: 0,
    activeViews: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  
  // Refs para controlar intervalos e evitar duplicações
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);
  const isFetching = useRef(false);
  const lastFetchTime = useRef(0);

  const ONLINE_WINDOW_MS = 2 * 60 * 1000;

  const fetchRealTimeStats = async () => {
    // Evitar múltiplas chamadas simultâneas
    const now = Date.now();
    if (isFetching.current || (now - lastFetchTime.current) < 5000) {
      return;
    }
    
    isFetching.current = true;
    lastFetchTime.current = now;
    
    try {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const twoMinutesAgo = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();

      // Usar Promise.all para executar queries em paralelo
      const [
        contentResult,
        likesResult,
        commentsResult,
        viewsTodayResult,
        totalViewsResult,
        sharesResult,
        followersResult,
        activeUsersResult,
        onlineUsersResult,
        // Queries adicionais para dados reais de vídeos
        videosLikesResult,
        videosViewsResult,
        videosCommentsResult
      ] = await Promise.all([
        // Total de conteúdos (modelos ativos)
        supabase.from('models').select('*', { count: 'exact', head: true }).eq('is_active', true),
        // Total de curtidas na tabela likes
        supabase.from('likes').select('*', { count: 'exact', head: true }).eq('is_active', true),
        // Total de comentários
        supabase.from('comments').select('*', { count: 'exact', head: true }),
        // Views de hoje
        supabase.from('video_views').select('*', { count: 'exact', head: true })
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString()),
        // Total de views
        supabase.from('video_views').select('*', { count: 'exact', head: true }),
        // Shares dos vídeos
        supabase.from('videos').select('shares_count'),
        // Seguidores
        supabase.from('model_followers').select('*', { count: 'exact', head: true }).eq('is_active', true),
        // Sessões ativas
        supabase.from('user_sessions').select('*', { count: 'exact', head: true })
          .eq('is_active', true).gte('last_activity_at', twoMinutesAgo),
        // Usuários online por estado
        supabase.from('online_users').select('location_state, device_type')
          .eq('is_online', true).gte('last_seen_at', twoMinutesAgo)
          .not('location_state', 'is', null),
        // Somar likes_count diretamente dos vídeos (fallback se tabela likes retornar 0)
        supabase.from('videos').select('likes_count'),
        // Somar views_count diretamente dos vídeos (fallback se video_views retornar 0)
        supabase.from('videos').select('views_count'),
        // Somar comments_count diretamente dos vídeos
        supabase.from('videos').select('comments_count')
      ]);

      // Processar dados de usuários online por estado + tipo de dispositivo
      let onlineUsersByState: { [state: string]: number } = {};
      let deviceStatsByState: { [state: string]: DeviceStats } = {};
      let totalDeviceStats: DeviceStats = { desktop: 0, mobile: 0 };
      let totalOnlineUsers = 0;

      if (onlineUsersResult.data && onlineUsersResult.data.length > 0) {
        onlineUsersResult.data.forEach((row: any) => {
          if (row.location_state) {
            onlineUsersByState[row.location_state] = (onlineUsersByState[row.location_state] || 0) + 1;
            
            // Agregar por tipo de dispositivo
            if (!deviceStatsByState[row.location_state]) {
              deviceStatsByState[row.location_state] = { desktop: 0, mobile: 0 };
            }
            const deviceType = (row.device_type || '').toLowerCase();
            if (deviceType === 'desktop') {
              deviceStatsByState[row.location_state].desktop += 1;
              totalDeviceStats.desktop += 1;
            } else {
              // mobile + tablet = mobile
              deviceStatsByState[row.location_state].mobile += 1;
              totalDeviceStats.mobile += 1;
            }
          }
        });
        totalOnlineUsers = Object.values(onlineUsersByState).reduce((sum, count) => sum + count, 0);
      }

      // Calculate total shares from videos table
      const totalShares = sharesResult.data?.reduce((sum: number, video: any) => sum + (video.shares_count || 0), 0) || 0;

      // Usar dados da tabela likes OU fallback dos contadores de vídeos
      const likesFromTable = likesResult.count || 0;
      const likesFromVideos = videosLikesResult.data?.reduce((sum: number, v: any) => sum + (v.likes_count || 0), 0) || 0;
      const finalLikes = Math.max(likesFromTable, likesFromVideos);

      // Views: usar tabela video_views OU fallback dos contadores
      const viewsFromTable = totalViewsResult.count || 0;
      const viewsFromVideos = videosViewsResult.data?.reduce((sum: number, v: any) => sum + (v.views_count || 0), 0) || 0;
      const finalTotalViews = Math.max(viewsFromTable, viewsFromVideos);

      // Comments: tabela comments OU fallback
      const commentsFromTable = commentsResult.count || 0;
      const commentsFromVideos = videosCommentsResult.data?.reduce((sum: number, v: any) => sum + (v.comments_count || 0), 0) || 0;
      const finalComments = Math.max(commentsFromTable, commentsFromVideos);

      // Views hoje: usar tabela ou fallback 
      const viewsTodayCount = viewsTodayResult.count || 0;

      const newStats: RealTimeStats = {
        totalContent: contentResult.count || 0,
        totalLikes: finalLikes,
        totalComments: finalComments,
        viewsToday: viewsTodayCount,
        totalShares: totalShares,
        totalFollowers: followersResult.count || 0,
        activeUsers: totalOnlineUsers || 0,
        onlineUsersByState,
        deviceStatsByState,
        totalDeviceStats,
        totalOnlineUsers,
        totalViews: finalTotalViews,
        activeViews: activeUsersResult.count || 0
      };

      setStats(newStats);

      console.log('📊 Real-time stats atualizadas:', newStats);

    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas em tempo real:', error);
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  };

  const trackUserActivity = async (userId: string, location?: { state?: string; city?: string; country?: string }) => {
    try {
      // Detectar tipo de dispositivo
      const userAgent = navigator.userAgent;
      let deviceType = 'desktop';
      
      if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
        if (/iPad/i.test(userAgent)) {
          deviceType = 'tablet';
        } else {
          deviceType = 'mobile';
        }
      } else if (/Tablet/i.test(userAgent)) {
        deviceType = 'tablet';
      }

      const now = new Date().toISOString();
      const clientIP = await getClientIP();

      // IDs persistentes para permitir múltiplas sessões simultâneas
      let onlineSessionId = localStorage.getItem('online_session_id');
      if (!onlineSessionId) {
        onlineSessionId = crypto.randomUUID();
        localStorage.setItem('online_session_id', onlineSessionId);
      }

      let persistentSessionToken = localStorage.getItem('user_session_token');
      if (!persistentSessionToken) {
        persistentSessionToken = crypto.randomUUID();
        localStorage.setItem('user_session_token', persistentSessionToken);
      }

      // Priorizar localização recebida; fallback para detecção robusta client-side
      const resolvedLocation = location ?? await detectLocation();

      // 1. Registrar/atualizar sessão do usuário
      const { error: sessionError } = await supabase
        .from('user_sessions')
        .upsert({
          user_id: userId,
          session_token: persistentSessionToken,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          last_activity_at: now,
          location_state: resolvedLocation.state || 'São Paulo',
          location_city: resolvedLocation.city || 'São Paulo',
          location_country: resolvedLocation.country || 'BR',
          user_agent: userAgent,
          ip_address: clientIP,
          device_type: deviceType,
          started_at: now,
          device_info: { type: deviceType, userAgent }
        }, {
          onConflict: 'session_token'
        });

      if (sessionError) {
        console.error('❌ Erro ao registrar sessão:', sessionError);
      }

      // 2. Registrar/atualizar usuário online
      const { error: onlineError } = await supabase
        .from('online_users')
        .upsert({
          user_id: userId,
          session_id: onlineSessionId,
          is_online: true,
          last_seen_at: now,
          location_state: resolvedLocation.state || 'São Paulo',
          location_city: resolvedLocation.city || 'São Paulo',
          location_country: resolvedLocation.country || 'BR',
          ip_address: clientIP,
          device_type: deviceType,
          user_agent: userAgent
        }, {
          onConflict: 'session_id'
        });

      if (onlineError && onlineError.code !== '42P10') {
        console.error('❌ Erro ao registrar usuário online:', onlineError);
      }

      // 3. Registrar evento de analytics
      await supabase
        .from('analytics_events')
        .insert({
          user_id: userId,
          event_name: 'user_activity',
          event_category: 'engagement',
          page_url: window.location.href,
          user_agent: userAgent,
          device_type: deviceType,
          ip_address: clientIP,
          region: resolvedLocation.state,
          city: resolvedLocation.city,
          country: resolvedLocation.country || 'BR'
        });

      console.log('✅ Atividade registrada:', {
        userId,
        deviceType,
        location: resolvedLocation.state || 'São Paulo',
        ip: clientIP
      });

    } catch (error) {
      console.error('❌ Erro ao rastrear atividade:', error);
    }
  };

  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  };

  // Limpeza de usuários inativos
  const cleanupInactiveUsers = async () => {
    try {
      const twoMinutesAgo = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
      
      // Marcar usuários como offline se não tiveram atividade nos últimos 2 minutos
      await supabase
        .from('online_users')
        .update({ is_online: false })
        .lt('last_seen_at', twoMinutesAgo);

      // Marcar sessões como inativas
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .lt('last_activity_at', twoMinutesAgo);

      console.log('🧹 Limpeza de usuários inativos executada');
    } catch (error) {
      console.error('❌ Erro na limpeza de usuários inativos:', error);
    }
  };

  // Configurar atualizações automáticas APENAS UMA VEZ
  useEffect(() => {
    if (!isInitialized.current) {
      console.log('🚀 Inicializando sistema de stats em tempo real...');
      isInitialized.current = true;

      // Buscar dados iniciais
      fetchRealTimeStats();

      // Executar limpeza inicial
      cleanupInactiveUsers();

      // Atualizar stats a cada 45 segundos (reduzido frequência para evitar sobrecarga)
      statsIntervalRef.current = setInterval(fetchRealTimeStats, 45000);

      // Limpar usuários inativos a cada 2 minutos
      cleanupIntervalRef.current = setInterval(cleanupInactiveUsers, ONLINE_WINDOW_MS);

      // REMOVER real-time subscriptions para evitar updates em cascata
      // As atualizações automáticas por intervalo são suficientes

      return () => {
        console.log('🧹 Limpando recursos do useRealTimeStats...');
        if (statsIntervalRef.current) {
          clearInterval(statsIntervalRef.current);
          statsIntervalRef.current = null;
        }
        if (cleanupIntervalRef.current) {
          clearInterval(cleanupIntervalRef.current);
          cleanupIntervalRef.current = null;
        }
        isInitialized.current = false;
      };
    }
  }, []);

  return {
    stats,
    isLoading,
    fetchRealTimeStats,
    trackUserActivity
  };
};
