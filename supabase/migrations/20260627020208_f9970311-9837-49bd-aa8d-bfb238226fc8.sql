CREATE POLICY "posts_agendados_delete_creator" ON public.posts_agendados
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'creator'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(p.username) = lower(posts_agendados.modelo_username)
  )
);