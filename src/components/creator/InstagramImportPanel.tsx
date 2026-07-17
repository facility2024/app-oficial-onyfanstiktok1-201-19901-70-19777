import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
  post_type?: string | null;
  created_at: string;
  ig_model_id: string | null;
};

const CONCURRENCY = 2;

function parseEntry(input: string): { kind: "shortcode" | "username"; value: string } | null {
  const s = input.trim();
  if (!s) return null;
  const sc = s.match(/instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
  if (sc) return { kind: "shortcode", value: sc[1] };
  const un = s.match(/instagram\.com\/([A-Za-z0-9._]{1,30})\/?/i);
  if (un && !/^(reel|reels|p|tv|explore|stories)$/i.test(un[1])) return { kind: "username", value: un[1].toLowerCase() };
  if (/^@[A-Za-z0-9._]{1,30}$/.test(s)) return { kind: "username", value: s.slice(1).toLowerCase() };
  if (/^[A-Za-z0-9_-]{5,20}$/.test(s) && !s.includes("/")) return { kind: "shortcode", value: s };
  return null;
}
function extractShortcode(input: string): string | null {
  const e = parseEntry(input);
  return e ? e.value : null;
}

export default function InstagramImportPanel() {
  const [rawInput, setRawInput] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [videos, setVideos] = useState<IgVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastStats, setLastStats] = useState<{ imported: number; skipped: number; failed: number } | null>(null);

  const parsedShortcodes = useMemo(() => {
    const lines = rawInput.split(/[\s,]+/).map((l) => l.trim()).filter(Boolean);
    return Array.from(new Set(lines.map(extractShortcode).filter((s): s is string => !!s)));
  }, [rawInput]);
  const invalidCount = useMemo(() => {
    const lines = rawInput.split(/[\s,]+/).map((l) => l.trim()).filter(Boolean);
    return lines.length - parsedShortcodes.length;
  }, [rawInput, parsedShortcodes.length]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ig_feed_videos")
      .select("id, ig_shortcode, video_url, thumbnail_url, caption, visibility, is_active, post_type, created_at, ig_model_id")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    else setVideos((data ?? []) as IgVideo[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const runImport = async () => {
    if (parsedShortcodes.length === 0) {
      return toast.error("Cole ao menos um link do Instagram (/p/ ou /reel/).");
    }
    setRunning(true);
    setProgress(0);
    setLastStats(null);

    const chunks: string[][] = [];
    for (let i = 0; i < parsedShortcodes.length; i += CONCURRENCY) {
      chunks.push(parsedShortcodes.slice(i, i + CONCURRENCY));
    }

    let done = 0, imp = 0, skp = 0, fail = 0;
    try {
      for (const chunk of chunks) {
        setProgressLabel(`Processando ${done + 1}–${done + chunk.length} de ${parsedShortcodes.length}`);
        const { data, error } = await supabase.functions.invoke("instagram-import", {
          body: { urls: chunk, visibility },
        });
        if (error) throw new Error(error.message);
        const r: any = data;
        if (r?.error) throw new Error(r.error);
        imp += r.imported ?? 0;
        skp += r.skipped ?? 0;
        fail += r.failed ?? 0;
        done += chunk.length;
        setProgress(Math.round((done / parsedShortcodes.length) * 100));
        setLastStats({ imported: imp, skipped: skp, failed: fail });
      }
      toast.success(`Importados: ${imp} • Duplicados: ${skp} • Falhas: ${fail}`);
      setRawInput("");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao importar");
    } finally {
      setRunning(false);
      setProgressLabel("");
    }
  };

  const toggleVisibility = async (v: IgVideo) => {
    const next = v.visibility === "public" ? "private" : "public";
    const { error } = await supabase.from("ig_feed_videos").update({ visibility: next }).eq("id", v.id);
    if (error) return toast.error(error.message);
    setVideos((arr) => arr.map((x) => (x.id === v.id ? { ...x, visibility: next } : x)));
  };

  const remove = async (v: IgVideo) => {
    if (!confirm("Remover este post do feed IG?")) return;
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
            <h3 className="text-xl font-bold text-white">Importar posts do Instagram (por link)</h3>
            <p className="text-sm text-gray-400">
              Cole links <code>/p/</code> ou <code>/reel/</code> — um por linha. Já importados são pulados
              <b> antes </b> de bater na RapidAPI (sem cobrança dupla). Cada mídia é copiada para a Bunny.
            </p>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-xs text-gray-400">
            Cole os links — o sistema detecta a modelo automaticamente pelo próprio post e cria o perfil (nome, foto HD, bio) na 1ª vez. Cobrança RapidAPI é única por shortcode.
          </p>
        </div>


        <Label className="text-white text-xs">Links do Instagram (um por linha)</Label>
        <Textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder={"https://www.instagram.com/reel/DZ-6MYwNTo-/\nhttps://www.instagram.com/p/ABC123xyz/"}
          rows={6}
          className="bg-gray-900 border-gray-700 text-white font-mono text-sm"
          disabled={running}
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Badge className="bg-blue-600">Válidos: {parsedShortcodes.length}</Badge>
          {invalidCount > 0 && <Badge className="bg-red-600">Ignorados: {invalidCount}</Badge>}
          <div className="flex items-center gap-2 ml-auto">
            <Switch id="vis" checked={visibility === "private"} onCheckedChange={(c) => setVisibility(c ? "private" : "public")} disabled={running} />
            <Label htmlFor="vis" className="text-white text-sm">
              {visibility === "private" ? "🔒 VIP" : "🌍 Público"}
            </Label>
          </div>
          <Button
            onClick={runImport}
            disabled={running || parsedShortcodes.length === 0}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 text-white font-bold"
          >
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Importar {parsedShortcodes.length > 0 ? `(${parsedShortcodes.length})` : ""}
          </Button>
        </div>

        {running && (
          <div className="mt-4 space-y-2">
            <Progress value={progress} />
            <p className="text-xs text-gray-400">{progressLabel} • {progress}%</p>
          </div>
        )}

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
          <h3 className="text-lg font-bold text-white">Posts importados ({videos.length})</h3>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>

        {videos.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Nenhum post importado ainda.</p>
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
                <div className="absolute top-2 left-2 flex gap-1">
                  <Badge className={v.visibility === "public" ? "bg-green-600" : "bg-yellow-600"}>
                    {v.visibility === "public" ? "Público" : "VIP"}
                  </Badge>
                  {v.post_type && v.post_type !== "video" && (
                    <Badge className="bg-purple-600">{v.post_type}</Badge>
                  )}
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
