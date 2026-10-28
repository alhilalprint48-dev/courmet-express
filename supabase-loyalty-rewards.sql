-- Apply last, after all previous migrations. 100 points = 10 DH, once per order.
-- No historical points or orders are changed. Customer identity comes from the verified server entrypoint.
BEGIN;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_redeemed integer NOT NULL DEFAULT 0;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.orders'::regclass AND conname='orders_loyalty_reward_consistent') THEN
  ALTER TABLE public.orders ADD CONSTRAINT orders_loyalty_reward_consistent CHECK
   ((discount_amount=0 AND points_redeemed=0) OR (discount_amount=10 AND points_redeemed=100));
 END IF;
END $$;
-- Deliberately retain completed-order debits when staff clear orders, just like earned credits.
CREATE TABLE IF NOT EXISTS private.loyalty_redemptions (
 order_id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
 order_number text NOT NULL,
 points integer NOT NULL CHECK(points=100),
 refunded boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS loyalty_redemptions_customer_tenant_idx ON private.loyalty_redemptions(user_id,restaurant_id);
ALTER TABLE private.loyalty_redemptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.loyalty_redemptions FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.credit_loyalty() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.customer_user_id IS NOT NULL THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('loyalty:'||NEW.customer_user_id::text||':'||NEW.restaurant_id::text,0));
 END IF;
 IF NEW.status='delivered' AND NEW.customer_user_id IS NOT NULL AND EXISTS(
  SELECT 1 FROM auth.users WHERE id=NEW.customer_user_id AND email_confirmed_at IS NOT NULL
 ) THEN
  INSERT INTO private.loyalty_ledger(order_id,user_id,restaurant_id,order_number,points)
  VALUES(NEW.id,NEW.customer_user_id,NEW.restaurant_id,NEW.order_number,greatest(0,floor((NEW.subtotal-NEW.discount_amount)/10)::integer))
  ON CONFLICT(order_id) DO UPDATE SET points=EXCLUDED.points;
 ELSE
  UPDATE private.loyalty_ledger SET points=0 WHERE order_id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.credit_loyalty() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.refund_loyalty_reward() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE should_refund boolean:=false;
BEGIN
 IF OLD.points_redeemed=0 THEN
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
 END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.status='cancelled' AND NEW.status<>'cancelled' THEN
   RAISE EXCEPTION 'Commande annulée avec récompense : créez une nouvelle commande au lieu de la rouvrir';
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN should_refund:=OLD.status<>'delivered';
 ELSE should_refund:=NEW.status='cancelled'; END IF;
 IF should_refund THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('loyalty:'||OLD.customer_user_id::text||':'||OLD.restaurant_id::text,0));
  UPDATE private.loyalty_redemptions SET refunded=true WHERE order_id=OLD.id AND NOT refunded;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
REVOKE ALL ON FUNCTION private.refund_loyalty_reward() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS refund_customer_reward ON public.orders;
CREATE TRIGGER refund_customer_reward AFTER UPDATE OF status OR DELETE ON public.orders
 FOR EACH ROW EXECUTE FUNCTION private.refund_loyalty_reward();

CREATE OR REPLACE FUNCTION private.customer_loyalty(tenant uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE earned bigint; spent bigint; completed bigint; confirmed boolean;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise' USING ERRCODE='42501'; END IF;
 SELECT coalesce(sum(points),0),count(*) FILTER(WHERE points>0) INTO earned,completed FROM private.loyalty_ledger WHERE user_id=auth.uid() AND restaurant_id=tenant;
 SELECT coalesce(sum(points),0) INTO spent FROM private.loyalty_redemptions WHERE user_id=auth.uid() AND restaurant_id=tenant AND NOT refunded;
 SELECT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL) INTO confirmed;
 RETURN jsonb_build_object('points',earned-spent,'completedOrders',completed,'rewardPoints',100,'rewardDiscount',10,'canRedeem',confirmed AND earned-spent>=100);
