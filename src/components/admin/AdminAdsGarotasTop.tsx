import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Save, X, Loader2, RefreshCw, Link } from "lucide-react";
import { useAdsGarotasRealtime } from "@/hooks/useAdsGarotasRealtime";


type Categoria = "garotas_top" | "latinas" | "novidades";
const TABLE_BY_CAT: Record<Categoria, string> = {
  garotas_top: "ads_garotas_top",
  latinas: "ads_latinas",
  novidades: "ads_novidades",
};
const CAT_LABEL: Record<Categoria, string> = {
  garotas_top: "Garotas Top",
  latinas: "Latinas 🌶️",
  novidades: "Novidades 🔥",
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
  link_acesso: string | null;
  checkout_template_id: string | null;
  _categoria: Categoria;
}

interface TemplateOption {
  id: string;
  nome: string;
  slug: string;
  valor: number | null;
}

const emptyForm = {
  nome: "",
  imagem_url: "",
  video_url: "",
  cta_texto: "Assinar Conteúdo",
  valor: "",
  ordem: 0,
  is_active: true,
  link_acesso: "",
  checkout_template_id: "",
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
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCat, setBulkCat] = useState<Categoria>("garotas_top");
  const [bulkUrls, setBulkUrls] = useState("");
  const [bulkImage, setBulkImage] = useState("");
  const [bulkValor, setBulkValor] = useState("");
  const [bulkLink, setBulkLink] = useState("");
  const [bulkCta, setBulkCta] = useState("Assinar Conteúdo");
  const [bulkNomePrefix, setBulkNomePrefix] = useState("Modelo");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [categoryLink, setCategoryLink] = useState("");
  const [applyingCategoryLink, setApplyingCategoryLink] = useState(false);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [categoryTemplateId, setCategoryTemplateId] = useState<string>("");
  const [applyingCategoryTemplate, setApplyingCategoryTemplate] = useState(false);

  const fetchTemplates = async () => {
    const { data } = await (supabase as any)
      .from("checkout_templates")
      .select("id, nome, slug, valor, ativo")
      .eq("ativo", true)
      .order("created_at", { ascending: false });
    setTemplates((data || []) as TemplateOption[]);
  };

  const applyTemplateToSelectedCategory = async (clear = false) => {
    if (filter === "all") return toast.error("Selecione uma categoria antes de aplicar o template");
    if (!clear && !categoryTemplateId) return toast.error("Escolha um template PIX");
    const action = clear ? "Limpar" : "Aplicar";
    if (!confirm(`${action} template PIX em todos os cards de ${CAT_LABEL[filter]}?`)) return;

    setApplyingCategoryTemplate(true);
    const { error, count } = await (supabase as any)
      .from(TABLE_BY_CAT[filter])
      .update({ checkout_template_id: clear ? null : categoryTemplateId }, { count: "exact" })
      .not("id", "is", null);
    setApplyingCategoryTemplate(false);
    if (error) return toast.error("Erro: " + error.message);
    toast.success(`${count ?? 0} card(s) atualizado(s)`);
    fetchCards();
  };


  const applyLinkToSelectedCategory = async () => {
    const link = categoryLink.trim();
    if (!link) return toast.error("Cole o link da página PIX");
    if (filter === "all") return toast.error("Selecione uma categoria antes de aplicar o link");
    if (!confirm(`Aplicar este link em todos os cards de ${CAT_LABEL[filter]}?\n\n${link}`)) return;

    setApplyingCategoryLink(true);
    const { error, count } = await (supabase as any)
      .from(TABLE_BY_CAT[filter])
      .update({ link_acesso: link }, { count: "exact" })
      .not("id", "is", null);
    setApplyingCategoryLink(false);

    if (error) return toast.error("Erro ao aplicar o link: " + error.message);
    toast.success(`Link aplicado em ${count ?? 0} card(s) de ${CAT_LABEL[filter]}`);
    fetchCards();
  };

  const handleBulkImport = async () => {
    const urls = bulkUrls
      .split(/\s|,|;/)
      .map((u) => u.trim())
      .filter((u) => /^https?:\/\//i.test(u));
    if (urls.length === 0) {
      toast.error("Cole ao menos uma URL de vídeo válida");
      return;
    }
    if (!bulkImage.trim()) {
      toast.error("Informe uma URL de imagem/capa padrão");
      return;
    }
    setBulkSaving(true);
    const payload = urls.map((video_url, i) => ({
      nome: `${bulkNomePrefix || "Modelo"} ${i + 1}`,
      imagem_url: bulkImage.trim(),
      video_url,
      cta_texto: bulkCta || "Assinar Conteúdo",
      valor:
        bulkValor !== "" && !Number.isNaN(Number(bulkValor))
          ? Number(bulkValor)
          : null,
      ordem: 0,
      is_active: true,
      link_acesso: bulkLink.trim() || null,
    }));
    const { error } = await (supabase as any)
      .from(TABLE_BY_CAT[bulkCat])
      .insert(payload);
    setBulkSaving(false);
    if (error) {
      toast.error("Erro no cadastro em massa: " + error.message);
      return;
    }
    toast.success(`${urls.length} card(s) criado(s) em ${CAT_LABEL[bulkCat]}`);
    setBulkUrls("");
    fetchCards();
  };

  const fetchCards = async () => {
    setLoading(true);
    const [gt, lt, nv] = await Promise.all([
      (supabase as any).from("ads_garotas_top").select("*")
        .order("ordem", { ascending: true }).order("created_at", { ascending: false }),
      (supabase as any).from("ads_latinas").select("*")
        .order("ordem", { ascending: true }).order("created_at", { ascending: false }),
      (supabase as any).from("ads_novidades").select("*")
        .order("ordem", { ascending: true }).order("created_at", { ascending: false }),
    ]);
    if (gt.error || lt.error || nv.error) toast.error("Erro ao carregar cards");
    const merged: CardItem[] = [
      ...((gt.data || []).map((c: any) => ({ ...c, _categoria: "garotas_top" as Categoria }))),
      ...((lt.data || []).map((c: any) => ({ ...c, _categoria: "latinas" as Categoria }))),
      ...((nv.data || []).map((c: any) => ({ ...c, _categoria: "novidades" as Categoria }))),
    ];
    setCards(merged);
    setLoading(false);
  };

  useEffect(() => { fetchCards(); fetchTemplates(); }, []);

  // Realtime: recarrega automaticamente quando qualquer card muda em qualquer categoria
  useAdsGarotasRealtime(() => { fetchCards(); });

  // Fallback: auto-refresh a cada 20s
  useEffect(() => {
    const id = setInterval(() => { fetchCards(); }, 20000);
    return () => clearInterval(id);
  }, []);

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
      valor: c.valor != null ? String(c.valor) : "",
      ordem: c.ordem,
      is_active: c.is_active,
      link_acesso: c.link_acesso || "",
      checkout_template_id: c.checkout_template_id || "",
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
      valor: form.valor !== "" && !Number.isNaN(Number(form.valor)) ? Number(form.valor) : null,
      ordem: editingId ? Number(form.ordem) || 0 : 0,
      is_active: form.is_active,
      link_acesso: form.link_acesso.trim() || null,
      checkout_template_id: form.checkout_template_id || null,
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
              <SelectItem value="novidades">Novidades 🔥</SelectItem>
            </SelectContent>
          </Select>
          {!isCreating && !editingId && (
            <>
              <Button
                onClick={() => fetchCards()}
                variant="outline"
                className="border-gray-600 text-white hover:bg-gray-800"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Atualizar
              </Button>
              <Button
                onClick={() => { setIsCreating(true); setForm(emptyForm); }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                <Plus className="w-4 h-4 mr-2" /> Novo Card
              </Button>
              <Button
                onClick={() => setBulkOpen((v) => !v)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
              >
                <Plus className="w-4 h-4 mr-2" /> Cadastro em massa
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="bg-gray-900 border-cyan-500/60">
        <CardContent className="p-4">
          <Label className="text-white font-bold">Link da página PIX para todos os cards da categoria</Label>
          <p className="text-xs text-gray-400 mt-1 mb-3">
            Selecione uma categoria acima, cole o link criado e aplique somente nos cards dessa categoria.
          </p>
          <div className="flex flex-col md:flex-row gap-2">
            <Input
              value={categoryLink}
              onChange={(e) => setCategoryLink(e.target.value)}
              placeholder="https://seu-app.com/checkout/link-da-pagina-pix"
              className="bg-gray-800 text-white border-gray-600 flex-1"
            />
            <Button
              type="button"
              onClick={applyLinkToSelectedCategory}
              disabled={applyingCategoryLink || filter === "all" || !categoryLink.trim()}
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
            >
              {applyingCategoryLink ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link className="w-4 h-4 mr-2" />}
              Aplicar em todos da categoria
            </Button>
          </div>
          {filter === "all" && (
            <p className="text-xs text-amber-300 mt-2">Escolha Garotas Top, Latinas ou Novidades no seletor acima.</p>
          )}
        </CardContent>
      </Card>

      {bulkOpen && !isCreating && !editingId && (
        <Card className="bg-gray-900 border-orange-500/40">
          <CardHeader>
            <CardTitle className="text-white">
              Cadastro em massa por URLs (Bunny)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Categoria de destino *</Label>
                <Select value={bulkCat} onValueChange={(v) => setBulkCat(v as Categoria)}>
                  <SelectTrigger className="bg-gray-800 text-white border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="garotas_top">{CAT_LABEL.garotas_top}</SelectItem>
                    <SelectItem value="latinas">{CAT_LABEL.latinas}</SelectItem>
                    <SelectItem value="novidades">{CAT_LABEL.novidades}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white">Prefixo do nome dos cards</Label>
                <Input
                  value={bulkNomePrefix}
                  onChange={(e) => setBulkNomePrefix(e.target.value)}
                  placeholder="Modelo"
                  className="bg-gray-800 text-white border-gray-700"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-white">URL da imagem/capa padrão *</Label>
                <Input
                  value={bulkImage}
                  onChange={(e) => setBulkImage(e.target.value)}
                  placeholder="https://..."
                  className="bg-gray-800 text-white border-gray-700"
                />
              </div>
              <div>
                <Label className="text-white">Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={bulkValor}
                  onChange={(e) => setBulkValor(e.target.value)}
                  placeholder="14.97"
                  className="bg-gray-800 text-white border-gray-700"
                />
              </div>
              <div>
                <Label className="text-white">Texto do CTA</Label>
                <Input
                  value={bulkCta}
                  onChange={(e) => setBulkCta(e.target.value)}
                  className="bg-gray-800 text-white border-gray-700"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-white">Link de acesso após pagamento</Label>
                <Input
                  value={bulkLink}
                  onChange={(e) => setBulkLink(e.target.value)}
                  placeholder="https://exemplo.com/area-vip"
                  className="bg-gray-800 text-white border-gray-700"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-white">
                  URLs dos vídeos Bunny (uma por linha) *
                </Label>
                <textarea
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  rows={8}
                  placeholder={"https://.../video1.mp4\nhttps://.../video2.mp4"}
                  className="w-full rounded-md bg-gray-800 text-white border border-gray-700 p-2 font-mono text-sm"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Será criado um card por URL na categoria selecionada, usando a mesma lógica dos cards atuais.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleBulkImport}
                disabled={bulkSaving}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {bulkSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Criar cards em massa
              </Button>
              <Button onClick={() => setBulkOpen(false)} variant="outline">
                <X className="w-4 h-4 mr-2" /> Fechar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                    <SelectItem value="novidades">{CAT_LABEL.novidades}</SelectItem>
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
                <Label className="text-white">Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  placeholder="14.97"
                  className="bg-gray-800 text-white border-gray-700"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Preço exibido no checkout PIX ao clicar neste card.
                </p>
              </div>
              <div className="md:col-span-2">
                <Label className="text-white">🔗 Link de acesso liberado após pagamento *</Label>
                <Input
                  value={form.link_acesso}
                  onChange={(e) => setForm({ ...form, link_acesso: e.target.value })}
                  placeholder="https://exemplo.com/area-vip ou /garotas-top-vip"
                  className="bg-gray-800 text-white border-gray-700"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Ao pagar apenas o acesso aos vídeos deste card, o botão "Clique aqui para acessar seus vídeos" abrirá este link.
                </p>
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
                    : c._categoria === "novidades"
                    ? "bg-cyan-600 text-white"
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
                <p className="text-xs text-gray-400">
                  Ordem: {c.ordem}
                  {c.valor != null && (
                    <span className="ml-2 text-green-400 font-bold">
                      R$ {Number(c.valor).toFixed(2).replace(".", ",")}
                    </span>
                  )}
                </p>
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
