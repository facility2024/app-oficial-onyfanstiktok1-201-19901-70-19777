
-- 1) Remover INSERT público em checkout_purchases / checkout_purchase_items.
-- Edge functions usam SERVICE_ROLE_KEY (bypass RLS), então continuam operando.
DROP POLICY IF EXISTS cpurchases_insert_any ON public.checkout_purchases;
DROP POLICY IF EXISTS cpi_insert_any ON public.checkout_purchase_items;

-- 2) Revogar EXECUTE público da RPC de liberação de entitlements.
REVOKE EXECUTE ON FUNCTION public.grant_entitlements_for_purchase(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_entitlements_for_purchase(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.grant_entitlements_for_purchase(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.grant_entitlements_for_purchase(uuid) TO service_role;
