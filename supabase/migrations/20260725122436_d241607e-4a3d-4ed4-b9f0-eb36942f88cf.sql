
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_inserted boolean := false;
BEGIN
  INSERT INTO public.profiles (id, email, name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING true INTO v_inserted;

  IF v_inserted THEN
    BEGIN
      PERFORM net.http_post(
        url := 'https://tnzvhwapfhkhqjgyiomk.supabase.co/functions/v1/send-welcome-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuenZod2FwZmhraHFqZ3lpb21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NjM5MzUsImV4cCI6MjA2OTQzOTkzNX0.mWv0UEbkeczgKUMRaDm94Azo3Olgu3-sOnkZ7kamWuM',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuenZod2FwZmhraHFqZ3lpb21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NjM5MzUsImV4cCI6MjA2OTQzOTkzNX0.mWv0UEbkeczgKUMRaDm94Azo3Olgu3-sOnkZ7kamWuM'
        ),
        body := jsonb_build_object('user_id', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'welcome email dispatch failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;
