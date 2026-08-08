ALTER TABLE public.checkout_purchases REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.checkout_purchases;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;