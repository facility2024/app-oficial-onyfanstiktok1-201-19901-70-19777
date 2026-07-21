
CREATE TEMP TABLE _to_delete AS
SELECT m.id FROM public.models m
WHERE m.is_active = true
AND NOT EXISTS (SELECT 1 FROM public.videos v WHERE v.model_id = m.id AND v.is_active = true);

DELETE FROM public.video_shares WHERE model_id IN (SELECT id FROM _to_delete);
DELETE FROM public.likes WHERE model_id IN (SELECT id FROM _to_delete);
DELETE FROM public.comments WHERE model_id IN (SELECT id FROM _to_delete);
DELETE FROM public.daily_actions WHERE model_id IN (SELECT id FROM _to_delete);
DELETE FROM public.analytics_events WHERE model_id IN (SELECT id FROM _to_delete);
DELETE FROM public.points_history WHERE model_id IN (SELECT id FROM _to_delete);
DELETE FROM public.video_views WHERE model_id IN (SELECT id FROM _to_delete);
DELETE FROM public.notifications WHERE model_id IN (SELECT id FROM _to_delete);
DELETE FROM public.model_followers WHERE model_id IN (SELECT id FROM _to_delete);
DELETE FROM public.shares WHERE model_id IN (SELECT id FROM _to_delete);
DELETE FROM public.model_sessions WHERE model_id IN (SELECT id FROM _to_delete);
DELETE FROM public.checkout_templates WHERE model_id IN (SELECT id FROM _to_delete);
DELETE FROM public.posts_agendados WHERE modelo_id IN (SELECT id FROM _to_delete);
DELETE FROM public.video_call_models WHERE selected_model_id IN (SELECT id FROM _to_delete);
DELETE FROM public.posts_principais WHERE modelo_id IN (SELECT id FROM _to_delete);
DELETE FROM public.user_actions WHERE model_id IN (SELECT id FROM _to_delete);
DELETE FROM public.transactions WHERE model_id IN (SELECT id FROM _to_delete);
DELETE FROM public.premium_content WHERE model_id IN (SELECT id FROM _to_delete);
DELETE FROM public.videos WHERE model_id IN (SELECT id FROM _to_delete);
DELETE FROM public.onlyfans_content WHERE model_id IN (SELECT id FROM _to_delete);
DELETE FROM public.model_chat_panels WHERE model_id IN (SELECT id FROM _to_delete);
DELETE FROM public.user_feed_progress WHERE model_id IN (SELECT id FROM _to_delete);
DELETE FROM public.cocoflix_content WHERE model_id IN (SELECT id FROM _to_delete);

DELETE FROM public.models WHERE id IN (SELECT id FROM _to_delete);
