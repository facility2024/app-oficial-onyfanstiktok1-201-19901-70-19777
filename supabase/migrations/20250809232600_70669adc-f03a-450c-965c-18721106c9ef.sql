-- Create video_views table for tracking video views
CREATE TABLE IF NOT EXISTS public.video_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL,
  model_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT DEFAULT 'unknown',
  watch_duration INTEGER DEFAULT 0,
  is_complete_view BOOLEAN DEFAULT false
);

-- Create user_sessions table for tracking active sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  device_type TEXT NOT NULL DEFAULT 'unknown',
  ip_address TEXT,
  user_agent TEXT,
  location_state TEXT,
  location_city TEXT,
  location_country TEXT DEFAULT 'BR',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on new tables
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for video_views
CREATE POLICY "Allow public insert video_views" 
ON public.video_views 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public read video_views" 
ON public.video_views 
FOR SELECT 
USING (true);

-- Create RLS policies for user_sessions
CREATE POLICY "Allow public insert user_sessions" 
ON public.user_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public read user_sessions" 
ON public.user_sessions 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public update user_sessions" 
ON public.user_sessions 
FOR UPDATE 
USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_video_views_created_at ON public.video_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_video_views_user_video ON public.video_views(user_id, video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_today ON public.video_views(viewed_at) WHERE viewed_at >= CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active, last_seen_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_location ON public.user_sessions(location_state, is_active);

-- Add device_type to online_users if not exists
ALTER TABLE public.online_users 
ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'unknown';

-- Create trigger to auto-update last_seen_at
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_sessions_last_seen
  BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_seen();

-- Enable realtime for the new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_views;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.online_users;