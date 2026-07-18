import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, Eye, Link as LinkIcon, Pencil, X } from "lucide-react";
import PixCheckoutModal from "@/components/PixCheckoutModal";

interface Template {
  id: string;
  nome: string;
  slug: string;
  amount: number;
  product_name: string;
  product_description: string;
  product_image_url: string;
  redirect_to: string;
  storage_flag: string;
  ativo: boolean;
  ordem: number;
  model_id: string | null;
}

interface ModelOption { id: string; username: string; avatar_url: string | null; }

const empty = (): Template => ({
  id: "",
  nome: "",
  slug: "",
  amount: 14.97,
  product_name: "",
  product_description: "",
  product_image_url: "",
  redirect_to: "/garotas-top-vip",
  storage_flag: "garotas_top_paid",
  ativo: true,
  ordem: 0,
  model_id: null,
});

const slugify = (s: string) =>
  s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export const AdminCheckoutTemplates = ({ initialDraft }: { initialDraft?: Partial<Template> | null } = {}) => {
  const [list, setList] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Template | null>(null);
  const [modelSearch, setModelSearch] = useState("");
  const [modelResults, setModelResults] = useState<ModelOption[]>([]);

  // Abre o editor pré-preenchido quando um rascunho é enviado (ex: da aba global)
  useEffect(() => {
    if (initialDraft) setEditing({ ...empty(), ...initialDraft });
  }, [initialDraft]);



  useEffect(() => {
    const q = modelSearch.trim();
    if (!q) { setModelResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await (supabase as any)
        .from("models")
        .select("id,username,avatar_url")
        .ilike("username", `%${q}%`)
        .limit(10);
      setModelResults((data as ModelOption[]) || []);
    }, 250);
    return () => clearTimeout(t);
  }, [modelSearch]);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("checkout_templates")
      .select("*")
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: false });
    setList((data as Template[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => setEditing(empty());
  const openEdit = (t: Template) => setEditing({ ...t });

  const save = async () => {
    if (!editing) return;
    if (!editing.nome.trim()) return toast.error("Informe o nome do modelo");
    const slug = editing.slug.trim() || slugify(editing.nome);
    if (!slug) return toast.error("Slug inválido");
    setSaving(true);
    try {
      const payload = { ...editing, slug };
      if (editing.id) {
        const { error } = await (supabase as any)
          .from("checkout_templates").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { id: _omit, ...toInsert } = payload;
        void _omit;
        const { error } = await (supabase as any)
          .from("checkout_templates").insert(toInsert);
        if (error) throw error;
      }
      toast.success("Modelo salvo!");
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error("Erro ao salvar", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: Template) => {
    if (!confirm(`Excluir modelo "${t.nome}"?`)) return;
    const { error } = await (supabase as any)
      .from("checkout_templates").delete().eq("id", t.id);
    if (error) return toast.error("Erro ao excluir", { description: error.message });
    toast.success("Modelo excluído");
    load();
  };

  const copyLink = (t: Template) => {
    const url = `${window.location.origin}/checkout/${t.slug}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copiado!", { description: url }),
      () => toast.error("Não foi possível copiar", { description: url }),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Modelos de Checkout</h3>
          <p className="text-sm text-gray-400">
            Crie múltiplos modelos com valores e produtos diferentes. Cada modelo tem um link único.
          </p>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
          <Plus className="w-4 h-4 mr-2" /> Novo modelo
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center p-8 border border-dashed border-white/10 rounded-xl text-gray-400">
          Nenhum modelo criado ainda. Clique em <b>Novo modelo</b> para começar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((t) => (
            <div key={t.id} className="bg-gray-900 border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                {t.product_image_url ? (
                  <img src={t.product_image_url} alt="" className="w-16 h-20 object-cover rounded-lg border border-white/10 shrink-0" />
                ) : (
                  <div className="w-16 h-20 bg-white/5 rounded-lg shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-white font-bold truncate">{t.nome}</div>
                  <div className="text-xs text-gray-400 truncate">/checkout/{t.slug}</div>
                  <div className="text-emerald-400 font-black mt-1">
                    R$ {Number(t.amount).toFixed(2).replace(".", ",")}
                  </div>
                  {!t.ativo && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-bold">
                      INATIVO
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" onClick={() => setPreview(t)}
                  className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10">
                  <Eye className="w-3.5 h-3.5 mr-1" /> Prévia
                </Button>
                <Button size="sm" variant="outline" onClick={() => copyLink(t)}
                  className="border-white/20 text-white hover:bg-white/10">
                  <LinkIcon className="w-3.5 h-3.5 mr-1" /> Copiar link
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEdit(t)}
                  className="border-white/20 text-white hover:bg-white/10">
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => remove(t)}
                  className="border-red-500/40 text-red-300 hover:bg-red-500/10">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor drawer */}
      {editing && (
        <div className="fixed inset-0 z-[10050] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-gray-950 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                {editing.id ? "Editar modelo" : "Novo modelo de checkout"}
              </h3>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <Label className="text-white">Nome interno *</Label>
              <Input value={editing.nome}
                onChange={(e) => setEditing({ ...editing, nome: e.target.value, slug: editing.slug || slugify(e.target.value) })}
                placeholder="Ex: VIP Latinas R$14,97"
                className="bg-gray-800 border-white/10 text-white" />
            </div>

            <div>
              <Label className="text-white">Slug do link (URL)</Label>
              <Input value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                placeholder="vip-latinas"
                className="bg-gray-800 border-white/10 text-white font-mono" />
              <p className="text-xs text-gray-500 mt-1">
                Link final: <span className="text-emerald-400">{window.location.origin}/checkout/{editing.slug || "..."}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white">Valor (R$) *</Label>
                <Input type="number" step="0.01" min="0" value={editing.amount}
                  onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value) })}
                  className="bg-gray-800 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white">Ordem</Label>
                <Input type="number" value={editing.ordem}
                  onChange={(e) => setEditing({ ...editing, ordem: Number(e.target.value) })}
                  className="bg-gray-800 border-white/10 text-white" />
              </div>
            </div>

            <div>
              <Label className="text-white">Nome do produto (título no card)</Label>
              <Input value={editing.product_name}
                onChange={(e) => setEditing({ ...editing, product_name: e.target.value })}
                className="bg-gray-800 border-white/10 text-white" />
            </div>

            <div>
              <Label className="text-white">Descrição do produto</Label>
              <Textarea rows={3} value={editing.product_description}
                onChange={(e) => setEditing({ ...editing, product_description: e.target.value })}
                className="bg-gray-800 border-white/10 text-white" />
            </div>

            <div>
              <Label className="text-white">URL da imagem lateral</Label>
              <Input value={editing.product_image_url}
                onChange={(e) => setEditing({ ...editing, product_image_url: e.target.value })}
                placeholder="https://..."
                className="bg-gray-800 border-white/10 text-white font-mono text-xs" />
              {editing.product_image_url && (
                <img src={editing.product_image_url} alt="" className="mt-2 w-24 h-32 object-cover rounded-lg border border-white/10" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white">Link liberado após pagar</Label>
                <Input value={editing.redirect_to}
                  onChange={(e) => setEditing({ ...editing, redirect_to: e.target.value })}
                  placeholder="/garotas-top-vip ou https://..."
                  className="bg-gray-800 border-white/10 text-white font-mono text-xs" />
              </div>
              <div>
                <Label className="text-white">Flag de acesso (storage)</Label>
                <Input value={editing.storage_flag}
                  onChange={(e) => setEditing({ ...editing, storage_flag: e.target.value })}
                  className="bg-gray-800 border-white/10 text-white font-mono text-xs" />
              </div>
            </div>

            {/* Vínculo com modelo (opcional) */}
            <div className="border border-white/10 rounded-lg p-3 bg-white/5 space-y-2">
              <Label className="text-white">🔗 Vincular a uma modelo (opcional)</Label>
              <p className="text-xs text-gray-400">
                Se vinculado, esse checkout aparece como botão "Comprar" no perfil da modelo.
              </p>
              {editing.model_id ? (
                <div className="flex items-center justify-between gap-2 bg-emerald-500/10 border border-emerald-500/40 rounded-lg px-3 py-2">
                  <span className="text-emerald-300 text-sm font-mono truncate">
                    {editing.model_id}
                  </span>
                  <Button size="sm" variant="outline"
                    onClick={() => setEditing({ ...editing, model_id: null })}
                    className="border-red-500/40 text-red-300 hover:bg-red-500/10">
                    Remover
                  </Button>
                </div>
              ) : (
                <>
                  <Input value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="Buscar modelo pelo @username..."
                    className="bg-gray-800 border-white/10 text-white" />
                  {modelResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto border border-white/10 rounded-lg divide-y divide-white/10">
                      {modelResults.map((m) => (
                        <button key={m.id} type="button"
                          onClick={() => { setEditing({ ...editing, model_id: m.id }); setModelSearch(""); setModelResults([]); }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-left">
                          <img src={m.avatar_url || "/default-avatar.svg"} alt="" className="w-8 h-8 rounded-full object-cover" />
                          <span className="text-white text-sm">@{m.username}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>


            <label className="flex items-center gap-2 text-white font-semibold">
              <input type="checkbox" checked={editing.ativo}
                onChange={(e) => setEditing({ ...editing, ativo: e.target.checked })}
                className="w-4 h-4 accent-emerald-500" />
              Ativo (link público funciona)
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditing(null)}
                className="border-white/20 text-white hover:bg-white/10">Cancelar</Button>
              <Button onClick={save} disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <PixCheckoutModal
          open={!!preview}
          onClose={() => setPreview(null)}
          amount={preview.amount}
          productName={preview.product_name}
          productDescription={preview.product_description}
          productImage={preview.product_image_url || undefined}
          storageFlag={preview.storage_flag}
          redirectTo={preview.redirect_to}
        />
      )}
    </div>
  );
};

export default AdminCheckoutTemplates;
