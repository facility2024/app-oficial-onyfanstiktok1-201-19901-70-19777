GRANT SELECT, INSERT, UPDATE ON public.likes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.likes TO authenticated;
GRANT ALL ON public.likes TO service_role;

GRANT SELECT ON public.videos TO anon;
GRANT SELECT ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;