import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Save, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Product {
  id: string;
  slug: string;
  name: string;
  type: "main" | "bump" | "upsell" | "subscription";
  image_url: string | null;
  description: string | null;
  default_price: number;
  access_key: string;
  is_active: boolean;
}

const empty = (): Partial<Product> => ({
  slug: "",
  name: "",
  type: "main",
  image_url: "",
  description: "",
  default_price: 0,
  access_key: "",
  is_active: true,
});

export default function AdminProducts() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Partial<Product>>(empty());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("products").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!draft.name || !draft.slug || !draft.access_key) {
      toast({ title: "Preencha nome, slug e chave de acesso", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("products").insert({
      slug: draft.slug,
      name: draft.name,
      type: draft.type,
      image_url: draft.image_url || null,
      description: draft.description || null,
      default_price: Number(draft.default_price || 0),
      access_key: draft.access_key,
      is_active: draft.is_active ?? true,
    });
    setSaving(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Produto criado" });
    setDraft(empty());
    load();
  };

  const patch = async (id: string, changes: Partial<Product>) => {
    const { error } = await (supabase as any).from("products").update(changes).eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await (supabase as any).from("products").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    load();
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-white">Produtos (Catálogo)</h2>
        <Button onClick={() => navigate("/admin?tab=access-pages")} className="bg-emerald-600 hover:bg-emerald-700">
          <Video className="w-4 h-4 mr-2" /> Cadastrar vídeos dos produtos
        </Button>
      </div>
      <p className="text-white/60 text-sm">
        Cada checkout, order bump ou assinatura é um produto. Vendas geram liberações individuais
        na tabela <code>user_entitlements</code>.
      </p>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h3 className="font-bold text-white flex items-center gap-2"><Plus /> Novo produto</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label className="text-white">Nome</Label>
            <Input value={draft.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <Label className="text-white">Slug (URL)</Label>
            <Input value={draft.slug || ""} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
          </div>
          <div>
            <Label className="text-white">Chave de acesso</Label>
            <Input value={draft.access_key || ""} onChange={(e) => setDraft({ ...draft, access_key: e.target.value })} placeholder="ex: garotas_ia" />
          </div>
          <div>
            <Label className="text-white">Tipo</Label>
            <select
              className="w-full h-10 rounded-md bg-gray-900 text-white border border-white/20 px-3"
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value as any })}
            >
              <option value="main" className="bg-gray-900 text-white">Principal</option>
              <option value="bump" className="bg-gray-900 text-white">Order Bump</option>
              <option value="upsell" className="bg-gray-900 text-white">Upsell</option>
              <option value="subscription" className="bg-gray-900 text-white">Assinatura</option>
            </select>
          </div>
          <div>
            <Label className="text-white">Preço padrão (R$)</Label>
            <Input type="number" step="0.01" value={draft.default_price ?? 0}
              onChange={(e) => setDraft({ ...draft, default_price: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-white">Imagem (URL)</Label>
            <Input value={draft.image_url || ""} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label className="text-white">Descrição</Label>
            <Textarea rows={2} value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
        </div>
        <Button onClick={save} disabled={saving} className="bg-green-600 hover:bg-green-500">
          {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} Criar produto
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="font-bold text-white">Produtos cadastrados</h3>
        {loading && <Loader2 className="animate-spin text-white" />}
        {!loading && items.length === 0 && <p className="text-white/60 text-sm">Nenhum produto ainda.</p>}
        {items.map((p) => (
          <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10">
              {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{p.name}</p>
              <p className="text-xs text-white/60">
                {p.type} • {p.access_key} • R$ {Number(p.default_price).toFixed(2)}
              </p>
            </div>
            <Button size="sm" variant="secondary"
              onClick={() => patch(p.id, { is_active: !p.is_active })}>
              {p.is_active ? "Desativar" : "Ativar"}
            </Button>
            <Button size="sm" onClick={() => navigate(`/admin?tab=access-pages&product=${p.id}`)}>
              <Video className="w-4 h-4 mr-1" /> Conteúdo
            </Button>
            <Button size="sm" variant="destructive" onClick={() => remove(p.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
