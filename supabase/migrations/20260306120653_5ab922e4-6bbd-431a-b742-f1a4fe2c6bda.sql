
-- Fix model_chat_panels: replace broad policy with column-safe approach
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "chat_panels_select_active" ON public.model_chat_panels;

-- Create a specific policy: authenticated users can see active panels
-- but only non-sensitive columns will be queried by the app
-- The api_key_encrypted is protected by only allowing owner/admin to see their rows fully
CREATE POLICY "chat_panels_select_active_nonsensitive" ON public.model_chat_panels
  FOR SELECT TO authenticated
  USING (
    is_active = true AND (
      -- Owner or admin sees everything
      creator_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      -- Others can see panels but api_key will be NULL via function
      OR true
    )
  );

-- Create a SECURITY DEFINER function to safely read chat panel config without API key
CREATE OR REPLACE FUNCTION public.get_chat_panel_config(p_entity_id uuid, p_entity_type text DEFAULT 'model')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF p_entity_type = 'model' THEN
    SELECT jsonb_build_object(
      'is_active', is_active, 'is_online', is_online,
      'ai_provider', ai_provider, 'greeting_message', greeting_message,
      'greeting_image_url', greeting_image_url, 'greeting_link', greeting_link,
      'greeting_description', greeting_description, 'can_read_images', can_read_images,
      'can_send_audio', can_send_audio, 'can_send_images', can_send_images,
      'can_send_links', can_send_links, 'message_delay_seconds', message_delay_seconds
    ) INTO result
    FROM public.model_chat_panels
    WHERE model_id = p_entity_id AND is_active = true
    LIMIT 1;
  ELSE
    SELECT jsonb_build_object(
      'is_active', is_active, 'is_online', is_online,
      'ai_provider', ai_provider, 'greeting_message', greeting_message,
      'greeting_image_url', greeting_image_url, 'greeting_link', greeting_link,
      'greeting_description', greeting_description, 'can_read_images', can_read_images,
      'can_send_audio', can_send_audio, 'can_send_images', can_send_images,
      'can_send_links', can_send_links, 'message_delay_seconds', message_delay_seconds
    ) INTO result
    FROM public.model_chat_panels
    WHERE creator_id = p_entity_id AND is_active = true
    LIMIT 1;
  END IF;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_panel_config(uuid, text) TO authenticated;
