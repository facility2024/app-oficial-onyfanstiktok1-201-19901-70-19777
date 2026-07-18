import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Save, CreditCard, Eye, Link as LinkIcon, Layers, Settings2, PlusCircle } from "lucide-react";
import PixCheckoutModal from "@/components/PixCheckoutModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AdminCheckoutTemplates } from "./AdminCheckoutTemplates";
import CheckoutSideMediaManager from "./CheckoutSideMediaManager";
import {
  CHECKOUT_PIX_KEY_MAP,
  CHECKOUT_PIX_KEYS,
  DEFAULT_CHECKOUT_PIX_SETTINGS,
  SIDE_MEDIA_KEY,
  type CheckoutPixSettings,
} from "@/hooks/useCheckoutPixSettings";

export const AdminCheckoutPagePix = () => {
  const [form, setForm] = useState<CheckoutPixSettings>(DEFAULT_CHECKOUT_PIX_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [savingAsTemplate, setSavingAsTemplate] = useState(false);
  const [activeTab, setActiveTab] = useState<"global" | "templates">("global");
  const [templatesRefresh, setTemplatesRefresh] = useState(0);
  const [initialDraft, setInitialDraft] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("admin_settings")
          .select("setting_key,setting_value")
          .in("setting_key", CHECKOUT_PIX_KEYS);
        const next = { ...DEFAULT_CHECKOUT_PIX_SETTINGS };
        (data || []).forEach((row: any) => {
          if (row.setting_key === SIDE_MEDIA_KEY) {
            const raw = row.setting_value;
            const arr = Array.isArray(raw)
              ? raw
              : (raw && typeof raw === "object" && Array.isArray((raw as any).value))
                ? (raw as any).value
                : (typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : []);
            next.side_media = Array.isArray(arr)
              ? arr.filter((x: any) => x && typeof x.url === "string" && (x.type === "image" || x.type === "video")).slice(0, 5)
              : [];
            return;
          }
          const entry = (Object.entries(CHECKOUT_PIX_KEY_MAP) as [keyof CheckoutPixSettings, string][])
            .find(([, k]) => k === row.setting_key);
          if (!entry) return;
          const v = typeof row.setting_value === "string" ? row.setting_value : row.setting_value?.value;
          if (typeof v === "string" && v !== "") (next as any)[entry[0]] = v;
        });
        setForm(next);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = <K extends keyof CheckoutPixSettings>(k: K, v: CheckoutPixSettings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const rows = (Object.entries(CHECKOUT_PIX_KEY_MAP) as [keyof CheckoutPixSettings, string][])
        .map(([field, key]) => ({
          setting_key: key,
          setting_value: form[field] as any,
        }));
      rows.push({
        setting_key: SIDE_MEDIA_KEY as any,
        setting_value: (form.side_media || []) as any,
      });
      const { error } = await (supabase as any)
        .from("admin_settings")
        .upsert(rows, { onConflict: "setting_key" });
      if (error) throw error;
      toast.success("Configurações do checkout salvas!");
    } catch (e: any) {
      toast.error("Erro ao salvar", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);

  const handleSaveAsTemplate = async () => {
    const amount = Number(form.default_amount);
    if (!amount || amount <= 0) {
      toast.error("Defina um valor padrão antes de gerar um novo modelo.");
      return;
    }
    setSavingAsTemplate(true);
    try {
      // Envia rascunho pré-preenchido pro editor — clona 100% da página global (aparência + valor + imagem)
      setInitialDraft({
        nome: "",
        slug: "",
        amount,
        product_name: "Acesso Coconudi",
        product_description: "Pagamento seguro via PIX",
        product_image_url: form.product_image_url || "",
        redirect_to: "/app",
        storage_flag: `checkout_${slugify(`pix-${Date.now().toString(36)}`)}_paid`,
        ativo: true,
        ordem: 0,
        model_id: null,
        // ▼ overrides visuais herdados da página global
        timer_label: form.timer_label,
        security_text: form.security_text,
        security_banner_url: form.security_banner_url,
        logo_url: form.logo_url,
        finalize_button_label: form.finalize_button_label,
        finalize_button_color: form.finalize_button_color,
        legal_text: form.legal_text,
        footer_security_text: form.footer_security_text,
        author_label: form.author_label,
        whatsapp_label: form.whatsapp_label,
        whatsapp_placeholder: form.whatsapp_placeholder,
        side_media: form.side_media || [],
      });
      setTemplatesRefresh((n) => n + 1);
      setActiveTab("templates");
      toast.success("Editor aberto — página duplicada 100%", { description: "Dê um nome à página e clique em Salvar." });

    } finally {
      setSavingAsTemplate(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-emerald-400" />
          Página de Checkout (PIX)
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Configure a aparência global do checkout e crie múltiplos modelos com valores diferentes.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "global" | "templates")} className="w-full">
        <TabsList className="bg-gray-900 border border-white/10">
          <TabsTrigger value="global" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Settings2 className="w-4 h-4 mr-2" /> Configurações globais
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Layers className="w-4 h-4 mr-2" /> Modelos de checkout
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          <AdminCheckoutTemplates key={templatesRefresh} initialDraft={initialDraft} />
        </TabsContent>

        <TabsContent value="global" className="mt-4 space-y-6">
          <div className="flex flex-wrap gap-2 justify-end">
            <Button onClick={() => setPreviewOpen(true)} variant="outline"
              className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 font-bold">
              <Eye className="w-4 h-4 mr-2" /> Ver prévia
            </Button>
            <Button onClick={() => {
              const url = `${window.location.origin}/checkout`;
              navigator.clipboard.writeText(url).then(
                () => toast.success("Link copiado!", { description: url }),
                () => toast.error("Não foi possível copiar", { description: url })
              );
            }} variant="outline" className="border-white/20 text-white hover:bg-white/10 font-bold">
              <LinkIcon className="w-4 h-4 mr-2" /> Copiar link da página
            </Button>
            <Button onClick={handleSaveAsTemplate} disabled={savingAsTemplate}
              variant="outline"
              className="border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/10 font-bold">
              {savingAsTemplate ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlusCircle className="w-4 h-4 mr-2" />}
              Gerar novo checkout com este valor
            </Button>
            <Button onClick={handleSave} disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar alterações
            </Button>
          </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1 - textos */}
        <div className="bg-gray-900 border border-white/10 rounded-xl p-5 space-y-4">
          <h3 className="text-lg font-bold text-emerald-400">🕐 Cabeçalho (timer)</h3>
          <div>
            <Label className="text-white">Texto abaixo do timer</Label>
            <Input
              value={form.timer_label}
              onChange={(e) => set("timer_label", e.target.value)}
              className="bg-gray-800 border-white/10 text-white"
            />
          </div>

          <h3 className="text-lg font-bold text-emerald-400 pt-2">🔐 Selo de segurança</h3>
          <div>
            <Label className="text-white">URL do banner de segurança (imagem)</Label>
            <Input
              value={form.security_banner_url}
              onChange={(e) => set("security_banner_url", e.target.value)}
              placeholder="https://..."
              className="bg-gray-800 border-white/10 text-white font-mono text-xs"
            />
          </div>
          <div>
            <Label className="text-white">Texto abaixo do selo</Label>
            <Input
              value={form.security_text}
              onChange={(e) => set("security_text", e.target.value)}
              className="bg-gray-800 border-white/10 text-white"
            />
          </div>

          <h3 className="text-lg font-bold text-emerald-400 pt-2">🎨 Logo (opcional)</h3>
          <div>
            <Label className="text-white">URL de logo customizada (deixe vazio p/ padrão)</Label>
            <Input
              value={form.logo_url}
              onChange={(e) => set("logo_url", e.target.value)}
              placeholder="https://..."
              className="bg-gray-800 border-white/10 text-white font-mono text-xs"
            />
          </div>

          <h3 className="text-lg font-bold text-emerald-400 pt-2">🖼️ Imagem lateral do card (Resumo do pedido)</h3>
          <div>
            <Label className="text-white">URL da imagem do produto (aparece no card lateral)</Label>
            <Input
              value={form.product_image_url}
              onChange={(e) => set("product_image_url", e.target.value)}
              placeholder="https://... (deixe vazio para usar a imagem enviada por cada card)"
              className="bg-gray-800 border-white/10 text-white font-mono text-xs"
            />
            {form.product_image_url && (
              <img
                src={form.product_image_url}
                alt="Prévia imagem do produto"
                className="mt-2 w-32 h-40 object-cover rounded-lg border border-white/10"
              />
            )}
            <p className="text-[11px] text-gray-500 mt-1">
              Esta imagem é usada como padrão quando o card/oferta não informar uma própria.
            </p>
          </div>

          <div className="pt-3 border-t border-white/10">
            <CheckoutSideMediaManager
              value={form.side_media}
              onChange={(next) => set("side_media", next)}
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Se você adicionar mídias aqui, elas viram um <b>carrossel</b> automático no card lateral (imagens trocam a cada 4s; vídeos avançam ao terminar). Se ficar vazio, usa apenas a imagem única acima.
            </p>
          </div>

          <h3 className="text-lg font-bold text-emerald-400 pt-2">💰 Valor padrão do PIX</h3>
          <div>
            <Label className="text-white">Valor (R$) usado no link global /checkout e na prévia</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.default_amount}
              onChange={(e) => set("default_amount", e.target.value)}
              placeholder="14.97"
              className="bg-gray-800 border-white/10 text-white font-mono"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Para valores diferentes por produto, use a aba <b>Modelos de checkout</b> — cada modelo tem seu próprio valor e link único.
            </p>
          </div>
        </div>

        {/* Coluna 2 - botão + textos legais */}
        <div className="bg-gray-900 border border-white/10 rounded-xl p-5 space-y-4">
          <h3 className="text-lg font-bold text-emerald-400">🟢 Botão "Finalizar Pagamento"</h3>
          <div>
            <Label className="text-white">Texto do botão</Label>
            <Input
              value={form.finalize_button_label}
              onChange={(e) => set("finalize_button_label", e.target.value)}
              className="bg-gray-800 border-white/10 text-white"
            />
          </div>
          <div>
            <Label className="text-white">Cor do botão (hex)</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="color"
                value={form.finalize_button_color}
                onChange={(e) => set("finalize_button_color", e.target.value)}
                className="w-16 h-10 p-1 bg-gray-800 border-white/10"
              />
              <Input
                value={form.finalize_button_color}
                onChange={(e) => set("finalize_button_color", e.target.value)}
                className="bg-gray-800 border-white/10 text-white font-mono"
              />
            </div>
          </div>

          <h3 className="text-lg font-bold text-emerald-400 pt-2">📝 Rodapé & Autor</h3>
          <div>
            <Label className="text-white">"Feito por:" (nome do vendedor)</Label>
            <Input
              value={form.author_label}
              onChange={(e) => set("author_label", e.target.value)}
              className="bg-gray-800 border-white/10 text-white"
            />
          </div>
          <div>
            <Label className="text-white">Texto legal (termos)</Label>
            <Textarea
              value={form.legal_text}
              onChange={(e) => set("legal_text", e.target.value)}
              rows={6}
              className="bg-gray-800 border-white/10 text-white text-xs"
            />
          </div>
          <div>
            <Label className="text-white">Texto de segurança do rodapé</Label>
            <Input
              value={form.footer_security_text}
              onChange={(e) => set("footer_security_text", e.target.value)}
              className="bg-gray-800 border-white/10 text-white"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar alterações
        </Button>
      </div>
        </TabsContent>
      </Tabs>

      {previewOpen && (
        <PixCheckoutModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          amount={Number(form.default_amount) || 14.97}
          productImage={form.product_image_url || undefined}
          sellerName={form.author_label}
          sideMediaOverride={form.side_media}
        />
      )}
    </div>
  );
};

export default AdminCheckoutPagePix;
