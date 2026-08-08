-- Allow public read access to marketplace_banners setting
CREATE POLICY "public_read_marketplace_banners" ON public.admin_settings
    FOR SELECT
    TO anon, authenticated
    USING (setting_key = 'marketplace_banners');