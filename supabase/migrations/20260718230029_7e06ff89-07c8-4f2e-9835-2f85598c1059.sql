
CREATE OR REPLACE FUNCTION public.sync_bump_to_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_slug text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_key := 'bump_' || REPLACE(OLD.id::text, '-', '');
    UPDATE public.products SET is_active = false, updated_at = now()
     WHERE access_key = v_key;
    RETURN OLD;
  END IF;

  v_key  := 'bump_' || REPLACE(NEW.id::text, '-', '');
  v_slug := 'bump-' || NEW.id::text;

  INSERT INTO public.products (slug, name, type, image_url, description, default_price, access_key, is_active)
  VALUES (v_slug, NEW.titulo, 'bump', NEW.imagem_url, NEW.descricao, NEW.valor, v_key, NEW.ativo)
  ON CONFLICT (access_key) DO UPDATE SET
    name          = EXCLUDED.name,
    image_url     = EXCLUDED.image_url,
    description   = EXCLUDED.description,
    default_price = EXCLUDED.default_price,
    is_active     = EXCLUDED.is_active,
    updated_at    = now();

  RETURN NEW;
END;
$$;

-- Garante unicidade de access_key para o ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS products_access_key_key ON public.products(access_key);

DROP TRIGGER IF EXISTS trg_sync_bump_to_product ON public.checkout_order_bumps;
CREATE TRIGGER trg_sync_bump_to_product
AFTER INSERT OR UPDATE OR DELETE ON public.checkout_order_bumps
FOR EACH ROW EXECUTE FUNCTION public.sync_bump_to_product();

-- Backfill dos bumps existentes para atualizar o catálogo
UPDATE public.checkout_order_bumps SET updated_at = now();
