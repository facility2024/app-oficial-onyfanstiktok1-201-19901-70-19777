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

interface Card {
  id: string;
  nome: string;
  imagem_url: string;
  video_url: string | null;
  cta_texto: string;
  cta_link: string | null;
  ordem: number;
  is_active: boolean;
}

const PAGE_SIZE = 20;

export default function AdsGarotasTopPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Card | null>(null);
  const { hasUpdate, clear } = useAdsGarotasRealtime();

  const fetchCards = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {pageCards.map((card) => (
              <button
                key={card.id}
                onClick={() => setSelected(card)}
                className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-purple-500/30 bg-gradient-to-br from-purple-950 to-black shadow-[0_0_20px_rgba(126,34,206,0.3)] hover:shadow-[0_0_40px_rgba(217,70,239,0.6)] hover:border-fuchsia-400 transition-all duration-300 hover:-translate-y-1"
              >
                <img
                  src={card.imagem_url}
                  alt={card.nome}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
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
          {selected?.video_url ? (
            <video
              src={selected.video_url}
              autoPlay
              playsInline
              controls
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
            onClick={() => {
              if (selected?.cta_link) window.location.href = selected.cta_link;
            }}
            className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold py-6 text-base shadow-[0_0_30px_rgba(168,85,247,0.6)]"
          >
            {selected?.cta_texto || "Assinar Conteúdo"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
