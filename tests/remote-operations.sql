-- Owner only: real schema/RLS/roles, disposable fixtures, no external messages.
-- Run after all operations SQL including enforcement. Everything rolls back.
BEGIN;
DO $$
DECLARE r uuid:=gen_random_uuid(); foreign_r uuid:=gen_random_uuid(); manager uuid:=gen_random_uuid();
 driver uuid:=gen_random_uuid(); second_driver uuid:=gen_random_uuid(); p uuid:=gen_random_uuid();
 o jsonb; q jsonb; before_stats jsonb; after_stats jsonb; result jsonb;
BEGIN
 INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
 (manager,manager||'@example.invalid',now()),(driver,driver||'@example.invalid',now()),(second_driver,second_driver||'@example.invalid',now());
 INSERT INTO public.restaurants(id,slug,name,delivery_fee,min_delivery_amount) VALUES
 (r,'ops-test-'||r,'TEST OPERATIONS ROLLBACK',0,0),(foreign_r,'ops-foreign-'||foreign_r,'TEST FOREIGN ROLLBACK',0,0);
 INSERT INTO public.products(id,restaurant_id,name_fr,name_ar,price) VALUES(p,r,'TEST OPERATIONS','TEST',20);
 INSERT INTO private.staff_members(user_id,restaurant_id,role) VALUES(manager,r,'admin'),(driver,r,'livreur'),(second_driver,r,'livreur');
 o:=public.server_create_order(jsonb_build_object('restaurantId',r,'mode','delivery','customer',jsonb_build_object('fullName','TEST ROLLBACK','phone','212600000096','address','TEST ROLLBACK','paymentMethod','cash','gpsCoords',jsonb_build_object('lat',0,'lng',0)),
 'items',jsonb_build_array(jsonb_build_object('productId',p,'quantity',1))),NULL);
 IF (o->>'gps_lat')::numeric IS DISTINCT FROM 0 OR (o->>'gps_lng')::numeric IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'GPS lost'; END IF;
 INSERT INTO public.orders(restaurant_id,order_number,mode,customer_name,customer_phone,subtotal,total,created_at)
 SELECT r,'TEST QUEUE '||i,'dine_in','','',20,20,now()-interval '2 hours'+make_interval(secs=>i) FROM generate_series(1,40) i;
 PERFORM set_config('request.jwt.claim.sub',manager::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 q:=public.staff_order_queue(r);
 IF jsonb_array_length(q->'active')<>41 OR q->'active'->0->>'order_number'<>'TEST QUEUE 1' THEN RAISE EXCEPTION 'Active queue lost old orders'; END IF;
 BEGIN
  PERFORM public.staff_order_queue(foreign_r);
  RAISE EXCEPTION 'Foreign queue visible';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM public.order_action(r,(o->>'id')::uuid,'prepare');
 PERFORM public.order_action(r,(o->>'id')::uuid,'ready');
 PERFORM set_config('request.jwt.claim.sub',driver::text,true);
 PERFORM public.order_action(r,(o->>'id')::uuid,'claim');
 PERFORM set_config('request.jwt.claim.sub',second_driver::text,true);
 q:=public.staff_order_queue(r,true);
 IF jsonb_array_length(q->'active')<>0 THEN RAISE EXCEPTION 'Other courier sees assigned delivery'; END IF;
 BEGIN
  PERFORM public.order_action(r,(o->>'id')::uuid,'claim');
  RAISE EXCEPTION 'Duplicate claim accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%déjà attribuée%' THEN RAISE; END IF; END;
 PERFORM set_config('request.jwt.claim.sub',driver::text,true);
 result:=public.order_action(r,(o->>'id')::uuid,'complete','payment_confirmed');
 IF (result->>'payment_received')::numeric<>20 OR result->>'paid_by'<>driver::text OR result->>'paid_at' IS NULL THEN RAISE EXCEPTION 'Payment not traced'; END IF;
 PERFORM set_config('request.jwt.claim.sub',manager::text,true);
 before_stats:=public.restaurant_analytics(r);
 PERFORM public.order_action(r,(o->>'id')::uuid,'archive');
 after_stats:=public.restaurant_analytics(r);
 IF before_stats IS DISTINCT FROM after_stats THEN RAISE EXCEPTION 'Archive changed analytics'; END IF;
 IF jsonb_array_length(public.order_event_log(r))<5 THEN RAISE EXCEPTION 'Missing journal'; END IF;
 BEGIN
  UPDATE public.orders SET status='new' WHERE id=(o->>'id')::uuid;
  RAISE EXCEPTION 'Direct status bypass accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  DELETE FROM public.orders WHERE id=(o->>'id')::uuid;
  RAISE EXCEPTION 'Hard deletion accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',driver::text,true);
 q:=public.staff_order_queue(r,true);
 IF jsonb_array_length(q->'history')<>1 THEN RAISE EXCEPTION 'Courier history lost after archive'; END IF;
 EXECUTE 'RESET ROLE';
END $$;
ROLLBACK;
SELECT true AS real_queue_payment_archive_assignment_isolation_passed_all_fixtures_rolled_back;
