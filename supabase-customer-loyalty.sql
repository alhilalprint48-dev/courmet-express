-- Apply after the secured checkout schema. No historical orders are credited.
BEGIN;
CREATE TABLE IF NOT EXISTS private.loyalty_ledger (
 order_id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
 order_number text NOT NULL,
 points integer NOT NULL CHECK(points>=0),
 earned_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS loyalty_customer_tenant_idx ON private.loyalty_ledger(user_id,restaurant_id);
ALTER TABLE private.loyalty_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.loyalty_ledger FROM PUBLIC,anon,authenticated;
-- Trigger-only function: users cannot call it or set points themselves.
-- Keep credits when staff clear completed orders; cancel/reopen reverses the credit.
CREATE OR REPLACE FUNCTION private.credit_loyalty() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status='delivered' AND NEW.customer_user_id IS NOT NULL AND EXISTS(
   SELECT 1 FROM auth.users u WHERE u.id=NEW.customer_user_id AND u.email_confirmed_at IS NOT NULL
 ) THEN
  INSERT INTO private.loyalty_ledger(order_id,user_id,restaurant_id,order_number,points)
  VALUES(NEW.id,NEW.customer_user_id,NEW.restaurant_id,NEW.order_number,greatest(0,floor(NEW.subtotal/10)::integer))
  ON CONFLICT(order_id) DO UPDATE SET points=EXCLUDED.points;
 ELSE
  UPDATE private.loyalty_ledger SET points=0 WHERE order_id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.credit_loyalty() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS credit_customer_loyalty ON public.orders;
CREATE TRIGGER credit_customer_loyalty AFTER INSERT OR UPDATE OF status ON public.orders
 FOR EACH ROW EXECUTE FUNCTION private.credit_loyalty();
CREATE OR REPLACE FUNCTION private.customer_loyalty(tenant uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('points',coalesce(sum(points),0),'completedOrders',count(*) FILTER(WHERE points>0))
 INTO result FROM private.loyalty_ledger WHERE user_id=auth.uid() AND restaurant_id=tenant;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION private.customer_loyalty(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.customer_loyalty(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.customer_loyalty(tenant uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.customer_loyalty(tenant) $$;
REVOKE ALL ON FUNCTION public.customer_loyalty(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.customer_loyalty(uuid) TO authenticated;
COMMIT;
