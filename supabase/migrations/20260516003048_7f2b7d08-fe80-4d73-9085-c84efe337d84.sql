
-- user_credits table
create table if not exists public.user_credits (
  user_id uuid primary key,
  balance integer not null default 25,
  generations_used integer not null default 0,
  tier text not null default 'free',
  updated_at timestamptz not null default now()
);

alter table public.user_credits enable row level security;

create policy "credits_select_own" on public.user_credits
  for select using (auth.uid() = user_id);
create policy "credits_update_own" on public.user_credits
  for update using (auth.uid() = user_id);
create policy "credits_insert_own" on public.user_credits
  for insert with check (auth.uid() = user_id);

-- Extend handle_new_user to seed credits
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict do nothing;

  insert into public.user_credits (user_id, balance, generations_used, tier)
  values (new.id, 25, 0, 'free')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Make sure trigger exists
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill credits for existing users
insert into public.user_credits (user_id, balance)
select id, 25 from auth.users
on conflict (user_id) do nothing;

-- Add missing UPDATE policy on closet_subcategories
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='closet_subcategories' and policyname='subcat_update_own'
  ) then
    create policy "subcat_update_own" on public.closet_subcategories
      for update using (auth.uid() = user_id);
  end if;
end $$;

-- Atomic credit consumption helper
create or replace function public.consume_credit(_user_id uuid, _cost integer default 1)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  new_balance integer;
begin
  update public.user_credits
     set balance = balance - _cost,
         generations_used = generations_used + 1,
         updated_at = now()
   where user_id = _user_id and balance >= _cost
  returning balance into new_balance;
  if new_balance is null then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;
  return new_balance;
end;
$$;
