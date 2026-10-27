import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) throw new Error('Configuration Supabase manquante.');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, storage: typeof window !== 'undefined' ? window.sessionStorage : undefined },
});
