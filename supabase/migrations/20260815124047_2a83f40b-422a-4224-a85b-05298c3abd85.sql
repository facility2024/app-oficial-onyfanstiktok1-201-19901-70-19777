DROP FUNCTION IF EXISTS public.get_ad_queue(UUID, UUID[], INTEGER);

CREATE OR REPLACE FUNCTION public.get_ad_queue(
    p_user_id UUID,
    p_seen UUID[] DEFAULT '{}',
    p_limit INTEGER DEFAULT 100
)
RETURNS SETOF public.feed_promotions
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bloco public.bloco_horario;
    v_data DATE := CURRENT_DATE;
    v_promo RECORD;
    v_video_id UUID;
BEGIN
    v_bloco := public.get_current_bloco();

    FOR v_promo IN 
        SELECT * FROM public.feed_promotions 
        WHERE is_active = true 
          AND (p_seen IS NULL OR id::UUID <> ALL(p_seen))
        ORDER BY priority DESC, created_at DESC
        LIMIT p_limit
    LOOP
        -- Registro de controle de rotação persistente por bloco para Ads
        IF p_user_id IS NOT NULL THEN
            INSERT INTO public.video_exibicoes (usuario_id, criadora_id, video_id, bloco, data_exibicao)
            VALUES (p_user_id, v_promo.id, v_promo.id, v_bloco, v_data)
            ON CONFLICT (usuario_id, criadora_id, bloco, data_exibicao) DO NOTHING;
        END IF;

        RETURN NEXT v_promo;
    END LOOP;
END;
$$;