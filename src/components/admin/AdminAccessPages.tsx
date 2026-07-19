import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, Save, Eye, EyeOff, ArrowLeft, Package, LayoutGrid, ListPlus, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

interface Product { id: string; name: string; slug: string; }
interface AccessPage {
  id: string; product_id: string; slug: string | null;
  title: string; description: string | null; cover_url: string | null;
  is_published: boolean;
}
interface AccessCard {
  id: string; page_id: string; title: string; description: string | null;
  cover_url: string | null; sort_order: number; is_active: boolean; is_published: boolean;
}
interface AccessVideo {
  id: string; page_id: string; card_id: string | null; title: string; description: string | null;
  thumbnail_url: string | null; video_url: string; sort_order: number; is_active: boolean;
}

export default function AdminAccessPages() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const productParam = searchParams.get("product");
  const [pages, setPages] = useState<AccessPage[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AccessPage | null>(null);
  const [autoHandled, setAutoHandled] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: pg }, { data: pr }] = await Promise.all([
      (supabase as any).from("access_pages").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("products").select("id, name, slug").eq("is_active", true).order("name"),
    ]);
    setPages(pg ?? []);
    setProducts(pr ?? []);
    setLoading(false);
    return { pg: pg ?? [], pr: pr ?? [] };
  };

  useEffect(() => { load(); }, []);

  // Abre/cria página automaticamente quando ?product=<id> for passado
  useEffect(() => {
    if (loading || autoHandled || !productParam) return;
    setAutoHandled(true);
    (async () => {
      // Sempre consulta o banco (evita corrida com estado local desatualizado)
      const { data: fresh } = await (supabase as any)
        .from("access_pages").select("*").eq("product_id", productParam).maybeSingle();
      if (fresh) {
        setEditing(fresh);
      } else {
        const prod = products.find(p => p.id === productParam);
        if (!prod) { toast({ title: "Produto não encontrado", variant: "destructive" }); return; }
        const { data, error } = await (supabase as any).from("access_pages").upsert({
          product_id: prod.id, slug: prod.slug, title: prod.name, is_published: false,
        }, { onConflict: "product_id" }).select().single();
        if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
        await load();
        setEditing(data);
        toast({ title: "Página pronta", description: `Cadastre os vídeos de "${prod.name}"` });
      }
      searchParams.delete("product");
      setSearchParams(searchParams, { replace: true });
    })();
  }, [loading, autoHandled, productParam, pages, products]);


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
    if (!confirm("Excluir esta página e todos os módulos/vídeos?")) return;
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
        Cada produto vira uma área de membros com <b>módulos (cards)</b>. Cada card contém vários vídeos. Ao clicar no card, o comprador abre a lista de vídeos daquele módulo.
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
                    Produto: {prod?.name ?? "—"} · /acesso-produto/{p.product_id}
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

