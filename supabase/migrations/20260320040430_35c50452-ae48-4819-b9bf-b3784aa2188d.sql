
-- Add billing columns to profiles if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='cpf') THEN
    ALTER TABLE public.profiles ADD COLUMN cpf text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='billing_name') THEN
    ALTER TABLE public.profiles ADD COLUMN billing_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='cep') THEN
    ALTER TABLE public.profiles ADD COLUMN cep text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='endereco') THEN
    ALTER TABLE public.profiles ADD COLUMN endereco text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='numero') THEN
    ALTER TABLE public.profiles ADD COLUMN numero text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='complemento') THEN
    ALTER TABLE public.profiles ADD COLUMN complemento text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='bairro') THEN
    ALTER TABLE public.profiles ADD COLUMN bairro text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='cidade') THEN
    ALTER TABLE public.profiles ADD COLUMN cidade text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='estado') THEN
    ALTER TABLE public.profiles ADD COLUMN estado text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='asaas_customer_id') THEN
    ALTER TABLE public.profiles ADD COLUMN asaas_customer_id text;
  END IF;
END $$;
