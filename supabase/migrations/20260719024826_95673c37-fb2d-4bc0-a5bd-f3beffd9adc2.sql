ALTER TABLE public.checkout_templates REPLICA IDENTITY FULL;
ALTER TABLE public.checkout_order_bumps REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.checkout_templates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.checkout_order_bumps;