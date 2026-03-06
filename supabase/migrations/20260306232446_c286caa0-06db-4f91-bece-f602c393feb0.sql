-- Garantir sessões paralelas por dispositivo/browser no online_users
-- 1) Remover possíveis duplicatas de session_id (mantendo o registro mais recente)
DELETE FROM public.online_users older
USING public.online_users newer
WHERE older.session_id IS NOT NULL
  AND newer.session_id IS NOT NULL
  AND older.session_id = newer.session_id
  AND older.last_seen_at < newer.last_seen_at;

-- 2) Preencher session_id ausente para compatibilidade com UNIQUE
UPDATE public.online_users
SET session_id = gen_random_uuid()::text
WHERE session_id IS NULL;

-- 3) Criar constraint UNIQUE para permitir upsert por session_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'online_users_session_id_key'
      AND conrelid = 'public.online_users'::regclass
  ) THEN
    ALTER TABLE public.online_users
    ADD CONSTRAINT online_users_session_id_key UNIQUE (session_id);
  END IF;
END
$$;