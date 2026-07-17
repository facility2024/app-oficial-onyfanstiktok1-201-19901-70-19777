import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Instagram, Loader2, RefreshCw, Trash2, Eye, EyeOff, Download } from "lucide-react";
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

export default function InstagramImportPanel() {
  const [username, setUsername] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [nextMaxId, setNextMaxId] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [videos, setVideos] = useState<IgVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastStats, setLastStats] = useState<{ imported: number; skipped: number; failed: number } | null>(null);

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

  const runImport = async (useMaxId: string) => {
    const u = username.trim().replace(/^@/, "").toLowerCase();
    if (!u) return toast.error("Digite o @username");
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-import", {
        body: { username: u, visibility, maxId: useMaxId },
      });
      if (error) throw new Error(error.message);
      const r: any = data;
      if (r?.error) throw new Error(r.error);
      setLastStats({ imported: r.imported, skipped: r.skipped, failed: r.failed });
      setNextMaxId(r.nextMaxId ?? "");
      toast.success(`Importados: ${r.imported} • Duplicados: ${r.skipped} • Falhas: ${r.failed}`);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao importar");
    } finally {
      setRunning(false);
    }
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
            <h3 className="text-xl font-bold text-white">Importar do Instagram (por @username)</h3>
            <p className="text-sm text-gray-400">1 requisição por página. Já importados são pulados automaticamente (sem cobrança).</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Label className="text-white text-xs">Username</Label>
            <Input
              value={username}
              onChange={(e) => { setUsername(e.target.value); setNextMaxId(""); }}
              placeholder="@keke"
              className="bg-gray-900 border-gray-700 text-white"
              disabled={running}
            />
          </div>
          <div className="flex items-end gap-3">
            <div className="flex items-center gap-2">
              <Switch id="vis" checked={visibility === "private"} onCheckedChange={(c) => setVisibility(c ? "private" : "public")} disabled={running} />
              <Label htmlFor="vis" className="text-white text-sm">
                {visibility === "private" ? "🔒 VIP" : "🌍 Público"}
              </Label>
            </div>
            <Button onClick={() => runImport("")} disabled={running} className="bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 text-white font-bold">
              {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Importar posts
            </Button>
            {nextMaxId && (
              <Button variant="outline" onClick={() => runImport(nextMaxId)} disabled={running}>
                Carregar mais
              </Button>
            )}
          </div>
        </div>

        {lastStats && (
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Badge className="bg-green-600">Importados: {lastStats.imported}</Badge>
            <Badge className="bg-yellow-600">Duplicados: {lastStats.skipped}</Badge>
            {lastStats.failed > 0 && <Badge className="bg-red-600">Falhas: {lastStats.failed}</Badge>}
          </div>
        )}
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
