-- Enable realtime for creator_applications and cadastro_modelos
ALTER PUBLICATION supabase_realtime ADD TABLE public.creator_applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cadastro_modelos;