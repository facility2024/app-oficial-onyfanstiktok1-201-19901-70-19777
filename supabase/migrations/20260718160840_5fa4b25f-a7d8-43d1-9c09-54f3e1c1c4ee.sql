
-- 1) Coluna side_media em checkout_templates
ALTER TABLE public.checkout_templates
  ADD COLUMN IF NOT EXISTS side_media jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) Políticas storage para bucket checkout-media
-- Leitura pública (necessário pro checkout público mostrar imagens/vídeos)
DROP POLICY IF EXISTS "checkout_media_public_read" ON storage.objects;
CREATE POLICY "checkout_media_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'checkout-media');

-- Upload por admin
DROP POLICY IF EXISTS "checkout_media_admin_insert" ON storage.objects;
CREATE POLICY "checkout_media_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'checkout-media' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "checkout_media_admin_update" ON storage.objects;
CREATE POLICY "checkout_media_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'checkout-media' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "checkout_media_admin_delete" ON storage.objects;
CREATE POLICY "checkout_media_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'checkout-media' AND public.has_role(auth.uid(), 'admin'));
