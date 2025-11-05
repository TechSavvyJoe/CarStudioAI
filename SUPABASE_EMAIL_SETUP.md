# Supabase Email Confirmation Setup for Testing

## The Issue
You're getting "Invalid login credentials" because:
1. You're trying to sign in with credentials that don't exist yet
2. When you try to sign up, email confirmation is enabled but you're using test emails

## SOLUTION: Disable Email Confirmation in Supabase

### Step 1: Go to Supabase Dashboard
1. Visit https://supabase.com/dashboard
2. Select your project: `ywdvxmpffmzchqxxwdaq`

### Step 2: Disable Email Confirmation
1. Go to **Authentication** → **Providers** → **Email**
2. Find "**Confirm email**" setting
3. **TOGGLE IT OFF** (disable it)
4. Click **Save**

### Step 3: Clear Any Existing Test Users (Optional)
1. Go to **Authentication** → **Users**
2. Delete any test users that weren't confirmed
3. This gives you a clean slate

### Step 4: Test Signup
After disabling email confirmation:
1. Visit your app
2. Click "Sign up"
3. Enter ANY email (doesn't need to be real): `test@test.com`
4. Enter a password (6+ characters): `password123`
5. Click "Sign up"
6. **You should be logged in immediately** (no email needed!)
7. **You're the first user, so you're automatically ADMIN**

## Alternative: Use Supabase Test Helper
If you want to keep email confirmation ON but bypass it for testing:

1. Go to **Authentication** → **URL Configuration**
2. Copy your Site URL
3. After signup, manually confirm users via SQL:
```sql
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'test@test.com';
```

## Quick Test Credentials
Once you disable email confirmation, create your first account with:
- Email: `admin@carstudio.test`
- Password: `Admin123!`

This will be your admin account (first user = admin automatically).

## Troubleshooting
- **"User already registered"**: That email exists. Try a different one or delete it from Auth → Users
- **"Invalid login credentials"**: No user with that email/password exists. Sign up first.
- **Nothing happens on signup**: Check browser console (F12) for detailed error logs
