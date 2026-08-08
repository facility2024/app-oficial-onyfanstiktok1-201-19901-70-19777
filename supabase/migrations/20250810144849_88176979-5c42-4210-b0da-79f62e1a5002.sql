-- Create table to store messages sent to model profiles
create extension if not exists pgcrypto;

create table if not exists public.model_messages (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null,
  model_username text not null,
  user_id uuid,
  viewer_name text,
  message text not null check (char_length(message) <= 130),
  created_at timestamptz not null default now()
);

-- Index for fast lookups by model and time
create index if not exists idx_model_messages_model_created on public.model_messages (model_id, created_at desc);

-- Enable Row Level Security
alter table public.model_messages enable row level security;

-- Policies: allow public inserts and reads (no auth in app)
create policy if not exists "Anyone can insert profile messages"
  on public.model_messages
  for insert
  to anon, authenticated
  with check (true);

create policy if not exists "Messages are viewable by everyone"
  on public.model_messages
  for select
  to anon, authenticated
  using (true);

-- Optional: enable realtime
alter table public.model_messages replica identity full;
alter publication supabase_realtime add table if not exists public.model_messages;