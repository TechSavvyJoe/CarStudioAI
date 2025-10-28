-- Dealerships (create first since profiles references it)
create table if not exists public.dealerships (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Profiles table mirrors auth.users with role and dealership assignment
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('admin','user')),
  dealership_id uuid null references public.dealerships(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Add user/dealership to projects
alter table if exists public.projects
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
  
alter table if exists public.projects
  add column if not exists dealership_id uuid references public.dealerships(id) on delete set null;

-- Ensure images still references projects (assumed from schema.sql)

-- Triggers: create profile on signup
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- First user becomes admin
create or replace function public.promote_first_user() returns trigger as $$
begin
  if (select count(*) from public.profiles) = 1 then
    update public.profiles set role = 'admin' where id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_insert_promote on public.profiles;
create trigger on_profile_insert_promote
  after insert on public.profiles
  for each row execute procedure public.promote_first_user();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.dealerships enable row level security;
alter table public.projects enable row level security;
alter table public.images enable row level security;

-- Policies
-- Profiles: users can read/update own; admins all
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select using (auth.uid() = id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Dealerships: admins full; users read only their dealership
drop policy if exists dealerships_admin_all on public.dealerships;
create policy dealerships_admin_all on public.dealerships
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists dealerships_user_read on public.dealerships;
create policy dealerships_user_read on public.dealerships
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.dealership_id = dealerships.id
    )
  );

-- Projects: insert as user; select/update/delete own or admin
drop policy if exists projects_insert_self on public.projects;
create policy projects_insert_self on public.projects
  for insert with check (user_id = auth.uid());

drop policy if exists projects_select_self_or_admin on public.projects;
create policy projects_select_self_or_admin on public.projects
  for select using (
    user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists projects_modify_self_or_admin on public.projects;
create policy projects_modify_self_or_admin on public.projects
  for update using (
    user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists projects_delete_self_or_admin on public.projects;
create policy projects_delete_self_or_admin on public.projects
  for delete using (
    user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Images follow project access
drop policy if exists images_select_by_project on public.images;
create policy images_select_by_project on public.images
  for select using (
    exists (select 1 from public.projects pr where pr.id = images.project_id and (pr.user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')))
  );

drop policy if exists images_insert_by_project on public.images;
create policy images_insert_by_project on public.images
  for insert with check (
    exists (select 1 from public.projects pr where pr.id = images.project_id and pr.user_id = auth.uid())
  );

drop policy if exists images_modify_by_project on public.images;
create policy images_modify_by_project on public.images
  for update using (
    exists (select 1 from public.projects pr where pr.id = images.project_id and (pr.user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')))
  );

drop policy if exists images_delete_by_project on public.images;
create policy images_delete_by_project on public.images
  for delete using (
    exists (select 1 from public.projects pr where pr.id = images.project_id and (pr.user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')))
  );
