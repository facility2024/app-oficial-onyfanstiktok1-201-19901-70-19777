-- Tabela de usuários da gamificação
CREATE TABLE public.users_gamification (
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

-- Tabela de ações dos usuários
CREATE TABLE public.user_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users_gamification(id) ON DELETE CASCADE,
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
CREATE TABLE public.user_daily_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users_gamification(id) ON DELETE CASCADE,
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
CREATE TABLE public.user_rankings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users_gamification(id) ON DELETE CASCADE UNIQUE,
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

-- Tabela de missões diárias
CREATE TABLE public.daily_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_count INTEGER NOT NULL,
  points_reward INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rules TEXT DEFAULT '📋 Regras de Participação
Para participar da premiação top10:

• Complete as ações diárias especificadas

• Cada ação concluída gera pontos automáticos

• Acumule pontos para subir no ranking

• Prêmios são distribuídos semanalmente

• Mantenha-se ativo para maximizar seus ganhos

• Vítimas que mais pontuam ganham recompensas exclusivas',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de conquistas
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'sales', 'fan_dedicated', 'most_shared', 'premium_member'
  model_id UUID,
  model_name TEXT,
  user_id UUID,
  user_name TEXT,
  value NUMERIC DEFAULT 0,
  count INTEGER DEFAULT 0,
  product_name TEXT,
  achievement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de vendas
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  sale_value NUMERIC NOT NULL,
  user_id UUID,
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de membros premium
CREATE TABLE public.premium_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users_gamification(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  membership_type TEXT NOT NULL DEFAULT 'premium',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir missões padrão
INSERT INTO public.daily_missions (title, description, action_type, target_count, points_reward) VALUES
('Curtir 10 vídeos hoje', 'Curta 10 vídeos diferentes para ganhar pontos', 'like', 10, 50),
('Compartilhar 3 conteúdos', 'Compartilhe 3 conteúdos para ganhar pontos', 'share', 3, 75),
('Comentar em 5 posts', 'Comente em 5 posts diferentes para ganhar pontos', 'comment', 5, 40),
('Assistir 20 minutos', 'Assista pelo menos 20 minutos de conteúdo', 'view', 20, 60);

-- Habilitar RLS
ALTER TABLE public.users_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_memberships ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para leitura pública (para o admin dashboard)
CREATE POLICY "Allow public read users_gamification" ON public.users_gamification FOR SELECT USING (true);
CREATE POLICY "Allow public insert users_gamification" ON public.users_gamification FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update users_gamification" ON public.users_gamification FOR UPDATE USING (true);

CREATE POLICY "Allow public read user_actions" ON public.user_actions FOR SELECT USING (true);
CREATE POLICY "Allow public insert user_actions" ON public.user_actions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read user_daily_tasks" ON public.user_daily_tasks FOR SELECT USING (true);
CREATE POLICY "Allow public insert user_daily_tasks" ON public.user_daily_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update user_daily_tasks" ON public.user_daily_tasks FOR UPDATE USING (true);

CREATE POLICY "Allow public read user_rankings" ON public.user_rankings FOR SELECT USING (true);
CREATE POLICY "Allow public insert user_rankings" ON public.user_rankings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update user_rankings" ON public.user_rankings FOR UPDATE USING (true);

CREATE POLICY "Allow public read daily_missions" ON public.daily_missions FOR SELECT USING (true);
CREATE POLICY "Allow public insert daily_missions" ON public.daily_missions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update daily_missions" ON public.daily_missions FOR UPDATE USING (true);

CREATE POLICY "Allow public read achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Allow public insert achievements" ON public.achievements FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read sales" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Allow public insert sales" ON public.sales FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read premium_memberships" ON public.premium_memberships FOR SELECT USING (true);
CREATE POLICY "Allow public insert premium_memberships" ON public.premium_memberships FOR INSERT WITH CHECK (true);

-- Função para atualizar pontos do usuário quando ele completa ações
CREATE OR REPLACE FUNCTION public.update_user_gamification_points()
RETURNS TRIGGER AS $$
DECLARE
    current_task RECORD;
    ranking_record RECORD;
BEGIN
    -- Buscar ou criar registro de tarefa diária
    INSERT INTO public.user_daily_tasks (user_id, task_date, total_actions, last_action_at)
    VALUES (NEW.user_id, NEW.date_performed, 1, NEW.created_at)
    ON CONFLICT (user_id, task_date)
    DO UPDATE SET 
        total_actions = user_daily_tasks.total_actions + 1,
        last_action_at = NEW.created_at,
        updated_at = NOW()
    RETURNING * INTO current_task;

    -- Se completou 3 ações (1 tarefa), marcar como completa e dar pontos
    IF current_task.total_actions = 3 AND NOT current_task.is_completed THEN
        -- Marcar tarefa como completa e dar 1 ponto
        UPDATE public.user_daily_tasks 
        SET 
            completed_tasks = 1,
            points_earned_today = 1,
            is_completed = TRUE,
            updated_at = NOW()
        WHERE id = current_task.id;

        -- Atualizar pontos do usuário
        UPDATE public.users_gamification 
        SET 
            total_points = total_points + 1,
            updated_at = NOW()
        WHERE id = NEW.user_id;

        -- Atualizar pontos na ação
        UPDATE public.user_actions 
        SET points_earned = 1 
        WHERE id = NEW.id;

        -- Atualizar ou criar ranking
        INSERT INTO public.user_rankings (user_id, total_points, total_tasks_completed, last_activity_at)
        VALUES (NEW.user_id, 1, 1, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET 
            total_points = user_rankings.total_points + 1,
            total_tasks_completed = user_rankings.total_tasks_completed + 1,
            current_streak = CASE 
                WHEN user_rankings.last_activity_at::date = CURRENT_DATE - INTERVAL '1 day' 
                THEN user_rankings.current_streak + 1
                ELSE 1
            END,
            max_streak = GREATEST(user_rankings.max_streak, 
                CASE 
                    WHEN user_rankings.last_activity_at::date = CURRENT_DATE - INTERVAL '1 day' 
                    THEN user_rankings.current_streak + 1
                    ELSE 1
                END
            ),
            level_name = CASE 
                WHEN user_rankings.total_points + 1 >= 100 THEN 'Diamante'
                WHEN user_rankings.total_points + 1 >= 50 THEN 'Ouro'
                WHEN user_rankings.total_points + 1 >= 20 THEN 'Prata'
                ELSE 'Bronze'
            END,
            last_activity_at = NOW(),
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar pontos automaticamente
CREATE TRIGGER update_gamification_points_trigger
    AFTER INSERT ON public.user_actions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_gamification_points();

-- Função para registrar ação de usuário
CREATE OR REPLACE FUNCTION public.register_user_action(
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
BEGIN
    -- Verificar quantas ações o usuário já fez hoje
    SELECT COUNT(*) INTO today_actions
    FROM public.user_actions
    WHERE user_id = p_user_id 
    AND date_performed = CURRENT_DATE;
    
    -- Se já fez 3 ações hoje, não permitir mais
    IF today_actions >= 3 THEN
        result := json_build_object(
            'success', false,
            'message', 'Limite diário de 3 ações atingido',
            'actions_today', today_actions,
            'next_reset', (CURRENT_DATE + INTERVAL '1 day')::text
        );
        RETURN result;
    END IF;
    
    -- Registrar a ação
    INSERT INTO public.user_actions (
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