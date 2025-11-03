-- MANUAL FIX: Create profile for existing user if missing
-- Only run this if you still can't log in after adding the INSERT policy

-- Step 1: Find your user ID
-- Replace 'your-email@example.com' with your actual email
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Step 2: Create the profile manually (replace YOUR_USER_ID with the ID from step 1)
INSERT INTO public.profiles (id, email, role)
VALUES (
  'YOUR_USER_ID',  -- Replace with your actual user ID from step 1
  'your-email@example.com',  -- Replace with your email
  'admin'  -- First user gets admin role
)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email, role = 'admin';

-- Step 3: Verify it was created
SELECT * FROM public.profiles WHERE email = 'your-email@example.com';
