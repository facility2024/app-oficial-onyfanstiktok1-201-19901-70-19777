import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserEntitlements } from "@/hooks/useUserEntitlements";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Lock, Pencil, Play } from "lucide-react";
import { toast } from "sonner";

interface AccessPage {
  id: string; product_id: string; title: string;
  description: string | null; cover_url: string | null; is_published: boolean;
}
interface AccessVideo {
  id: string; title: string; description: string | null;
  thumbnail_url: string | null; video_url: string;
}

export default function ProductAccessPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { hasProduct, loading: entLoading } = useUserEntitlements();
  const [page, setPage] = useState<AccessPage | null>(null);
  const [videos, setVideos] = useState<AccessVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<AccessVideo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!productId || entLoading) return;
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      let admin = false;
      if (user) {
        const { data: role } = await (supabase as any)
          .from("user_roles")
          .select("id")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        admin = Boolean(role);
      }
      setIsAdmin(admin);

      if (!admin && !hasProduct(productId)) {
        toast.error("Você ainda não tem acesso a este produto.");
        navigate("/meus-acessos");
        return;
      }

      let pageQuery = (supabase as any)
        .from("access_pages").select("*")
        .eq("product_id", productId);
      if (!admin) pageQuery = pageQuery.eq("is_published", true);
      const { data: pg } = await (supabase as any)
        .from("access_pages").select("*")
        .eq("product_id", productId)
        .maybeSingle();
      const resolvedPage = admin ? (await pageQuery.maybeSingle()).data : pg;
      if (!resolvedPage) { setLoading(false); return; }
      setPage(resolvedPage);
      let videosQuery = (supabase as any)
        .from("access_page_videos").select("*")
        .eq("page_id", resolvedPage.id);
      if (!admin) videosQuery = videosQuery.eq("is_active", true);
      const { data: vs } = await videosQuery.order("sort_order");
      setVideos(vs ?? []);
      setLoading(false);
    })();
  }, [productId, entLoading, hasProduct, navigate]);

  if (loading || entLoading) {
    return (
      <div className="min-h-dvh bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-dvh bg-gray-950 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Lock className="w-10 h-10 text-gray-500" />
        <p className="text-white font-bold">Página em preparação</p>
        <p className="text-gray-400 text-sm">O conteúdo deste produto ainda não foi publicado.</p>
        <Button onClick={() => navigate("/meus-acessos")}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-950">
      <header className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/meus-acessos")}>
          <ArrowLeft className="w-5 h-5 text-white" />
        </Button>
        <h1 className="text-white font-bold flex-1 truncate">{page.title}</h1>
        {isAdmin && (
          <Button size="sm" onClick={() => navigate("/admin?tab=access-pages")}>
            <Pencil className="w-4 h-4 mr-1" /> Editar conteúdo
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => navigate("/app")}>Voltar ao app</Button>
      </header>

      {page.cover_url && (
        <div className="relative h-48 w-full overflow-hidden">
          <img src={page.cover_url} alt={page.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/50 to-transparent" />
        </div>
      )}

      <div className="p-4 space-y-4">
        {page.description && (
          <p className="text-gray-300 text-sm whitespace-pre-wrap">{page.description}</p>
        )}

        {videos.length === 0 ? (
          <div className="text-center text-gray-400 py-10">Nenhum vídeo disponível ainda.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {videos.map((v) => (
              <button
                key={v.id}
                onClick={() => setPlaying(v)}
                className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-gray-900 border border-gray-800 hover:border-emerald-500 transition"
              >
                {v.thumbnail_url ? (
                  <img src={v.thumbnail_url} alt={v.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <Play className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/90 flex items-center justify-center">
                    <Play className="w-6 h-6 text-black fill-black ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-white text-sm font-semibold line-clamp-2">{v.title}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!playing} onOpenChange={(o) => !o && setPlaying(null)}>
        <DialogContent className="max-w-3xl bg-black border-gray-800 p-0">
          {playing && (
            <div className="space-y-2">
              <video
                src={playing.video_url}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[80vh] bg-black"
              />
              <div className="p-3">
                <p className="text-white font-bold">{playing.title}</p>
                {playing.description && (
                  <p className="text-gray-400 text-sm mt-1 whitespace-pre-wrap">{playing.description}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
