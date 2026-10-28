-- Apply after operations preparation. Retain all orders, including archived history.
BEGIN;
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
  FROM periods p LEFT JOIN public.orders o ON o.restaurant_id=tenant AND coalesce(o.paid_at,o.created_at)>=p.start_at AND coalesce(o.paid_at,o.created_at)<p.end_at AND coalesce(o.paid_at,o.created_at)<=now()
  GROUP BY p.key,p.start_at,p.end_at
 ), top_products AS (
  SELECT i.product_id,i.product_name_fr AS name,sum(i.quantity) AS quantity,sum(i.total_price) AS revenue
  FROM public.order_items i JOIN public.orders o ON o.id=i.order_id
  JOIN periods p ON p.key='month' AND coalesce(o.paid_at,o.created_at)>=p.start_at AND coalesce(o.paid_at,o.created_at)<p.end_at
  WHERE o.restaurant_id=tenant AND o.status='delivered' AND coalesce(o.paid_at,o.created_at)<=now()
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
