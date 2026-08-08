
CREATE OR REPLACE FUNCTION public.ads_garotas_top_auto_ordem()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ordem IS NULL OR NEW.ordem = 0 THEN
    UPDATE public.ads_garotas_top
    SET ordem = ordem + 1
    WHERE ordem >= 1;

    NEW.ordem := 1;
  END IF;

  RETURN NEW;
END;
$$;
