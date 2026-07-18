import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, X, Copy, CheckCircle2, ShieldCheck } from "lucide-react";
import coconudiLogo from "@/assets/coconudi-logo.png";
import { useCheckoutPixSettings, type SideMediaItem } from "@/hooks/useCheckoutPixSettings";
import CheckoutSideCarousel from "@/components/CheckoutSideCarousel";

interface Props {
  open: boolean;
  onClose: () => void;
  amount?: number;
  productName?: string;
  productDescription?: string;
  productImage?: string;
  sellerName?: string;
  storageFlag?: string;
  redirectTo?: string;
  templateSlug?: string;
  /** Overrides visuais (usado em prévia de rascunho de template) */
  visualOverrides?: Partial<Record<
    | "timer_label" | "security_text" | "security_banner_url" | "logo_url"
    | "finalize_button_label" | "finalize_button_color" | "legal_text"
    | "footer_security_text" | "author_label" | "whatsapp_label"
    | "whatsapp_placeholder" | "product_image_url",
    string
  >>;
  /** Prévia/override do carrossel lateral */
  sideMediaOverride?: SideMediaItem[];
}

export default function PixCheckoutModal({
  open,
  onClose,
  amount: amountProp,
  productName: productNameProp,
  productDescription: productDescriptionProp,
  productImage,
  sellerName,
  storageFlag: storageFlagProp,
  redirectTo: redirectToProp,
  templateSlug,
  visualOverrides,
  sideMediaOverride,
}: Props) {
  const { settings: globalPixSettings } = useCheckoutPixSettings();

  const [template, setTemplate] = useState<any | null>(null);

  useEffect(() => {
    if (!open || !templateSlug) { setTemplate(null); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from("checkout_templates")
        .select("*")
        .eq("slug", templateSlug)
        .eq("ativo", true)
        .maybeSingle();
      if (data) setTemplate(data);
    })();
  }, [open, templateSlug]);

  // Merge: global < template (banco) < visualOverrides (prévia)
  const pick = (k: string): string => {
    const v1 = (visualOverrides as any)?.[k];
    if (typeof v1 === "string" && v1 !== "") return v1;
    const v2 = template?.[k];
    if (typeof v2 === "string" && v2 !== "") return v2;
    return (globalPixSettings as any)[k] ?? "";
  };
  const pixSettings = {
    timer_label: pick("timer_label"),
    security_text: pick("security_text"),
    security_banner_url: pick("security_banner_url"),
    logo_url: pick("logo_url"),
    finalize_button_label: pick("finalize_button_label"),
    finalize_button_color: pick("finalize_button_color"),
    legal_text: pick("legal_text"),
    footer_security_text: pick("footer_security_text"),
    author_label: pick("author_label"),
    whatsapp_label: pick("whatsapp_label"),
    whatsapp_placeholder: pick("whatsapp_placeholder"),
    product_image_url: pick("product_image_url"),
  };
  const effectiveSellerName = sellerName || pixSettings.author_label;

  const amount = template?.amount ?? amountProp ?? 14.97;
  const productName = template?.product_name || productNameProp || "Meu acesso vip Orientais /Latinas";
  const productDescription = template?.product_description || productDescriptionProp ||
    "🚨 Olá! 🥵🔥 Tenha acesso a mais de 600 vídeos exclusivos, com novos conteúdos...";
  const storageFlag = template?.storage_flag || storageFlagProp || "garotas_top_paid";
  const redirectTo = template?.redirect_to || redirectToProp || "/garotas-top-vip";
  const effectiveProductImage =
    productImage ||
    template?.product_image_url ||
    pixSettings.product_image_url ||
    "https://COCONUDIMUDIAL.b-cdn.net/PASTA%20TUTORIAS%20E%20ARQUIVOS%20COCONUDI/ChatGPT%20Image%205%20de%20jul.%20de%202026%2C%2008_22_21.png";

  const effectiveSideMedia: SideMediaItem[] = (() => {
    if (sideMediaOverride && sideMediaOverride.length > 0) return sideMediaOverride;
    const t = Array.isArray(template?.side_media) ? (template!.side_media as SideMediaItem[]) : [];
    if (t.length > 0) return t;
    return globalPixSettings.side_media || [];
  })();


  // WhatsApp
  const [whatsapp, setWhatsapp] = useState("");
  const digits = whatsapp.replace(/\D/g, "");
  const whatsappValid = digits.length >= 10 && digits.length <= 11;
  const formatWhatsapp = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };
  const [loading, setLoading] = useState(false);
  const [pix, setPix] = useState<{
    transaction_id?: string;
    pix_code?: string;
    pix_image?: string;
  } | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);
  const pollRef = useRef<number | null>(null);
  const [countdown, setCountdown] = useState("00:00:00");

  interface Bump {
    id: string;
    titulo: string;
    descricao: string | null;
    valor: number;
    imagem_url: string | null;
    link_acesso: string | null;
    ordem: number;
  }
  const [bumps, setBumps] = useState<Bump[]>([]);
  const [selectedBumps, setSelectedBumps] = useState<Record<string, boolean>>({});

  const bumpsTotal = bumps.reduce(
    (sum, b) => (selectedBumps[b.id] ? sum + Number(b.valor || 0) : sum),
    0
  );
  const finalAmount = Number((amount + bumpsTotal).toFixed(2));

  useEffect(() => {
    if (!open) return;
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(24, 0, 0, 0); // próxima meia-noite (reset a cada 24h)
      const diff = Math.max(0, end.getTime() - now.getTime());
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      const pad = (n: number) => String(n).padStart(2, "0");
      setCountdown(`${pad(h)}:${pad(m)}:${pad(s)}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setPix(null);
    setQrImage(null);
    setPaid(false);
    setCopied(false);
    setSelectedBumps({});
    (async () => {
      const { data } = await (supabase as any)
        .from("checkout_order_bumps")
        .select("id,titulo,descricao,valor,imagem_url,link_acesso,ordem,template_ids")
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      const currentTemplateId = template?.id || null;
      const filtered = (data || []).filter((b: any) => {
        const ids: string[] | null = b.template_ids;
        if (!ids || ids.length === 0) return true; // aparece em todas as páginas PIX
        return currentTemplateId ? ids.includes(currentTemplateId) : false;
      });
      setBumps(filtered);
    })();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [open, template?.id]);

  const generate = async () => {
    if (!whatsappValid) {
      toast({ title: "WhatsApp inválido", description: "Informe um WhatsApp válido com DDD.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const selectedList = bumps.filter((b) => selectedBumps[b.id]).map((b) => b.titulo);
      const productWithBumps = selectedList.length
        ? `${productName} + ${selectedList.join(" + ")}`
        : productName;
      const { data, error } = await supabase.functions.invoke("neonpay-pix-gateway", {
        body: {
          amount: finalAmount,
          product_name: productWithBumps,
          customer_whatsapp: whatsapp,
          client: { phone: whatsapp },
        },
      });
      if (error) throw error;
      if (!data?.pix_code) throw new Error("PIX não retornado");
      setPix(data);
      await buildQrImage(String(data.pix_code), data.pix_image);
      startPolling(data.transaction_id);

      // Registra compra + itens no novo sistema de produtos/liberações
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id ?? null;

        const items: { product_id: string; price: number; snapshot_name: string; snapshot_access_key?: string }[] = [];
        if (template?.product_id) {
          items.push({
            product_id: template.product_id,
            price: Number(amount || 0),
            snapshot_name: productName,
          });
        }
        for (const b of bumps.filter((x) => selectedBumps[x.id])) {
          const { data: bumpRow } = await (supabase as any)
            .from("checkout_order_bumps").select("product_id").eq("id", b.id).maybeSingle();
          if (bumpRow?.product_id) {
            items.push({
              product_id: bumpRow.product_id,
              price: Number(b.valor || 0),
              snapshot_name: b.titulo,
            });
          }
        }

        if (items.length > 0) {
          const { data: purchase, error: pErr } = await (supabase as any)
            .from("checkout_purchases")
            .insert({
              user_id: userId,
              customer_whatsapp: whatsapp,
              customer_email: authData?.user?.email ?? null,
              total_amount: finalAmount,
              status: "pending",
              gateway: "neonpay",
              gateway_payment_id: String(data.transaction_id),
              metadata: { template_id: template?.id ?? null, template_slug: templateSlug ?? null },
            })
            .select("id")
            .maybeSingle();
          if (pErr) console.warn("[checkout_purchases insert]", pErr.message);
          if (purchase?.id) {
            const payload = items.map((it) => ({ ...it, purchase_id: purchase.id }));
            const { error: iErr } = await (supabase as any)
              .from("checkout_purchase_items").insert(payload);
            if (iErr) console.warn("[checkout_purchase_items insert]", iErr.message);
          }
        }
      } catch (regErr) {
        console.warn("[registro compra falhou]", regErr);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Tente novamente em instantes.";
      toast({ title: "Erro ao gerar PIX", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const buildQrImage = async (pixCode: string, apiImage?: string) => {
    if (apiImage) {
      const normalized = apiImage.startsWith("data:image") || apiImage.startsWith("http") || apiImage.startsWith("blob:")
        ? apiImage
        : `data:image/png;base64,${apiImage}`;
      setQrImage(normalized);
      return;
    }
    const generated = await QRCode.toDataURL(pixCode, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 256,
      color: { dark: "#000000", light: "#FFFFFF" },
    });
    setQrImage(generated);
  };

  const startPolling = (transactionId?: string) => {
    if (!transactionId) return;
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(
          `https://tnzvhwapfhkhqjgyiomk.supabase.co/functions/v1/neonpay-pix-status?transactionId=${encodeURIComponent(transactionId)}`,
          {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
          }
        );
        const json = await res.json().catch(() => ({}));
        const status = String(json?.status || "").toUpperCase();
        if (["OK", "PAID", "APPROVED", "CONFIRMED", "COMPLETED"].includes(status)) {
          handleConfirmed();
        }
      } catch {
        /* silencioso */
      }
    }, 4000) as unknown as number;
  };

  const handleConfirmed = async () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    setPaid(true);
    try {
      localStorage.setItem(storageFlag, "1");
    } catch (error) {
      void error;
    }

    // Prioridade: redirectTo do card (link_acesso específico) > admin_settings global > fallback
    let mainLink = redirectTo;
    const usingCardLink = !!redirectTo && redirectTo !== "/garotas-top-vip";
    if (!usingCardLink) {
      try {
        const { data } = await (supabase as any)
          .from("admin_settings")
          .select("setting_value")
          .eq("setting_key", "checkout_main_access_link")
          .maybeSingle();
        const v = data?.setting_value;
        if (typeof v === "string" && v.trim()) mainLink = v.trim();
      } catch { /* usa fallback */ }
    }

    // Links dos bumps comprados
    const purchasedBumps = bumps
      .filter((b) => selectedBumps[b.id] && b.link_acesso)
      .map((b) => ({ titulo: b.titulo, link: b.link_acesso as string }));

    try {
      sessionStorage.setItem("purchased_main_link", mainLink);
      sessionStorage.setItem("purchased_bump_links", JSON.stringify(purchasedBumps));
      if (pix?.transaction_id) {
        sessionStorage.setItem("pending_payment_id", String(pix.transaction_id));
      }
      // Guarda o WhatsApp da compra para autopreencher a tela de acesso
      if (digits) sessionStorage.setItem("buyer_whatsapp_prefill", digits);
    } catch { /* ignore */ }

    toast({ title: "Pagamento confirmado!", description: "Redirecionando para sua área de acessos..." });
    setTimeout(() => {
      onClose();
      window.location.href = "/acesso";
    }, 1200);
  };

  const copy = async () => {
    if (!pix?.pix_code) return;
    try {
      await navigator.clipboard.writeText(pix.pix_code);
      setCopied(true);
      toast({ title: "Código PIX copiado!" });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  if (!open) return null;

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
  const priceFmt = fmt(amount);
  const bumpsFmt = fmt(bumpsTotal);
  const totalFmt = fmt(finalAmount);

  return createPortal(
    <div
      data-modal-root
      className="fixed inset-0 z-[10030] bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="min-h-full w-full bg-[#f5f5f5]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Timer header */}
        <div className="relative bg-gradient-to-r from-[#1a1a1a] via-[#6b21a8] to-[#1a1a1a] text-white text-center py-4 px-4 border-b border-purple-900/60">
          <div className="text-2xl sm:text-3xl font-black tracking-wider tabular-nums drop-shadow-[0_0_10px_rgba(168,85,247,0.6)]">{countdown}</div>
          <div className="text-xs sm:text-sm font-semibold opacity-95">
            {pixSettings.timer_label}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selo de segurança */}
        <div className="bg-neutral-900 border-b border-black py-4 px-4 flex flex-col items-center justify-center gap-2">
          <img
            src={pixSettings.security_banner_url}
            alt="Pagamento seguro"
            className="h-16 sm:h-20 w-auto object-contain"
          />
          <p className="text-xs sm:text-sm font-semibold text-white text-center">
            {pixSettings.security_text}
          </p>
        </div>



        {/* Body */}
        <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
          {/* Left column */}
          <div className="space-y-5 order-2 lg:order-1">
            {/* Payment method */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="text-gray-900 font-bold text-lg mb-4">Método de pagamento</h3>
              <div className="border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-center gap-2 bg-gray-50">
                <span className="inline-block w-5 h-5 rotate-45 bg-teal-400" />
                <span className="text-gray-800 font-semibold">Pix</span>
              </div>
            </div>

            {/* Order Bumps */}
            {bumps.length > 0 && !pix && !paid && (
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h3 className="text-gray-900 font-bold text-lg mb-1">
                  ⚡ Turbine seu pedido
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Adicione ofertas exclusivas com desconto só nesta compra:
                </p>
                <div className="space-y-3">
                  {bumps.map((b) => {
                    const checked = !!selectedBumps[b.id];
                    return (
                      <label
                        key={b.id}
                        className={`flex gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                          checked
                            ? "border-purple-600 bg-purple-50"
                            : "border-gray-200 hover:border-purple-300 bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedBumps((s) => ({ ...s, [b.id]: e.target.checked }))
                          }
                          className="mt-1 w-5 h-5 accent-purple-600 shrink-0"
                        />
                        {b.imagem_url && (
                          <img
                            src={b.imagem_url}
                            alt={b.titulo}
                            className="w-16 h-16 rounded-lg object-cover shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-gray-900">{b.titulo}</div>
                          {b.descricao && (
                            <div className="text-xs text-gray-600 mt-0.5">{b.descricao}</div>
                          )}
                          <div className="text-sm font-black text-purple-700 mt-1">
                            + {fmt(Number(b.valor))}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PIX area */}
            {(loading || pix || paid) && (
              <div className="bg-white rounded-xl shadow-sm p-5">
                {loading && (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-10 h-10 animate-spin text-[#7CB342]" />
                  </div>
                )}

                {!loading && paid && (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto animate-pulse" />
                    <p className="mt-3 text-lg font-bold text-green-600">Pagamento confirmado!</p>
                    <p className="text-sm text-gray-500">Liberando conteúdo...</p>
                  </div>
                )}

                {!loading && !paid && pix?.pix_code && (
                  <div className="space-y-4">
                    {qrImage && (
                      <div className="bg-white border border-gray-200 p-3 rounded-xl flex justify-center">
                        <img src={qrImage} alt="QR Code PIX" className="w-52 h-52 object-contain" />
                      </div>
                    )}
                    <div>
                      <label className="text-xs uppercase tracking-widest text-gray-500 font-bold">
                        Código copia e cola
                      </label>
                      <textarea
                        readOnly
                        value={pix.pix_code}
                        className="w-full mt-1 h-24 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 text-xs p-2 font-mono resize-none"
                      />
                    </div>
                    <Button
                      onClick={copy}
                      className="w-full bg-[#7CB342] hover:bg-[#6ba338] text-white font-bold py-6"
                    >
                      {copied ? (
                        <><CheckCircle2 className="w-5 h-5 mr-2" /> Copiado!</>
                      ) : (
                        <><Copy className="w-5 h-5 mr-2" /> Copiar código PIX</>
                      )}
                    </Button>
                    <p className="text-[11px] text-center text-gray-500 leading-relaxed">
                      Abra o app do seu banco, escolha PIX › <b>Copia e Cola</b>, cole o código e confirme.
                      Assim que o pagamento cair, seu acesso é liberado automaticamente.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* WhatsApp obrigatório */}
            {!pix && !paid && (
              <div className="bg-white rounded-xl shadow-sm p-5">
                <label className="block text-sm font-bold text-gray-900 mb-2 leading-snug">
                  {pixSettings.whatsapp_label}
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatWhatsapp(e.target.value))}
                  placeholder={pixSettings.whatsapp_placeholder}
                  className={`w-full h-12 px-4 rounded-lg border-2 text-gray-900 text-base font-semibold focus:outline-none transition ${
                    whatsapp === ""
                      ? "border-gray-300 focus:border-purple-500"
                      : whatsappValid
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-red-400 bg-red-50"
                  }`}
                />
                {whatsapp !== "" && !whatsappValid && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">
                    Digite um WhatsApp válido com DDD (10 ou 11 dígitos).
                  </p>
                )}
              </div>
            )}

            {/* Finalizar */}
            {!pix && !paid && (
              <Button
                onClick={generate}
                disabled={loading || !whatsappValid}
                style={{ backgroundColor: pixSettings.finalize_button_color }}
                className="w-full disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-6 rounded-lg text-base shadow hover:brightness-95"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gerando PIX...</>
                ) : (
                  pixSettings.finalize_button_label
                )}
              </Button>
            )}

            {/* Footer disclaimer */}
            <div className="text-[11px] text-gray-500 leading-relaxed space-y-2 pt-2">
              <p>{pixSettings.legal_text}</p>
              <p className="flex items-center gap-1.5 text-gray-600">
                <ShieldCheck className="w-3.5 h-3.5" />
                {pixSettings.footer_security_text}
              </p>
            </div>
          </div>

          {/* Right column - order summary */}
          <div className="bg-white rounded-xl shadow-sm p-5 h-fit order-1 lg:order-2">
            <h3 className="text-gray-900 font-bold text-lg mb-4">Resumo do pedido</h3>
            <CheckoutSideCarousel
              items={effectiveSideMedia}
              fallbackImage={effectiveProductImage}
              productName={productName}
            />
            <div className="text-gray-900 font-bold text-base leading-tight">{productName}</div>
            <div className="text-xs text-gray-500 mt-1">Feito por: {effectiveSellerName}</div>

            <div className="mt-4 bg-gray-50 rounded-lg p-3">
              <div className="text-xs font-bold text-gray-800 mb-1">Descrição</div>
              <div className="text-xs text-gray-600 leading-relaxed">{productDescription}</div>
            </div>

            <div className="mt-4 bg-gray-50 rounded-lg p-3 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-700">
                <span>Subtotal</span><span>{priceFmt}</span>
              </div>
              {bumpsTotal > 0 && (
                <>
                  {bumps.filter((b) => selectedBumps[b.id]).map((b) => (
                    <div key={b.id} className="flex justify-between text-xs text-purple-700">
                      <span className="truncate pr-2">+ {b.titulo}</span>
                      <span>{fmt(Number(b.valor))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm text-gray-700 border-t border-gray-200 pt-1.5">
                    <span>Extras</span><span>{bumpsFmt}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-1.5">
                <span>Total</span><span>{totalFmt}</span>
              </div>
            </div>

            <div className="text-[11px] text-gray-500 mt-3">Feito por: {effectiveSellerName}</div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
