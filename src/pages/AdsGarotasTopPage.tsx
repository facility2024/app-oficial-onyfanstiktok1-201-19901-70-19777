import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, ChevronLeft, ChevronRight, RefreshCw, Loader2, ArrowLeft } from "lucide-react";
import { useAdsGarotasRealtime } from "@/hooks/useAdsGarotasRealtime";
import { useNavigate } from "react-router-dom";
import PixCheckoutModal from "@/components/PixCheckoutModal";
import { useCheckoutPrice } from "@/hooks/useCheckoutPrice";

interface Card {
  id: string;
  nome: string;
  imagem_url: string;
  video_url: string | null;
  cta_texto: string;
  valor: number | null;
  ordem: number;
  is_active: boolean;
  link_acesso: string | null;
  checkout_template_id: string | null;
}

async function resolveCheckoutSlug(templateId: string): Promise<string | null> {
  try {
    const { data } = await (supabase as any)
      .from("checkout_templates")
      .select("slug, ativo")
      .eq("id", templateId)
      .maybeSingle();
    if (data?.slug && data?.ativo !== false) return data.slug as string;
  } catch {}
  return null;
}


const PAGE_SIZE = 20;

type CategoryKey = "garotas_top" | "latinas" | "novidades";
const CATEGORIES: { key: CategoryKey; label: string; table: "ads_garotas_top" | "ads_latinas" | "ads_novidades"; title: string; subtitle: string }[] = [
  { key: "garotas_top", label: "Garotas Top", table: "ads_garotas_top", title: "GAROTAS TOP 10", subtitle: "Chinesas e as mais quentes das redes" },
  { key: "latinas", label: "Latinas", table: "ads_latinas", title: "LATINAS", subtitle: "As latinas mais desejadas" },
  { key: "novidades", label: "Novidades 🔥", table: "ads_novidades", title: "NOVIDADES 🔥", subtitle: "Recém-chegadas toda semana" },
];

