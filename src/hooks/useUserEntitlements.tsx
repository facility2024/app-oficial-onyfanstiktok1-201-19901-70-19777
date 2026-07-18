import { useEffect, useState, useCallback } from "react";
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
    if (!uid) { setEntitlements([]); setLoading(false); return; }
    const { data } = await (supabase as any)
      .from("user_entitlements")
      .select("id, product_id, status, granted_at, expires_at, purchase_id")
      .eq("user_id", uid)
      .eq("status", "active");
    setEntitlements(data ?? []);
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

  const productIds = new Set(entitlements.map((e) => e.product_id));
  const hasProduct = (productId: string) => productIds.has(productId);

  return { entitlements, productIds, hasProduct, loading, userId, reload: () => load(userId) };
}
