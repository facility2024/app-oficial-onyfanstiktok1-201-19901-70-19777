-- Fix security warnings by setting search_path for the function
CREATE OR REPLACE FUNCTION public.processar_posts_agendados()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_record RECORD;
  resultado TEXT := '';
BEGIN
  -- Find posts scheduled for now or past
  FOR post_record IN 
    SELECT * FROM public.posts_agendados 
    WHERE status = 'agendado' 
    AND data_agendamento <= now()
    ORDER BY data_agendamento ASC
  LOOP
    -- Update post status to published
    UPDATE public.posts_agendados 
    SET 
      status = 'publicado',
      data_publicacao = now(),
      updated_at = now()
    WHERE id = post_record.id;
    
    -- Record execution
    INSERT INTO public.agendamento_execucoes (
      post_agendado_id,
      status_execucao
    ) VALUES (
      post_record.id,
      'executado'
    );
    
    resultado := resultado || 'Post ' || post_record.titulo || ' publicado. ';
  END LOOP;
  
  IF resultado = '' THEN
    resultado := 'Nenhum post agendado para publicar no momento.';
  END IF;
  
  RETURN resultado;
END;
$$;