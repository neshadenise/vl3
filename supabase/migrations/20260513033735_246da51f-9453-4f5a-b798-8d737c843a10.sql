-- Profiles
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id);

-- updated_at trigger func
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.raw_user_meta_data->>'avatar_url');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Closet items
create table public.closet_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  image_url text not null,
  back_url text,
  color text,
  brand text,
  tags text[] not null default '{}',
  notes text,
  source text,
  favorite boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.closet_items enable row level security;
create policy "closet_select_own" on public.closet_items for select using (auth.uid() = user_id);
create policy "closet_insert_own" on public.closet_items for insert with check (auth.uid() = user_id);
create policy "closet_update_own" on public.closet_items for update using (auth.uid() = user_id);
create policy "closet_delete_own" on public.closet_items for delete using (auth.uid() = user_id);
create index closet_items_user_idx on public.closet_items(user_id, created_at desc);

-- Models
create table public.models (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  prompt text not null,
  pose text not null,
  base_image_url text not null,
  current_image_url text not null,
  history jsonb not null default '[]'::jsonb,
  worn_item_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.models enable row level security;
create policy "models_select_own" on public.models for select using (auth.uid() = user_id);
create policy "models_insert_own" on public.models for insert with check (auth.uid() = user_id);
create policy "models_update_own" on public.models for update using (auth.uid() = user_id);
create policy "models_delete_own" on public.models for delete using (auth.uid() = user_id);
create index models_user_idx on public.models(user_id, created_at desc);

-- Looks
create table public.looks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  model_id uuid,
  image_url text not null,
  item_ids jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.looks enable row level security;
create policy "looks_select_own" on public.looks for select using (auth.uid() = user_id);
create policy "looks_insert_own" on public.looks for insert with check (auth.uid() = user_id);
create policy "looks_update_own" on public.looks for update using (auth.uid() = user_id);
create policy "looks_delete_own" on public.looks for delete using (auth.uid() = user_id);
create index looks_user_idx on public.looks(user_id, created_at desc);

-- Collections
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  look_ids jsonb not null default '[]'::jsonb,
  cover text,
  created_at timestamptz not null default now()
);
alter table public.collections enable row level security;
create policy "collections_select_own" on public.collections for select using (auth.uid() = user_id);
create policy "collections_insert_own" on public.collections for insert with check (auth.uid() = user_id);
create policy "collections_update_own" on public.collections for update using (auth.uid() = user_id);
create policy "collections_delete_own" on public.collections for delete using (auth.uid() = user_id);

-- Moodboards
create table public.moodboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  pins jsonb not null default '[]'::jsonb,
  palette jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.moodboards enable row level security;
create policy "moodboards_select_own" on public.moodboards for select using (auth.uid() = user_id);
create policy "moodboards_insert_own" on public.moodboards for insert with check (auth.uid() = user_id);
create policy "moodboards_update_own" on public.moodboards for update using (auth.uid() = user_id);
create policy "moodboards_delete_own" on public.moodboards for delete using (auth.uid() = user_id);

-- Storage policies for studio-images: per-user folder write, public read
create policy "studio_images_public_read" on storage.objects for select
  using (bucket_id = 'studio-images');
create policy "studio_images_user_insert" on storage.objects for insert
  with check (bucket_id = 'studio-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "studio_images_user_update" on storage.objects for update
  using (bucket_id = 'studio-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "studio_images_user_delete" on storage.objects for delete
  using (bucket_id = 'studio-images' and auth.uid()::text = (storage.foldername(name))[1]);