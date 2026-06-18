import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Save, X, Loader2 } from "lucide-react";

interface Card {
  id: string;
  nome: string;
  imagem_url: string;
  video_url: string | null;
  cta_texto: string;
  cta_link: string | null;
  ordem: number;
  is_active: boolean;
}

const emptyForm = {
  nome: "",
  imagem_url: "",
  video_url: "",
  cta_texto: "Assinar Conteúdo",
  cta_link: "",
  ordem: 0,
  is_active: true,
};

export const AdminAdsGarotasTop = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCards = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("ads_garotas_top")
      .select("*")
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar cards");
    setCards(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setIsCreating(false);
  };

  const startEdit = (c: Card) => {
    setEditingId(c.id);
    setIsCreating(false);
    setForm({
      nome: c.nome,
      imagem_url: c.imagem_url,
      video_url: c.video_url || "",
      cta_texto: c.cta_texto,
      cta_link: c.cta_link || "",
      ordem: c.ordem,
      is_active: c.is_active,
    });
  };

  const handleSave = async () => {
    if (!form.nome || !form.imagem_url) {
      toast.error("Nome e imagem são obrigatórios");
      return;
    }
    setSaving(true);
    const payload = {
      nome: form.nome,
      imagem_url: form.imagem_url,
      video_url: form.video_url || null,
      cta_texto: form.cta_texto || "Assinar Conteúdo",
      cta_link: form.cta_link || null,
      ordem: Number(form.ordem) || 0,
      is_active: form.is_active,
    };

    let error;
    if (editingId) {
      ({ error } = await (supabase as any)
        .from("ads_garotas_top")
        .update(payload)
        .eq("id", editingId));
    } else {
      ({ error } = await (supabase as any)
        .from("ads_garotas_top")
        .insert(payload));
    }

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success(editingId ? "Card atualizado!" : "Card criado!");
    resetForm();
    fetchCards();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este card?")) return;
    const { error } = await (supabase as any)
      .from("ads_garotas_top")
      .delete()
      .eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Card excluído");
    fetchCards();
  };

  const toggleActive = async (c: Card) => {
    await (supabase as any)
      .from("ads_garotas_top")
      .update({ is_active: !c.is_active })
      .eq("id", c.id);
    fetchCards();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Ads Garotas Top</h1>
          <p className="text-gray-400">Página /ads/garotas-top — máx. 20 por página</p>
        </div>
        {!isCreating && !editingId && (
          <Button
            onClick={() => {
              setIsCreating(true);
              setForm(emptyForm);
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
          >
            <Plus className="w-4 h-4 mr-2" /> Novo Card
          </Button>
        )}
      </div>

      {(isCreating || editingId) && (
        <Card className="bg-gray-900 border-purple-500/40">
          <CardHeader>
            <CardTitle className="text-white">
              {editingId ? "Editar Card" : "Novo Card"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Nome da modelo *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
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
              <div className="md:col-span-2">
                <Label className="text-white">URL da imagem *</Label>
                <Input
                  value={form.imagem_url}
                  onChange={(e) => setForm({ ...form, imagem_url: e.target.value })}
                  placeholder="https://..."
                  className="bg-gray-800 text-white border-gray-700"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-white">URL do vídeo (10s)</Label>
                <Input
                  value={form.video_url}
                  onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                  placeholder="https://..."
                  className="bg-gray-800 text-white border-gray-700"
                />
              </div>
              <div>
                <Label className="text-white">Texto do CTA</Label>
                <Input
                  value={form.cta_texto}
                  onChange={(e) => setForm({ ...form, cta_texto: e.target.value })}
                  className="bg-gray-800 text-white border-gray-700"
                />
              </div>
              <div>
                <Label className="text-white">Link do CTA</Label>
                <Input
                  value={form.cta_link}
                  onChange={(e) => setForm({ ...form, cta_link: e.target.value })}
                  placeholder="/subscribe"
                  className="bg-gray-800 text-white border-gray-700"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <Label className="text-white">Ativo</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white"
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
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Card key={c.id} className="bg-gray-900 border-gray-700 overflow-hidden">
              <div className="aspect-[3/4] relative bg-black">
                <img src={c.imagem_url} alt={c.nome} className="w-full h-full object-cover" />
                {!c.is_active && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <span className="text-red-400 font-bold">INATIVO</span>
                  </div>
                )}
              </div>
              <CardContent className="p-3 space-y-2">
                <h3 className="text-white font-bold truncate">{c.nome}</h3>
                <p className="text-xs text-gray-400">Ordem: {c.ordem}</p>
                <div className="flex items-center justify-between gap-2">
                  <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} />
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(c)}>
                      <Edit className="w-4 h-4 text-blue-400" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
