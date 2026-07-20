
-- Backfill items + entitlements when template.product_id is set/changed
CREATE OR REPLACE FUNCTION public.backfill_template_purchases()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p RECORD;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.product_id IS NOT DISTINCT FROM OLD.product_id THEN
    RETURN NEW;
  END IF;

  FOR p IN
    SELECT cp.id, cp.total_amount
    FROM public.checkout_purchases cp
    WHERE cp.status = 'paid'
      AND (cp.metadata->>'template_id' = NEW.id::text OR cp.metadata->>'template_slug' = NEW.slug)
      AND NOT EXISTS (
        SELECT 1 FROM public.checkout_purchase_items i
        WHERE i.purchase_id = cp.id AND i.product_id = NEW.product_id
      )
  LOOP
    INSERT INTO public.checkout_purchase_items (purchase_id, product_id, price, snapshot_name)
    VALUES (p.id, NEW.product_id, COALESCE(NEW.amount, p.total_amount), NEW.product_name);
    PERFORM public.grant_entitlements_for_purchase(p.id);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_backfill_template_purchases ON public.checkout_templates;
CREATE TRIGGER trg_backfill_template_purchases
AFTER INSERT OR UPDATE OF product_id ON public.checkout_templates
FOR EACH ROW EXECUTE FUNCTION public.backfill_template_purchases();
