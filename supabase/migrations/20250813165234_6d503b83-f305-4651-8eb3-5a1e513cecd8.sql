-- Criar tabelas com nomes únicos
CREATE TABLE public.gamification_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  max_streak INTEGER NOT NULL DEFAULT 0,
  level_name TEXT NOT NULL DEFAULT 'Bronze',
  is_premium BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  registered_from TEXT DEFAULT 'app',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de ações dos usuários da gamificação
CREATE TABLE public.gamification_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.gamification_users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'like', 'comment', 'share', 'view', 'message'
  date_performed DATE NOT NULL DEFAULT CURRENT_DATE,
  video_id UUID,
  model_id UUID,
  points_earned INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de tarefas diárias dos usuários
CREATE TABLE public.gamification_daily_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.gamification_users(id) ON DELETE CASCADE,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_actions INTEGER NOT NULL DEFAULT 0,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  points_earned_today INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  last_action_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 day'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_date)
);

-- Tabela de ranking dos usuários
CREATE TABLE public.gamification_rankings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.gamification_users(id) ON DELETE CASCADE UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  total_tasks_completed INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  max_streak INTEGER NOT NULL DEFAULT 0,
  level_name TEXT NOT NULL DEFAULT 'Bronze',
  position INTEGER,
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.gamification_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_rankings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para leitura pública
CREATE POLICY "Allow public read gamification_users" ON public.gamification_users FOR SELECT USING (true);
CREATE POLICY "Allow public insert gamification_users" ON public.gamification_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update gamification_users" ON public.gamification_users FOR UPDATE USING (true);

CREATE POLICY "Allow public read gamification_actions" ON public.gamification_actions FOR SELECT USING (true);
CREATE POLICY "Allow public insert gamification_actions" ON public.gamification_actions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read gamification_daily_tasks" ON public.gamification_daily_tasks FOR SELECT USING (true);
CREATE POLICY "Allow public insert gamification_daily_tasks" ON public.gamification_daily_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update gamification_daily_tasks" ON public.gamification_daily_tasks FOR UPDATE USING (true);

CREATE POLICY "Allow public read gamification_rankings" ON public.gamification_rankings FOR SELECT USING (true);
CREATE POLICY "Allow public insert gamification_rankings" ON public.gamification_rankings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update gamification_rankings" ON public.gamification_rankings FOR UPDATE USING (true);

-- Função para atualizar pontos do usuário quando ele completa ações
CREATE OR REPLACE FUNCTION public.update_gamification_user_points()
RETURNS TRIGGER AS $$
DECLARE
    current_task RECORD;
    user_name TEXT;
