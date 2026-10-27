import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Configuration Supabase requise');
const db = createClient(url, key, { auth: { persistSession: false } });
let failed = false;
for (const table of ['orders', 'order_items', 'blacklist', 'blacklists']) {
  const { data, error } = await db.from(table).select('*').limit(1);
  if (!error && data?.length) { console.error('FAIL : données privées accessibles :', table); failed = true; }
  else console.log('Accès anonyme sans données :', table);
}
console.log('Ce contrôle en lecture ne prouve pas le refus des écritures. Exécuter aussi les tests SQL.');
if (failed) process.exitCode = 1;
