import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Save, CreditCard, Eye, Link as LinkIcon } from "lucide-react";
import PixCheckoutModal from "@/components/PixCheckoutModal";
import {
  CHECKOUT_PIX_KEY_MAP,
  CHECKOUT_PIX_KEYS,
  DEFAULT_CHECKOUT_PIX_SETTINGS,
  type CheckoutPixSettings,
} from "@/hooks/useCheckoutPixSettings";

export const AdminCheckoutPagePix = () => {
  const [form, setForm] = useState<CheckoutPixSettings>(DEFAULT_CHECKOUT_PIX_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("admin_settings")
          .select("setting_key,setting_value")
          .in("setting_key", CHECKOUT_PIX_KEYS);
        const next = { ...DEFAULT_CHECKOUT_PIX_SETTINGS };
        (data || []).forEach((row: any) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" />
            Página de Checkout (PIX)
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Edite todos os textos e elementos fixos da tela de pagamento PIX do NeonPay.
            (O banner do produto, título e descrição são editados em <b>Feed de Ofertas</b>.)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setPreviewOpen(true)}
            variant="outline"
            className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 font-bold"
          >
            <Eye className="w-4 h-4 mr-2" />
            Ver prévia
          </Button>
          <Button
            onClick={() => {
              const url = `${window.location.origin}/checkout`;
              navigator.clipboard.writeText(url).then(
                () => toast.success("Link copiado!", { description: url }),
                () => toast.error("Não foi possível copiar", { description: url })
              );
            }}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 font-bold"
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            Copiar link da página
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar alterações
          </Button>
        </div>
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
    </div>
  );
};

export default AdminCheckoutPagePix;
