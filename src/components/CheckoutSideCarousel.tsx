import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import type { SideMediaItem } from "@/hooks/useCheckoutPixSettings";

interface Props {
  items: SideMediaItem[];
  fallbackImage: string;
  productName: string;
  intervalMs?: number;
}

export function CheckoutSideCarousel({ items, fallbackImage, productName, intervalMs = 4000 }: Props) {
  const list: SideMediaItem[] =
    items && items.length > 0 ? items : [{ type: "image", url: fallbackImage }];
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (list.length <= 1) return;
    const current = list[idx];
    // Só auto-avança em imagens; vídeos ficam parados até o usuário revelar
    if (current?.type === "video") return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % list.length), intervalMs);
    return () => clearTimeout(t);
  }, [idx, list, intervalMs]);

  const current = list[idx] ?? list[0];
  const isRevealed = !!revealed[idx];

  return (
    <div className="w-full aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 mb-3 relative">
      {current.type === "video" ? (
        isRevealed ? (
          <video
            key={`v-${idx}-${current.url}`}
            src={current.url}
            className="w-full h-full object-cover"
            autoPlay
            controls
            playsInline
            loop={list.length === 1}
            onEnded={() => list.length > 1 && setIdx((i) => (i + 1) % list.length)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setRevealed((r) => ({ ...r, [idx]: true }))}
            className="relative w-full h-full block group"
            aria-label="Reproduzir vídeo"
          >
            <video
              src={`${current.url}#t=0.1`}
              preload="metadata"
              muted
              playsInline
              className="w-full h-full object-cover blur-md brightness-50 pointer-events-none"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Eye className="w-8 h-8 text-white drop-shadow-lg" />
              </span>
            </span>
          </button>
        )
      ) : (
        <img
          key={`i-${idx}-${current.url}`}
          src={current.url}
          alt={productName}
          className="w-full h-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      )}
      {list.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {list.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Mídia ${i + 1}`}
              className={`w-2 h-2 rounded-full transition ${i === idx ? "bg-white" : "bg-white/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CheckoutSideCarousel;

