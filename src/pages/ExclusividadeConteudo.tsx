import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Play, Lock, Eye, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import rainbowLogo from '@/assets/coconudi-rainbow-logo.png';

interface ExclusiveVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string;
  views_count: number;
  likes_count: number;
  model_name?: string;
}

const ExclusividadeConteudo = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [videos, setVideos] = useState<ExclusiveVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('exclusividade_user');
    if (!stored) {
      navigate('/exclusividade');
      return;
    }
    setUser(JSON.parse(stored));
    fetchVideos();
  }, [navigate]);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('id, title, thumbnail_url, video_url, views_count, likes_count')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20) as any;

      if (!error && data) {
        setVideos(data.map((v: any) => ({
          id: v.id,
          title: v.title || 'Conteúdo Exclusivo',
          thumbnail_url: v.thumbnail_url,
          video_url: v.video_url,
          views_count: v.views_count ?? 0,
          likes_count: v.likes_count ?? 0,
        })));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('exclusividade_user');
    navigate('/exclusividade');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)',
    }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #7CB342 0%, #558B2F 35%, #C4842E 70%, #8B4513 100%)',
        }}
      >
        <img src={rainbowLogo} alt="CocoNudi" className="h-10 object-contain" />
        <div className="flex items-center gap-3">
          <span className="text-white/90 text-sm hidden sm:block">Olá, {user.name}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/20 text-xs">
            Sair
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="w-5 h-5 text-yellow-400" />
          <h2 className="text-xl font-bold text-white">Conteúdos Exclusivos</h2>
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">VIP</Badge>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[9/16] rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20">
            <Lock className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/50 text-lg">Nenhum conteúdo exclusivo disponível no momento</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {videos.map((video) => (
              <Card
                key={video.id}
                className="group cursor-pointer border-0 bg-white/5 hover:bg-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl"
                onClick={() => setPlayingId(playingId === video.id ? null : video.id)}
              >
                <div className="relative aspect-[9/16]">
                  {playingId === video.id ? (
                    <video
                      src={video.video_url}
                      className="w-full h-full object-cover"
                      autoPlay
                      controls
                      playsInline
                    />
                  ) : (
                    <>
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#7CB342]/30 to-[#8B4513]/30 flex items-center justify-center">
                          <Play className="w-12 h-12 text-white/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play className="w-7 h-7 text-white ml-1" fill="white" />
                        </div>
                      </div>
                      <Badge className="absolute top-2 right-2 bg-yellow-500/80 text-white text-[10px] border-0">
                        Exclusivo
                      </Badge>
                    </>
                  )}
                </div>
                <CardContent className="p-3">
                  <p className="text-white text-sm font-medium truncate">{video.title}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-white/50 text-xs">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{video.views_count}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{video.likes_count}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ExclusividadeConteudo;
