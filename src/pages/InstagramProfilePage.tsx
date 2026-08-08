import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Instagram, Play, Images } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type IgModelCard = {
  id: string;
  slug: string;
  ig_username: string;
  display_name: string | null;
  avatar_url: string | null;
  video_count: number;
  latest_thumb: string | null;
};

const InstagramProfilePage = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState<IgModelCard[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    // 1) puxa modelos ativos
    const { data: mods } = await supabase
      .from('ig_models')
      .select('id, slug, ig_username, display_name, avatar_url')
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (!mods || mods.length === 0) {
      setModels([]);
      setLoading(false);
      return;
    }

    // 2) puxa vídeos públicos dessas modelos p/ contar + capa
    const ids = mods.map((m) => m.id);
    const { data: vids } = await supabase
      .from('ig_feed_videos')
      .select('ig_model_id, thumbnail_url, video_url, created_at')
      .in('ig_model_id', ids)
      .eq('is_active', true)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    const byModel = new Map<string, { count: number; thumb: string | null }>();
    (vids ?? []).forEach((v) => {
      const cur = byModel.get(v.ig_model_id) ?? { count: 0, thumb: null };
      cur.count += 1;
      if (!cur.thumb) cur.thumb = v.thumbnail_url ?? v.video_url ?? null;
      byModel.set(v.ig_model_id, cur);
    });

    const cards: IgModelCard[] = mods
      .map((m) => {
        const info = byModel.get(m.id);
        return {
          id: m.id,
          slug: m.slug,
          ig_username: m.ig_username,
          display_name: m.display_name,
          avatar_url: m.avatar_url,
          video_count: info?.count ?? 0,
          latest_thumb: info?.thumb ?? null,
        };
      })
      .filter((c) => c.video_count > 0);

    setModels(cards);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel('ig_feed_videos_grid')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ig_feed_videos' },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 text-white">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-black/60 border-b border-white/10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
              <Instagram className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold">Perfil do Instagram</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : models.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 mb-4">
              <Instagram className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-1">Nenhum perfil importado ainda</h2>
            <p className="text-white/70 text-sm">
              Importe perfis do Instagram pelo Creator Studio e eles aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {models.map((m) => (
              <button
                key={m.id}
                onClick={() => navigate(`/perfil-instagram/${m.slug}`)}
                className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 bg-white/5 text-left"
              >
                {m.latest_thumb ? (
                  <img
                    src={m.latest_thumb}
                    alt={m.display_name ?? m.ig_username}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/30 to-purple-700/30" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur text-[11px]">
                  {m.video_count > 1 ? <Images className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {m.video_count}
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center gap-2">
                  <img
                    src={m.avatar_url || '/default-avatar.svg'}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-white/70"
                    onError={(e) => ((e.currentTarget as HTMLImageElement).src = '/default-avatar.svg')}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {m.display_name || m.ig_username}
                    </div>
                    <div className="text-[11px] text-white/70 truncate">@{m.ig_username}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default InstagramProfilePage;
