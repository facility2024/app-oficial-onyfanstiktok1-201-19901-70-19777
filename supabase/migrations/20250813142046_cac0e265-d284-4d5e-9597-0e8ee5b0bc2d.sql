-- Criar função para processar posts agendados manualmente (para teste)
CREATE OR REPLACE FUNCTION public.processar_posts_agendados_manual()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    post_record RECORD;
    posts_processados INTEGER := 0;
    resultado TEXT := '';
BEGIN
    -- Buscar posts que deveriam ter sido publicados
    FOR post_record IN 
        SELECT * FROM public.posts_agendados 
        WHERE status = 'agendado' 
        AND data_agendamento <= NOW()
        ORDER BY data_agendamento ASC
    LOOP
        -- Atualizar status para publicado
        UPDATE public.posts_agendados 
        SET 
            status = 'publicado',
            data_publicacao = NOW(),
            updated_at = NOW()
        WHERE id = post_record.id;
        
        -- Registrar execução
        INSERT INTO public.agendamento_execucoes (
            post_agendado_id,
            status_execucao,
            data_execucao
        ) VALUES (
            post_record.id,
            'executado',
            NOW()
        );
        
        -- Se for para enviar para tela principal
        IF post_record.enviar_tela_principal THEN
            INSERT INTO public.posts_principais (
                modelo_id,
                modelo_username,
                titulo,
                descricao,
                conteudo_url,
                tipo_conteudo,
                post_agendado_id,
                is_active
            ) VALUES (
                post_record.modelo_id,
                post_record.modelo_username,
                post_record.titulo,
                post_record.descricao,
                post_record.conteudo_url,
                post_record.tipo_conteudo,
                post_record.id,
                true
            );
        END IF;
        
        posts_processados := posts_processados + 1;
        resultado := resultado || 'Post "' || post_record.titulo || '" publicado. ';
    END LOOP;
    
    IF posts_processados = 0 THEN
        resultado := 'Nenhum post encontrado para publicar no momento.';
    ELSE
        resultado := 'Processados ' || posts_processados || ' posts: ' || resultado;
    END IF;
    
    RETURN resultado;
END;
$$;

-- Executar a função para processar posts pendentes
SELECT public.processar_posts_agendados_manual();