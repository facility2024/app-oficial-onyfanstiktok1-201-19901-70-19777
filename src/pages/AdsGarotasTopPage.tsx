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

export default function AdsGarotasTopPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Card | null>(null);
  const [videoFallbacks, setVideoFallbacks] = useState<Record<string, boolean>>({});
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const { hasUpdate, clear } = useAdsGarotasRealtime();
  const navigate = useNavigate();
  const [showPix, setShowPix] = useState(false);
  const { price: fallbackPrice } = useCheckoutPrice("garotas_top");
  const checkoutAmount = selected?.valor && selected.valor > 0 ? Number(selected.valor) : fallbackPrice;
  const price = fallbackPrice;

  const fetchCards = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ads_garotas_top")
      .select("*")
      .eq("is_active", true)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: false });
    setCards(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCards();
  }, []);

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

      <div className="relative max-w-7xl mx-auto px-4 py-10">
        <button
          onClick={() => navigate('/app')}
          className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-purple-900/40 border border-purple-500/40 text-purple-200 hover:bg-purple-800/60 hover:text-white transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-semibold">Voltar ao app</span>
        </button>

        {/* Header */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-900/40 border border-purple-500/40 mb-4">
            <Sparkles className="w-4 h-4 text-fuchsia-400" />
            <span className="text-xs uppercase tracking-widest text-fuchsia-300">
              Exclusivo
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-purple-300 via-fuchsia-400 to-purple-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(168,85,247,0.5)]">
            GAROTAS TOP 10
          </h1>
          <p className="mt-3 text-lg md:text-xl text-purple-200/80 font-medium">
            Chinesas e as mais quentes das redes
          </p>
          <p className="mt-3 text-sm md:text-base text-purple-100/90 max-w-2xl mx-auto leading-relaxed">
            São vários vídeos atualizados todas as semanas com as mais lindas da internet.
          </p>
          <button
            onClick={() => setShowPix(true)}
            className="mt-5 inline-flex flex-col items-center gap-1 px-6 py-3 rounded-2xl bg-gradient-to-r from-fuchsia-600/40 to-purple-600/40 hover:from-fuchsia-500/60 hover:to-purple-500/60 border border-fuchsia-400/60 shadow-[0_0_30px_rgba(217,70,239,0.5)] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            <span className="text-2xl md:text-3xl font-black text-white drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]">
              Tudo isso por <span className="text-yellow-300">R$ {price.toFixed(2).replace(".", ",")}</span>
            </span>
            <span className="text-[11px] md:text-xs uppercase tracking-widest text-fuchsia-200 font-bold animate-pulse">
              🔥 Pagar com PIX — acesso imediato 🔥
            </span>
          </button>
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
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4">
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
                {card.video_url && !videoFallbacks[card.id] ? (
                  <video
                    src={card.video_url}
                    poster={card.imagem_url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    onError={() => setVideoFallbacks((prev) => ({ ...prev, [card.id]: true }))}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : null}
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
        <DialogContent className="max-w-md bg-gradient-to-br from-purple-950 to-black border-purple-500/40 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black bg-gradient-to-r from-purple-300 to-fuchsia-400 bg-clip-text text-transparent">
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
              className="w-full rounded-xl aspect-[9/16] object-cover bg-black"
            />
          ) : selected?.imagem_url ? (
            <img
              src={selected.imagem_url}
              alt={selected.nome}
              className="w-full rounded-xl aspect-[9/16] object-cover"
            />
          ) : null}
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
            className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold py-6 text-base shadow-[0_0_30px_rgba(168,85,247,0.6)]"
          >
            Assinar por R$ {(selected?.valor && selected.valor > 0 ? Number(selected.valor) : price).toFixed(2).replace(".", ",")} via PIX
          </Button>

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
