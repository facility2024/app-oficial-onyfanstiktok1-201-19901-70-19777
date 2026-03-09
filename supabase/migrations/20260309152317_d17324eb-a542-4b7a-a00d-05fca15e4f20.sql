
CREATE TABLE public.promo_click_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id TEXT NOT NULL,
  button_type TEXT NOT NULL,
  region TEXT,
  city TEXT,
  device_type TEXT DEFAULT 'unknown',
  session_id TEXT,
  user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast admin queries
CREATE INDEX idx_promo_clicks_created ON public.promo_click_tracking (created_at DESC);
CREATE INDEX idx_promo_clicks_promo ON public.promo_click_tracking (promo_id);
CREATE INDEX idx_promo_clicks_button ON public.promo_click_tracking (button_type);

-- RLS
ALTER TABLE public.promo_click_tracking ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (tracking anonymous users too)
CREATE POLICY "promo_clicks_insert_public" ON public.promo_click_tracking
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read
CREATE POLICY "promo_clicks_select_admin" ON public.promo_click_tracking
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
