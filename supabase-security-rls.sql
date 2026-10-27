-- Apply after supabase_schema.sql as database owner. Never expose private in the Data API.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
CREATE TABLE IF NOT EXISTS private.staff_members (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('admin','kds','livreur')),
 PRIMARY KEY(user_id,restaurant_id)
);
CREATE TABLE IF NOT EXISTS private.platform_admins (user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS private.bootstrap_admin_emails (email text PRIMARY KEY);
ALTER TABLE private.bootstrap_admin_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.platform_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA private FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION private.staff_role(tenant uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT CASE WHEN auth.uid() IS NULL THEN NULL
 WHEN EXISTS(SELECT 1 FROM private.platform_admins WHERE user_id=auth.uid()) THEN 'superadmin'
 ELSE (SELECT role FROM private.staff_members WHERE user_id=auth.uid() AND restaurant_id=tenant) END
$$;
REVOKE ALL ON FUNCTION private.staff_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.staff_role(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.current_staff_role(tenant uuid) RETURNS text
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$ SELECT private.staff_role(tenant) $$;
REVOKE ALL ON FUNCTION public.current_staff_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_staff_role(uuid) TO authenticated;
-- One-time reservation for a verified owner email, converted to immutable user_id.
-- Populate this private table only as database owner, never from the client.
CREATE OR REPLACE FUNCTION private.claim_platform_access() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE verified_email text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise' USING ERRCODE='42501'; END IF;
 SELECT lower(email) INTO verified_email FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;
 IF verified_email IS NULL THEN RETURN; END IF;
 DELETE FROM private.bootstrap_admin_emails WHERE lower(email)=verified_email;
 IF FOUND THEN INSERT INTO private.platform_admins(user_id) VALUES(auth.uid()) ON CONFLICT DO NOTHING; END IF;
END $$;
REVOKE ALL ON FUNCTION private.claim_platform_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.claim_platform_access() TO authenticated;
CREATE OR REPLACE FUNCTION public.claim_platform_access() RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.claim_platform_access() $$;
REVOKE ALL ON FUNCTION public.claim_platform_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_platform_access() TO authenticated;

CREATE TABLE IF NOT EXISTS public.blacklist (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
 phone text NOT NULL, reason text, created_at timestamptz DEFAULT now()
);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS option_groups jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_user_id uuid REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS orders_customer_idx ON public.orders(customer_user_id);
CREATE INDEX IF NOT EXISTS orders_tenant_idx ON public.orders(restaurant_id);
-- Permissive policies OR together; remove ALL previous policies, not just known names.
DO $$ DECLARE t text; p record; BEGIN
 FOREACH t IN ARRAY ARRAY['restaurants','categories','products','product_option_groups','product_options','orders','order_items','blacklist','blacklists'] LOOP
  IF to_regclass('public.'||t) IS NULL THEN CONTINUE; END IF;
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated',t);
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
   EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t);
  END LOOP;
 END LOOP;
END $$;
DROP FUNCTION IF EXISTS public.verify_order_totals(uuid,numeric);
GRANT SELECT ON public.restaurants,public.categories,public.products,public.product_option_groups,public.product_options TO anon,authenticated;
CREATE POLICY menu_restaurants ON public.restaurants FOR SELECT TO anon,authenticated USING(is_active);
CREATE POLICY staff_restaurants ON public.restaurants FOR SELECT TO authenticated USING(private.staff_role(id) IS NOT NULL);
CREATE POLICY menu_categories ON public.categories FOR SELECT TO anon,authenticated USING(EXISTS(SELECT 1 FROM public.restaurants r WHERE r.id=restaurant_id AND r.is_active));
CREATE POLICY menu_products ON public.products FOR SELECT TO anon,authenticated USING(EXISTS(SELECT 1 FROM public.restaurants r WHERE r.id=restaurant_id AND r.is_active));
CREATE POLICY menu_groups ON public.product_option_groups FOR SELECT TO anon,authenticated USING(EXISTS(SELECT 1 FROM public.products p WHERE p.id=product_id));
CREATE POLICY menu_options ON public.product_options FOR SELECT TO anon,authenticated USING(EXISTS(SELECT 1 FROM public.product_option_groups g WHERE g.id=group_id));
GRANT INSERT,UPDATE,DELETE ON public.restaurants TO authenticated;
CREATE POLICY platform_restaurants ON public.restaurants FOR ALL TO authenticated USING(private.staff_role(id)='superadmin') WITH CHECK(private.staff_role(id)='superadmin');
GRANT INSERT,UPDATE,DELETE ON public.categories,public.products,public.product_option_groups,public.product_options TO authenticated;
CREATE POLICY manager_categories ON public.categories FOR ALL TO authenticated USING(private.staff_role(restaurant_id) IN ('admin','superadmin')) WITH CHECK(private.staff_role(restaurant_id) IN ('admin','superadmin'));
CREATE POLICY manager_products ON public.products FOR ALL TO authenticated USING(private.staff_role(restaurant_id) IN ('admin','superadmin')) WITH CHECK(private.staff_role(restaurant_id) IN ('admin','superadmin') AND (category_id IS NULL OR EXISTS(SELECT 1 FROM public.categories c WHERE c.id=category_id AND c.restaurant_id=products.restaurant_id)));
CREATE POLICY manager_groups ON public.product_option_groups FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.products p WHERE p.id=product_id AND private.staff_role(p.restaurant_id) IN ('admin','superadmin'))) WITH CHECK(EXISTS(SELECT 1 FROM public.products p WHERE p.id=product_id AND private.staff_role(p.restaurant_id) IN ('admin','superadmin')));
CREATE POLICY manager_options ON public.product_options FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.product_option_groups g JOIN public.products p ON p.id=g.product_id WHERE g.id=group_id AND private.staff_role(p.restaurant_id) IN ('admin','superadmin'))) WITH CHECK(EXISTS(SELECT 1 FROM public.product_option_groups g JOIN public.products p ON p.id=g.product_id WHERE g.id=group_id AND private.staff_role(p.restaurant_id) IN ('admin','superadmin')));
GRANT SELECT,DELETE ON public.orders,public.order_items TO authenticated;
GRANT UPDATE(status) ON public.orders TO authenticated;
CREATE POLICY customer_orders ON public.orders FOR SELECT TO authenticated USING(customer_user_id=auth.uid());
CREATE POLICY staff_orders ON public.orders FOR SELECT TO authenticated USING(private.staff_role(restaurant_id) IN ('admin','kds','superadmin') OR (private.staff_role(restaurant_id)='livreur' AND mode='delivery' AND status IN ('ready','delivering','delivered')));
CREATE POLICY kitchen_status ON public.orders FOR UPDATE TO authenticated USING(private.staff_role(restaurant_id) IN ('admin','kds','superadmin')) WITH CHECK(private.staff_role(restaurant_id) IN ('admin','kds','superadmin') AND status IN ('new','accepted','preparing','ready','delivering','delivered','cancelled'));
CREATE POLICY driver_status ON public.orders FOR UPDATE TO authenticated USING(private.staff_role(restaurant_id)='livreur' AND mode='delivery' AND status IN ('ready','delivering')) WITH CHECK(private.staff_role(restaurant_id)='livreur' AND mode='delivery' AND status IN ('delivering','delivered'));
CREATE POLICY manager_delete_orders ON public.orders FOR DELETE TO authenticated USING(private.staff_role(restaurant_id) IN ('admin','superadmin'));
CREATE POLICY readable_items ON public.order_items FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id));
CREATE POLICY manager_delete_items ON public.order_items FOR DELETE TO authenticated USING(EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id AND private.staff_role(o.restaurant_id) IN ('admin','superadmin')));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.blacklist TO authenticated;
CREATE POLICY manager_blacklist ON public.blacklist FOR ALL TO authenticated USING(private.staff_role(restaurant_id) IN ('admin','superadmin')) WITH CHECK(private.staff_role(restaurant_id) IN ('admin','superadmin'));

