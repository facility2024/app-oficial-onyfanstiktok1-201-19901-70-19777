import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Instagram, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type IgVideo = {
  id: string;
  ig_shortcode: string;
  video_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  post_type: 'video' | 'image' | 'carousel';
  media: Array<{ kind: 'video' | 'image'; url: string; thumb?: string | null }> | null;
  visibility: 'public' | 'private';
  created_at: string;
};

type IgModel = {
  id: string;
  slug: string;
  ig_username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

const InstagramModelFeed = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [model, setModel] = useState<IgModel | null>(null);
  const [videos, setVideos] = useState<IgVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: m } = await supabase
        .from('ig_models')
        .select('id, slug, ig_username, display_name, avatar_url, bio')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (!m) {
        setLoading(false);
        return;
      }
      setModel(m as IgModel);

      const { data: v } = await supabase
        .from('ig_feed_videos')
        .select('id, ig_shortcode, video_url, thumbnail_url, caption, post_type, media, visibility, created_at')
        .eq('ig_model_id', m.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      setVideos((v ?? []) as IgVideo[]);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Instagram className="w-10 h-10 text-white/40" />
        <p className="text-white/70">Perfil não encontrado.</p>
        <Button variant="secondary" onClick={() => navigate('/perfil-instagram')}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-black/70 border-b border-white/10">
        <div className="flex items-center gap-3 px-4 py-3 max-w-3xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/perfil-instagram')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img
            src={model.avatar_url || '/default-avatar.svg'}
            alt=""
            className="w-10 h-10 rounded-full object-cover ring-2 ring-pink-500"
            onError={(e) => ((e.currentTarget as HTMLImageElement).src = '/default-avatar.svg')}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{model.display_name || model.ig_username}</div>
            <div className="text-[11px] text-white/60 truncate">@{model.ig_username} · {videos.length} posts</div>
          </div>
          <a
            href={`https://www.instagram.com/${model.ig_username}/`}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
            title="Abrir no Instagram"
          >
            <Instagram className="w-4 h-4 text-white" />
          </a>
        </div>
      </header>

      <main ref={containerRef} className="max-w-3xl mx-auto">
        {videos.length === 0 ? (
          <div className="p-10 text-center text-white/60">Sem posts publicados ainda.</div>
        ) : (
          <div className="flex flex-col gap-6 py-4 px-2">
            {videos.map((v) => (
              <IgPostCard key={v.id} post={v} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

function IgPostCard({ post }: { post: IgVideo }) {
  const items = useMemo(() => {
    if (Array.isArray(post.media) && post.media.length > 0) return post.media;
    if (post.video_url) return [{ kind: 'video' as const, url: post.video_url, thumb: post.thumbnail_url }];
    return [];
  }, [post]);

  const [idx, setIdx] = useState(0);
  const isPrivate = post.visibility === 'private';
  const current = items[idx];

  if (!current) return null;

  return (
    <article className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03]">
      <div className="relative aspect-[9/12] bg-black">
        {isPrivate ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 backdrop-blur">
            <Lock className="w-8 h-8 text-white/80" />
            <div className="text-sm font-semibold">Conteúdo VIP</div>
            <a
              href="/subscribe"
              className="px-4 py-2 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-xs font-bold"
            >
              Desbloquear
            </a>
          </div>
        ) : current.kind === 'video' ? (
          <video
            src={current.url}
            poster={current.thumb ?? undefined}
            controls
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-contain bg-black"
          />
        ) : (
          <img
            src={current.url}
            alt=""
            className="absolute inset-0 w-full h-full object-contain bg-black"
          />
        )}

        {items.length > 1 && !isPrivate && (
          <>
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIdx((i) => Math.min(items.length - 1, i + 1))}
              disabled={idx === items.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {items.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${i === idx ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {post.caption && (
        <div className="p-3 text-sm text-white/80 whitespace-pre-wrap line-clamp-4">
          {post.caption}
        </div>
      )}
    </article>
  );
}

export default InstagramModelFeed;
