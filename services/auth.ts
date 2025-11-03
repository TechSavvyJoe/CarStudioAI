import { createClient, type Session } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

function isLikelyJwt(token: string): boolean {
  // Supabase anon keys are JWT-like: three segments separated by dots
  return token.split('.').length === 3 && token.length > 20;
}

function validateSupabaseEnv(url: string, key: string) {
  const problems: string[] = [];
  if (!url) problems.push('VITE_SUPABASE_URL is missing.');
  if (!key) problems.push('VITE_SUPABASE_ANON_KEY is missing.');
  if (key && !isLikelyJwt(key)) problems.push('VITE_SUPABASE_ANON_KEY does not look like a valid key.');
  if (url && !/^https?:\/\//.test(url)) problems.push('VITE_SUPABASE_URL must start with http(s)://');
  return problems;
}

// Exported for UI diagnostics
export function getSupabaseEnvIssues(): string[] {
  return validateSupabaseEnv(supabaseUrl, anonKey);
}

const envIssues = validateSupabaseEnv(supabaseUrl, anonKey);
if (envIssues.length) {
  // Surface a clear message to aid production debugging without leaking secrets
  logger.error('[Supabase] Misconfiguration detected:', envIssues.join(' '));
}
if (!envIssues.length) {
  const anonPreview = `${anonKey.slice(0, 4)}...${anonKey.slice(-4)} (len: ${anonKey.length})`;
  const urlPreview = supabaseUrl.replace(/^https?:\/\//, '');
  logger.info(`[Supabase] Config loaded - url host: ${urlPreview}, anon key: ${anonPreview}`);
}

if (!supabaseUrl || !anonKey) {
  // Create a no-op client to avoid hard crashes; callers will hit explicit errors
  logger.error('Supabase environment variables are missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, anonKey);

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Add detailed logging for invalid API key errors
    if (error.message && /invalid api key/i.test(error.message)) {
      logger.error('[Supabase] Invalid API key during sign-in. This means:');
      logger.error('  1. The VITE_SUPABASE_ANON_KEY does not match the project in VITE_SUPABASE_URL');
      logger.error('  2. Or the anon key is invalid/expired');
      logger.error(`  Current URL: ${supabaseUrl}`);
      logger.error(`  Anon key length: ${anonKey.length}`);
    }
    throw error;
  }
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  logger.log('[Auth] Attempting signup for:', email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // For testing: disable email confirmation requirement
      emailRedirectTo: undefined,
    }
  });
  if (error) {
    logger.error('[Auth] Signup error:', error);
    throw error;
  }
  logger.log('[Auth] Signup response:', {
    user: data.user?.id,
    session: !!data.session,
    needsConfirmation: data.user && !data.session
  });
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    // Common production pitfall: invalid/mismatched anon key -> 401 Invalid API Key
    if (typeof error.message === 'string' && /invalid api key/i.test(error.message)) {
      logger.error('[Supabase] Invalid API key. Ensure Vercel env VITE_SUPABASE_ANON_KEY matches your project and that VITE_SUPABASE_URL points to the same project.');
    }
    throw error;
  }
  return data.session;
}

export type UserProfile = {
  id: string;
  email: string | null;
  role: 'admin' | 'user';
  dealership_id: string | null;
};

export async function getProfileById(userId: string, userEmail: string | null): Promise<UserProfile | null> {
  logger.log('[Auth] getProfileById() called for user:', userId);

  try {
    logger.log('[Auth] getProfileById: Querying profiles table...');

    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, dealership_id')
      .eq('id', userId)
      .single();

    logger.log('[Auth] getProfileById: Database query returned');

    if (error) {
      logger.error('[Auth] getProfileById: Database query failed:', error);
      logger.error('[Auth] getProfileById: Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });

      // If profile doesn't exist, try to create it
      if (error.code === 'PGRST116') {
        logger.log('[Auth] getProfileById: No profile found, attempting to create...');

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: userEmail,
            role: 'user'
          })
          .select('id, role, dealership_id')
          .single();

        if (createError) {
          logger.error('[Auth] getProfileById: Failed to create profile:', createError);
          throw createError;
        }

        logger.log('[Auth] getProfileById: Profile created:', newProfile);
        return {
          id: newProfile.id,
          role: newProfile.role,
          dealership_id: newProfile.dealership_id,
          email: userEmail
        };
      }

      throw error;
    }

    logger.log('[Auth] getProfileById: Profile found:', {
      id: data.id,
      role: data.role,
      dealership_id: data.dealership_id,
      email: userEmail
    });

    return {
      id: data.id,
      role: data.role,
      dealership_id: data.dealership_id,
      email: userEmail
    };
  } catch (err) {
    logger.error('[Auth] getProfileById: Caught exception:', err);
    throw err;
  }
}

export async function getProfile(): Promise<UserProfile | null> {
  logger.log('[Auth] getProfile() called');

  try {
    // Use session instead of getUser() to avoid API timeout
    logger.log('[Auth] getProfile: Getting session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    logger.log('[Auth] getProfile: getSession() returned');

    if (sessionError) {
      logger.error('[Auth] getProfile: Failed to get session:', sessionError);
      throw sessionError;
    }

    if (!session?.user) {
      logger.log('[Auth] getProfile: No session or user');
      return null;
    }

    return getProfileById(session.user.id, session.user.email);
  } catch (err) {
    logger.error('[Auth] getProfile: Caught exception:', err);
    throw err;
  }
}

