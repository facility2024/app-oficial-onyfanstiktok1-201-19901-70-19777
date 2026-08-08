ALTER TABLE public.checkout_order_bumps ADD COLUMN IF NOT EXISTS link_acesso TEXT;

INSERT INTO public.admin_settings (setting_key, setting_value)
VALUES ('checkout_main_access_link', '"/garotas-top-vip"'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;