CREATE OR REPLACE FUNCTION private.create_order(payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 uid uuid:=auth.uid(); tenant public.restaurants%ROWTYPE; prod public.products%ROWTYPE;
 phone text; normalized text; customer jsonb:=payload->'customer';
 item jsonb; choice jsonb; grp jsonb; opt jsonb; chosen jsonb; lines jsonb:='[]';
 line jsonb; opts jsonb; seen text[]; n int; qty int; unit numeric; sub numeric:=0; fee numeric; grand numeric;
 oid uuid:=gen_random_uuid(); num text:='CMD-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,28));
 md text:=payload->>'mode'; payment text:=customer->>'paymentMethod'; result jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authentification requise' USING ERRCODE='42501'; END IF;
 SELECT u.phone INTO phone FROM auth.users u WHERE u.id=uid AND u.phone_confirmed_at IS NOT NULL;
 normalized:=regexp_replace(coalesce(customer->>'phone',''),'[^0-9]','','g');
 IF normalized ~ '^0[67][0-9]{8}$' THEN normalized:='212'||substr(normalized,2); END IF;
 IF phone IS NULL OR regexp_replace(phone,'[^0-9]','','g')<>normalized THEN RAISE EXCEPTION 'Veuillez vérifier votre numéro de téléphone' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
 IF EXISTS(SELECT 1 FROM public.orders WHERE customer_user_id=uid AND created_at>now()-interval '30 seconds') THEN RAISE EXCEPTION 'Veuillez patienter avant une autre commande'; END IF;
 SELECT * INTO tenant FROM public.restaurants WHERE id=(payload->>'restaurantId')::uuid AND is_active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Restaurant indisponible'; END IF;
 IF md IS NULL OR md NOT IN ('delivery','takeaway','dine_in') OR payment IS NULL OR payment NOT IN ('cash','tpe') THEN RAISE EXCEPTION 'Commande invalide'; END IF;
 IF coalesce(length(trim(customer->>'fullName')),0) NOT BETWEEN 1 AND 128 OR
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
 IF grand<=0 OR (md='delivery' AND sub<tenant.min_delivery_amount) OR (payment='cash' AND grand>500) THEN RAISE EXCEPTION 'Montant hors limites'; END IF;
 INSERT INTO public.orders(id,restaurant_id,customer_user_id,order_number,status,mode,table_number,subtotal,delivery_fee,total,customer_name,customer_phone,customer_address,customer_landmark,special_instructions,delivery_timeslot,payment_method,cash_change_amount,is_phone_verified)
 VALUES(oid,tenant.id,uid,num,'new',md,left(payload->>'tableNumber',32),sub,fee,grand,customer->>'fullName','+'||normalized,left(customer->>'address',1000),left(customer->>'landmark',500),left(customer->>'specialInstructions',1000),left(customer->>'deliveryTimeSlot',64),payment,left(customer->>'cashChangeAmount',64),true);
 FOR line IN SELECT value FROM jsonb_array_elements(lines) LOOP
  INSERT INTO public.order_items(order_id,product_id,product_name_fr,quantity,unit_price,total_price,selected_options,special_instructions)
  VALUES(oid,(line->>'productId')::uuid,line->'name'->>'fr',(line->>'quantity')::int,(line->>'unitPrice')::numeric,(line->>'totalPrice')::numeric,line->'selectedOptions',line->>'specialInstructions');
 END LOOP;
 SELECT to_jsonb(o) INTO result FROM public.orders o WHERE o.id=oid;
 RETURN result||jsonb_build_object('items',lines);
END $$;
REVOKE ALL ON FUNCTION private.create_order(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.create_order(jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.create_order(payload jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.create_order(payload) $$;
REVOKE ALL ON FUNCTION public.create_order(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order(jsonb) TO authenticated;
COMMIT;
