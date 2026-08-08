ALTER TABLE public.models ADD COLUMN IF NOT EXISTS creator_user_id UUID;
CREATE INDEX IF NOT EXISTS idx_models_creator_user_id ON public.models(creator_user_id);