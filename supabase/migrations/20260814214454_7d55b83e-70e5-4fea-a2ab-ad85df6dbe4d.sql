CREATE TABLE IF NOT EXISTS public.user_carousel_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  carousel_key text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  shown_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, carousel_key)
);

CREATE INDEX IF NOT EXISTS idx_user_carousel_queue_user ON public.user_carousel_queue (user_id, consumed_at, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_carousel_queue TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_carousel_queue TO authenticated;
GRANT ALL ON public.user_carousel_queue TO service_role;

ALTER TABLE public.user_carousel_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carousel_queue_select_public" ON public.user_carousel_queue
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "carousel_queue_insert_public" ON public.user_carousel_queue
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "carousel_queue_update_public" ON public.user_carousel_queue
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "carousel_queue_delete_public" ON public.user_carousel_queue
  FOR DELETE TO anon, authenticated USING (true);

CREATE TRIGGER trg_user_carousel_queue_updated_at
  BEFORE UPDATE ON public.user_carousel_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();