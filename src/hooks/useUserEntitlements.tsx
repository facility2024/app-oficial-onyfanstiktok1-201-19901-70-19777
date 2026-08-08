import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Entitlement {
  id: string;
  product_id: string;
  status: string;
  granted_at: string;
  expires_at: string | null;
  purchase_id: string | null;
}

/**
 * Retorna o conjunto de produtos liberados para o usuário logado.
 * Mantém sincronizado em tempo real via Supabase realtime.
 */
export function useUserEntitlements() {
  const [userId, setUserId] = useState<string | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (uid: string | null) => {
    setLoading(true);
    const results: Entitlement[] = [];

    if (uid) {
      const { data } = await (supabase as any)
        .from("user_entitlements")
        .select("id, product_id, status, granted_at, expires_at, purchase_id")
        .eq("user_id", uid)
        .eq("status", "active");
      if (data) results.push(...data);
    }

    // Comprador validado via WhatsApp. A Edge Function usa service role para
    // consultar somente os IDs liberados, sem expor compras protegidas por RLS.
    const buyerWa = typeof window !== "undefined" ? sessionStorage.getItem("buyer_whatsapp") : null;
    if (buyerWa) {
      const { data, error } = await supabase.functions.invoke("buyer-access", {
        body: { whatsapp: buyerWa },
      });

      if (!error && !(data as any)?.error) {
        ((data as any)?.product_ids ?? []).forEach((productId: string) => {
          results.push({
            id: `wa-${productId}`,
            product_id: productId,
            status: "active",
            granted_at: new Date().toISOString(),
            expires_at: null,
            purchase_id: null,
          });
        });
      }
    }

    setEntitlements(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const uid = data.user?.id ?? null;
      setUserId(uid);
      load(uid);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      load(uid);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`entitlements-${userId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "user_entitlements", filter: `user_id=eq.${userId}` },
        () => load(userId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, load]);

  // Keep these references stable. ProductAccessPage uses hasProduct inside an
  // effect; recreating it on every render caused that effect to run forever,
  // repeatedly replacing the page with the loading spinner.
  const productIds = useMemo(
    () => new Set(entitlements.map((e) => e.product_id)),
    [entitlements],
  );
  const hasProduct = useCallback(
    (productId: string) => productIds.has(productId),
    [productIds],
  );

  return { entitlements, productIds, hasProduct, loading, userId, reload: () => load(userId) };
}
