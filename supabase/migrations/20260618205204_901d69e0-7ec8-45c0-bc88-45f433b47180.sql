
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC, id DESC) AS nova_ordem
  FROM public.ads_garotas_top
)
UPDATE public.ads_garotas_top a
SET ordem = ordered.nova_ordem
FROM ordered
WHERE a.id = ordered.id;