END $$;
REVOKE ALL ON FUNCTION private.customer_loyalty(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.customer_loyalty(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION private.create_order(payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 uid uuid:=auth.uid(); tenant public.restaurants%ROWTYPE; prod public.products%ROWTYPE;
 tracking text:=gen_random_uuid()::text||gen_random_uuid()::text; normalized text; customer jsonb:=payload->'customer';
 item jsonb; choice jsonb; grp jsonb; opt jsonb; chosen jsonb; lines jsonb:='[]';
 line jsonb; opts jsonb; seen text[]; n int; qty int; unit numeric; sub numeric:=0; fee numeric; grand numeric;
 oid uuid:=gen_random_uuid(); num text:='CMD-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,28));
 md text:=payload->>'mode'; payment text:=customer->>'paymentMethod'; result jsonb;
 redeem boolean:=false; discount numeric:=0; spent integer:=0; available bigint;
BEGIN
 normalized:=CASE WHEN md='dine_in' THEN '' ELSE regexp_replace(coalesce(customer->>'phone',''),'[^0-9]','','g') END;
 IF normalized ~ '^0[67][0-9]{8}$' THEN normalized:='212'||substr(normalized,2); END IF;
 IF md<>'dine_in' AND normalized !~ '^[1-9][0-9]{7,14}$' THEN RAISE EXCEPTION 'Numéro de téléphone invalide'; END IF;
 -- Guests cannot read or write tables. This RPC creates only pending orders with canonical prices.
 -- Serialize per restaurant, then throttle each phone/table and total guest traffic.
 PERFORM pg_advisory_xact_lock(hashtextextended(payload->>'restaurantId',0));
 IF EXISTS(SELECT 1 FROM public.orders WHERE restaurant_id=(payload->>'restaurantId')::uuid
   AND created_at>now()-interval '30 seconds' AND
   ((md='dine_in' AND mode='dine_in' AND table_number=trim(payload->>'tableNumber')) OR
    (md<>'dine_in' AND customer_phone='+'||normalized)))
 THEN RAISE EXCEPTION 'Veuillez patienter avant une autre commande'; END IF;
 IF (SELECT count(*) FROM public.orders WHERE restaurant_id=(payload->>'restaurantId')::uuid
   AND created_at>now()-interval '1 minute')>=60 THEN RAISE EXCEPTION 'Trop de commandes. Contactez le restaurant'; END IF;
 SELECT * INTO tenant FROM public.restaurants WHERE id=(payload->>'restaurantId')::uuid AND is_active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Restaurant indisponible'; END IF;
 IF NOT tenant.is_open THEN RAISE EXCEPTION 'Restaurant fermé. Les commandes sont temporairement indisponibles.'; END IF;
 IF md IS NULL OR md NOT IN ('delivery','takeaway','dine_in') OR payment IS NULL OR payment NOT IN ('cash','tpe') THEN RAISE EXCEPTION 'Commande invalide'; END IF;
 IF (md<>'dine_in' AND coalesce(length(trim(customer->>'fullName')),0) NOT BETWEEN 1 AND 128) OR
 (md='delivery' AND coalesce(length(trim(customer->>'address')),0) NOT BETWEEN 1 AND 1000) OR
 (md='dine_in' AND coalesce(length(trim(payload->>'tableNumber')),0) NOT BETWEEN 1 AND 32) THEN RAISE EXCEPTION 'Coordonnées requises'; END IF;
 IF EXISTS(SELECT 1 FROM (
  SELECT b1.restaurant_id,b1.phone FROM public.blacklist b1 UNION ALL SELECT b2.restaurant_id,b2.phone FROM public.blacklists b2
 ) b WHERE (b.restaurant_id=tenant.id OR b.restaurant_id IS NULL) AND
 (CASE WHEN regexp_replace(b.phone,'[^0-9]','','g') ~ '^0[67][0-9]{8}$' THEN '212'||substr(regexp_replace(b.phone,'[^0-9]','','g'),2) ELSE regexp_replace(b.phone,'[^0-9]','','g') END)=normalized) THEN RAISE EXCEPTION 'Commande refusée. Contactez le restaurant'; END IF;
 IF jsonb_typeof(payload->'items') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Panier invalide'; END IF;
 IF jsonb_array_length(payload->'items') NOT BETWEEN 1 AND 40 THEN RAISE EXCEPTION 'Panier invalide'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(payload->'items') LOOP
  IF coalesce(item->>'quantity','') !~ '^[0-9]{1,2}$' THEN RAISE EXCEPTION 'Quantité invalide'; END IF;
  qty:=(item->>'quantity')::int;
  IF qty NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'Quantité invalide'; END IF;
  SELECT * INTO prod FROM public.products WHERE id=(item->>'productId')::uuid AND restaurant_id=tenant.id AND is_available FOR SHARE;
  IF NOT FOUND OR prod.price IS NULL OR prod.price<0 THEN RAISE EXCEPTION 'Produit indisponible'; END IF;
  chosen:=coalesce(item->'options','[]'::jsonb);
  IF jsonb_typeof(chosen)<>'array' THEN RAISE EXCEPTION 'Options invalides'; END IF;
  IF jsonb_array_length(chosen)>40 THEN RAISE EXCEPTION 'Trop d options'; END IF;
  unit:=prod.price; opts:='[]'; seen:=ARRAY[]::text[];
  FOR choice IN SELECT value FROM jsonb_array_elements(chosen) LOOP
   SELECT value INTO grp FROM jsonb_array_elements(coalesce(prod.option_groups,'[]'::jsonb)) WHERE value->>'id'=choice->>'groupId';
   IF grp IS NULL THEN RAISE EXCEPTION 'Groupe inconnu'; END IF;
   SELECT value INTO opt FROM jsonb_array_elements(grp->'options') WHERE value->>'id'=choice->>'optionId';
   IF opt IS NULL OR ((choice->>'groupId')||':'||(choice->>'optionId'))=ANY(seen) THEN RAISE EXCEPTION 'Option invalide'; END IF;
   seen:=array_append(seen,(choice->>'groupId')||':'||(choice->>'optionId'));
   IF (opt->>'price')::numeric IS NULL OR (opt->>'price')::numeric<0 THEN RAISE EXCEPTION 'Prix option invalide'; END IF;
   unit:=unit+(opt->>'price')::numeric;
   opts:=opts||jsonb_build_array(jsonb_build_object('groupId',grp->>'id','groupName',grp->'name','optionId',opt->>'id','optionName',opt->'name','price',(opt->>'price')::numeric));
  END LOOP;
  FOR grp IN SELECT value FROM jsonb_array_elements(coalesce(prod.option_groups,'[]'::jsonb)) LOOP
   SELECT count(*) INTO n FROM jsonb_array_elements(chosen) c WHERE c->>'groupId'=grp->>'id';
   IF n<greatest(coalesce((grp->>'minSelect')::int,0),CASE WHEN (grp->>'required')::boolean THEN 1 ELSE 0 END) OR n>coalesce((grp->>'maxSelect')::int,1) THEN RAISE EXCEPTION 'Nombre d options invalide'; END IF;
  END LOOP;
  unit:=round(unit,2); sub:=sub+unit*qty;
  lines:=lines||jsonb_build_array(jsonb_build_object('productId',prod.id,'name',jsonb_build_object('fr',prod.name_fr,'ar',prod.name_ar),'quantity',qty,'unitPrice',unit,'totalPrice',unit*qty,'selectedOptions',opts,'specialInstructions',left(item->>'specialInstructions',1000)));
 END LOOP;
 IF tenant.delivery_fee IS NULL OR tenant.delivery_fee<0 THEN RAISE EXCEPTION 'Frais invalides'; END IF;
 IF payload ? 'redeemPoints' AND jsonb_typeof(payload->'redeemPoints') NOT IN ('boolean','null') THEN RAISE EXCEPTION 'Commande : choix de récompense invalide'; END IF;
 redeem:=coalesce((payload->>'redeemPoints')::boolean,false);
 IF redeem THEN
  IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=uid AND email_confirmed_at IS NOT NULL) THEN
   RAISE EXCEPTION 'Commande : compte connecté et e-mail confirmé requis pour la récompense';
  END IF;
  IF sub<10 THEN RAISE EXCEPTION 'Commande : minimum de 10 DH de produits pour la récompense'; END IF;
  -- Serialize both spending and credit changes for this customer and restaurant.
  PERFORM pg_advisory_xact_lock(hashtextextended('loyalty:'||uid::text||':'||tenant.id::text,0));
  SELECT coalesce((SELECT sum(points) FROM private.loyalty_ledger WHERE user_id=uid AND restaurant_id=tenant.id),0)
    -coalesce((SELECT sum(points) FROM private.loyalty_redemptions WHERE user_id=uid AND restaurant_id=tenant.id AND NOT refunded),0) INTO available;
  IF available<100 THEN RAISE EXCEPTION 'Commande : solde de points insuffisant'; END IF;
  discount:=10; spent:=100;
 END IF;
 fee:=CASE WHEN md='delivery' THEN tenant.delivery_fee ELSE 0 END; grand:=sub-discount+fee;
 IF grand<0 OR (grand=0 AND NOT redeem) OR (md='delivery' AND sub<tenant.min_delivery_amount) OR (payment='cash' AND grand>tenant.max_cash_amount) THEN RAISE EXCEPTION 'Montant hors limites'; END IF;
 INSERT INTO public.orders(id,restaurant_id,customer_user_id,order_number,status,mode,table_number,subtotal,delivery_fee,total,customer_name,customer_phone,customer_address,customer_landmark,special_instructions,delivery_timeslot,payment_method,cash_change_amount,is_phone_verified,discount_amount,points_redeemed)
 VALUES(oid,tenant.id,uid,num,'new',md,CASE WHEN md='dine_in' THEN trim(payload->>'tableNumber') ELSE NULL END,sub,fee,grand,CASE WHEN md='dine_in' THEN coalesce(nullif(left(trim(customer->>'fullName'),128),''),'Client '||trim(payload->>'tableNumber')) ELSE customer->>'fullName' END,CASE WHEN md='dine_in' THEN '' ELSE '+'||normalized END,left(customer->>'address',1000),left(customer->>'landmark',500),left(customer->>'specialInstructions',1000),left(customer->>'deliveryTimeSlot',64),payment,left(customer->>'cashChangeAmount',64),false,discount,spent);
 FOR line IN SELECT value FROM jsonb_array_elements(lines) LOOP
  INSERT INTO public.order_items(order_id,product_id,product_name_fr,quantity,unit_price,total_price,selected_options,special_instructions)
  VALUES(oid,(line->>'productId')::uuid,line->'name'->>'fr',(line->>'quantity')::int,(line->>'unitPrice')::numeric,(line->>'totalPrice')::numeric,line->'selectedOptions',line->>'specialInstructions');
 END LOOP;
 IF redeem THEN
  INSERT INTO private.loyalty_redemptions(order_id,user_id,restaurant_id,order_number,points) VALUES(oid,uid,tenant.id,num,100);
 END IF;
 SELECT to_jsonb(o) INTO result FROM public.orders o WHERE o.id=oid;
 INSERT INTO private.order_tracking(order_id,token_hash) VALUES(oid,md5(tracking));
 RETURN result||jsonb_build_object('items',lines,'tracking_token',tracking);
END $$;
COMMIT;
