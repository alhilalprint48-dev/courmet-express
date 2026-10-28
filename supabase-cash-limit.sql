-- Apply after the existing security, guest checkout and Turnstile migrations.
-- Default remains 500 DH. Replacing the order function preserves its revoked grants.
BEGIN;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS max_cash_amount numeric(12,2) NOT NULL DEFAULT 500
 CHECK (max_cash_amount > 0 AND max_cash_amount <= 100000);
CREATE OR REPLACE FUNCTION private.update_cash_limit(tenant uuid, amount numeric) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF coalesce(private.staff_role(tenant),'') NOT IN ('admin','superadmin') THEN
  RAISE EXCEPTION 'Modification refusée' USING ERRCODE='42501';
 END IF;
 IF amount IS NULL OR amount <= 0 OR amount > 100000 OR amount <> round(amount,2) THEN
  RAISE EXCEPTION 'Plafond invalide';
 END IF;
 UPDATE public.restaurants SET max_cash_amount=amount WHERE id=tenant;
 IF NOT FOUND THEN RAISE EXCEPTION 'Restaurant introuvable'; END IF;
 RETURN amount;
END $$;
REVOKE ALL ON FUNCTION private.update_cash_limit(uuid,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.update_cash_limit(uuid,numeric) TO authenticated;
CREATE OR REPLACE FUNCTION public.update_cash_limit(tenant uuid, amount numeric) RETURNS numeric
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.update_cash_limit($1,$2) $$;
REVOKE ALL ON FUNCTION public.update_cash_limit(uuid,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_cash_limit(uuid,numeric) TO authenticated;
CREATE OR REPLACE FUNCTION private.create_order(payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 uid uuid:=auth.uid(); tenant public.restaurants%ROWTYPE; prod public.products%ROWTYPE;
 tracking text:=gen_random_uuid()::text||gen_random_uuid()::text; normalized text; customer jsonb:=payload->'customer';
 item jsonb; choice jsonb; grp jsonb; opt jsonb; chosen jsonb; lines jsonb:='[]';
 line jsonb; opts jsonb; seen text[]; n int; qty int; unit numeric; sub numeric:=0; fee numeric; grand numeric;
 oid uuid:=gen_random_uuid(); num text:='CMD-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,28));
 md text:=payload->>'mode'; payment text:=customer->>'paymentMethod'; result jsonb;
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
 fee:=CASE WHEN md='delivery' THEN tenant.delivery_fee ELSE 0 END; grand:=sub+fee;
 IF grand<=0 OR (md='delivery' AND sub<tenant.min_delivery_amount) OR (payment='cash' AND grand>tenant.max_cash_amount) THEN RAISE EXCEPTION 'Montant hors limites'; END IF;
 INSERT INTO public.orders(id,restaurant_id,customer_user_id,order_number,status,mode,table_number,subtotal,delivery_fee,total,customer_name,customer_phone,customer_address,customer_landmark,special_instructions,delivery_timeslot,payment_method,cash_change_amount,is_phone_verified)
 VALUES(oid,tenant.id,uid,num,'new',md,CASE WHEN md='dine_in' THEN trim(payload->>'tableNumber') ELSE NULL END,sub,fee,grand,CASE WHEN md='dine_in' THEN coalesce(nullif(left(trim(customer->>'fullName'),128),''),'Client '||trim(payload->>'tableNumber')) ELSE customer->>'fullName' END,CASE WHEN md='dine_in' THEN '' ELSE '+'||normalized END,left(customer->>'address',1000),left(customer->>'landmark',500),left(customer->>'specialInstructions',1000),left(customer->>'deliveryTimeSlot',64),payment,left(customer->>'cashChangeAmount',64),false);
 FOR line IN SELECT value FROM jsonb_array_elements(lines) LOOP
  INSERT INTO public.order_items(order_id,product_id,product_name_fr,quantity,unit_price,total_price,selected_options,special_instructions)
  VALUES(oid,(line->>'productId')::uuid,line->'name'->>'fr',(line->>'quantity')::int,(line->>'unitPrice')::numeric,(line->>'totalPrice')::numeric,line->'selectedOptions',line->>'specialInstructions');
 END LOOP;
 SELECT to_jsonb(o) INTO result FROM public.orders o WHERE o.id=oid;
 INSERT INTO private.order_tracking(order_id,token_hash) VALUES(oid,md5(tracking));
 RETURN result||jsonb_build_object('items',lines,'tracking_token',tracking);
END $$;
COMMIT;
