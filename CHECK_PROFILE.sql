-- Check if your user has a profile
-- Run this in Supabase SQL Editor to see what's in the database

-- 1. Check all users in auth.users
SELECT id, email, created_at, confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- 2. Check all profiles
SELECT id, email, role, dealership_id, created_at
FROM public.profiles
ORDER BY created_at DESC;

-- 3. Check if any users are missing profiles
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;
