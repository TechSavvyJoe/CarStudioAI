import { createClient, type Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !anonKey) {
  // Surface a clear error in development to make misconfiguration obvious.
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
  const { data } = await supabase.auth.getSession();
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
  const user = userData.user;
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, dealership_id')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  return { id: data.id, role: data.role, dealership_id: data.dealership_id, email: user.email };
}
