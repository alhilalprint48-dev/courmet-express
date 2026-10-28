-- Apply after existing security and cash-limit migrations. No customer data changes.
BEGIN;
CREATE OR REPLACE FUNCTION private.update_restaurant_settings(tenant uuid, fee numeric, minimum numeric, whatsapp text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE saved jsonb;
BEGIN
 IF coalesce(private.staff_role(tenant),'') NOT IN ('admin','superadmin') THEN
  RAISE EXCEPTION 'Modification refusée' USING ERRCODE='42501';
 END IF;
 IF fee IS NULL OR minimum IS NULL OR fee NOT BETWEEN 0 AND 100000 OR minimum NOT BETWEEN 0 AND 100000
  OR fee<>round(fee,2) OR minimum<>round(minimum,2) THEN RAISE EXCEPTION 'Montants invalides'; END IF;
 IF whatsapp IS NULL OR whatsapp !~ '^[1-9][0-9]{7,14}$' THEN RAISE EXCEPTION 'Numéro WhatsApp invalide'; END IF;
 UPDATE public.restaurants SET delivery_fee=fee,min_delivery_amount=minimum,whatsapp_number=whatsapp,updated_at=now()
 WHERE id=tenant RETURNING jsonb_build_object('delivery_fee',delivery_fee,'min_delivery_amount',min_delivery_amount,'whatsapp_number',whatsapp_number) INTO saved;
 IF saved IS NULL THEN RAISE EXCEPTION 'Restaurant introuvable'; END IF;
 RETURN saved;
END $$;
REVOKE ALL ON FUNCTION private.update_restaurant_settings(uuid,numeric,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.update_restaurant_settings(uuid,numeric,numeric,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.update_restaurant_settings(tenant uuid, fee numeric, minimum numeric, whatsapp text) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.update_restaurant_settings($1,$2,$3,$4) $$;
REVOKE ALL ON FUNCTION public.update_restaurant_settings(uuid,numeric,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_restaurant_settings(uuid,numeric,numeric,text) TO authenticated;

CREATE INDEX IF NOT EXISTS orders_tenant_created_idx ON public.orders(restaurant_id,created_at);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items(order_id);
CREATE OR REPLACE FUNCTION private.restaurant_analytics(tenant uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF coalesce(private.staff_role(tenant),'') NOT IN ('admin','superadmin') THEN
  RAISE EXCEPTION 'Consultation refusée' USING ERRCODE='42501';
 END IF;
 WITH periods AS (
  SELECT key, date_trunc(unit,now() AT TIME ZONE 'Africa/Casablanca') AT TIME ZONE 'Africa/Casablanca' AS start_at,
   (date_trunc(unit,now() AT TIME ZONE 'Africa/Casablanca')+span) AT TIME ZONE 'Africa/Casablanca' AS end_at
  FROM (VALUES ('day','day',interval '1 day'),('week','week',interval '1 week'),('month','month',interval '1 month')) p(key,unit,span)
 ), summaries AS (
  SELECT p.key,p.start_at,p.end_at,
   coalesce(sum(o.total) FILTER(WHERE o.status='delivered'),0) AS revenue,
   count(o.id) FILTER(WHERE o.status='delivered') AS order_count,
   count(o.id) FILTER(WHERE o.status='cancelled') AS cancelled_count,
   count(o.id) FILTER(WHERE o.status NOT IN ('delivered','cancelled')) AS pending_count
  FROM periods p LEFT JOIN public.orders o ON o.restaurant_id=tenant AND o.created_at>=p.start_at AND o.created_at<p.end_at AND o.created_at<=now()
  GROUP BY p.key,p.start_at,p.end_at
 ), top_products AS (
  SELECT i.product_id,i.product_name_fr AS name,sum(i.quantity) AS quantity,sum(i.total_price) AS revenue
  FROM public.order_items i JOIN public.orders o ON o.id=i.order_id
  JOIN periods p ON p.key='month' AND o.created_at>=p.start_at AND o.created_at<p.end_at
  WHERE o.restaurant_id=tenant AND o.status='delivered' AND o.created_at<=now()
  GROUP BY i.product_id,i.product_name_fr ORDER BY quantity DESC,revenue DESC,i.product_name_fr,i.product_id LIMIT 10
 ) SELECT jsonb_build_object('generated_at',now(),'timezone','Africa/Casablanca',
   'periods',(SELECT jsonb_object_agg(key,jsonb_build_object('start_at',start_at,'end_at',end_at,'revenue',revenue,'order_count',order_count,'cancelled_count',cancelled_count,'pending_count',pending_count)) FROM summaries),
   'top_products',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.quantity DESC,t.revenue DESC,t.name,t.product_id) FROM top_products t),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION private.restaurant_analytics(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.restaurant_analytics(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.restaurant_analytics(tenant uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.restaurant_analytics($1) $$;
REVOKE ALL ON FUNCTION public.restaurant_analytics(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.restaurant_analytics(uuid) TO authenticated;
COMMIT;
