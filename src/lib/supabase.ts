import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xonihnqotjbnirwpajyu.supabase.co';
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Y9bA01yHf430LRCfQhzD9g_08kG8bN2';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
