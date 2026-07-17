import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Instagram, Loader2, RefreshCw, Trash2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type IgVideo = {
  id: string;
  ig_shortcode: string | null;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  visibility: "public" | "private";
  is_active: boolean;
  created_at: string;
  ig_model_id: string | null;
};

const CONCURRENCY = 3;

export default function InstagramImportPanel() {
  const [urls, setUrls] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [videos, setVideos] = useState<IgVideo[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ig_feed_videos")
      .select("id, ig_shortcode, video_url, thumbnail_url, caption, visibility, is_active, created_at, ig_model_id")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    else setVideos((data ?? []) as IgVideo[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const importOne = async (url: string) => {
    const { data, error } = await supabase.functions.invoke("instagram-import", {
      body: { url, visibility },
    });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return data;
  };

  const handleImport = async () => {
    const list = urls.split(/\s|,|\n/g).map((s) => s.trim()).filter(Boolean);
    if (!list.length) return toast.error("Cole ao menos uma URL do Instagram");
    setImporting(true);
    setProgress({ done: 0, total: list.length });
    let ok = 0, skip = 0, fail = 0;
    const queue = [...list];
    const workers = Array.from({ length: Math.min(CONCURRENCY, list.length) }, async () => {
      while (queue.length) {
        const url = queue.shift()!;
        try {
          const r: any = await importOne(url);
          if (r?.skipped) skip++; else ok++;
        } catch (e: any) {
          fail++;
          console.error(url, e);
        }
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }
    });
    await Promise.all(workers);
    setImporting(false);
    toast.success(`Importado: ${ok} • Duplicados: ${skip} • Falhas: ${fail}`);
    setUrls("");
    load();
  };

  const toggleVisibility = async (v: IgVideo) => {
    const next = v.visibility === "public" ? "private" : "public";
    const { error } = await supabase.from("ig_feed_videos").update({ visibility: next }).eq("id", v.id);
    if (error) return toast.error(error.message);
    setVideos((arr) => arr.map((x) => (x.id === v.id ? { ...x, visibility: next } : x)));
  };

  const remove = async (v: IgVideo) => {
    if (!confirm("Remover este vídeo do feed IG?")) return;
    const { error } = await supabase.from("ig_feed_videos").delete().eq("id", v.id);
    if (error) return toast.error(error.message);
    setVideos((arr) => arr.filter((x) => x.id !== v.id));
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800/50 border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
            <Instagram className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Importar do Instagram</h3>
            <p className="text-sm text-gray-400">Cole uma ou várias URLs de reels/posts (uma por linha)</p>
          </div>
        </div>

        <Textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder={"https://www.instagram.com/reel/XXXXXXXXX/\nhttps://www.instagram.com/p/YYYYYYYYY/"}
          className="min-h-[140px] bg-gray-900 border-gray-700 text-white font-mono text-sm"
          disabled={importing}
        />

        <div className="flex flex-wrap items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Switch id="vis" checked={visibility === "private"} onCheckedChange={(c) => setVisibility(c ? "private" : "public")} disabled={importing} />
            <Label htmlFor="vis" className="text-white">
              {visibility === "private" ? "🔒 Privado (VIP)" : "🌍 Público"}
            </Label>
          </div>

          <Button onClick={handleImport} disabled={importing} className="bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 text-white font-bold ml-auto">
            {importing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importando {progress.done}/{progress.total}...</>
            ) : (
              <><Instagram className="w-4 h-4 mr-2" /> Importar</>
            )}
          </Button>
        </div>
      </Card>

      <Card className="bg-gray-800/50 border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Vídeos importados ({videos.length})</h3>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>

        {videos.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Nenhum vídeo importado ainda.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {videos.map((v) => (
              <div key={v.id} className="relative rounded-lg overflow-hidden bg-gray-900 border border-gray-700 group">
                <div className="aspect-[9/16] bg-black">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt={v.caption ?? ""} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <video src={v.video_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                  )}
                </div>
                <div className="absolute top-2 left-2">
                  <Badge className={v.visibility === "public" ? "bg-green-600" : "bg-yellow-600"}>
                    {v.visibility === "public" ? "Público" : "VIP"}
                  </Badge>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent flex gap-1">
                  <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => toggleVisibility(v)} title="Alternar visibilidade">
                    {v.visibility === "public" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => remove(v)} title="Remover">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
