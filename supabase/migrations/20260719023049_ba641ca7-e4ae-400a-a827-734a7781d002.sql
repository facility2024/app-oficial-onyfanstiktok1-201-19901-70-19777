-- 1) Nova coluna
ALTER TABLE public.feed_promotions
  ADD COLUMN IF NOT EXISTS checkout_template_id UUID
  REFERENCES public.checkout_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_feed_promotions_checkout_template_id
  ON public.feed_promotions(checkout_template_id);

-- 2) Backfill: para cada card cujo cta_link contém /checkout/<slug>,
--    resolve o template pelo slug e grava o id.
UPDATE public.feed_promotions fp
SET checkout_template_id = ct.id
FROM public.checkout_templates ct
WHERE fp.checkout_template_id IS NULL
  AND fp.cta_link IS NOT NULL
  AND position('/checkout/' IN fp.cta_link) > 0
  AND ct.slug = regexp_replace(
        split_part(split_part(fp.cta_link, '/checkout/', 2), '?', 1),
        '[/#].*$', ''
      );