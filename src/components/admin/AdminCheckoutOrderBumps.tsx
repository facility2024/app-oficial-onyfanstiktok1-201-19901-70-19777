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
}

const empty = {
  titulo: "",
  descricao: "",
  valor: "",
  imagem_url: "",
  link_acesso: "",
  ativo: true,
  ordem: 0,
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
      ativo: form.ativo,
      ordem: Number(form.ordem) || 0,
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