BEGIN
    -- Buscar nome do usuário
    SELECT name INTO user_name FROM public.gamification_users WHERE id = NEW.user_id;
    
    -- Buscar ou criar registro de tarefa diária
    INSERT INTO public.gamification_daily_tasks (user_id, task_date, total_actions, last_action_at)
    VALUES (NEW.user_id, NEW.date_performed, 1, NEW.created_at)
    ON CONFLICT (user_id, task_date)
    DO UPDATE SET 
        total_actions = gamification_daily_tasks.total_actions + 1,
        last_action_at = NEW.created_at,
        updated_at = NOW()
    RETURNING * INTO current_task;

    -- Se completou 3 ações (1 tarefa), marcar como completa e dar pontos
    IF current_task.total_actions = 3 AND NOT current_task.is_completed THEN
        -- Marcar tarefa como completa e dar 1 ponto
        UPDATE public.gamification_daily_tasks 
        SET 
            completed_tasks = 1,
            points_earned_today = 1,
            is_completed = TRUE,
            updated_at = NOW()
        WHERE id = current_task.id;

        -- Atualizar pontos do usuário
        UPDATE public.gamification_users 
        SET 
            total_points = total_points + 1,
            updated_at = NOW()
        WHERE id = NEW.user_id;

        -- Atualizar pontos na ação
        UPDATE public.gamification_actions 
        SET points_earned = 1 
        WHERE id = NEW.id;

        -- Atualizar ou criar ranking
        INSERT INTO public.gamification_rankings (user_id, total_points, total_tasks_completed, last_activity_at)
        VALUES (NEW.user_id, 1, 1, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET 
            total_points = gamification_rankings.total_points + 1,
            total_tasks_completed = gamification_rankings.total_tasks_completed + 1,
            current_streak = CASE 
                WHEN gamification_rankings.last_activity_at::date = CURRENT_DATE - INTERVAL '1 day' 
                THEN gamification_rankings.current_streak + 1
                ELSE 1
            END,
            max_streak = GREATEST(gamification_rankings.max_streak, 
                CASE 
                    WHEN gamification_rankings.last_activity_at::date = CURRENT_DATE - INTERVAL '1 day' 
                    THEN gamification_rankings.current_streak + 1
                    ELSE 1
                END
            ),
            level_name = CASE 
                WHEN gamification_rankings.total_points + 1 >= 100 THEN 'Diamante'
                WHEN gamification_rankings.total_points + 1 >= 50 THEN 'Ouro'
                WHEN gamification_rankings.total_points + 1 >= 20 THEN 'Prata'
                ELSE 'Bronze'
            END,
            last_activity_at = NOW(),
            updated_at = NOW();
            
        -- Criar notificação de conclusão
        INSERT INTO public.notifications (
            user_id, 
            title, 
            message, 
            type,
            points_awarded,
            video_id,
            model_id
        ) VALUES (
            NEW.user_id,
            'Parabéns! Tarefas Concluídas!',
            'Parabéns, ' || user_name || '! Você completou as 3 tarefas com excelência. Agora faltam ' || 
            EXTRACT(HOUR FROM (current_task.reset_at - NOW())) || ' horas para realizar novas tarefas. Você acaba de conquistar 1 ponto!',
            'task_completed',
            1,
            NEW.video_id,
            NEW.model_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar pontos automaticamente
CREATE TRIGGER update_gamification_points_trigger
    AFTER INSERT ON public.gamification_actions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_gamification_user_points();

-- Função para registrar ação de usuário da gamificação
CREATE OR REPLACE FUNCTION public.register_gamification_action(
    p_user_id UUID,
    p_action_type TEXT,
    p_video_id UUID DEFAULT NULL,
    p_model_id UUID DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    today_actions INTEGER;
    action_id UUID;
    result JSON;
    user_name TEXT;
    hours_remaining INTEGER;
BEGIN
    -- Buscar nome do usuário
    SELECT name INTO user_name FROM public.gamification_users WHERE id = p_user_id;
    
    -- Verificar quantas ações o usuário já fez hoje
    SELECT COUNT(*) INTO today_actions
    FROM public.gamification_actions
    WHERE user_id = p_user_id 
    AND date_performed = CURRENT_DATE;
    
    -- Se já fez 3 ações hoje, não permitir mais
    IF today_actions >= 3 THEN
        -- Calcular horas restantes até o reset
        SELECT EXTRACT(HOUR FROM ((CURRENT_DATE + INTERVAL '1 day') - NOW())) INTO hours_remaining;
        
        result := json_build_object(
            'success', false,
            'message', 'Limite diário de 3 ações atingido',
            'completion_message', 'Você já completou suas tarefas diárias! Volte em ' || hours_remaining || ' horas para novas tarefas.',
            'actions_today', today_actions,
            'hours_remaining', hours_remaining,
            'next_reset', (CURRENT_DATE + INTERVAL '1 day')::text
        );
        RETURN result;
    END IF;
    
    -- Registrar a ação
    INSERT INTO public.gamification_actions (
        user_id, action_type, video_id, model_id, ip_address, user_agent
    ) VALUES (
        p_user_id, p_action_type, p_video_id, p_model_id, p_ip_address, p_user_agent
    ) RETURNING id INTO action_id;
    
    result := json_build_object(
        'success', true,
        'message', 'Ação registrada com sucesso',
        'action_id', action_id,
        'actions_today', today_actions + 1,
        'remaining_actions', 3 - (today_actions + 1)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;