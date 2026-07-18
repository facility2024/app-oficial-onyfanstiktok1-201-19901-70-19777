
ALTER TABLE public.checkout_templates
  ADD COLUMN IF NOT EXISTS timer_label TEXT,
  ADD COLUMN IF NOT EXISTS security_text TEXT,
  ADD COLUMN IF NOT EXISTS security_banner_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS finalize_button_label TEXT,
  ADD COLUMN IF NOT EXISTS finalize_button_color TEXT,
  ADD COLUMN IF NOT EXISTS legal_text TEXT,
  ADD COLUMN IF NOT EXISTS footer_security_text TEXT,
  ADD COLUMN IF NOT EXISTS author_label TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_label TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_placeholder TEXT;
