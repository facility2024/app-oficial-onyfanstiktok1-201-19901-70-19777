import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Flame, ChevronLeft, ChevronRight, Loader2, X, Home } from "lucide-react";
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
  checkout_template_id?: string | null;
}

async function openCheckoutTemplate(templateId: string): Promise<boolean> {
  try {
    const { data } = await (supabase as any)
      .from("checkout_templates")
      .select("slug, ativo")
      .eq("id", templateId)
      .maybeSingle();
    if (data?.slug && data?.ativo !== false) {
      window.location.href = `/checkout/${data.slug}`;
      return true;
    }
  } catch {}
  return false;
}

const PAGE_SIZE = 20;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AdsLatinasModal({ open, onClose }: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Card | null>(null);
  const [videoFallbacks, setVideoFallbacks] = useState<Record<string, boolean>>({});
  const [showPix, setShowPix] = useState(false);
  const { price: fallbackPrice } = useCheckoutPrice("latinas");
  const checkoutAmount = selected?.valor && selected.valor > 0 ? Number(selected.valor) : fallbackPrice;
  const price = fallbackPrice;

  useEffect(() => {
    if (!open) return;
    setPage(1);
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("ads_latinas")
        .select("*")
        .eq("is_active", true)
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: false });
      setCards(data || []);
      setLoading(false);
    })();
  }, [open]);

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

  return createPortal(
    <div
      data-modal-root
      className="fixed inset-0 z-[10030] bg-black/90 backdrop-blur-sm overflow-y-scroll overscroll-contain ads-modal-scroll"
      onClick={onClose}
    >
      <div
        className="relative min-h-full w-full max-w-5xl mx-auto bg-gradient-to-b from-rose-950/60 via-black to-black border-x border-pink-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Voltar para Home"
          className="fixed top-3 left-3 z-[10040] flex items-center gap-1.5 px-3 h-11 rounded-full bg-black/80 border border-pink-500/50 text-white hover:bg-pink-800/70 shadow-[0_0_20px_rgba(236,72,153,0.5)] text-sm font-semibold"
        >
          <Home className="w-4 h-4" /> Home
        </button>

        <button
          onClick={onClose}
          aria-label="Fechar"
          className="fixed top-3 right-3 z-[10040] w-11 h-11 flex items-center justify-center rounded-full bg-black/80 border border-pink-500/50 text-white hover:bg-pink-800/70 shadow-[0_0_20px_rgba(236,72,153,0.5)]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="pointer-events-none absolute -top-40 -left-40 w-[400px] h-[400px] bg-pink-700/30 rounded-full blur-[120px]" />
        <div className="pointer-events-none absolute top-1/3 -right-40 w-[400px] h-[400px] bg-red-600/20 rounded-full blur-[120px]" />

        <div className="relative px-3 sm:px-5 py-8 pb-16">
          <header className="text-center mb-6 sm:mb-10 pt-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-900/40 border border-pink-500/40 mb-3">
              <Flame className="w-4 h-4 text-red-400" />
              <span className="text-[10px] sm:text-xs uppercase tracking-widest text-pink-300">
                Quentes
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-pink-300 via-red-400 to-pink-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(236,72,153,0.5)]">
              LATINAS
            </h1>
            <p className="mt-2 text-sm sm:text-base md:text-lg text-pink-200/80 font-medium px-4">
              As mais gostosas da América Latina
            </p>
            <p className="mt-3 text-xs sm:text-sm md:text-base text-pink-100/90 px-4 max-w-2xl mx-auto leading-relaxed">
              São vários vídeos atualizados todas as semanas com as mais lindas da internet.
            </p>
            <button
              onClick={() => setShowPix(true)}
              className="mt-4 inline-flex flex-col items-center gap-1 px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-600/40 to-red-600/40 hover:from-pink-500/60 hover:to-red-500/60 border border-pink-400/60 shadow-[0_0_25px_rgba(236,72,153,0.5)] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]">
                Tudo isso por <span className="text-yellow-300">R$ {price.toFixed(2).replace(".", ",")}</span>
              </span>
              <span className="text-[10px] sm:text-xs uppercase tracking-widest text-pink-200 font-bold animate-pulse">
                🔥 Pagar com PIX — acesso imediato 🔥
              </span>
            </button>
          </header>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-pink-400" />
            </div>
          ) : pageCards.length === 0 ? (
            <div className="text-center py-20 text-pink-200/60">
              Nenhuma latina disponível no momento.
            </div>
          ) : (
            <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {pageCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => setSelected(card)}
                  className="group relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-pink-500/30 bg-gradient-to-br from-rose-950 to-black shadow-[0_0_20px_rgba(190,24,93,0.3)] hover:shadow-[0_0_40px_rgba(244,63,94,0.6)] hover:border-red-400 transition-all duration-300 hover:-translate-y-1"
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
                className="border-pink-500/40 bg-rose-950/40 text-pink-200 hover:bg-pink-800/40"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg font-bold text-sm transition-all ${
                    page === i + 1
                      ? "bg-gradient-to-r from-pink-600 to-red-600 text-white shadow-[0_0_20px_rgba(236,72,153,0.6)]"
                      : "bg-rose-950/40 text-pink-200 hover:bg-pink-800/40 border border-pink-500/30"
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
                className="border-pink-500/40 bg-rose-950/40 text-pink-200 hover:bg-pink-800/40"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-md bg-gradient-to-br from-rose-950 to-black border border-pink-500/40 rounded-2xl p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              aria-label="Fechar"
              className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center rounded-full bg-black/70 border border-pink-500/40 text-white hover:bg-pink-800/70"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-pink-300 to-red-400 bg-clip-text text-transparent mb-3 pr-8">
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
                loop
                preload="auto"
                onLoadedMetadata={(e) => e.currentTarget.play().catch(() => {})}
                onCanPlay={(e) => e.currentTarget.play().catch(() => {})}
                onPause={(e) => { if (!e.currentTarget.ended) e.currentTarget.play().catch(() => {}); }}
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
              onClick={async () => {
                if (selected?.checkout_template_id) {
                  const ok = await openCheckoutTemplate(selected.checkout_template_id);
                  if (ok) return;
                }
                setSelected(null);
                setShowPix(true);
              }}
              className="w-full mt-4 bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-500 hover:to-red-500 text-white font-bold py-6 text-base shadow-[0_0_30px_rgba(236,72,153,0.6)]"
            >
              Assinar por R$ {(selected?.valor && selected.valor > 0 ? Number(selected.valor) : price).toFixed(2).replace(".", ",")} via PIX
            </Button>
          </div>
        </div>
      )}

      <PixCheckoutModal
        open={showPix}
        onClose={() => setShowPix(false)}
        amount={checkoutAmount}
        productName="Assinatura Latinas 🌶️"
        storageFlag="latinas_paid"
        redirectTo="/garotas-top-vip"
      />
    </div>,
    document.body
  );
}
