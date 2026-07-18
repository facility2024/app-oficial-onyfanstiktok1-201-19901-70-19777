import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, Link as LinkIcon, Trash2, GripVertical, Image as ImgIcon, Video as VideoIcon } from "lucide-react";
import type { SideMediaItem } from "@/hooks/useCheckoutPixSettings";

const MAX_ITEMS = 5;
const MAX_VIDEO_SECONDS = 10;
const MAX_UPLOAD_MB = 15;
// URL assinada de longa duração (bucket é privado por política do workspace)
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 anos

async function getPlayableUrl(path: string): Promise<string> {
  const { data, error } = await (supabase as any).storage
    .from("checkout-media")
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) throw error || new Error("Falha ao gerar URL");
  return data.signedUrl as string;
}

function detectTypeByUrl(url: string): "image" | "video" {
  const clean = url.toLowerCase().split("?")[0];
  if (/\.(mp4|webm|mov|m4v|ogg)$/i.test(clean)) return "video";
  return "image";
}

async function validateVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = URL.createObjectURL(file);
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src);
      resolve(v.duration);
    };
    v.onerror = () => reject(new Error("Não foi possível ler o vídeo"));
  });
}

export function CheckoutSideMediaManager({
  value,
  onChange,
}: {
  value: SideMediaItem[];
  onChange: (next: SideMediaItem[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlType, setUrlType] = useState<"image" | "video">("image");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const items = Array.isArray(value) ? value : [];

  const canAdd = items.length < MAX_ITEMS;

  const addItem = (item: SideMediaItem) => {
    if (!canAdd) return toast.error(`Máximo de ${MAX_ITEMS} mídias`);
    onChange([...items, item]);
  };

  const removeAt = (i: number) => {
    const next = items.slice();
    next.splice(i, 1);
    onChange(next);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!canAdd) return toast.error(`Máximo de ${MAX_ITEMS} mídias`);
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) return toast.error("Envie apenas imagem ou vídeo");
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024)
      return toast.error(`Arquivo maior que ${MAX_UPLOAD_MB}MB`);

    if (isVideo) {
      try {
        const dur = await validateVideoDuration(file);
        if (dur > MAX_VIDEO_SECONDS + 0.5) {
          return toast.error(`Vídeo excede ${MAX_VIDEO_SECONDS}s`, {
            description: `Duração: ${dur.toFixed(1)}s`,
          });
        }
      } catch {
        return toast.error("Não foi possível validar duração do vídeo");
      }
    }

    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await (supabase as any).storage
        .from("checkout-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const url = await getPlayableUrl(path);
      addItem({ type: isVideo ? "video" : "image", url });
      toast.success("Mídia enviada!");
    } catch (e: any) {
      toast.error("Erro no upload", { description: e?.message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleAddUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) return toast.error("URL inválida (use http/https)");
    const type = urlType || detectTypeByUrl(url);
    addItem({ type, url });
    setUrlInput("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-white font-bold">
          🎞️ Mídia lateral do checkout (imagem + vídeo em loop até {MAX_VIDEO_SECONDS}s)
        </Label>
        <span className="text-[10px] text-gray-400">
          {items.length}/{MAX_ITEMS} · carrossel automático
        </span>
      </div>

      {/* Upload */}
      <div className="flex flex-wrap gap-2 items-center bg-gray-900 border border-white/10 rounded-lg p-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || !canAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
        >
          {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          Enviar arquivo
        </Button>
        <span className="text-xs text-gray-500">
          Imagem ou vídeo — máx {MAX_UPLOAD_MB}MB · vídeo até {MAX_VIDEO_SECONDS}s
        </span>
      </div>

      {/* URL */}
      <div className="flex flex-wrap gap-2 items-center bg-gray-900 border border-white/10 rounded-lg p-3">
        <select
          value={urlType}
          onChange={(e) => setUrlType(e.target.value as "image" | "video")}
          className="bg-gray-800 border border-white/10 text-white text-sm rounded-md px-2 h-10"
        >
          <option value="image">Imagem</option>
          <option value="video">Vídeo (loop)</option>
        </select>
        <Input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://... (URL direta)"
          className="bg-gray-800 border-white/10 text-white flex-1 min-w-[220px] font-mono text-xs"
        />
        <Button
          type="button"
          onClick={handleAddUrl}
          disabled={!canAdd}
          variant="outline"
          className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
        >
          <LinkIcon className="w-4 h-4 mr-2" /> Adicionar URL
        </Button>
      </div>

      {/* Lista */}
      {items.length === 0 ? (
        <div className="text-xs text-gray-500 text-center py-3 border border-dashed border-white/10 rounded-lg">
          Nenhuma mídia. Adicione até {MAX_ITEMS} — se vazio, usa a imagem única do card.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {items.map((it, i) => (
            <div key={i} className="relative group bg-gray-900 border border-white/10 rounded-lg overflow-hidden">
              <div className="aspect-[3/4] bg-black flex items-center justify-center">
                {it.type === "video" ? (
                  <video src={it.url} muted autoPlay loop playsInline className="w-full h-full object-cover" />
                ) : (
                  <img src={it.url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                {it.type === "video" ? <VideoIcon className="w-3 h-3" /> : <ImgIcon className="w-3 h-3" />}
                #{i + 1}
              </div>
              <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                  className="text-white text-xs bg-white/20 hover:bg-white/30 rounded px-1.5 py-0.5 disabled:opacity-30">
                  <GripVertical className="w-3 h-3 inline" />←
                </button>
                <button type="button" onClick={() => move(i, +1)} disabled={i === items.length - 1}
                  className="text-white text-xs bg-white/20 hover:bg-white/30 rounded px-1.5 py-0.5 disabled:opacity-30">
                  →<GripVertical className="w-3 h-3 inline" />
                </button>
                <button type="button" onClick={() => removeAt(i)}
                  className="text-red-300 text-xs bg-red-900/60 hover:bg-red-800 rounded px-1.5 py-0.5">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CheckoutSideMediaManager;
