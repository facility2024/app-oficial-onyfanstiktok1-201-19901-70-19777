
-- Add daily scheduling fields to promo_ads
ALTER TABLE public.promo_ads
  ADD COLUMN IF NOT EXISTS daily_start_time TIME DEFAULT '00:00:00',
  ADD COLUMN IF NOT EXISTS daily_end_time TIME DEFAULT '23:59:59',
  ADD COLUMN IF NOT EXISTS shows_per_day INTEGER DEFAULT 0;

-- shows_per_day = 0 means unlimited (use timer_minutes logic)
-- When shows_per_day > 0, the system distributes N shows evenly within [daily_start_time, daily_end_time]
