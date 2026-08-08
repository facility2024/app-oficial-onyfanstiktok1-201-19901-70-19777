ALTER TABLE public.creator_applications
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_creator_applications_referred_by
  ON public.creator_applications(referred_by);