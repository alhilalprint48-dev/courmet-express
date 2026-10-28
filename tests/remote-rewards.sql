-- Run as database owner. Disposable fixtures; no message or email; all rolled back.
-- Validates real SQL functions and triggers, not JWT signature verification.
BEGIN;
DO $$ DECLARE r uuid:=gen_random_uuid(); u uuid:=gen_random_uuid(); p uuid:=gen_random_uuid(); o jsonb; payload jsonb; BEGIN
 INSERT INTO auth.users(id,email,email_confirmed_at) VALUES(u,u::text||'@example.invalid',now());
 INSERT INTO public.restaurants(id,slug,name,delivery_fee,min_delivery_amount) VALUES(r,'reward-test-'||r,'TEST REWARD ROLLBACK',15,0);
 INSERT INTO public.products(id,restaurant_id,name_fr,name_ar,price) VALUES(p,r,'TEST REWARD','TEST',50);
 INSERT INTO private.loyalty_ledger(order_id,user_id,restaurant_id,order_number,points) VALUES(gen_random_uuid(),u,r,'TEST SOURCE',100);
 payload:=jsonb_build_object('restaurantId',r,'mode','dine_in','tableNumber','TEST REWARD','redeemPoints',true,'customer',jsonb_build_object('paymentMethod','cash'),'items',jsonb_build_array(jsonb_build_object('productId',p,'quantity',1)));
 o:=public.server_create_order(payload,u);
 IF (o->>'total')::numeric<>40 OR (o->>'discount_amount')::numeric<>10 OR (o->>'points_redeemed')::int<>100 THEN RAISE EXCEPTION 'Reward amount incorrect'; END IF;
 IF (public.customer_loyalty(r)->>'points')::int<>0 THEN RAISE EXCEPTION 'Reward points not reserved'; END IF;
 BEGIN
  PERFORM public.server_create_order(jsonb_set(payload,'{tableNumber}','"TEST DOUBLE SPEND"'),u);
  RAISE EXCEPTION 'Double spending accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%points insuffisant%' THEN RAISE; END IF; END;
 UPDATE public.orders SET status='delivered' WHERE id=(o->>'id')::uuid;
 IF (public.customer_loyalty(r)->>'points')::int<>4 THEN RAISE EXCEPTION 'Net earnings incorrect'; END IF;
 UPDATE public.orders SET status='cancelled' WHERE id=(o->>'id')::uuid;
 IF (public.customer_loyalty(r)->>'points')::int<>100 THEN RAISE EXCEPTION 'Reward refund incorrect'; END IF;
 UPDATE public.orders SET status='cancelled' WHERE id=(o->>'id')::uuid;
 IF (public.customer_loyalty(r)->>'points')::int<>100 THEN RAISE EXCEPTION 'Duplicate reward refund'; END IF;
END $$;
ROLLBACK;
SELECT true AS real_reward_discount_debit_double_spend_rejection_and_refund_passed_all_fixtures_rolled_back;
