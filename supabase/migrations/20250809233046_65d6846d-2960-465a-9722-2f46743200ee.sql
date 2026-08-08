-- Add missing columns to existing tables
ALTER TABLE public.video_views 
ADD COLUMN IF NOT EXISTS is_complete_view BOOLEAN DEFAULT false;

ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS location_state TEXT,
ADD COLUMN IF NOT EXISTS location_city TEXT,
ADD COLUMN IF NOT EXISTS location_country TEXT DEFAULT 'BR',
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP WITH TIME ZONE;

-- Add device_type to online_users if not exists
ALTER TABLE public.online_users 
ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'unknown';

-- Create indexes for better performance (using existing column names)
CREATE INDEX IF NOT EXISTS idx_video_views_created_at ON public.video_views(created_at);
CREATE INDEX IF NOT EXISTS idx_video_views_user_video ON public.video_views(user_id, video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_today ON public.video_views(created_at) WHERE created_at >= CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active, last_activity_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_location ON public.user_sessions(location_state, is_active);

-- Create trigger to auto-update last_seen_at
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_user_sessions_last_seen ON public.user_sessions;
CREATE TRIGGER update_user_sessions_last_seen
  BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_seen();

-- Enable realtime for the tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_views;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.online_users;