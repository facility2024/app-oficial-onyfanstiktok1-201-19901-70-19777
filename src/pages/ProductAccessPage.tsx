import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserEntitlements } from "@/hooks/useUserEntitlements";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Lock, Pencil, LayoutGrid, PlayCircle } from "lucide-react";
import { toast } from "sonner";

interface AccessPage {
  id: string; product_id: string; title: string;
  description: string | null; cover_url: string | null; is_published: boolean;
}
interface AccessCard {
  id: string; title: string; description: string | null;
  cover_url: string | null; is_published: boolean; is_active: boolean;
  sort_order: number; videoCount?: number;
}

export default function ProductAccessPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { hasProduct, loading: entLoading } = useUserEntitlements();
  const [page, setPage] = useState<AccessPage | null>(null);
  const [cards, setCards] = useState<AccessCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!productId || entLoading) return;
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      let admin = false;
      if (user) {
        const { data: role } = await (supabase as any)
          .from("user_roles").select("id")
          .eq("user_id", user.id).eq("role", "admin").maybeSingle();
        admin = Boolean(role);
      }
      setIsAdmin(admin);

      if (!admin && !hasProduct(productId)) {
        toast.error("Você ainda não tem acesso a este produto.");
        navigate("/meus-acessos");
        return;
      }

      const { data: pg } = await (supabase as any)
        .from("access_pages").select("*")
        .eq("product_id", productId).maybeSingle();
      if (!pg) { setLoading(false); return; }
      setPage(pg);

      let cardsQ = (supabase as any).from("access_page_cards")
        .select("*").eq("page_id", pg.id);
      if (!admin) cardsQ = cardsQ.eq("is_published", true).eq("is_active", true);
      const { data: cs } = await cardsQ.order("sort_order");

      const { data: vs } = await (supabase as any)
        .from("access_page_videos").select("id, card_id, is_active")
        .eq("page_id", pg.id);
      const counts: Record<string, number> = {};
      (vs ?? []).forEach((v: any) => {
        if (!v.card_id) return;
        if (!admin && !v.is_active) return;
        counts[v.card_id] = (counts[v.card_id] ?? 0) + 1;
      });
      setCards((cs ?? []).map((c: AccessCard) => ({ ...c, videoCount: counts[c.id] ?? 0 })));
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
          <Button size="sm" onClick={() => navigate(`/admin?tab=product-content&product=${productId}`)}>
            <Pencil className="w-4 h-4 mr-1" /> Editar
          </Button>
        )}
      </header>

      {page.cover_url && (
        <div className="relative h-56 w-full overflow-hidden">
          <img src={page.cover_url} alt={page.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
        </div>
      )}

      <div className="p-4 space-y-5 max-w-6xl mx-auto">
        {page.description && (
          <p className="text-gray-300 text-sm whitespace-pre-wrap">{page.description}</p>
        )}

        <div className="flex items-center gap-2 text-white">
          <LayoutGrid className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold">Módulos disponíveis</h2>
        </div>

        {cards.length === 0 ? (
          <div className="text-center text-gray-400 py-10 border border-dashed border-gray-800 rounded-lg">
            Nenhum módulo publicado ainda.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {cards.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/acesso-produto/${productId}/card/${c.id}`)}
                className="group relative aspect-[4/5] rounded-xl overflow-hidden bg-gray-900 border border-gray-800 hover:border-emerald-500 transition text-left"
              >
                {c.cover_url ? (
                  <img src={c.cover_url} alt={c.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 via-gray-900 to-gray-950" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {c.videoCount} vídeo{(c.videoCount ?? 0) === 1 ? "" : "s"}
                </div>
                {!c.is_published && (
                  <div className="absolute top-2 left-2 bg-yellow-600 text-white text-[10px] px-2 py-1 rounded">
                    RASCUNHO
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-center gap-2 text-emerald-400 mb-1">
                    <PlayCircle className="w-4 h-4" />
                    <span className="text-[11px] uppercase font-bold tracking-wider">Abrir</span>
                  </div>
                  <p className="text-white font-bold text-sm line-clamp-2">{c.title}</p>
                  {c.description && (
                    <p className="text-gray-300 text-xs mt-1 line-clamp-2">{c.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
