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

type ImportJob = {
  id: string;
  status: "queued" | "discovering" | "processing" | "completed" | "completed_with_errors" | "failed" | "cancelled";
  total_items: number;
  processed_items: number;
  imported_items: number;
  skipped_items: number;
  failed_items: number;
  last_error: string | null;
  created_at: string;
};

type Entry =
  | { kind: "username"; value: string; raw: string }
  | { kind: "shortcode"; value: string; raw: string };

function parseEntry(input: string): Entry | null {
  const s = input.trim();
  if (!s) return null;
  const sc = s.match(/instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
  if (sc) return { kind: "shortcode", value: sc[1], raw: s };
  const un = s.match(/instagram\.com\/([A-Za-z0-9._]{1,30})\/?/i);
  if (un && !/^(reel|reels|p|tv|explore|stories)$/i.test(un[1])) {
    return { kind: "username", value: un[1].toLowerCase(), raw: s };
  }
  if (/^@[A-Za-z0-9._]{1,30}$/.test(s)) return { kind: "username", value: s.slice(1).toLowerCase(), raw: s };
  if (/^[A-Za-z0-9._]{2,30}$/.test(s) && !s.includes("/")) return { kind: "username", value: s.toLowerCase(), raw: s };
  return null;
}

export default function InstagramImportPanel() {
  const [rawInput, setRawInput] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [maxPages, setMaxPages] = useState(1);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [videos, setVideos] = useState<IgVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastStats, setLastStats] = useState<{ imported: number; skipped: number; failed: number } | null>(null);
  const [activeJob, setActiveJob] = useState<ImportJob | null>(null);

  const parsed = useMemo(() => {
    const lines = rawInput.split(/\s+/).map((l) => l.trim()).filter(Boolean);
    const out: Entry[] = [];
    const seen = new Set<string>();
    for (const ln of lines) {
      const e = parseEntry(ln);
      if (!e) continue;
      const key = `${e.kind}:${e.value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
    }
    return out;
  }, [rawInput]);

  const usernames = useMemo(() => parsed.filter((p) => p.kind === "username"), [parsed]);
  const shortcodes = useMemo(() => parsed.filter((p) => p.kind === "shortcode"), [parsed]);
  const invalidCount = useMemo(() => {
    const lines = rawInput.split(/\s+/).map((l) => l.trim()).filter(Boolean);
    return lines.length - parsed.length;
  }, [rawInput, parsed.length]);

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

  useEffect(() => {
    const loadLatestJob = async () => {
      const { data } = await supabase
        .from("ig_import_jobs")
        .select("id, status, total_items, processed_items, imported_items, skipped_items, failed_items, last_error, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setActiveJob(data as ImportJob);
    };
    loadLatestJob();
    const channel = supabase
      .channel("ig-import-job-progress")
      .on("postgres_changes", { event: "*", schema: "public", table: "ig_import_jobs" }, (payload) => {
        const next = payload.new as ImportJob;
        if (!next?.id) return;
        setActiveJob((current) => !current || current.id === next.id || next.created_at > current.created_at ? next : current);
        setLastStats({ imported: next.imported_items, skipped: next.skipped_items, failed: next.failed_items });
        if (["completed", "completed_with_errors", "failed"].includes(next.status)) {
          setRunning(false);
          setProgressLabel("");
          load();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!activeJob) return;
    const total = Math.max(activeJob.total_items, 1);
    setProgress(Math.round((activeJob.processed_items / total) * 100));
    setLastStats({ imported: activeJob.imported_items, skipped: activeJob.skipped_items, failed: activeJob.failed_items });
    if (["queued", "discovering", "processing"].includes(activeJob.status)) {
      setRunning(true);
      setProgressLabel(activeJob.status === "discovering" ? "Buscando posts no Instagram…" : "Processando mídia em segundo plano…");
    }
  }, [activeJob]);

  const runImport = async () => {
    if (parsed.length === 0) {
      return toast.error("Cole @username, link do perfil ou link de /reel/ /p/.");
    }
    setRunning(true);
    setProgress(0);
    setLastStats(null);

    try {
      setProgressLabel("Buscando posts no Instagram…");
      const { data, error } = await supabase.functions.invoke("instagram-import", {
        body: { urls: parsed.map((entry) => entry.raw), visibility, maxPages },
      });
      if (error) throw new Error(error.message);
      const result: any = data;
      if (result?.error) throw new Error(result.error);
      const { data: job } = await supabase
        .from("ig_import_jobs")
        .select("id, status, total_items, processed_items, imported_items, skipped_items, failed_items, last_error, created_at")
        .eq("id", result.jobId)
        .single();
      if (job) setActiveJob(job as ImportJob);
      setLastStats({ imported: 0, skipped: result.skipped ?? 0, failed: result.failed ?? 0 });
      toast.success(`${result.queued ?? 0} posts enviados para a fila. Você pode sair desta tela.`);
      setRawInput("");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao importar");
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
            <h3 className="text-xl font-bold text-white">Importar do Instagram (por perfil)</h3>
            <p className="text-sm text-gray-400">
              Cole o link do perfil (<code>instagram.com/nomedamodelo</code>) ou <code>@username</code>.
              O sistema baixa todos os posts recentes de uma vez, cria a modelo automaticamente e envia mídia para a Bunny.
              Já importados são <b>pulados sem cobrar</b>.
            </p>
          </div>
        </div>

        <Label className="text-white text-xs">Perfis ou links (um por linha)</Label>
        <Textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder={"https://instagram.com/nomedamodelo\n@outra_modelo\nhttps://www.instagram.com/reel/DZ-6MYwNTo-/"}
          rows={6}
          className="bg-gray-900 border-gray-700 text-white font-mono text-sm"
          disabled={running}
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Badge className="bg-blue-600">Perfis: {usernames.length}</Badge>
          <Badge className="bg-purple-600">Posts avulsos: {shortcodes.length}</Badge>
          {invalidCount > 0 && <Badge className="bg-red-600">Ignorados: {invalidCount}</Badge>}

          <div className="flex items-center gap-2">
            <Label className="text-white text-xs">Páginas por perfil</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={maxPages}
              onChange={(e) => setMaxPages(Math.min(5, Math.max(1, parseInt(e.target.value || "1", 10))))}
              className="w-16 h-8 bg-gray-900 border-gray-700 text-white"
              disabled={running}
            />
            <span className="text-xs text-gray-400">(~12 posts/pg)</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Switch id="vis" checked={visibility === "private"} onCheckedChange={(c) => setVisibility(c ? "private" : "public")} disabled={running} />
            <Label htmlFor="vis" className="text-white text-sm">
              {visibility === "private" ? "🔒 VIP" : "🌍 Público"}
            </Label>
          </div>
          <Button
            onClick={runImport}
            disabled={running || parsed.length === 0}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 text-white font-bold"
          >
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Importar {parsed.length > 0 ? `(${parsed.length})` : ""}
          </Button>
        </div>

        {(running || activeJob) && (
          <div className="mt-4 space-y-2">
            <Progress value={progress} />
            <div className="flex items-center justify-between gap-3 text-xs text-gray-400">
              <p>{progressLabel || "Última importação concluída"} • {progress}%</p>
              {activeJob && <Badge className={activeJob.status === "completed" ? "bg-green-600" : activeJob.status === "failed" ? "bg-red-600" : "bg-blue-600"}>{activeJob.status}</Badge>}
            </div>
            {activeJob?.last_error && <p className="text-xs text-red-400">{activeJob.last_error}</p>}
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
