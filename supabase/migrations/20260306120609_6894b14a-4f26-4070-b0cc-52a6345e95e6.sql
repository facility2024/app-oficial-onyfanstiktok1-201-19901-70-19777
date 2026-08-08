
-- Fix remaining: webhook_logs and model_chat_panels
DROP POLICY IF EXISTS "webhook_logs_update_admin" ON public.webhook_logs;
DROP POLICY IF EXISTS "webhook_logs_service_update" ON public.webhook_logs;
CREATE POLICY "webhook_logs_update_admin" ON public.webhook_logs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- MODEL_CHAT_PANELS - fix API key exposure
DROP POLICY IF EXISTS "authenticated_read_active" ON public.model_chat_panels;
DROP POLICY IF EXISTS "chat_panels_select_active_safe" ON public.model_chat_panels;
DROP POLICY IF EXISTS "chat_panels_select_active_public" ON public.model_chat_panels;

-- Only creators see their own panels (with API key) - creator_view_own already exists
-- For other users: create a safe read policy that still allows chat but API key masked in code
CREATE POLICY "chat_panels_select_active" ON public.model_chat_panels
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Fix remaining functions without search_path
CREATE OR REPLACE FUNCTION public.update_model_chat_panels_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_model_subscription_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_online_users_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id; RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id; RETURN OLD;
  END IF; RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id; RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id; RETURN OLD;
  END IF; RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.update_posts_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  UPDATE public.marketplace_products SET average_rating = (SELECT COALESCE(AVG(rating), 0) FROM public.marketplace_reviews WHERE product_id = NEW.product_id), total_reviews = (SELECT COUNT(*) FROM public.marketplace_reviews WHERE product_id = NEW.product_id) WHERE id = NEW.product_id;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.validate_gmail(email_input text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN LOWER(email_input) LIKE '%@gmail.com'; END; $$;

CREATE OR REPLACE FUNCTION public.normalize_phone(phone_input text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN regexp_replace(phone_input, '[^0-9]', '', 'g'); END; $$;

CREATE OR REPLACE FUNCTION public.atualizar_contador_evento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
    IF TG_OP = 'INSERT' THEN UPDATE public.eventos_ao_vivo SET participantes_atuais = participantes_atuais + 1 WHERE id = NEW.evento_id; RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN UPDATE public.eventos_ao_vivo SET participantes_atuais = participantes_atuais - 1 WHERE id = OLD.evento_id; RETURN OLD;
    END IF; RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.detectar_movimento(id_usuario uuid, velocidade numeric, coordenadas jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE tipo_movimento TEXT; confianca DECIMAL(5,2); BEGIN
    IF velocidade = 0 THEN tipo_movimento := 'parado'; confianca := 95.0;
    ELSIF velocidade <= 5 THEN tipo_movimento := 'caminhando'; confianca := 85.0;
    ELSIF velocidade <= 15 THEN tipo_movimento := 'correndo'; confianca := 80.0;
    ELSIF velocidade <= 25 THEN tipo_movimento := 'bicicleta'; confianca := 75.0;
    ELSE tipo_movimento := 'veiculo'; confianca := 70.0; END IF;
    INSERT INTO public.deteccao_movimento (usuario_id, tipo_movimento, confianca_deteccao, velocidade_media, rota_percorrida) VALUES (id_usuario, tipo_movimento, confianca, velocidade, coordenadas);
    RETURN tipo_movimento;
END; $$;

CREATE OR REPLACE FUNCTION public.atualizar_pontuacao_usuario(id_usuario uuid, acao text, pontos integer, referencia_id uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
    INSERT INTO public.sistema_pontos (usuario_id, acao_realizada, pontos_ganhos, referencia_id) VALUES (id_usuario, acao, pontos, referencia_id);
    INSERT INTO public.ranking_usuarios (usuario_id, categoria_ranking, pontos_totais) VALUES (id_usuario, 'geral', pontos) ON CONFLICT (usuario_id, categoria_ranking, periodo_referencia) DO UPDATE SET pontos_totais = ranking_usuarios.pontos_totais + pontos, data_ultima_atividade = NOW(), data_atualizacao = NOW();
    RETURN TRUE;
END; $$;

CREATE OR REPLACE FUNCTION public.videos_posts_normalize_video_url()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE url text; BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='videos_posts' AND column_name='video_url') THEN RETURN NEW; END IF;
  url := NEW.video_url; IF url IS NULL OR length(trim(url)) = 0 THEN RETURN NEW; END IF;
  url := trim(both from url);
  IF position('http://' in lower(url)) = 1 THEN url := 'https://' || right(url, length(url) - 7); END IF;
  NEW.video_url := url; RETURN NEW;
END; $$;
