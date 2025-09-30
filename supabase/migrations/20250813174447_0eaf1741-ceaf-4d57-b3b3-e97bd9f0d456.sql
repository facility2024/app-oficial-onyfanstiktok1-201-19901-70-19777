-- Create daily_missions table for managing missions
CREATE TABLE public.daily_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN ('like', 'comment', 'share', 'view', 'message', 'custom')),
  target_count INTEGER NOT NULL DEFAULT 1,
  points_reward INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1,
  icon TEXT DEFAULT '🎯',
  difficulty TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category TEXT DEFAULT 'engagement',
  requirements JSONB,
  reward_description TEXT,
  time_limit_hours INTEGER,
  max_completions_per_day INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read daily_missions" 
ON public.daily_missions 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Allow insert daily_missions" 
ON public.daily_missions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update daily_missions" 
ON public.daily_missions 
FOR UPDATE 
USING (true);

-- Create indexes
CREATE INDEX idx_daily_missions_active ON public.daily_missions(is_active);
CREATE INDEX idx_daily_missions_priority ON public.daily_missions(priority);
CREATE INDEX idx_daily_missions_difficulty ON public.daily_missions(difficulty);

-- Create trigger for updated_at
CREATE TRIGGER update_daily_missions_updated_at
  BEFORE UPDATE ON public.daily_missions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample missions
INSERT INTO public.daily_missions (
  title, description, action_type, target_count, points_reward, icon, difficulty, category, reward_description
) VALUES 
('Curtir 10 vídeos', 'Dê like em 10 vídeos diferentes para ganhar pontos', 'like', 10, 50, '❤️', 'easy', 'engagement', 'Ganhe 50 pontos por completar esta missão diária'),
('Compartilhar 3 conteúdos', 'Compartilhe 3 posts ou vídeos nas suas redes sociais', 'share', 3, 75, '📤', 'medium', 'viral', 'Ganhe 75 pontos e ajude a espalhar o conteúdo'),
('Comentar em 5 posts', 'Deixe comentários construtivos em 5 publicações diferentes', 'comment', 5, 40, '💬', 'easy', 'engagement', 'Ganhe 40 pontos por interagir com a comunidade'),
('Assistir 20 minutos', 'Assista a vídeos por pelo menos 20 minutos no total', 'view', 20, 60, '⏱️', 'medium', 'watch_time', 'Ganhe 60 pontos por dedicar tempo ao conteúdo'),
('Enviar 2 mensagens', 'Interaja enviando mensagens privadas para modelos', 'message', 2, 30, '✉️', 'easy', 'interaction', 'Ganhe 30 pontos por se comunicar diretamente');

-- Create user_mission_progress table to track individual progress
CREATE TABLE public.user_mission_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mission_id UUID NOT NULL REFERENCES public.daily_missions(id) ON DELETE CASCADE,
  progress_count INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  date_started DATE NOT NULL DEFAULT CURRENT_DATE,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, mission_id, date_started)
);

-- Enable RLS
ALTER TABLE public.user_mission_progress ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read user_mission_progress" 
ON public.user_mission_progress 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert user_mission_progress" 
ON public.user_mission_progress 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update user_mission_progress" 
ON public.user_mission_progress 
FOR UPDATE 
USING (true);

-- Create indexes
CREATE INDEX idx_user_mission_progress_user_date ON public.user_mission_progress(user_id, date_started);
CREATE INDEX idx_user_mission_progress_mission ON public.user_mission_progress(mission_id);
CREATE INDEX idx_user_mission_progress_completed ON public.user_mission_progress(is_completed);

-- Create trigger for updated_at
CREATE TRIGGER update_user_mission_progress_updated_at
  BEFORE UPDATE ON public.user_mission_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update mission progress
CREATE OR REPLACE FUNCTION public.update_mission_progress(
  p_user_id UUID,
  p_action_type TEXT,
  p_increment INTEGER DEFAULT 1
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mission_record RECORD;
  progress_record RECORD;
  result JSON;
  missions_completed INTEGER := 0;
  total_points INTEGER := 0;
BEGIN
  -- Get active missions for this action type
  FOR mission_record IN 
    SELECT * FROM public.daily_missions 
    WHERE action_type = p_action_type 
    AND is_active = true
  LOOP
    -- Get or create progress record for today
    INSERT INTO public.user_mission_progress (
      user_id, mission_id, progress_count, date_started
    ) VALUES (
      p_user_id, mission_record.id, 0, CURRENT_DATE
    )
    ON CONFLICT (user_id, mission_id, date_started)
    DO NOTHING;

    -- Update progress if not completed
    UPDATE public.user_mission_progress 
    SET 
      progress_count = LEAST(progress_count + p_increment, mission_record.target_count),
      updated_at = NOW()
    WHERE user_id = p_user_id 
    AND mission_id = mission_record.id
    AND date_started = CURRENT_DATE
    AND NOT is_completed
    RETURNING * INTO progress_record;

    -- Check if mission is now completed
    IF progress_record.progress_count >= mission_record.target_count AND NOT progress_record.is_completed THEN
      -- Mark as completed and award points
      UPDATE public.user_mission_progress 
      SET 
        is_completed = true,
        completed_at = NOW(),
        points_earned = mission_record.points_reward,
        updated_at = NOW()
      WHERE id = progress_record.id;

      missions_completed := missions_completed + 1;
      total_points := total_points + mission_record.points_reward;

      -- Update user total points in gamification system
      UPDATE public.gamification_users 
      SET total_points = total_points + mission_record.points_reward
      WHERE id = p_user_id;
    END IF;
  END LOOP;

  result := json_build_object(
    'success', true,
    'missions_completed', missions_completed,
    'points_earned', total_points,
    'message', CASE 
      WHEN missions_completed > 0 THEN 'Missão(ões) completada(s)! Você ganhou ' || total_points || ' pontos!'
      ELSE 'Progresso atualizado!'
    END
  );

  RETURN result;
END;
$$;