import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CheckoutKey = "garotas_top" | "latinas" | "novidades";

const DEFAULTS: Record<CheckoutKey, number> = {
  garotas_top: 14.97,
  latinas: 14.97,
  novidades: 14.97,
};

const SETTING_KEY = "checkout_prices";

export function useCheckoutPrice(key: CheckoutKey) {
  const [price, setPrice] = useState<number>(DEFAULTS[key]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", SETTING_KEY)
        .maybeSingle();
      const v = (data?.setting_value as any) || {};
      const parsed = Number(v?.[key]);
      if (!Number.isNaN(parsed) && parsed > 0) setPrice(parsed);
      setLoading(false);
    })();
  }, [key]);

  return { price, loading };
}

export async function fetchCheckoutPrices(): Promise<Record<CheckoutKey, number>> {
  const { data } = await supabase
    .from("admin_settings")
    .select("setting_value")
    .eq("setting_key", SETTING_KEY)
    .maybeSingle();
  const v = (data?.setting_value as any) || {};
  return {
    garotas_top: Number(v?.garotas_top) > 0 ? Number(v.garotas_top) : DEFAULTS.garotas_top,
    latinas: Number(v?.latinas) > 0 ? Number(v.latinas) : DEFAULTS.latinas,
    novidades: Number(v?.novidades) > 0 ? Number(v.novidades) : DEFAULTS.novidades,
  };
}

export async function saveCheckoutPrices(prices: Record<CheckoutKey, number>) {
  await supabase.from("admin_settings").upsert(
    {
      setting_key: SETTING_KEY,
      setting_value: prices as any,
    },
    { onConflict: "setting_key" }
  );
}
