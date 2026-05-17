
-- Drop old open table from prior iteration
drop table if exists public.diagnoses;

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can delete their own profile"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Diagnostics
create table public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text,
  device_type text,
  ai_diagnosis text,
  problems jsonb not null default '[]'::jsonb,
  estimated_repair_cost_min numeric,
  estimated_repair_cost_max numeric,
  confidence_score text,
  repair_urgency text,
  recommended_solution text,
  repair_time text,
  created_at timestamptz not null default now()
);

create index diagnostics_user_id_created_at_idx
  on public.diagnostics (user_id, created_at desc);

alter table public.diagnostics enable row level security;

create policy "Users can view their own diagnostics"
  on public.diagnostics for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own diagnostics"
  on public.diagnostics for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own diagnostics"
  on public.diagnostics for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete their own diagnostics"
  on public.diagnostics for delete
  to authenticated
  using (auth.uid() = user_id);

-- Storage bucket for device images
insert into storage.buckets (id, name, public)
values ('device-images', 'device-images', true)
on conflict (id) do nothing;

create policy "Device images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'device-images');

create policy "Users can upload their own device images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'device-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own device images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'device-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own device images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'device-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
