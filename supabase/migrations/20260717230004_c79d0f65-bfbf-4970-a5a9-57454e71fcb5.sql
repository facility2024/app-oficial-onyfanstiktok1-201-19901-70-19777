CREATE TABLE public.ig_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID NOT NULL,
  inputs JSONB NOT NULL DEFAULT '[]'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  max_pages INTEGER NOT NULL DEFAULT 1 CHECK (max_pages BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'discovering', 'processing', 'completed', 'completed_with_errors', 'failed', 'cancelled')),
  total_items INTEGER NOT NULL DEFAULT 0,
  processed_items INTEGER NOT NULL DEFAULT 0,
  imported_items INTEGER NOT NULL DEFAULT 0,
  skipped_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ig_import_jobs TO authenticated;
GRANT ALL ON public.ig_import_jobs TO service_role;

ALTER TABLE public.ig_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ig_import_jobs_admin_all"
ON public.ig_import_jobs
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX ig_import_jobs_pending_idx
ON public.ig_import_jobs (status, next_attempt_at, created_at);

CREATE TRIGGER ig_import_jobs_updated_at
BEFORE UPDATE ON public.ig_import_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ig_import_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.ig_import_jobs(id) ON DELETE CASCADE,
  ig_model_id UUID REFERENCES public.ig_models(id) ON DELETE SET NULL,
  username TEXT,
  shortcode TEXT NOT NULL,
  source_payload JSONB,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'imported', 'skipped', 'retry', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  result_video_id UUID REFERENCES public.ig_feed_videos(id) ON DELETE SET NULL,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, shortcode)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ig_import_items TO authenticated;
GRANT ALL ON public.ig_import_items TO service_role;

ALTER TABLE public.ig_import_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ig_import_items_admin_all"
ON public.ig_import_items
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX ig_import_items_pending_idx
ON public.ig_import_items (job_id, status, next_attempt_at, created_at);

CREATE TRIGGER ig_import_items_updated_at
BEFORE UPDATE ON public.ig_import_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.ig_import_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ig_import_items;