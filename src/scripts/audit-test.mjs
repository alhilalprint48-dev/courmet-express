import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Configuration Supabase requise');
const db = createClient(url, key, { auth: { persistSession: false } });
let failed = false;
const menu = await db.from('restaurants').select('id').limit(1);
if (menu.error || menu.status !== 200) {
  throw new Error('Connexion/menu non vérifiés. Aucun résultat de sécurité fiable.');
}
console.log('Connexion à la base et clé publique vérifiées : HTTP 200.');
for (const table of ['orders', 'order_items', 'blacklist', 'blacklists']) {
  const { error, status } = await db.from(table).select('id').limit(1);
  if (error?.code === '42501' && [401,403].includes(status)) {
    console.log('PASS :', table, 'accès refusé HTTP', status, '(42501).');
  } else {
    console.error('FAIL : refus de permission non prouvé pour', table, status, error?.code || 'requête autorisée');
    failed = true;
  }
}
console.log('Ce contrôle en lecture ne prouve ni les écritures, ni la séparation des comptes A/B.');
if (failed) process.exitCode = 1;
