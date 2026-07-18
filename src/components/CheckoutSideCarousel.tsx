import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (list.length <= 1) return;
    const current = list[idx];
    if (current?.type === "video") return; // vídeo avança no onEnded
    const t = setTimeout(() => setIdx((i) => (i + 1) % list.length), intervalMs);
    return () => clearTimeout(t);
  }, [idx, list, intervalMs]);

  const current = list[idx] ?? list[0];

  return (
    <div className="w-full aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 mb-3 relative">
      {current.type === "video" ? (
        <video
          key={`v-${idx}-${current.url}`}
          src={current.url}
          className="w-full h-full object-cover"
          autoPlay
          muted
          playsInline
          loop={list.length === 1}
          onEnded={() => list.length > 1 && setIdx((i) => (i + 1) % list.length)}
        />
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
