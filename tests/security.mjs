import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const db = new PGlite();
let checks = 0;
const ids = {
  customer:'10000000-0000-0000-0000-000000000001', other:'10000000-0000-0000-0000-000000000002',
  manager:'10000000-0000-0000-0000-000000000003', kitchen:'10000000-0000-0000-0000-000000000004',
  driver:'10000000-0000-0000-0000-000000000005', platform:'10000000-0000-0000-0000-000000000006',
  unverified:'10000000-0000-0000-0000-000000000007',
  a:'20000000-0000-0000-0000-000000000001', b:'20000000-0000-0000-0000-000000000002',
  product:'30000000-0000-0000-0000-000000000001', foreign:'30000000-0000-0000-0000-000000000002'
};
const sql = text => db.exec(text);
async function as(role, uid = '') {
  await sql('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [uid]);
  await sql(`SET ROLE ${role}`);
}
async function reject(name, action, pattern = /./) {
  await assert.rejects(action, pattern, name); checks++; console.log('PASS', name);
}
function eq(name, actual, expected) { assert.deepEqual(actual, expected, name); checks++; console.log('PASS',name); }
const countBootstrap = async () => Number((await db.query('SELECT count(*) AS n FROM private.bootstrap_admin_emails')).rows[0].n);
const count = async table => Number((await db.query(`SELECT count(*) AS n FROM public.${table}`)).rows[0].n);
const order = (overrides={}) => ({restaurantId:ids.a,mode:'delivery',customer:{fullName:'Test',phone:'0611223344',address:'Adresse',paymentMethod:'cash'},items:[{productId:ids.product,quantity:1,options:[{groupId:'g',optionId:'o'}]}],...overrides});
const create = payload => db.query('SELECT public.create_order($1::jsonb) AS result', [JSON.stringify(payload)]);
try {
  // Auth stub only: authorization, RLS, functions, transactions and grants are real PostgreSQL.
  await sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, phone text, phone_confirmed_at timestamptz, email text, email_confirmed_at timestamptz);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`);
  let schema = readFileSync(new URL('../supabase_schema.sql',import.meta.url),'utf8')
    .replace('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";','')
    .replaceAll('uuid_generate_v4()', 'gen_random_uuid()')
    .replace('ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;','');
  await sql(schema);
  await sql(`INSERT INTO public.restaurants(id,slug,name,delivery_fee,min_delivery_amount) VALUES
    ('${ids.a}','a','A',15,50),('${ids.b}','b','B',20,10);
    INSERT INTO public.products(id,restaurant_id,name_fr,name_ar,price) VALUES
    ('${ids.product}','${ids.a}','Produit','منتوج',60),('${ids.foreign}','${ids.b}','Autre','آخر',80);`);
  for (const [name, phone] of [['customer','212611223344'],['other','212655667788'],['manager',null],['kitchen',null],['driver',null],['platform',null],['unverified','212699998888']]) {
    await db.query('INSERT INTO auth.users(id,phone,phone_confirmed_at) VALUES($1,$2,$3)', [ids[name],phone,name==='unverified'?null:new Date().toISOString()]);
  }
  await sql('CREATE POLICY old_open_orders ON public.orders FOR ALL USING (true) WITH CHECK (true); GRANT ALL ON public.orders TO anon,authenticated;');
  const migration = readFileSync(new URL('../supabase-security-rls.sql',import.meta.url),'utf8');
  await sql(migration); await sql(migration);
  eq('migration rerunnable and old policies removed', (await db.query("SELECT count(*)::int AS n FROM pg_policies WHERE policyname='old_open_orders'")).rows[0].n, 0);
  await sql(`INSERT INTO private.staff_members VALUES
    ('${ids.manager}','${ids.a}','admin'),('${ids.kitchen}','${ids.a}','kds'),('${ids.driver}','${ids.a}','livreur');
    INSERT INTO private.platform_admins VALUES('${ids.platform}');`);
  await db.query('UPDATE public.products SET option_groups=$1 WHERE id=$2', [JSON.stringify([{id:'g',name:{fr:'Supplément',ar:'إضافة'},required:true,minSelect:1,maxSelect:1,options:[{id:'o',name:{fr:'Fromage',ar:'فرماج'},price:5}]}]),ids.product]);
  await as('anon');
  eq('public menu remains readable', await count('products'),2);
  for(const table of ['orders','order_items','blacklist','blacklists']) await reject(`anonymous cannot read ${table}`,()=>count(table),/permission denied/);
  await reject('anonymous cannot invoke order RPC',()=>create(order()),/permission denied/);
  await reject('anonymous cannot alter prices',()=>sql('UPDATE public.products SET price=1'),/permission denied/);
  await as('authenticated',ids.unverified);
  await reject('unverified phone rejected',()=>create(order({customer:{...order().customer,phone:'0699998888'}})),/vérifier/);
  await as('postgres');
  await db.query('UPDATE auth.users SET email=$1,email_confirmed_at=NULL WHERE id=$2',['owner@example.test',ids.unverified]);
  await sql("INSERT INTO private.bootstrap_admin_emails VALUES('owner@example.test')");
  await as('authenticated',ids.unverified);
  await sql('SELECT public.claim_platform_access()');
  eq('unconfirmed email cannot claim administrator role',(await db.query('SELECT public.current_staff_role($1) AS role',[ids.a])).rows[0].role,null);
  await as('authenticated',ids.customer);
  await sql('SELECT public.claim_platform_access()');
  eq('other account cannot claim reserved administrator role',(await db.query('SELECT public.current_staff_role($1) AS role',[ids.a])).rows[0].role,null);
  await as('postgres');
  await db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1',[ids.unverified]);
  await as('authenticated',ids.unverified);
  await sql('SELECT public.claim_platform_access()');
  eq('verified reserved owner can claim role',(await db.query('SELECT public.current_staff_role($1) AS role',[ids.a])).rows[0].role,'superadmin');
  await as('postgres');
  eq('email reservation consumed once',await countBootstrap(),0);
  await sql(`DELETE FROM private.platform_admins WHERE user_id='${ids.unverified}'`);
  await as('authenticated',ids.unverified);
  await sql('SELECT public.claim_platform_access()');
  eq('consumed reservation cannot grant role again',(await db.query('SELECT public.current_staff_role($1) AS role',[ids.a])).rows[0].role,null);
  await as('authenticated',ids.customer);
  await reject('private membership table cannot be edited',()=>sql(`INSERT INTO private.platform_admins VALUES('${ids.customer}')`),/permission denied/);
  await reject('no direct order insert',()=>sql(`INSERT INTO public.orders(restaurant_id,order_number,subtotal,total,customer_name,customer_phone) VALUES('${ids.a}','fake',1,1,'X','X')`),/permission denied/);
  await reject('no direct item insert',()=>sql('INSERT INTO public.order_items DEFAULT VALUES'),/permission denied/);
  await reject('foreign restaurant product rejected',()=>create(order({items:[{productId:ids.foreign,quantity:1,options:[]}]})),/indisponible/);
  await reject('required options enforced',()=>create(order({items:[{productId:ids.product,quantity:1,options:[]}]})),/options/);
  await reject('invented options rejected',()=>create(order({items:[{productId:ids.product,quantity:1,options:[{groupId:'g',optionId:'fake',price:-100}]}]})),/Option/);
  await reject('duplicate options rejected',()=>create(order({items:[{productId:ids.product,quantity:1,options:[{groupId:'g',optionId:'o'},{groupId:'g',optionId:'o'}]}]})),/Option/);
  await reject('negative quantities rejected',()=>create(order({items:[{...order().items[0],quantity:-1}]})),/Quantité/);
  await reject('fractional quantities rejected',()=>create(order({items:[{...order().items[0],quantity:1.5}]})),/Quantité/);
  await reject('phone mismatch rejected',()=>create(order({customer:{...order().customer,phone:'0655667788'}})),/vérifier/);
  await reject('cash ceiling checked in DB',()=>create(order({items:[{...order().items[0],quantity:10}]})),/limites/);
  eq('invalid orders leave no records',await count('orders'),0);
  const forged=order({total:1,subtotal:1,deliveryFee:0,status:'delivered',is_phone_verified:true});
  forged.items[0].price=-1; forged.items[0].options[0].price=-100;
  const created=(await create(forged)).rows[0].result; const oid=created.id;
  eq('server uses canonical product and option prices', Number(created.subtotal),65);
  eq('server charges actual delivery fee', Number(created.total),80);
  eq('server forces new status',created.status,'new');
  eq('atomic item persisted',await count('order_items'),1);
  await reject('submission throttle enforced',()=>create(order()),/patienter/);
  eq('customer cannot edit status',(await db.query("UPDATE public.orders SET status='delivered' RETURNING id")).rows.length,0);
  await reject('customer cannot change order total',()=>sql('UPDATE public.orders SET total=1'),/permission denied/);
  eq('customer cannot delete orders',(await db.query('DELETE FROM public.orders RETURNING id')).rows.length,0);
  await as('authenticated',ids.other);
  eq('other customer cannot read orders',await count('orders'),0);
  eq('other customer cannot read items',await count('order_items'),0);
  await as('postgres');
  await sql(`INSERT INTO public.orders(restaurant_id,order_number,status,mode,subtotal,total,customer_name,customer_phone)
    VALUES('${ids.b}','foreign','ready','delivery',80,80,'Other tenant','+212600000000')`);
  await as('authenticated',ids.kitchen);
  eq('kitchen cannot read foreign orders',await count('orders'),1);
  eq('kitchen cannot update foreign orders',(await db.query(`UPDATE public.orders SET status='delivered' WHERE restaurant_id='${ids.b}' RETURNING id`)).rows.length,0);
  await as('authenticated',ids.driver);
  eq('driver cannot read foreign ready deliveries',await count('orders'),0);
  await as('authenticated',ids.manager);
  eq('manager sees own restaurant orders',await count('orders'),1);
  eq('manager cannot modify foreign tenant prices',(await db.query(`UPDATE public.products SET price=1 WHERE restaurant_id='${ids.b}' RETURNING id`)).rows.length,0);
  eq('manager cannot suspend tenant',(await db.query(`UPDATE public.restaurants SET is_active=false WHERE id='${ids.a}' RETURNING id`)).rows.length,0);
  await reject('manager cannot promote self',()=>sql(`UPDATE private.staff_members SET role='superadmin'`),/permission denied/);
  await sql(`INSERT INTO public.blacklist(restaurant_id,phone) VALUES('${ids.a}','06 11 22 33 44')`);
  await as('authenticated',ids.driver);
  eq('driver cannot see new kitchen orders',await count('orders'),0);
  eq('driver cannot change menu',(await db.query('UPDATE public.products SET price=1 RETURNING id')).rows.length,0);
  await as('authenticated',ids.kitchen);
  eq('kitchen can update own order status',(await db.query(`UPDATE public.orders SET status='ready' WHERE id='${oid}' RETURNING id`)).rows.length,1);
  eq('kitchen cannot delete orders',(await db.query('DELETE FROM public.orders RETURNING id')).rows.length,0);
  await as('authenticated',ids.driver);
  eq('driver sees ready delivery',await count('orders'),1);
  await reject('driver cannot cancel delivery',()=>sql(`UPDATE public.orders SET status='cancelled' WHERE id='${oid}'`),/row-level security/);
  eq('driver can deliver',(await db.query(`UPDATE public.orders SET status='delivered' WHERE id='${oid}' RETURNING id`)).rows.length,1);
  await as('authenticated',ids.platform);
  eq('platform admin can suspend restaurant',(await db.query(`UPDATE public.restaurants SET is_active=false WHERE id='${ids.a}' RETURNING id`)).rows.length,1);
  await as('authenticated',ids.customer);
  await as('postgres'); await sql(`UPDATE public.orders SET created_at=now()-interval '1 minute'`);
  await as('authenticated',ids.customer);
  await reject('suspended restaurant rejected',()=>create(order()),/indisponible/);
  await as('postgres'); await sql(`UPDATE public.restaurants SET is_active=true WHERE id='${ids.a}'`);
  await as('authenticated',ids.customer);
  await reject('blacklist enforced server-side across phone formats',()=>create(order()),/refusée/);
  await as('postgres');
  await sql(`DELETE FROM public.blacklist; INSERT INTO public.blacklists(restaurant_id,phone) VALUES(NULL,'+212611223344')`);
  await as('authenticated',ids.customer);
  await reject('legacy global blacklist enforced',()=>create(order()),/refusée/);
  await as('postgres'); await sql('DELETE FROM public.blacklists');
  await sql(`CREATE FUNCTION public.fail_items() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'item failure'; END $$;
    CREATE TRIGGER fail_items BEFORE INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.fail_items();`);
  await as('authenticated',ids.customer);
  await reject('item failure rolls back entire order',()=>create(order()),/item failure/);
  eq('no orphaned order after rollback',await count('orders'),1);
  console.log(`\n${checks} security checks passed (isolated PostgreSQL; no production calls).`);
} catch (error) { console.error(error.message, error.where || ''); process.exitCode = 1; } finally { await db.close(); }
