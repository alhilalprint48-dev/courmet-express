-- Owner only. Isolated fixture accounts/restaurants, no email or messages. Entire transaction rolls back.
BEGIN;
DO $$
DECLARE r uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); u uuid:=gen_random_uuid(); p uuid:=gen_random_uuid(); other_p uuid:=gen_random_uuid();
 schedule jsonb:='[[],[],[],[],[],[],[]]'; day int; payload jsonb; o jsonb; n int;
BEGIN
 INSERT INTO auth.users(id,email,email_confirmed_at) VALUES(u,u||'@example.invalid',now());
 INSERT INTO public.restaurants(id,slug,name,delivery_fee,min_delivery_amount) VALUES(r,'catalog-test-'||r,'TEST ROLLBACK',0,0),(b,'catalog-foreign-'||b,'TEST FOREIGN',0,0);
 INSERT INTO private.staff_members VALUES(u,r,'admin');
 INSERT INTO public.products(id,restaurant_id,name_fr,name_ar,price) VALUES(p,r,'Original','TEST',20),(other_p,b,'Foreign','TEST',30);
 payload:=jsonb_build_object('restaurantId',r,'mode','takeaway','customer',jsonb_build_object('fullName','TEST','phone','212600000095','paymentMethod','cash','deliveryTimeSlot','12:15 - 12:45'),'items',jsonb_build_array(jsonb_build_object('productId',p,'quantity',1,'expectedUnitPrice',20)));
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 UPDATE public.products SET price=21,name_fr='Updated' WHERE id=p AND restaurant_id=r;
 UPDATE public.products SET price=1 WHERE id=other_p;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'Foreign product editable'; END IF;
 day:=(extract(dow FROM now() AT TIME ZONE 'Africa/Casablanca')::int+3)%7;
 schedule:=jsonb_set(schedule,ARRAY[day::text],'[{"start":"11:00","end":"12:00"}]');
 PERFORM public.update_opening_schedule(r,true,schedule);
 EXECUTE 'RESET ROLE';
 -- Stale prices are rejected before insertion; test schedule with a current-price basket.
 payload:=jsonb_set(payload,'{items,0,expectedUnitPrice}','21');
 BEGIN
  PERFORM public.server_create_order(payload,NULL);
  RAISE EXCEPTION 'Outside-hours order accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Restaurant fermé%' THEN RAISE; END IF; END;
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 PERFORM public.update_opening_schedule(r,false,schedule);
 EXECUTE 'RESET ROLE';
 payload:=jsonb_set(payload,'{items,0,expectedUnitPrice}','20');
 BEGIN
  PERFORM public.server_create_order(payload,NULL);
  RAISE EXCEPTION 'Stale price accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Prix modifié%' THEN RAISE; END IF; END;
 payload:=jsonb_set(payload,'{items,0,expectedUnitPrice}','21');
 o:=public.server_create_order(payload,NULL);
 IF (o->>'total')::numeric<>21 OR o->>'delivery_timeslot'<>'Au plus vite — délai à confirmer par le restaurant' THEN RAISE EXCEPTION 'Canonical price/pickup incorrect'; END IF;
 IF EXISTS(SELECT 1 FROM public.restaurants WHERE id=b AND schedule_enabled) THEN RAISE EXCEPTION 'Foreign schedule changed'; END IF;
END $$;
ROLLBACK;
SELECT true AS real_catalog_rls_schedule_and_stale_price_passed_all_fixtures_rolled_back;