export function PageEditor({ page, products, onBack }: { page: AccessPage; products: Product[]; onBack: () => void; }) {
  const [form, setForm] = useState<AccessPage>(page);
  const [cards, setCards] = useState<AccessCard[]>([]);
  const [videos, setVideos] = useState<AccessVideo[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});
  const [showNewCard, setShowNewCard] = useState(false);
  const [creatingCard, setCreatingCard] = useState(false);
  const [newCard, setNewCard] = useState({ title: "", description: "", cover_url: "", video_urls: "" });

  const loadData = async () => {
    setLoading(true);
    const [{ data: c }, { data: v }] = await Promise.all([
      (supabase as any).from("access_page_cards").select("*").eq("page_id", page.id).order("sort_order"),
      (supabase as any).from("access_page_videos").select("*").eq("page_id", page.id).order("sort_order"),
    ]);
    setCards(c ?? []);
    setVideos(v ?? []);
    setLoading(false);
  };
  useEffect(() => { loadData(); }, [page.id]);

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

  const createCard = async (publish: boolean) => {
    const title = newCard.title.trim();
    if (!title) {
      toast({ title: "Digite o título do card", variant: "destructive" });
      return;
    }

    setCreatingCard(true);
    const { data, error } = await (supabase as any).from("access_page_cards").insert({
      page_id: page.id,
      title,
      description: newCard.description.trim() || null,
      cover_url: newCard.cover_url.trim() || null,
      sort_order: cards.length,
      is_active: true,
      is_published: publish,
    }).select().single();

    if (error || !data) {
      setCreatingCard(false);
      toast({ title: "Erro ao criar card", description: error?.message, variant: "destructive" });
      return;
    }

    const urls = newCard.video_urls.split(/\r?\n/).map(url => url.trim()).filter(url => url.length > 5);
    let createdVideos: AccessVideo[] = [];
    if (urls.length) {
      const rows = urls.map((videoUrl, index) => ({
        page_id: page.id,
        card_id: data.id,
        title: `Vídeo ${index + 1}`,
        video_url: videoUrl,
        sort_order: index,
        is_active: true,
      }));
      const { data: insertedVideos, error: videoError } = await (supabase as any)
        .from("access_page_videos").insert(rows).select();
      if (videoError) {
        toast({ title: "Card criado, mas houve erro nos vídeos", description: videoError.message, variant: "destructive" });
      } else {
        createdVideos = insertedVideos ?? [];
      }
    }

    setCards(current => [...current, data]);
    setVideos(current => [...current, ...createdVideos]);
    setNewCard({ title: "", description: "", cover_url: "", video_urls: "" });
    setShowNewCard(false);
    setCreatingCard(false);
    toast({ title: publish ? "Card criado e publicado" : "Card salvo como rascunho" });
  };

  const updateCard = async (id: string, patch: Partial<AccessCard>) => {
    setCards(cards.map(c => c.id === id ? { ...c, ...patch } : c));
    await (supabase as any).from("access_page_cards").update(patch).eq("id", id);
  };

  const removeCard = async (id: string) => {
    if (!confirm("Excluir módulo e todos os vídeos dele?")) return;
    await (supabase as any).from("access_page_cards").delete().eq("id", id);
    setCards(cards.filter(c => c.id !== id));
    setVideos(videos.filter(v => v.card_id !== id));
  };

  const moveCard = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= cards.length) return;
    const arr = [...cards];
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    const updated = arr.map((c, i) => ({ ...c, sort_order: i }));
    setCards(updated);
    await Promise.all(updated.map(c =>
      (supabase as any).from("access_page_cards").update({ sort_order: c.sort_order }).eq("id", c.id)
    ));
  };

  const addVideo = async (cardId: string) => {
    const inCard = videos.filter(v => v.card_id === cardId);
    const { data, error } = await (supabase as any).from("access_page_videos").insert({
      page_id: page.id, card_id: cardId,
      title: "Novo vídeo", video_url: "",
      sort_order: inCard.length, is_active: true,
    }).select().single();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setVideos([...videos, data]);
  };

  const bulkAddVideos = async (cardId: string, text: string) => {
    const urls = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 5);
    if (!urls.length) { toast({ title: "Cole ao menos uma URL", variant: "destructive" }); return; }
    const base = videos.filter(v => v.card_id === cardId).length;
    const rows = urls.map((u, i) => ({
      page_id: page.id, card_id: cardId,
      title: `Vídeo ${base + i + 1}`, video_url: u,
      sort_order: base + i, is_active: true,
    }));
    const { data, error } = await (supabase as any).from("access_page_videos").insert(rows).select();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setVideos([...videos, ...(data ?? [])]);
    toast({ title: `${urls.length} vídeos adicionados` });
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

  const moveVideo = async (cardId: string, idx: number, dir: -1 | 1) => {
    const list = videos.filter(v => v.card_id === cardId).sort((a, b) => a.sort_order - b.sort_order);
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    [list[idx], list[j]] = [list[j], list[idx]];
    const updated = list.map((v, i) => ({ ...v, sort_order: i }));
    setVideos(videos.map(v => {
      const u = updated.find(x => x.id === v.id);
      return u ?? v;
    }));
    await Promise.all(updated.map(v =>
      (supabase as any).from("access_page_videos").update({ sort_order: v.sort_order }).eq("id", v.id)
    ));
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Button>
        <h2 className="text-xl font-bold text-white flex-1">Editar área de membros</h2>
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
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <LayoutGrid className="w-5 h-5" /> Módulos (cards)
        </h3>
        <Button onClick={() => setShowNewCard(value => !value)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-1" /> Novo card
        </Button>
      </div>

      {showNewCard && (
        <div className="grid gap-4 rounded-lg border-2 border-emerald-600 bg-gray-900 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-white">Criar novo card</h4>
              <p className="text-xs text-gray-400">Este card aparecerá separado na página principal do produto.</p>
            </div>
            <span className="rounded bg-gray-800 px-2 py-1 text-xs font-bold text-gray-300">CARD #{cards.length + 1}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-1 md:col-span-2">
              <Label className="text-white">Título do card</Label>
              <Input
                value={newCard.title}
                onChange={(event) => setNewCard({ ...newCard, title: event.target.value })}
                placeholder="Ex.: Curso completo — Parte 1"
                className="bg-gray-950 border-gray-700 text-white"
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-white">URL da capa</Label>
              <Input
                value={newCard.cover_url}
                onChange={(event) => setNewCard({ ...newCard, cover_url: event.target.value })}
                placeholder="https://cdn.../capa.jpg"
                className="bg-gray-950 border-gray-700 text-white"
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-white">Descrição do card</Label>
              <Input
                value={newCard.description}
                onChange={(event) => setNewCard({ ...newCard, description: event.target.value })}
                placeholder="Descrição que aparecerá na página"
                className="bg-gray-950 border-gray-700 text-white"
              />
            </div>
          </div>
          <div className="grid gap-1">
            <Label className="text-white">Vídeos deste card — uma URL Bunny por linha</Label>
            <Textarea
              rows={7}
              value={newCard.video_urls}
              onChange={(event) => setNewCard({ ...newCard, video_urls: event.target.value })}
              placeholder={"https://cdn.../video-1.mp4\nhttps://cdn.../video-2.mp4\nhttps://cdn.../video-3.mp4"}
              className="bg-gray-950 border-gray-700 text-white font-mono text-sm"
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowNewCard(false)} disabled={creatingCard}>Cancelar</Button>
            <Button variant="secondary" onClick={() => createCard(false)} disabled={creatingCard}>
              {creatingCard && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Salvar rascunho
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => createCard(true)} disabled={creatingCard}>
              {creatingCard && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Salvar e publicar
            </Button>
          </div>
        </div>
      )}

      {cards.length > 0 && (
        <p className="text-sm font-semibold text-gray-300">Cards já criados — cada linha abaixo é um card separado:</p>
      )}

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-white" /></div>
      ) : cards.length === 0 ? (
        <div className="text-center text-gray-400 py-6 border border-dashed border-gray-800 rounded-lg">
          Nenhum módulo criado. Clique em "Novo card" para começar.
        </div>
      ) : (
        <div className="grid gap-3">
          {cards.map((card, ci) => {
            const cardVideos = videos.filter(v => v.card_id === card.id).sort((a, b) => a.sort_order - b.sort_order);
            const isOpen = openCards[card.id] ?? false;
            return (
              <div key={card.id} className="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
                <div className="p-3 flex items-center gap-2 bg-gray-950/50 flex-wrap">
                  <Button size="icon" variant="ghost" onClick={() => setOpenCards({ ...openCards, [card.id]: !isOpen })}>
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </Button>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded">CARD #{ci + 1}</span>
                  <div className="w-14 h-14 rounded-md overflow-hidden bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                    {card.cover_url ? (
                      <img src={card.cover_url} alt={card.title} className="w-full h-full object-cover" />
                    ) : (
                      <LayoutGrid className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                  <Input value={card.title}
                    onChange={(e) => updateCard(card.id, { title: e.target.value })}
                    placeholder="Título do módulo"
                    className="flex-1 min-w-[180px] bg-gray-950 border-gray-700 text-white font-bold" />
                  <span className="text-xs text-gray-400 whitespace-nowrap">{cardVideos.length} vídeo(s)</span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${card.is_published ? "bg-emerald-600 text-white" : "bg-yellow-600 text-white"}`}>
                    {card.is_published ? "PUBLICADO" : "RASCUNHO"}
                  </span>
                  <Button size="icon" variant="ghost" onClick={() => moveCard(ci, -1)} title="Subir"><ArrowUp className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => moveCard(ci, 1)} title="Descer"><ArrowDown className="w-4 h-4" /></Button>
                  <Button size="sm" variant="secondary"
                    onClick={() => setOpenCards({ ...openCards, [card.id]: !isOpen })}
                    title="Editar informações do card">
                    <Pencil className="w-4 h-4 mr-1" />{isOpen ? "Fechar" : "Editar"}
                  </Button>
                  <Button size="sm" variant={card.is_published ? "secondary" : "default"}
                    className={card.is_published ? "" : "bg-emerald-600 hover:bg-emerald-700"}
                    onClick={() => updateCard(card.id, { is_published: !card.is_published })}>
                    {card.is_published ? (<><EyeOff className="w-4 h-4 mr-1" />Despublicar</>) : (<><Eye className="w-4 h-4 mr-1" />Publicar</>)}
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => removeCard(card.id)} title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>


                {isOpen && (
                  <div className="p-3 grid gap-3 border-t border-gray-800">
                    <div className="grid md:grid-cols-2 gap-2">
                      <Input value={card.cover_url ?? ""}
                        onChange={(e) => updateCard(card.id, { cover_url: e.target.value })}
                        placeholder="URL da capa do card (miniatura)"
                        className="bg-gray-950 border-gray-700 text-white" />
                      <Input value={card.description ?? ""}
                        onChange={(e) => updateCard(card.id, { description: e.target.value })}
                        placeholder="Descrição curta"
                        className="bg-gray-950 border-gray-700 text-white" />
                    </div>

                    <BulkAddBox onSubmit={(t) => bulkAddVideos(card.id, t)} />

                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-semibold text-sm">Vídeos deste card</h4>
                      <Button size="sm" onClick={() => addVideo(card.id)} className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="w-4 h-4 mr-1" /> Adicionar vídeo
                      </Button>
                    </div>

                    {cardVideos.length === 0 ? (
                      <div className="text-center text-gray-500 text-sm py-4 border border-dashed border-gray-800 rounded">
                        Nenhum vídeo neste card ainda.
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {cardVideos.map((v, i) => (
                          <div key={v.id} className="p-2 rounded border border-gray-800 bg-gray-950 grid gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">#{i + 1}</span>
                              <Input value={v.title}
                                onChange={(e) => updateVideo(v.id, { title: e.target.value })}
                                placeholder="Título"
                                className="flex-1 bg-gray-900 border-gray-700 text-white text-sm" />
                              <Button size="icon" variant="ghost" onClick={() => moveVideo(card.id, i, -1)}><ArrowUp className="w-4 h-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => moveVideo(card.id, i, 1)}><ArrowDown className="w-4 h-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => updateVideo(v.id, { is_active: !v.is_active })}>
                                {v.is_active ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
                              </Button>
                              <Button size="icon" variant="destructive" onClick={() => removeVideo(v.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="grid md:grid-cols-2 gap-2">
                              <Input value={v.thumbnail_url ?? ""}
                                onChange={(e) => updateVideo(v.id, { thumbnail_url: e.target.value })}
                                placeholder="URL da miniatura"
                                className="bg-gray-900 border-gray-700 text-white text-sm" />
                              <Input value={v.video_url}
                                onChange={(e) => updateVideo(v.id, { video_url: e.target.value })}
                                placeholder="URL do vídeo (Bunny)"
                                className="bg-gray-900 border-gray-700 text-white text-sm" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BulkAddBox({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  if (!open) {
    return (
      <Button variant="secondary" size="sm" className="w-fit" onClick={() => setOpen(true)}>
        <ListPlus className="w-4 h-4 mr-1" /> Adicionar em lote (várias URLs)
      </Button>
    );
  }
  return (
    <div className="p-3 rounded border border-emerald-700/50 bg-emerald-950/20 grid gap-2">
      <Label className="text-emerald-300 text-sm">Cole uma URL por linha (Bunny CDN)</Label>
      <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)}
        placeholder={"https://cdn.bunny.net/video1.mp4\nhttps://cdn.bunny.net/video2.mp4"}
        className="bg-gray-950 border-gray-700 text-white text-sm font-mono" />
      <div className="flex gap-2">
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => { onSubmit(text); setText(""); setOpen(false); }}>
          Cadastrar todos
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setText(""); setOpen(false); }}>Cancelar</Button>
      </div>
    </div>
  );
}
