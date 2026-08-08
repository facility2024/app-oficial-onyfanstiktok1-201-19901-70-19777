
-- =====================================================
-- FIX 1: Function Search Path Mutable
-- Add SET search_path = public to all public functions missing it
-- =====================================================

-- Trigger functions (non-security-definer)
CREATE OR REPLACE FUNCTION public.set_promo_ads_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.set_referral_code_on_profile()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substr(md5(random()::text), 1, 8));
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.update_creator_applications_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_model_chat_panels_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_model_subscription_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_online_users_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.update_posts_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN
  UPDATE marketplace_products SET average_rating = (SELECT COALESCE(AVG(rating), 0) FROM marketplace_reviews WHERE product_id = NEW.product_id), total_reviews = (SELECT COUNT(*) FROM marketplace_reviews WHERE product_id = NEW.product_id) WHERE id = NEW.product_id;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_user_followers_count()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET followers_count = COALESCE(followers_count, 0) + 1 WHERE id = NEW.following_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET followers_count = GREATEST(COALESCE(followers_count, 0) - 1, 0) WHERE id = OLD.following_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.normalize_phone(phone_input text)
RETURNS text LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$ BEGIN RETURN regexp_replace(phone_input, '[^0-9]', '', 'g'); END; $$;

CREATE OR REPLACE FUNCTION public.generate_unique_referral_code()
RETURNS text LANGUAGE plpgsql
SET search_path = public
AS $$ DECLARE code TEXT; BEGIN
  LOOP
    code := upper(substr(md5(random()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code);
  END LOOP;
  RETURN code;
END; $$;

CREATE OR REPLACE FUNCTION public.videos_posts_normalize_video_url()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$ DECLARE url text; BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='videos_posts' AND column_name='video_url') THEN RETURN NEW; END IF;
  url := NEW.video_url;
  IF url IS NULL OR length(trim(url)) = 0 THEN RETURN NEW; END IF;
  url := trim(both from url);
  IF position('http://' in lower(url)) = 1 THEN url := 'https://' || right(url, length(url) - 7); END IF;
  IF NOT (lower(url) ~ '^https://(www\.)?youtube\.com/' OR lower(url) ~ '^https://(www\.)?youtu\.be/' OR lower(url) ~ '^https://(www\.)?vimeo\.com/' OR lower(url) ~ '^https://(www\.)?tiktok\.com/' OR lower(url) ~ '^https://(www\.)?instagram\.com/') THEN
    RAISE NOTICE 'video_url com domínio não validado: %', url;
  END IF;
  NEW.video_url := url;
  RETURN NEW;
END; $$;

-- Security definer functions that need search_path
CREATE OR REPLACE FUNCTION public.admin_delete_model(p_model_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$ BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Permissão negada: apenas admins podem excluir modelos';
  END IF;
  DELETE FROM public.likes WHERE model_id = p_model_id;
  DELETE FROM public.comments WHERE model_id = p_model_id;
  DELETE FROM public.video_views WHERE model_id = p_model_id;
  DELETE FROM public.videos WHERE model_id = p_model_id;
  DELETE FROM public.model_followers WHERE model_id = p_model_id;
  DELETE FROM public.model_chat_panels WHERE model_id = p_model_id;
  DELETE FROM public.model_subscription_plans WHERE model_id = p_model_id;
  DELETE FROM public.model_subscriptions WHERE model_id = p_model_id;
  DELETE FROM public.models WHERE id = p_model_id;
END; $$;

CREATE OR REPLACE FUNCTION public.cleanup_registration_limits()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$ BEGIN
  DELETE FROM public.registration_limits WHERE user_id IS NULL AND created_at < (now() - interval '7 days');
END; $$;

CREATE OR REPLACE FUNCTION public.get_referrer_by_code(p_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$ DECLARE referrer_id UUID; BEGIN
  SELECT id INTO referrer_id FROM public.profiles WHERE referral_code = upper(p_code) LIMIT 1;
  RETURN referrer_id;
END; $$;

CREATE OR REPLACE FUNCTION public.register_sale(p_page_id uuid, p_whatsapp text, p_amount numeric, p_real_amount numeric DEFAULT NULL, p_transaction_id text DEFAULT NULL, p_hoopay_data jsonb DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$ DECLARE sale_id UUID; BEGIN
  INSERT INTO public.sales_records (page_id, customer_whatsapp, sale_amount, real_amount, external_transaction_id, hoopay_response, payment_status)
  VALUES (p_page_id, p_whatsapp, p_amount, p_real_amount, p_transaction_id, p_hoopay_data, 'completed')
  RETURNING id INTO sale_id;
  RETURN sale_id;
END; $$;

CREATE OR REPLACE FUNCTION public.update_monthly_revenue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$ DECLARE month_key TEXT; BEGIN
  month_key := TO_CHAR(NEW.created_at, 'YYYY-MM');
  INSERT INTO public.monthly_revenue (month_year, page_id, total_sales_count, total_revenue, real_revenue)
  VALUES (month_key, NEW.page_id, 1, NEW.sale_amount, COALESCE(NEW.real_amount, NEW.sale_amount))
  ON CONFLICT (month_year, page_id) DO UPDATE SET
    total_sales_count = monthly_revenue.total_sales_count + 1,
    total_revenue = monthly_revenue.total_revenue + NEW.sale_amount,
    real_revenue = monthly_revenue.real_revenue + COALESCE(NEW.real_amount, NEW.sale_amount),
    updated_at = NOW();
  RETURN NEW;
END; $$;
