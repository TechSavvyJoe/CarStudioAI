import { createClient, type Session } from '@supabase/supabase-js';

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

const envIssues = validateSupabaseEnv(supabaseUrl, anonKey);
if (envIssues.length) {
  // Surface a clear message to aid production debugging without leaking secrets
  console.error('[Supabase] Misconfiguration detected:', envIssues.join(' '));
}

if (!supabaseUrl || !anonKey) {
  // Create a no-op client to avoid hard crashes; callers will hit explicit errors
  console.error('Supabase environment variables are missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, anonKey);

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
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
      console.error('[Supabase] Invalid API key. Ensure Vercel env VITE_SUPABASE_ANON_KEY matches your project and that VITE_SUPABASE_URL points to the same project.');
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

export async function getProfile(): Promise<UserProfile | null> {
  const { data: userData } = await supabase.auth.getUser();
  const { user } = userData;
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, dealership_id')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  return { id: data.id, role: data.role, dealership_id: data.dealership_id, email: user.email };
}
