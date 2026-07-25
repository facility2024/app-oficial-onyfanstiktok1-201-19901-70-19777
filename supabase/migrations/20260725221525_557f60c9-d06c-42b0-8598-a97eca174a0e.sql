-- 1) profiles: remove broad authenticated read of sensitive data
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;

-- Safe public view for cross-user reads (no CPF, address, phone, billing, gateway ids)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, name, username, first_name, avatar_url, bio, followers_count,
       video_call_active, video_call_url, live_active, live_url,
       referral_code, is_referrer_only, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 2) app_users: no more public inserts
DROP POLICY IF EXISTS "Public can insert app_users for age verification" ON public.app_users;
REVOKE INSERT ON public.app_users FROM anon;

-- 3) registrations_data: no anonymous inserts of sensitive data
DROP POLICY IF EXISTS "Allow anonymous insert of registration data" ON public.registrations_data;
REVOKE INSERT, SELECT, UPDATE, DELETE ON public.registrations_data FROM anon;
GRANT ALL ON public.registrations_data TO service_role;