import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CheckoutPixSettings {
  timer_label: string;
  security_text: string;
  security_banner_url: string;
  logo_url: string;
  finalize_button_label: string;
  finalize_button_color: string;
  legal_text: string;
  footer_security_text: string;
  author_label: string;
  product_image_url: string;
  whatsapp_label: string;
  whatsapp_placeholder: string;
  default_amount: string;
}

export const DEFAULT_CHECKOUT_PIX_SETTINGS: CheckoutPixSettings = {
  timer_label: "Oferta acaba em breve — não perca!",
  security_text: "Pagamento seguro pela plataforma coconudi.com",
  security_banner_url:
    "https://COCONUDIMUDIAL.b-cdn.net/PASTA%20TUTORIAS%20E%20ARQUIVOS%20COCONUDI/Design%20sem%20nome%20(1).png",
  logo_url: "",
  finalize_button_label: "Finalizar Pagamento",
  finalize_button_color: "#7CB342",
  legal_text:
    "Ao clicar em 'Finalizar Pagamento', eu declaro que li e concordo (i) que a NeonPay está processando este pedido em nome de terceiros e não possui responsabilidade pelo conteúdo e/ou faz controle prévio deste; (ii) com os Termos de Uso e Política de Privacidade, e (iii) que sou maior de idade ou autorizado e acompanhado por um responsável legal.",
  footer_security_text:
    "Os pagamentos são processados de forma segura e criptografada pela NeonPay.",
  author_label: "Otavio gomes dos santos",
  product_image_url: "",
  whatsapp_label:
    "📱 Coloque seu WhatsApp válido — ele será sua chave de acesso aos seus produtos",
  whatsapp_placeholder: "(11) 99999-9999",
  default_amount: "14.97",
};

const KEY_MAP: Record<keyof CheckoutPixSettings, string> = {
  timer_label: "checkout_pix_timer_label",
  security_text: "checkout_pix_security_text",
  security_banner_url: "checkout_pix_security_banner_url",
  logo_url: "checkout_pix_logo_url",
  finalize_button_label: "checkout_pix_finalize_button_label",
  finalize_button_color: "checkout_pix_finalize_button_color",
  legal_text: "checkout_pix_legal_text",
  footer_security_text: "checkout_pix_footer_security_text",
  author_label: "checkout_pix_author_label",
  product_image_url: "checkout_pix_product_image_url",
  whatsapp_label: "checkout_pix_whatsapp_label",
  whatsapp_placeholder: "checkout_pix_whatsapp_placeholder",
  default_amount: "checkout_pix_default_amount",
};

export const CHECKOUT_PIX_KEYS = Object.values(KEY_MAP);
export const CHECKOUT_PIX_KEY_MAP = KEY_MAP;

function coerceString(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "value" in (v as any)) {
    const inner = (v as any).value;
    if (typeof inner === "string") return inner;
  }
  return null;
}

export function useCheckoutPixSettings() {
  const [settings, setSettings] = useState<CheckoutPixSettings>(
    DEFAULT_CHECKOUT_PIX_SETTINGS
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("admin_settings")
          .select("setting_key,setting_value")
          .in("setting_key", CHECKOUT_PIX_KEYS);
        if (cancelled) return;
        const next = { ...DEFAULT_CHECKOUT_PIX_SETTINGS };
        (data || []).forEach((row: any) => {
          const entry = (Object.entries(KEY_MAP) as [keyof CheckoutPixSettings, string][])
            .find(([, k]) => k === row.setting_key);
          if (!entry) return;
          const val = coerceString(row.setting_value);
          if (val !== null && val !== "") (next as any)[entry[0]] = val;
        });
        setSettings(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { settings, loading };
}
