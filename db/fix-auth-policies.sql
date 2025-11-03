-- FIX: Add missing INSERT policy for profiles table
-- This allows the app to create profiles if the trigger didn't run
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

-- Also ensure the trigger function has proper permissions
-- Re-create with explicit SECURITY DEFINER to bypass RLS
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Ensure the trigger is active
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
