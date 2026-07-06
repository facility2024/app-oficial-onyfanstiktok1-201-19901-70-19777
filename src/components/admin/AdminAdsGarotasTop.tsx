import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Save, X, Loader2 } from "lucide-react";


type Categoria = "garotas_top" | "latinas";
const TABLE_BY_CAT: Record<Categoria, string> = {
  garotas_top: "ads_garotas_top",
  latinas: "ads_latinas",
};
const CAT_LABEL: Record<Categoria, string> = {
  garotas_top: "Garotas Top",
  latinas: "Latinas 🌶️",
};

interface CardItem {
  id: string;
  nome: string;
  imagem_url: string;
  video_url: string | null;
  cta_texto: string;
  valor: number | null;
  ordem: number;
  is_active: boolean;
  _categoria: Categoria;
}

const emptyForm = {
  nome: "",
  imagem_url: "",
  video_url: "",
  cta_texto: "Assinar Conteúdo",
  valor: "",
  ordem: 0,
  is_active: true,
  categoria: "garotas_top" as Categoria,
};

export const AdminAdsGarotasTop = () => {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCat, setEditingCat] = useState<Categoria | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | Categoria>("all");

  const fetchCards = async () => {
    setLoading(true);
    const [gt, lt] = await Promise.all([
      (supabase as any).from("ads_garotas_top").select("*")
        .order("ordem", { ascending: true }).order("created_at", { ascending: false }),
      (supabase as any).from("ads_latinas").select("*")
        .order("ordem", { ascending: true }).order("created_at", { ascending: false }),
    ]);
    if (gt.error || lt.error) toast.error("Erro ao carregar cards");
    const merged: CardItem[] = [
      ...((gt.data || []).map((c: any) => ({ ...c, _categoria: "garotas_top" as Categoria }))),
      ...((lt.data || []).map((c: any) => ({ ...c, _categoria: "latinas" as Categoria }))),
    ];
    setCards(merged);
    setLoading(false);
  };

  useEffect(() => { fetchCards(); }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setEditingCat(null);
    setIsCreating(false);
  };

  const startEdit = (c: CardItem) => {
    setEditingId(c.id);
    setEditingCat(c._categoria);
    setIsCreating(false);
    setForm({
      nome: c.nome,
      imagem_url: c.imagem_url,
      video_url: c.video_url || "",
      cta_texto: c.cta_texto,
      cta_link: c.cta_link || "",
      ordem: c.ordem,
      is_active: c.is_active,
      categoria: c._categoria,
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
      ordem: editingId ? Number(form.ordem) || 0 : 0,
      is_active: form.is_active,
    };

    let error: any;
    if (editingId && editingCat) {
      if (editingCat !== form.categoria) {
        // Mover entre categorias: insere no novo, apaga do antigo
        const ins = await (supabase as any).from(TABLE_BY_CAT[form.categoria]).insert(payload);
        if (ins.error) error = ins.error;
        else {
          const del = await (supabase as any).from(TABLE_BY_CAT[editingCat]).delete().eq("id", editingId);
          if (del.error) error = del.error;
        }
      } else {
        ({ error } = await (supabase as any)
          .from(TABLE_BY_CAT[editingCat])
          .update(payload).eq("id", editingId));
      }
    } else {
      ({ error } = await (supabase as any)
        .from(TABLE_BY_CAT[form.categoria]).insert(payload));
    }

    setSaving(false);
    if (error) {
      toast.error(
        error.message?.includes("row-level security")
          ? "Erro ao salvar: confirme que você está logado como admin"
          : "Erro ao salvar: " + error.message
      );
      return;
    }
    toast.success(editingId ? "Card atualizado!" : "Card criado!");
    resetForm();
    fetchCards();
  };

  const handleDelete = async (c: CardItem) => {
    if (!confirm("Excluir este card?")) return;
    const { error } = await (supabase as any)
      .from(TABLE_BY_CAT[c._categoria]).delete().eq("id", c.id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Card excluído");
    fetchCards();
  };

  const toggleActive = async (c: CardItem) => {
    await (supabase as any)
      .from(TABLE_BY_CAT[c._categoria])
      .update({ is_active: !c.is_active }).eq("id", c.id);
    fetchCards();
  };

  const visibleCards = filter === "all" ? cards : cards.filter((c) => c._categoria === filter);

  return (
    <div className="space-y-6">
      <AdminCheckoutPrices />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black text-white">Ads Garotas Top / Latinas</h1>
          <p className="text-gray-400">Escolha a categoria ao criar — cards novos entram no topo</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[180px] bg-gray-800 text-white border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              <SelectItem value="garotas_top">Garotas Top</SelectItem>
              <SelectItem value="latinas">Latinas 🌶️</SelectItem>
            </SelectContent>
          </Select>
          {!isCreating && !editingId && (
            <Button
              onClick={() => { setIsCreating(true); setForm(emptyForm); }}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              <Plus className="w-4 h-4 mr-2" /> Novo Card
            </Button>
          )}
        </div>
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
                <Label className="text-white">Categoria *</Label>
                <Select
                  value={form.categoria}
                  onValueChange={(v) => setForm({ ...form, categoria: v as Categoria })}
                >
                  <SelectTrigger className="bg-gray-800 text-white border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="garotas_top">{CAT_LABEL.garotas_top}</SelectItem>
                    <SelectItem value="latinas">{CAT_LABEL.latinas}</SelectItem>
                  </SelectContent>
                </Select>
                {editingId && editingCat && editingCat !== form.categoria && (
                  <p className="text-xs text-yellow-400 mt-1">
                    ⚠️ Mudar categoria vai mover este card para a outra página.
                  </p>
                )}
              </div>
              <div>
                <Label className="text-white">Nome da modelo *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="bg-gray-800 text-white border-gray-700"
                />
              </div>
              {editingId && (
                <div>
                  <Label className="text-white">Ordem</Label>
                  <Input
                    type="number"
                    value={form.ordem}
                    onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
                    className="bg-gray-800 text-white border-gray-700"
                  />
                </div>
              )}
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
          {visibleCards.map((c) => (
            <Card key={`${c._categoria}-${c.id}`} className="bg-gray-900 border-gray-700 overflow-hidden">
              <div className="aspect-[3/4] relative bg-black">
                <img src={c.imagem_url} alt={c.nome} className="w-full h-full object-cover" />
                <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  c._categoria === "latinas"
                    ? "bg-pink-600 text-white"
                    : "bg-purple-600 text-white"
                }`}>
                  {CAT_LABEL[c._categoria]}
                </span>
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
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(c)}>
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
