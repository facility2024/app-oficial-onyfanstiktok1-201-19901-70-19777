ALTER TABLE public.feed_promotions ALTER COLUMN position_interval SET DEFAULT 5;
UPDATE public.feed_promotions SET position_interval = 5 WHERE position_interval IS DISTINCT FROM 5;
ALTER TABLE public.feed_promotions ALTER COLUMN daily_frequency SET DEFAULT 3;
UPDATE public.feed_promotions SET daily_frequency = 3 WHERE daily_frequency IS NULL OR daily_frequency < 1 OR daily_frequency > 3;