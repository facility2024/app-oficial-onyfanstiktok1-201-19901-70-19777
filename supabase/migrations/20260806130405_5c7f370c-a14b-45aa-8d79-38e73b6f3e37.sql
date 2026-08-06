ALTER TABLE public.models ADD COLUMN IF NOT EXISTS base_followers integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS base_followers integer NOT NULL DEFAULT 0;
ALTER TABLE public.engagement_schedules ADD COLUMN IF NOT EXISTS base_followers integer NOT NULL DEFAULT 0;