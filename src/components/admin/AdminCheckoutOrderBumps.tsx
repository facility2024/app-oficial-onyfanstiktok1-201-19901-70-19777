import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Save, X, Loader2 } from "lucide-react";

interface Bump {
  id: string;
  titulo: string;
  descricao: string | null;
  valor: number;
  imagem_url: string | null;
  link_acesso: string | null;
  ativo: boolean;
  ordem: number;
  template_ids: string[] | null;
}

interface TemplateOpt { id: string; nome: string; slug: string; model_id: string | null; model_name?: string | null }

const empty = {
  titulo: "",
  descricao: "",
  valor: "",
  imagem_url: "",
  link_acesso: "",
  ativo: true,
  ordem: 0,
  template_ids: [] as string[],
};

export const AdminCheckoutOrderBumps = () => {
  const [items, setItems] = useState<Bump[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [mainLink, setMainLink] = useState("");
  const [mainLinkSaving, setMainLinkSaving] = useState(false);
  const [templates, setTemplates] = useState<TemplateOpt[]>([]);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("checkout_order_bumps")
      .select("*")
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar order bumps");
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const fetchMainLink = async () => {
    const { data } = await (supabase as any)
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "checkout_main_access_link")
      .maybeSingle();
    const v = data?.setting_value;
    setMainLink(typeof v === "string" ? v : (v ?? ""));
  };

  const saveMainLink = async () => {
    setMainLinkSaving(true);
    const { error } = await (supabase as any)
      .from("admin_settings")
      .upsert(
        { setting_key: "checkout_main_access_link", setting_value: mainLink.trim() },
        { onConflict: "setting_key" }
      );
    setMainLinkSaving(false);
    if (error) {
      toast.error("Erro ao salvar link: " + error.message);
      return;
    }
    toast.success("Link do produto principal salvo!");
  };

  useEffect(() => {
    fetchItems();
    fetchMainLink();
    (async () => {
      const { data } = await (supabase as any)
        .from("checkout_templates")
        .select("id,nome,slug,model_id")
        .eq("ativo", true)
        .order("nome", { ascending: true });
      setTemplates(data || []);
    })();
  }, []);

  const resetForm = () => {
    setForm(empty);
    setEditingId(null);
    setIsCreating(false);
  };

  const handleEdit = (b: Bump) => {
    setEditingId(b.id);
    setIsCreating(false);
    setForm({
      titulo: b.titulo,
      descricao: b.descricao || "",
      valor: String(b.valor ?? ""),
      imagem_url: b.imagem_url || "",
      link_acesso: b.link_acesso || "",
      ativo: b.ativo,
      ordem: b.ordem,
      template_ids: b.template_ids || [],
    });
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    const valorNum = Number(form.valor);
    if (!Number.isFinite(valorNum) || valorNum < 0) {
      toast.error("Valor inválido");
      return;
    }
    setSaving(true);
    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      valor: valorNum,
      imagem_url: form.imagem_url.trim() || null,
      link_acesso: form.link_acesso.trim() || null,
      ativo: form.ativo,
      ordem: Number(form.ordem) || 0,
      template_ids: form.template_ids.length ? form.template_ids : null,
    };
    const q = editingId
      ? (supabase as any).from("checkout_order_bumps").update(payload).eq("id", editingId)
      : (supabase as any).from("checkout_order_bumps").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success(editingId ? "Atualizado!" : "Criado!");
    resetForm();
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este order bump?")) return;
    const { error } = await (supabase as any)
      .from("checkout_order_bumps")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    toast.success("Excluído!");
    fetchItems();
  };

  const toggleActive = async (b: Bump) => {
    const { error } = await (supabase as any)
      .from("checkout_order_bumps")
      .update({ ativo: !b.ativo })
      .eq("id", b.id);
    if (error) {
      toast.error("Erro");
      return;
    }
    fetchItems();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white">Order Bumps do Checkout</h2>
          <p className="text-sm text-gray-400">
            Ofertas adicionais exibidas no checkout PIX. O valor marcado pelo usuário é somado
            automaticamente ao total.
          </p>
        </div>
        {!isCreating && !editingId && (
          <Button
            onClick={() => {
              setIsCreating(true);
              setForm(empty);
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
          >
            <Plus className="w-4 h-4 mr-2" /> Novo Order Bump
          </Button>
        )}
      </div>

      {/* Link de acesso ao produto principal */}
      <Card className="bg-gray-900 border-green-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">
            🎬 Link de acesso — Produto principal (vídeos)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label className="text-white">
            URL que o usuário verá após pagamento aprovado (botão "Meu acesso aos vídeos")
          </Label>
          <Input
            value={mainLink}
            onChange={(e) => setMainLink(e.target.value)}
            placeholder="https://exemplo.com/area-vip ou /garotas-top-vip"
            className="bg-gray-800 text-white border-gray-700"
          />
          <Button
            onClick={saveMainLink}
            disabled={mainLinkSaving}
            className="bg-green-600 hover:bg-green-700 text-white font-bold"
          >
            {mainLinkSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar link principal
          </Button>
        </CardContent>
      </Card>

      {(isCreating || editingId) && (
        <Card className="bg-gray-900 border-purple-700">
          <CardHeader>
            <CardTitle className="text-white">
              {editingId ? "Editar Order Bump" : "Novo Order Bump"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-white">Título *</Label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ex: Pacote Extra de Fotos"
                className="bg-gray-800 text-white border-gray-700"
              />
            </div>
            <div>
              <Label className="text-white">Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descrição curta"
                className="bg-gray-800 text-white border-gray-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white">Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  className="bg-gray-800 text-white border-gray-700"
                />
              </div>
              <div>
                <Label className="text-white">Ordem</Label>
                <Input
                  type="number"
                  value={form.ordem}
                  onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
                  className="bg-gray-800 text-white border-gray-700"
                />
              </div>
            </div>
            <div>
              <Label className="text-white">Imagem (URL, opcional)</Label>
              <Input
                value={form.imagem_url}
                onChange={(e) => setForm({ ...form, imagem_url: e.target.value })}
                placeholder="https://..."
                className="bg-gray-800 text-white border-gray-700"
              />
            </div>
            <div>
              <Label className="text-white">🔗 Link de acesso liberado ao comprar este bump *</Label>
              <Input
                value={form.link_acesso}
                onChange={(e) => setForm({ ...form, link_acesso: e.target.value })}
                placeholder="https://exemplo.com/minha-oferta-extra"
                className="bg-gray-800 text-white border-gray-700"
              />
              <p className="text-xs text-gray-400 mt-1">
                Após o pagamento aprovado, o usuário verá o botão "Acesso à minha oferta" apontando para este link.
              </p>
            </div>
            <div>
              <Label className="text-white">🎯 Onde exibir este Order Bump (opcional)</Label>
              <p className="text-xs text-gray-400 mb-2">
                Deixe <b>tudo desmarcado</b> para exibir em <b>todos</b> os checkouts (global + qualquer página PIX + modelos).
                Ou marque abaixo para restringir a páginas específicas.
              </p>
              <div className="max-h-56 overflow-y-auto border border-gray-700 rounded p-2 bg-gray-800 space-y-2">
                {/* Página global /checkout */}
                <label className="flex items-center gap-2 text-sm text-white cursor-pointer hover:bg-gray-700 px-1 rounded border-b border-gray-700 pb-2">
                  <input
                    type="checkbox"
                    checked={form.template_ids.includes("__global__")}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...form.template_ids, "__global__"]
                        : form.template_ids.filter((id) => id !== "__global__");
                      setForm({ ...form, template_ids: next });
                    }}
                    className="w-4 h-4 accent-green-500"
                  />
                  <span className="font-semibold">🌐 Página global /checkout</span>
                </label>

                {/* Páginas PIX standalone (sem modelo) */}
                <div className="text-xs text-purple-300 font-semibold mt-2">📄 Páginas PIX criadas</div>
                {templates.filter(t => !t.model_id).length === 0 && (
                  <div className="text-xs text-gray-500 pl-2">Nenhuma página PIX standalone.</div>
                )}
                {templates.filter(t => !t.model_id).map((t) => {
                  const checked = form.template_ids.includes(t.id);
                  return (
                    <label key={t.id} className="flex items-center gap-2 text-sm text-white cursor-pointer hover:bg-gray-700 px-1 rounded">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...form.template_ids, t.id]
                            : form.template_ids.filter((id) => id !== t.id);
                          setForm({ ...form, template_ids: next });
                        }}
                        className="w-4 h-4 accent-purple-500"
                      />
                      <span className="font-semibold">{t.nome}</span>
                      <span className="text-xs text-gray-400">/checkout/{t.slug}</span>
                    </label>
                  );
                })}

                {/* Páginas vinculadas a modelos */}
                <div className="text-xs text-pink-300 font-semibold mt-2">👤 Vinculadas a modelos</div>
                {templates.filter(t => t.model_id).length === 0 && (
                  <div className="text-xs text-gray-500 pl-2">Nenhuma vinculada a modelo.</div>
                )}
                {templates.filter(t => t.model_id).map((t) => {
                  const checked = form.template_ids.includes(t.id);
                  return (
                    <label key={t.id} className="flex items-center gap-2 text-sm text-white cursor-pointer hover:bg-gray-700 px-1 rounded">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...form.template_ids, t.id]
                            : form.template_ids.filter((id) => id !== t.id);
                          setForm({ ...form, template_ids: next });
                        }}
                        className="w-4 h-4 accent-pink-500"
                      />
                      <span className="font-semibold">{t.nome}</span>
                      <span className="text-xs text-gray-400">/checkout/{t.slug}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: v })}
              />
              <Label className="text-white">Ativo</Label>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white font-bold"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
              <Button onClick={resetForm} variant="outline">
                <X className="w-4 h-4 mr-2" /> Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((b) => (
            <Card key={b.id} className="bg-gray-900 border-gray-700">
              <CardContent className="p-4 space-y-3">
                {b.imagem_url && (
                  <img
                    src={b.imagem_url}
                    alt={b.titulo}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                )}
                <div>
                  <div className="text-white font-bold">{b.titulo}</div>
                  {b.descricao && (
                    <div className="text-xs text-gray-400 mt-1">{b.descricao}</div>
                  )}
                </div>
                <div className="text-green-400 font-black text-lg">
                  + R$ {Number(b.valor).toFixed(2).replace(".", ",")}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={b.ativo} onCheckedChange={() => toggleActive(b)} />
                    <span className="text-xs text-gray-300">{b.ativo ? "Ativo" : "Inativo"}</span>
                  </div>
                  <span className="text-xs text-gray-500">Ordem: {b.ordem}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleEdit(b)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDelete(b.id)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-400">
              Nenhum order bump cadastrado.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminCheckoutOrderBumps;
