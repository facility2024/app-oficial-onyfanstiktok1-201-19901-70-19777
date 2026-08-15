DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bloco_horario') THEN
        CREATE TYPE public.bloco_horario AS ENUM ('manha_09h', 'meio_dia_12h', 'noite_19h');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.video_exibicoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    criadora_id UUID NOT NULL, -- Pode ser creator_id ou model_id
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
    bloco public.bloco_horario NOT NULL,
    data_exibicao DATE DEFAULT CURRENT_DATE NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (usuario_id, criadora_id, bloco, data_exibicao)
);

GRANT SELECT, INSERT ON public.video_exibicoes TO authenticated;
GRANT ALL ON public.video_exibicoes TO service_role;

ALTER TABLE public.video_exibicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_view_own_exhibitions" ON public.video_exibicoes
    FOR SELECT TO authenticated
    USING (usuario_id = auth.uid());

CREATE POLICY "user_insert_own_exhibitions" ON public.video_exibicoes
    FOR INSERT TO authenticated
    WITH CHECK (usuario_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_current_bloco()
RETURNS public.bloco_horario
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    -- Ajuste para Horário de Brasília (UTC-3)
    hora INT := EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'));
BEGIN
    IF hora >= 19 OR hora < 9 THEN
        RETURN 'noite_19h'::public.bloco_horario;
    ELSIF hora >= 12 THEN
        RETURN 'meio_dia_12h'::public.bloco_horario;
    ELSE
        RETURN 'manha_09h'::public.bloco_horario;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_video_for_block(p_usuario_id UUID, p_criadora_id UUID)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bloco public.bloco_horario;
    v_video_id UUID;
    v_data DATE := CURRENT_DATE;
BEGIN
    v_bloco := public.get_current_bloco();

    -- 1. Tenta recuperar vídeo já sorteado para este bloco/dia
    SELECT video_id INTO v_video_id
    FROM public.video_exibicoes
    WHERE usuario_id = p_usuario_id
      AND criadora_id = p_criadora_id
      AND bloco = v_bloco
      AND data_exibicao = v_data;

    IF v_video_id IS NOT NULL THEN
        RETURN v_video_id;
    END IF;

    -- 2. Se não existe, sorteia um vídeo da criadora que ainda não foi visto HOJE por este usuário
    -- (independente do bloco)
    SELECT v.id INTO v_video_id
    FROM public.videos v
    WHERE (v.creator_id = p_criadora_id OR v.model_id = p_criadora_id)
      AND v.is_active = true
      AND v.id NOT IN (
          -- Exclui vídeos já vistos hoje em outros blocos
          SELECT ve.video_id 
          FROM public.video_exibicoes ve 
          WHERE ve.usuario_id = p_usuario_id 
            AND ve.data_exibicao = v_data
      )
    ORDER BY random()
    LIMIT 1;

    -- 3. Se todos os vídeos já foram vistos hoje, sorteia qualquer um ativo da criadora
    IF v_video_id IS NULL THEN
        SELECT v.id INTO v_video_id
        FROM public.videos v
        WHERE (v.creator_id = p_criadora_id OR v.model_id = p_criadora_id)
          AND v.is_active = true
        ORDER BY random()
        LIMIT 1;
    END IF;

    -- 4. Persiste o sorteio para manter consistência no refresh
    IF v_video_id IS NOT NULL THEN
        INSERT INTO public.video_exibicoes (usuario_id, criadora_id, video_id, bloco, data_exibicao)
        VALUES (p_usuario_id, p_criadora_id, v_video_id, v_bloco, v_data)
        ON CONFLICT (usuario_id, criadora_id, bloco, data_exibicao) DO NOTHING;
    END IF;

    RETURN v_video_id;
END;
$$;