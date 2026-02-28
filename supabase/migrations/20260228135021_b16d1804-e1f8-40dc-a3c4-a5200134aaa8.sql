
-- Fix increment_agent_messages: drop first then recreate with search_path
DROP FUNCTION IF EXISTS public.increment_agent_messages(uuid);

CREATE FUNCTION public.increment_agent_messages(agent_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
    UPDATE public.agents SET total_messages = total_messages + 1, last_activity = NOW() WHERE id = agent_id;
END;
$function$;

-- Fix remaining permissive RLS policies that were not in previous migration
-- (previous migration already handled admin_media, admin_pages, admin_settings, 
--  admin_versions, agendamento_execucoes, app_statistics, bonus_user_actions,
--  campaigns, comments, dados_sem_senha, daily_missions, users, analytics_events)

-- Check what other permissive policies remain and were not covered
