
-- Create cocoflix_content table
CREATE TABLE public.cocoflix_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.models(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  preview_video_url TEXT,
  thumbnail_url TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Geral',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cocoflix_videos table
CREATE TABLE public.cocoflix_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.cocoflix_content(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cocoflix_purchases table
CREATE TABLE public.cocoflix_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.cocoflix_content(id) ON DELETE CASCADE,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_reference TEXT,
  price_paid NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_id)
);

-- Enable RLS
ALTER TABLE public.cocoflix_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cocoflix_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cocoflix_purchases ENABLE ROW LEVEL SECURITY;

-- cocoflix_content: public read for active content
CREATE POLICY "cocoflix_content_public_read" ON public.cocoflix_content
  FOR SELECT TO anon, authenticated USING (is_active = true);

-- cocoflix_content: admin full access
CREATE POLICY "cocoflix_content_admin_all" ON public.cocoflix_content
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- cocoflix_videos: purchasers can read
CREATE POLICY "cocoflix_videos_purchaser_read" ON public.cocoflix_videos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cocoflix_purchases
      WHERE cocoflix_purchases.content_id = cocoflix_videos.content_id
        AND cocoflix_purchases.user_id = auth.uid()
        AND cocoflix_purchases.payment_status = 'confirmed'
    )
  );

-- cocoflix_videos: admin full access
CREATE POLICY "cocoflix_videos_admin_all" ON public.cocoflix_videos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- cocoflix_purchases: users read own
CREATE POLICY "cocoflix_purchases_select_own" ON public.cocoflix_purchases
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- cocoflix_purchases: users insert own
CREATE POLICY "cocoflix_purchases_insert_own" ON public.cocoflix_purchases
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- cocoflix_purchases: admin full access
CREATE POLICY "cocoflix_purchases_admin_all" ON public.cocoflix_purchases
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- cocoflix_purchases: webhook can update (anon for payment webhook)
CREATE POLICY "cocoflix_purchases_webhook_update" ON public.cocoflix_purchases
  FOR UPDATE TO anon, service_role USING (true);

-- Indexes
CREATE INDEX idx_cocoflix_content_category ON public.cocoflix_content(category);
CREATE INDEX idx_cocoflix_content_model ON public.cocoflix_content(model_id);
CREATE INDEX idx_cocoflix_videos_content ON public.cocoflix_videos(content_id);
CREATE INDEX idx_cocoflix_purchases_user ON public.cocoflix_purchases(user_id);
CREATE INDEX idx_cocoflix_purchases_content ON public.cocoflix_purchases(content_id);
