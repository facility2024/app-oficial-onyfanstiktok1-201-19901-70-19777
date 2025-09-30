-- Criar tabelas para sistema de gamificação com dados reais

-- Tabela para registrar ações dos usuários (likes, comments, shares)
CREATE TABLE IF NOT EXISTS public.user_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.bonus_users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('like', 'comment', 'share', 'profile_view')),
    video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
    model_id UUID REFERENCES public.models(id) ON DELETE SET NULL,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_performed DATE DEFAULT CURRENT_DATE,
    session_id TEXT,
    ip_address INET,
    user_agent TEXT
);

-- Tabela para controle de tarefas diárias por usuário
CREATE TABLE IF NOT EXISTS public.daily_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.bonus_users(id) ON DELETE CASCADE,
    task_date DATE DEFAULT CURRENT_DATE,
    total_actions INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    points_earned_today INTEGER DEFAULT 0,
    last_action_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_completed BOOLEAN DEFAULT FALSE,
    reset_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_DATE + INTERVAL '1 day'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, task_date)
);

-- Tabela para ranking e pontuação geral
CREATE TABLE IF NOT EXISTS public.user_rankings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.bonus_users(id) ON DELETE CASCADE UNIQUE,
    total_points INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    level_name TEXT DEFAULT 'Bronze',
    total_tasks_completed INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_actions_user_date ON public.user_actions(user_id, date_performed);
CREATE INDEX IF NOT EXISTS idx_user_actions_type ON public.user_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date ON public.daily_tasks(user_id, task_date);
CREATE INDEX IF NOT EXISTS idx_user_rankings_points ON public.user_rankings(total_points DESC);

-- Trigger para atualizar pontuação automaticamente
CREATE OR REPLACE FUNCTION update_user_points()
RETURNS TRIGGER AS $$
DECLARE
    current_task RECORD;
    ranking_record RECORD;
BEGIN
    -- Buscar ou criar registro de tarefa diária
    INSERT INTO public.daily_tasks (user_id, task_date, total_actions, last_action_at)
    VALUES (NEW.user_id, NEW.date_performed, 1, NEW.created_at)
    ON CONFLICT (user_id, task_date)
    DO UPDATE SET 
        total_actions = daily_tasks.total_actions + 1,
        last_action_at = NEW.created_at,
        updated_at = NOW()
    RETURNING * INTO current_task;

    -- Se completou 3 ações (1 tarefa), marcar como completa e dar pontos
    IF current_task.total_actions = 3 AND NOT current_task.is_completed THEN
        -- Marcar tarefa como completa e dar 1 ponto
        UPDATE public.daily_tasks 
        SET 
            completed_tasks = 1,
            points_earned_today = 1,
            is_completed = TRUE,
            updated_at = NOW()
        WHERE id = current_task.id;

        -- Atualizar pontos do usuário
        UPDATE public.bonus_users 
        SET 
            points = points + 1,
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

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_update_user_points ON public.user_actions;
CREATE TRIGGER trigger_update_user_points
    AFTER INSERT ON public.user_actions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_points();

-- Políticas RLS
ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rankings ENABLE ROW LEVEL SECURITY;

-- Políticas para user_actions
CREATE POLICY "Usuários podem inserir suas próprias ações" ON public.user_actions
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Usuários podem ver todas as ações" ON public.user_actions
    FOR SELECT USING (TRUE);

-- Políticas para daily_tasks
CREATE POLICY "Usuários podem ver suas tarefas diárias" ON public.daily_tasks
    FOR SELECT USING (TRUE);

CREATE POLICY "Sistema pode gerenciar tarefas diárias" ON public.daily_tasks
    FOR ALL USING (TRUE);

-- Políticas para user_rankings
CREATE POLICY "Todos podem ver rankings" ON public.user_rankings
    FOR SELECT USING (TRUE);

CREATE POLICY "Sistema pode gerenciar rankings" ON public.user_rankings
    FOR ALL USING (TRUE);