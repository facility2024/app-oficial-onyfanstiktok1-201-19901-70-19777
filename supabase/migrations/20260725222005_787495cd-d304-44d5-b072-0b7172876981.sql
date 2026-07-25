DROP VIEW IF EXISTS public.public_profiles;

CREATE TABLE public.public_profiles (
  id uuid PRIMARY KEY,
  name text,
  username text,
  first_name text,
  avatar_url text,
  bio text,
  followers_count integer,
  video_call_active boolean,
  video_call_url text,
  live_active boolean,
  live_url text,
  referral_code text,
  is_referrer_only boolean,
  created_at timestamptz
);

GRANT SELECT ON public.public_profiles TO anon, authenticated;
GRANT ALL ON public.public_profiles TO service_role;

ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_profiles_read_all" ON public.public_profiles
  FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.sync_public_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.public_profiles WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.public_profiles (id, name, username, first_name, avatar_url, bio,
    followers_count, video_call_active, video_call_url, live_active, live_url,
    referral_code, is_referrer_only, created_at)
  VALUES (NEW.id, NEW.name, NEW.username, NEW.first_name, NEW.avatar_url, NEW.bio,
    NEW.followers_count, NEW.video_call_active, NEW.video_call_url, NEW.live_active, NEW.live_url,
    NEW.referral_code, NEW.is_referrer_only, NEW.created_at)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    avatar_url = EXCLUDED.avatar_url,
    bio = EXCLUDED.bio,
    followers_count = EXCLUDED.followers_count,
    video_call_active = EXCLUDED.video_call_active,
    video_call_url = EXCLUDED.video_call_url,
    live_active = EXCLUDED.live_active,
    live_url = EXCLUDED.live_url,
    referral_code = EXCLUDED.referral_code,
    is_referrer_only = EXCLUDED.is_referrer_only,
    created_at = EXCLUDED.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_public_profile_trg ON public.profiles;
CREATE TRIGGER sync_public_profile_trg
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_public_profile();

INSERT INTO public.public_profiles (id, name, username, first_name, avatar_url, bio,
  followers_count, video_call_active, video_call_url, live_active, live_url,
  referral_code, is_referrer_only, created_at)
SELECT id, name, username, first_name, avatar_url, bio, followers_count,
  video_call_active, video_call_url, live_active, live_url, referral_code, is_referrer_only, created_at
FROM public.profiles
ON CONFLICT (id) DO NOTHING;