export default function AdsGarotasTopPage() {
  const [category, setCategory] = useState<CategoryKey>("garotas_top");
  const activeCategory = CATEGORIES.find((c) => c.key === category)!;
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Card | null>(null);
  const [videoFallbacks, setVideoFallbacks] = useState<Record<string, boolean>>({});
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const { hasUpdate, clear } = useAdsGarotasRealtime();
  const navigate = useNavigate();
  const [showPix, setShowPix] = useState(false);
  const { price: fallbackPrice } = useCheckoutPrice(category);
  const price = useMemo(() => {
    const syncedCard = cards.find((card) => card.valor != null && Number(card.valor) > 0);
    return syncedCard ? Number(syncedCard.valor) : fallbackPrice;
  }, [cards, fallbackPrice]);
  const checkoutAmount = selected?.valor && selected.valor > 0 ? Number(selected.valor) : price;

  useEffect(() => {
    document.documentElement.classList.add('allow-scroll');
    return () => {
      document.documentElement.classList.remove('allow-scroll');
    };
  }, []);

  const fetchCards = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from(activeCategory.table)
      .select("*")
      .eq("is_active", true)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: false });
    setCards(data || []);
    setPage(1);
    setLoading(false);
  };

  useEffect(() => {
    fetchCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);


  const totalPages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const pageCards = useMemo(
    () => cards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [cards, page]
  );

  const handleRefresh = async () => {
    clear();
    setPage(1);
    await fetchCards();
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Sombras roxas decorativas */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[500px] h-[500px] bg-purple-700/30 rounded-full blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-40 w-[500px] h-[500px] bg-fuchsia-600/20 rounded-full blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-purple-900/40 rounded-full blur-[140px]" />

      {/* Banner de atualização disponível */}
      {hasUpdate && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold shadow-[0_0_30px_rgba(168,85,247,0.7)] hover:scale-105 transition-transform"
          >
            <RefreshCw className="w-4 h-4 animate-spin" />
            Nova atualização — Atualizar página agora
          </button>
        </div>
      )}

      <div className="relative max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <button
          onClick={() => navigate('/app')}
          className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-purple-900/40 border border-purple-500/40 text-purple-200 hover:bg-purple-800/60 hover:text-white transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-semibold">Voltar ao app</span>
        </button>

        {/* Abas de categorias */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold border transition-all ${
                category === c.key
                  ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 border-fuchsia-400 text-white shadow-[0_0_20px_rgba(217,70,239,0.6)] animate-cta-attention-purple"
                  : "bg-purple-950/40 border-purple-500/30 text-purple-200 hover:bg-purple-800/40 animate-pulse"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Header */}
        <header className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-900/40 border border-purple-500/40 mb-4">
            <Sparkles className="w-4 h-4 text-fuchsia-400" />
            <span className="text-xs uppercase tracking-widest text-fuchsia-300">
              Exclusivo
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black bg-gradient-to-r from-purple-300 via-fuchsia-400 to-purple-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(168,85,247,0.5)] break-words px-2">
            {activeCategory.title}
          </h1>
          <p className="mt-3 text-base sm:text-lg md:text-xl text-purple-200/80 font-medium px-2">
            {activeCategory.subtitle}
          </p>

          <p className="mt-3 text-sm md:text-base text-purple-100/90 max-w-2xl mx-auto leading-relaxed px-3">
            São vários vídeos atualizados todas as semanas com as mais lindas da internet.
          </p>
          <div
            role="presentation"
            className="mt-5 inline-flex flex-col items-center gap-1 px-4 sm:px-6 py-3 rounded-2xl bg-gradient-to-r from-fuchsia-600/40 to-purple-600/40 border border-fuchsia-400/60 shadow-[0_0_30px_rgba(217,70,239,0.5)] max-w-[95vw] animate-cta-attention-purple cursor-default select-none pointer-events-none"
          >
            <span className="text-lg sm:text-2xl md:text-3xl font-black text-white drop-shadow-[0_0_10px_rgba(236,72,153,0.8)] text-center leading-tight">
              Tudo isso por <span className="text-yellow-300 whitespace-nowrap">R$ {price.toFixed(2).replace(".", ",")}</span>
            </span>
            <span className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-widest text-fuchsia-200 font-bold animate-pulse text-center">
              🔥 Pagar com PIX — acesso imediato 🔥
            </span>
          </div>
        </header>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
          </div>
        ) : pageCards.length === 0 ? (
          <div className="text-center py-20 text-purple-200/60">
            Nenhuma garota disponível no momento.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3 sm:gap-4">

            {pageCards.map((card) => (
              <button
                key={card.id}
                onClick={() => setSelected(card)}
                className="group relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-purple-500/30 bg-gradient-to-br from-purple-950 to-black shadow-[0_0_20px_rgba(126,34,206,0.3)] hover:shadow-[0_0_40px_rgba(217,70,239,0.6)] hover:border-fuchsia-400 transition-all duration-300 hover:-translate-y-1"
              >
                <img
                  src={card.imagem_url}
                  alt={card.nome}
                  loading="eager"
                  onLoad={() => setLoadedImages((prev) => ({ ...prev, [card.id]: true }))}
                  className={`absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-all duration-500 ${
                    loadedImages[card.id] ? "opacity-100" : "opacity-70"
                  }`}
                />
                {card.video_url && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm border-2 border-white/80 flex items-center justify-center shadow-[0_0_20px_rgba(217,70,239,0.7)] group-hover:scale-110 transition-transform">
                      <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 ml-1">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                  <h3 className="text-white font-bold text-sm md:text-base drop-shadow-lg truncate">
                    {card.nome}
                  </h3>
                  <span className="text-xs text-fuchsia-300 opacity-0 group-hover:opacity-100 transition-opacity">
                    Toque para ver
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="border-purple-500/40 bg-purple-950/40 text-purple-200 hover:bg-purple-800/40"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-10 h-10 rounded-lg font-bold transition-all ${
                  page === i + 1
                    ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.6)]"
                    : "bg-purple-950/40 text-purple-200 hover:bg-purple-800/40 border border-purple-500/30"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="border-purple-500/40 bg-purple-950/40 text-purple-200 hover:bg-purple-800/40"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Modal de vídeo */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="w-[calc(100vw-16px)] max-w-md max-h-[calc(100dvh-16px)] overflow-y-auto overscroll-contain bg-gradient-to-br from-purple-950 to-black border-purple-500/40 text-white p-3 sm:p-6 gap-3 rounded-xl">
          <DialogHeader className="shrink-0 pr-10 text-left">
            <DialogTitle className="text-lg sm:text-2xl leading-tight font-black bg-gradient-to-r from-purple-300 to-fuchsia-400 bg-clip-text text-transparent break-words">
              {selected?.nome}
            </DialogTitle>
          </DialogHeader>
          {selected?.video_url && !videoFallbacks[selected.id] ? (
            <video
              key={selected.id}
              src={selected.video_url}
              poster={selected.imagem_url}
              autoPlay
              playsInline
              controls
              muted
              preload="auto"
              onCanPlay={(event) => event.currentTarget.play().catch(() => undefined)}
              onError={() => setVideoFallbacks((prev) => ({ ...prev, [selected.id]: true }))}
              className="w-full rounded-xl aspect-[9/16] max-h-[calc(100dvh-150px)] object-contain bg-black"
            />
          ) : selected?.imagem_url ? (
            <img
              src={selected.imagem_url}
              alt={selected.nome}
              className="w-full rounded-xl aspect-[9/16] max-h-[calc(100dvh-150px)] object-contain bg-black"
            />
          ) : null}
          <div className="sticky bottom-0 z-10 -mx-1 pt-2 pb-[max(0px,env(safe-area-inset-bottom))] bg-gradient-to-t from-black via-black/95 to-transparent">
            <Button
              onClick={async () => {
                if (selected?.checkout_template_id) {
                  const slug = await resolveCheckoutSlug(selected.checkout_template_id);
                  if (slug) {
                    setSelected(null);
                    navigate(`/checkout/${slug}`);
                    return;
                  }
                }
                setSelected(null);
                setShowPix(true);
              }}
              className="w-full min-h-12 h-auto whitespace-normal bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold px-3 py-3 text-sm sm:text-base leading-tight shadow-[0_0_30px_rgba(168,85,247,0.6)] animate-cta-attention-purple"
            >
              Assinar por R$ {(selected?.valor && selected.valor > 0 ? Number(selected.valor) : price).toFixed(2).replace(".", ",")} via PIX
            </Button>
          </div>

        </DialogContent>
      </Dialog>

      <PixCheckoutModal
        open={showPix}
        onClose={() => setShowPix(false)}
        amount={checkoutAmount}
        productName={selected?.nome ? `Assinatura ${selected.nome}` : "Assinatura Garotas Top 10"}
        storageFlag="garotas_top_paid"
        redirectTo={selected?.link_acesso || "/garotas-top-vip"}
      />
    </div>
  );
}
