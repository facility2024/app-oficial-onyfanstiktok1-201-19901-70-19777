DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='ads_latinas') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.ads_latinas';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='ads_novidades') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.ads_novidades';
  END IF;
END $$;
ALTER TABLE public.ads_latinas REPLICA IDENTITY FULL;
ALTER TABLE public.ads_novidades REPLICA IDENTITY FULL;
ALTER TABLE public.ads_garotas_top REPLICA IDENTITY FULL;