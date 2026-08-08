
CREATE TABLE IF NOT EXISTS public.whatsapp_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wac_whatsapp ON public.whatsapp_access_codes(whatsapp);
CREATE INDEX IF NOT EXISTS idx_wac_expires ON public.whatsapp_access_codes(expires_at);

GRANT ALL ON public.whatsapp_access_codes TO service_role;

ALTER TABLE public.whatsapp_access_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wac_service_only" ON public.whatsapp_access_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
