-- Run as database owner on the target project. Everything is rolled back.
-- Uses the real auth schema, functions, privileges and RLS; no auth stub is installed.
-- JWT signature validation and browser login are outside this SQL test.
BEGIN;
DO $$
DECLARE
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid();
 ua uuid:=gen_random_uuid(); ub uuid:=gen_random_uuid();
 pa uuid:=gen_random_uuid(); pb uuid:=gen_random_uuid();
 oa jsonb; ob jsonb; settings jsonb; stats jsonb; delivery jsonb; affected int;
BEGIN
 INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
 (ua,ua::text||'@example.invalid',now()),(ub,ub::text||'@example.invalid',now());
 INSERT INTO public.restaurants(id,slug,name,delivery_fee,min_delivery_amount,is_active) VALUES
 (a,'audit-a-'||a::text,'TEST TRANSACTION A',15,0,true),
 (b,'audit-b-'||b::text,'TEST TRANSACTION B',15,0,true);
 INSERT INTO public.products(id,restaurant_id,name_fr,name_ar,price,is_available,option_groups) VALUES
 (pa,a,'TEST A','تجربة',42,true,'[]'),(pb,b,'TEST B','تجربة',50,true,'[]');
 INSERT INTO private.staff_members(user_id,restaurant_id,role) VALUES(ua,a,'admin'),(ub,b,'admin');
 INSERT INTO public.blacklist(restaurant_id,phone) VALUES(b,'+212600000099');
 PERFORM set_config('request.jwt.claim.sub',ub::text,true);
 ob:=public.server_create_order(jsonb_build_object('restaurantId',b,'mode','dine_in','tableNumber','TEST B',
  'customer',jsonb_build_object('fullName','','phone','','paymentMethod','cash'),
  'items',jsonb_build_array(jsonb_build_object('productId',pb,'quantity',1,'options','[]'::jsonb))),ub);
 PERFORM set_config('request.jwt.claim.sub',ua::text,true);
 oa:=public.server_create_order(jsonb_build_object('restaurantId',a,'mode','dine_in','tableNumber','TEST A',
  'total',1,'status','delivered',
  'customer',jsonb_build_object('fullName','','phone','','paymentMethod','cash'),
  'items',jsonb_build_array(jsonb_build_object('productId',pa,'quantity',2,'options','[]'::jsonb))),ua);
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF oa->>'status'<>'new' OR (oa->>'total')::numeric<>84 OR oa->>'customer_phone'<>'' THEN RAISE EXCEPTION 'Commande ou prix canonique incorrect'; END IF;
 IF (SELECT count(*) FROM public.orders WHERE id=(oa->>'id')::uuid)<>1 THEN RAISE EXCEPTION 'A ne voit pas sa commande'; END IF;
 IF EXISTS(SELECT 1 FROM public.orders WHERE id=(ob->>'id')::uuid) THEN RAISE EXCEPTION 'A voit la commande de B'; END IF;
 IF EXISTS(SELECT 1 FROM public.order_items WHERE order_id=(ob->>'id')::uuid) THEN RAISE EXCEPTION 'A voit les lignes de B'; END IF;
 IF EXISTS(SELECT 1 FROM public.blacklist WHERE restaurant_id=b) THEN RAISE EXCEPTION 'A voit la liste noire de B'; END IF;
 BEGIN
  PERFORM public.order_action(a,(ob->>'id')::uuid,'cancel','TEST FOREIGN');
  RAISE EXCEPTION 'A modifie B';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  DELETE FROM public.orders WHERE id=(ob->>'id')::uuid;
  RAISE EXCEPTION 'Suppression directe autorisée';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 UPDATE public.products SET price=1 WHERE id=pb;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'A modifie les prix de B'; END IF;
 PERFORM public.order_action(a,(oa->>'id')::uuid,'prepare');
 PERFORM public.order_action(a,(oa->>'id')::uuid,'ready');
 PERFORM public.order_action(a,(oa->>'id')::uuid,'complete','payment_confirmed');
 IF public.guest_order_status((oa->>'id')::uuid,oa->>'tracking_token') IS DISTINCT FROM 'delivered' THEN RAISE EXCEPTION 'Suivi incorrect'; END IF;
 IF (public.customer_loyalty(a)->>'points')::int<>8 THEN RAISE EXCEPTION 'Fidélité incorrecte'; END IF;
 settings:=public.update_restaurant_settings(a,0,0,'212600000098');
 IF (settings->>'delivery_fee')::numeric<>0 OR (settings->>'min_delivery_amount')::numeric<>0 OR settings->>'whatsapp_number'<>'212600000098' THEN RAISE EXCEPTION 'Paramètres non enregistrés'; END IF;
 stats:=public.restaurant_analytics(a);
 IF (stats->'periods'->'month'->>'revenue')::numeric<>84 OR (stats->'periods'->'day'->>'order_count')::int<>1
  OR (stats->'top_products'->0->>'quantity')::int<>2 THEN RAISE EXCEPTION 'Statistiques incorrectes'; END IF;
 BEGIN
  PERFORM public.restaurant_analytics(b);
  RAISE EXCEPTION 'A voit les statistiques de B';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.update_restaurant_settings(b,0,0,'212600000098');
  RAISE EXCEPTION 'A modifie les paramètres de B';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 EXECUTE 'RESET ROLE';
 delivery:=public.server_create_order(jsonb_build_object('restaurantId',a,'mode','delivery',
  'customer',jsonb_build_object('fullName','TEST ROLLBACK','phone','212600000097','address','TEST ROLLBACK','paymentMethod','cash'),
  'items',jsonb_build_array(jsonb_build_object('productId',pa,'quantity',1,'options','[]'::jsonb))),NULL);
 IF (delivery->>'delivery_fee')::numeric<>0 OR (delivery->>'total')::numeric<>42 THEN RAISE EXCEPTION 'Nouveaux frais non appliqués au checkout'; END IF;
 EXECUTE 'SET LOCAL ROLE authenticated';
 PERFORM public.update_restaurant_profile(a,jsonb_build_object('name','TEST PROFIL','address','TEST ADRESSE','phone','+212600000098','open_hours','11:30–23:30','closed_message','TEST FERMETURE'));
 IF (SELECT name FROM public.restaurants WHERE id=a)<>'TEST PROFIL' THEN RAISE EXCEPTION 'Fiche non enregistrée'; END IF;
 PERFORM public.update_restaurant_availability(a,false);
 EXECUTE 'RESET ROLE';
 BEGIN
  PERFORM public.server_create_order(jsonb_build_object('restaurantId',a,'mode','dine_in','tableNumber','TEST FERME',
   'customer',jsonb_build_object('paymentMethod','cash'),'items',jsonb_build_array(jsonb_build_object('productId',pa,'quantity',1))),NULL);
  RAISE EXCEPTION 'Commande acceptée restaurant fermé';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Restaurant fermé%' THEN RAISE; END IF; END;
 IF (SELECT is_open FROM public.restaurants WHERE id=b) IS NOT TRUE THEN RAISE EXCEPTION 'Fermeture affecte un autre restaurant'; END IF;
 EXECUTE 'SET LOCAL ROLE authenticated';
 PERFORM public.update_restaurant_availability(a,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 EXECUTE 'RESET ROLE';
 PERFORM set_config('request.jwt.claim.sub',ub::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF EXISTS(SELECT 1 FROM public.orders WHERE id=(oa->>'id')::uuid) THEN RAISE EXCEPTION 'B voit A'; END IF;
 IF (SELECT count(*) FROM public.orders WHERE id=(ob->>'id')::uuid)<>1 THEN RAISE EXCEPTION 'B ne voit pas sa commande'; END IF;
 BEGIN
  PERFORM public.order_action(b,(oa->>'id')::uuid,'cancel','TEST FOREIGN');
  RAISE EXCEPTION 'B modifie A';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF (public.customer_loyalty(a)->>'points')::int<>0 THEN RAISE EXCEPTION 'B voit la fidélité de A'; END IF;
 EXECUTE 'RESET ROLE';
END $$;
ROLLBACK;
SELECT true AS actual_database_order_lifecycle_and_cross_tenant_isolation_passed;
