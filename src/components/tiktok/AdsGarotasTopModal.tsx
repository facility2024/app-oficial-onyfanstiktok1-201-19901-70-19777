import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";

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

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AdsGarotasTopModal({ open, onClose }: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Card | null>(null);
  const [videoFallbacks, setVideoFallbacks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("ads_garotas_top")
        .select("*")
        .eq("is_active", true)
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: false });
      setCards(data || []);
      setLoading(false);
    })();
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const totalPages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const pageCards = useMemo(
    () => cards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [cards, page]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm overflow-y-auto overscroll-contain"
      onClick={onClose}
    >
      <div
        className="relative min-h-full w-full max-w-5xl mx-auto bg-gradient-to-b from-purple-950/60 via-black to-black border-x border-purple-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="fixed top-3 right-3 z-[210] w-11 h-11 flex items-center justify-center rounded-full bg-black/80 border border-purple-500/50 text-white hover:bg-purple-800/70 shadow-[0_0_20px_rgba(168,85,247,0.5)]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Sombras decorativas */}
        <div className="pointer-events-none absolute -top-40 -left-40 w-[400px] h-[400px] bg-purple-700/30 rounded-full blur-[120px]" />
        <div className="pointer-events-none absolute top-1/3 -right-40 w-[400px] h-[400px] bg-fuchsia-600/20 rounded-full blur-[120px]" />

        <div className="relative px-3 sm:px-5 py-8 pb-16">
          <header className="text-center mb-6 sm:mb-10 pt-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-900/40 border border-purple-500/40 mb-3">
              <Sparkles className="w-4 h-4 text-fuchsia-400" />
              <span className="text-[10px] sm:text-xs uppercase tracking-widest text-fuchsia-300">
                Exclusivo
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-300 via-fuchsia-400 to-purple-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(168,85,247,0.5)]">
              GAROTAS TOP 10
            </h1>
            <p className="mt-2 text-sm sm:text-base md:text-lg text-purple-200/80 font-medium px-4">
              Chinesas e as mais quentes das redes
            </p>
          </header>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
            </div>
          ) : pageCards.length === 0 ? (
            <div className="text-center py-20 text-purple-200/60">
              Nenhuma garota disponível no momento.
            </div>
          ) : (
            <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {pageCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => setSelected(card)}
                  className="group relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-purple-500/30 bg-gradient-to-br from-purple-950 to-black shadow-[0_0_20px_rgba(126,34,206,0.3)] hover:shadow-[0_0_40px_rgba(217,70,239,0.6)] hover:border-fuchsia-400 transition-all duration-300 hover:-translate-y-1"
                >
                  <img
                    src={card.imagem_url}
                    alt={card.nome}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
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
                      onError={() =>
                        setVideoFallbacks((prev) => ({ ...prev, [card.id]: true }))
                      }
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 text-left">
                    <h3 className="text-white font-bold text-xs sm:text-sm md:text-base drop-shadow-lg truncate">
                      {card.nome}
                    </h3>
                  </div>
                </button>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center flex-wrap gap-2 mt-8">
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
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg font-bold text-sm transition-all ${
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
      </div>

      {/* Sub-modal do card selecionado */}
      {selected && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-md bg-gradient-to-br from-purple-950 to-black border border-purple-500/40 rounded-2xl p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              aria-label="Fechar"
              className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center rounded-full bg-black/70 border border-purple-500/40 text-white hover:bg-purple-800/70"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-purple-300 to-fuchsia-400 bg-clip-text text-transparent mb-3 pr-8">
              {selected.nome}
            </h2>
            {selected.video_url && !videoFallbacks[selected.id] ? (
              <video
                key={selected.id}
                src={selected.video_url}
                poster={selected.imagem_url}
                autoPlay
                playsInline
                controls
                muted
                preload="auto"
                onError={() =>
                  setVideoFallbacks((prev) => ({ ...prev, [selected.id]: true }))
                }
                className="w-full rounded-xl aspect-[9/16] object-cover bg-black"
              />
            ) : (
              <img
                src={selected.imagem_url}
                alt={selected.nome}
                className="w-full rounded-xl aspect-[9/16] object-cover"
              />
            )}
            <Button
              onClick={() => {
                if (selected.cta_link) {
                  window.open(selected.cta_link, "_blank", "noopener,noreferrer");
                }
              }}
              className="w-full mt-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold py-6 text-base shadow-[0_0_30px_rgba(168,85,247,0.6)]"
            >
              {selected.cta_texto || "Assinar Conteúdo"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
