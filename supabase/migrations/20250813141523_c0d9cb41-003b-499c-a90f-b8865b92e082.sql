-- Verificar e corrigir o problema de timezone no agendamento
-- Vamos garantir que as datas sejam armazenadas e comparadas corretamente

-- Primeiro, vamos ver que posts estão agendados (para debug)
DO $$
DECLARE
    post_record RECORD;
    current_time_utc TIMESTAMP WITH TIME ZONE;
    current_time_brazil TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Obter o horário atual
    current_time_utc := NOW();
    current_time_brazil := current_time_utc AT TIME ZONE 'America/Sao_Paulo';
    
    RAISE NOTICE 'Horário atual UTC: %', current_time_utc;
    RAISE NOTICE 'Horário atual Brasil: %', current_time_brazil;
    
    -- Listar posts agendados
    FOR post_record IN 
        SELECT id, titulo, data_agendamento, status 
        FROM public.posts_agendados 
        WHERE status = 'agendado'
        ORDER BY data_agendamento
    LOOP
        RAISE NOTICE 'Post: % | Agendado para: % | Status: %', 
            post_record.titulo, 
            post_record.data_agendamento, 
            post_record.status;
            
        -- Verificar se deveria ter sido executado
        IF post_record.data_agendamento <= current_time_utc THEN
            RAISE NOTICE '  ↳ Este post DEVERIA ter sido executado!';
        ELSE
            RAISE NOTICE '  ↳ Este post ainda não chegou a hora: faltam % minutos', 
                EXTRACT(EPOCH FROM (post_record.data_agendamento - current_time_utc))/60;
        END IF;
    END LOOP;
END $$;