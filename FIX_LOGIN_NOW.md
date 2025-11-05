# URGENT FIX: Add Missing Profile Insert Policy

## The Problem
The profiles table has RLS enabled but NO INSERT policy. This means:
1. When you sign up, the trigger tries to create a profile
2. The app tries to read the profile
3. If the profile doesn't exist, the app tries to create it
4. **The insert fails because there's no INSERT policy!**

## The Solution
Run this SQL in your Supabase SQL Editor immediately:

```sql
-- Add missing INSERT policy for profiles table
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);
```

## How to Apply This Fix

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/ywdvxmpffmzchqxxwdaq
2. **Click "SQL Editor"** in the left sidebar
3. **Click "New Query"**
4. **Paste the SQL above**
5. **Click "Run"** (or press Cmd+Enter)

## What This Does
- Allows authenticated users to insert their own profile record
- The check `auth.uid() = id` ensures users can only create their OWN profile
- This fixes the login loop issue!

## After Running the SQL
1. Try logging in again
2. The app will automatically create your profile if it doesn't exist
3. You should be logged in successfully!

## Why This Happened
The original database schema had RLS policies for SELECT and UPDATE but forgot the INSERT policy. The trigger function is marked as `security definer` which should bypass RLS, but when the app tries to auto-create missing profiles, it needs the INSERT policy.
