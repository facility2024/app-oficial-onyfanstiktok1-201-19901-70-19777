import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, Save, Eye, EyeOff, ArrowLeft, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Product { id: string; name: string; slug: string; }
interface AccessPage {
  id: string; product_id: string; slug: string | null;
  title: string; description: string | null; cover_url: string | null;
  is_published: boolean;
}
interface AccessVideo {
  id: string; page_id: string; title: string; description: string | null;
  thumbnail_url: string | null; video_url: string; sort_order: number; is_active: boolean;
}

export default function AdminAccessPages() {
  const navigate = useNavigate();
  const [pages, setPages] = useState<AccessPage[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AccessPage | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: pg }, { data: pr }] = await Promise.all([
      (supabase as any).from("access_pages").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("products").select("id, name, slug").eq("is_active", true).order("name"),
    ]);
    setPages(pg ?? []);
    setProducts(pr ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createPage = async () => {
    const available = products.filter(p => !pages.some(pg => pg.product_id === p.id));
    if (!available.length) { toast({ title: "Todos os produtos já têm página" }); return; }
    const p = available[0];
    const { data, error } = await (supabase as any).from("access_pages").insert({
      product_id: p.id, slug: p.slug, title: p.name, is_published: false,
    }).select().single();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    await load();
    setEditing(data);
  };

  const removePage = async (id: string) => {
    if (!confirm("Excluir esta página e todos os vídeos?")) return;
    await (supabase as any).from("access_pages").delete().eq("id", id);
    toast({ title: "Página excluída" });
    load();
  };

  if (editing) {
    return <PageEditor page={editing} products={products} onBack={() => { setEditing(null); load(); }} />;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold text-white">Páginas de Acesso</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate("/admin?tab=products")}>
            <Package className="w-4 h-4 mr-1" /> Cadastrar produto
          </Button>
          <Button onClick={createPage} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-1" /> Nova página
          </Button>
        </div>
      </div>
      <p className="text-sm text-gray-400">
        Cada produto pode ter uma página de acesso. Ao aprovar o pagamento, o comprador é liberado automaticamente.
      </p>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-white" /></div>
      ) : pages.length === 0 ? (
        <div className="text-center text-gray-400 py-10">Nenhuma página criada.</div>
      ) : (
        <div className="grid gap-2">
          {pages.map((p) => {
            const prod = products.find(x => x.id === p.product_id);
            return (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-800 bg-gray-900">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{p.title}</p>
                  <p className="text-xs text-gray-400 truncate">
                    Produto: {prod?.name ?? "—"} · slug: /acesso-produto/{p.product_id}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${p.is_published ? "bg-emerald-600 text-white" : "bg-gray-700 text-gray-300"}`}>
                  {p.is_published ? "Publicada" : "Rascunho"}
                </span>
                <Button size="sm" variant="secondary" onClick={() => setEditing(p)}>Editar</Button>
                <Button size="sm" variant="destructive" onClick={() => removePage(p.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PageEditor({ page, products, onBack }: { page: AccessPage; products: Product[]; onBack: () => void; }) {
  const [form, setForm] = useState<AccessPage>(page);
  const [videos, setVideos] = useState<AccessVideo[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadVideos = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("access_page_videos").select("*").eq("page_id", page.id).order("sort_order");
    setVideos(data ?? []);
    setLoading(false);
  };
  useEffect(() => { loadVideos(); }, [page.id]);

  const savePage = async (publish?: boolean) => {
    setSaving(true);
    const payload: any = {
      product_id: form.product_id,
      title: form.title, description: form.description,
      cover_url: form.cover_url, slug: form.slug,
    };
    if (publish !== undefined) payload.is_published = publish;
    const { error } = await (supabase as any).from("access_pages").update(payload).eq("id", page.id);
    setSaving(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    if (publish !== undefined) setForm({ ...form, is_published: publish });
    toast({ title: publish ? "Publicada!" : "Salvo" });
  };

  const addVideo = async () => {
    const { data, error } = await (supabase as any).from("access_page_videos").insert({
      page_id: page.id, title: "Novo vídeo", video_url: "",
      sort_order: videos.length, is_active: true,
    }).select().single();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setVideos([...videos, data]);
  };

  const updateVideo = async (id: string, patch: Partial<AccessVideo>) => {
    setVideos(videos.map(v => v.id === id ? { ...v, ...patch } : v));
    await (supabase as any).from("access_page_videos").update(patch).eq("id", id);
  };

  const removeVideo = async (id: string) => {
    if (!confirm("Excluir vídeo?")) return;
    await (supabase as any).from("access_page_videos").delete().eq("id", id);
    setVideos(videos.filter(v => v.id !== id));
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= videos.length) return;
    const arr = [...videos];
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    const updated = arr.map((v, i) => ({ ...v, sort_order: i }));
    setVideos(updated);
    await Promise.all(updated.map(v =>
      (supabase as any).from("access_page_videos").update({ sort_order: v.sort_order }).eq("id", v.id)
    ));
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Button>
        <h2 className="text-xl font-bold text-white flex-1">Editar página de acesso</h2>
        <Button variant="secondary" onClick={() => savePage()} disabled={saving}>
          <Save className="w-4 h-4 mr-1" /> Salvar rascunho
        </Button>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => savePage(true)} disabled={saving}>
          Salvar e Publicar
        </Button>
      </div>

      <div className="grid gap-3 p-4 rounded-lg border border-gray-800 bg-gray-900">
        <div>
          <Label className="text-white">Produto vinculado</Label>
          <select
            className="w-full mt-1 p-2 rounded bg-gray-950 border border-gray-700 text-white"
            value={form.product_id}
            onChange={(e) => setForm({ ...form, product_id: e.target.value })}
          >
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-white">Título</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="bg-gray-950 border-gray-700 text-white" />
        </div>
        <div>
          <Label className="text-white">Descrição</Label>
          <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="bg-gray-950 border-gray-700 text-white" />
        </div>
        <div>
          <Label className="text-white">URL da capa</Label>
          <Input value={form.cover_url ?? ""} onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
            placeholder="https://cdn.../capa.jpg" className="bg-gray-950 border-gray-700 text-white" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Vídeos da página</h3>
        <Button onClick={addVideo} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-1" /> Adicionar vídeo
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-white" /></div>
      ) : videos.length === 0 ? (
        <div className="text-center text-gray-400 py-6 border border-dashed border-gray-800 rounded-lg">
          Nenhum vídeo cadastrado.
        </div>
      ) : (
        <div className="grid gap-3">
          {videos.map((v, i) => (
            <div key={v.id} className="p-3 rounded-lg border border-gray-800 bg-gray-900 grid gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">#{i + 1}</span>
                <Input value={v.title}
                  onChange={(e) => updateVideo(v.id, { title: e.target.value })}
                  placeholder="Título do vídeo"
                  className="flex-1 bg-gray-950 border-gray-700 text-white" />
                <Button size="icon" variant="ghost" onClick={() => move(i, -1)}><ArrowUp className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => move(i, 1)}><ArrowDown className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => updateVideo(v.id, { is_active: !v.is_active })}>
                  {v.is_active ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
                </Button>
                <Button size="icon" variant="destructive" onClick={() => removeVideo(v.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <Textarea value={v.description ?? ""}
                onChange={(e) => updateVideo(v.id, { description: e.target.value })}
                placeholder="Descrição"
                className="bg-gray-950 border-gray-700 text-white min-h-[60px]" />
              <div className="grid md:grid-cols-2 gap-2">
                <Input value={v.thumbnail_url ?? ""}
                  onChange={(e) => updateVideo(v.id, { thumbnail_url: e.target.value })}
                  placeholder="URL da miniatura"
                  className="bg-gray-950 border-gray-700 text-white" />
                <Input value={v.video_url}
                  onChange={(e) => updateVideo(v.id, { video_url: e.target.value })}
                  placeholder="URL do vídeo (Bunny)"
                  className="bg-gray-950 border-gray-700 text-white" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
