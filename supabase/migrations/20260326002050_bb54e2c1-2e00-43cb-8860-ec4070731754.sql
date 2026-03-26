-- Criar bucket público para imagens das lojas do marketplace
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: qualquer usuário autenticado pode fazer upload
CREATE POLICY "Authenticated users can upload store assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'store-assets');

-- RLS: leitura pública
CREATE POLICY "Public can view store assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'store-assets');

-- RLS: dono pode deletar seus arquivos
CREATE POLICY "Users can delete own store assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'store-assets' AND (storage.foldername(name))[1] = auth.uid()::text);