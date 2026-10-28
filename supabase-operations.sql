-- Additive preparation. Deploy the new staff UI before supabase-operations-enforce.sql.
BEGIN;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS archived_by uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assigned_driver_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_by uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_received numeric(10,2);
CREATE INDEX IF NOT EXISTS orders_service_queue_idx ON public.orders(restaurant_id,archived_at,status,created_at);
CREATE INDEX IF NOT EXISTS orders_driver_queue_idx ON public.orders(restaurant_id,assigned_driver_id,status);
CREATE TABLE IF NOT EXISTS private.order_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
 order_id uuid NOT NULL, order_number text NOT NULL,
 actor_id uuid, event text NOT NULL, details jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_events_tenant_time_idx ON private.order_events(restaurant_id,created_at DESC);
ALTER TABLE private.order_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.order_events FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.log_order_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE kind text;
BEGIN
 IF TG_OP='INSERT' THEN kind:='created';
 ELSIF NEW.status IS DISTINCT FROM OLD.status THEN kind:='status:'||NEW.status;
 ELSIF NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN kind:='archived';
 ELSIF NEW.assigned_driver_id IS DISTINCT FROM OLD.assigned_driver_id THEN kind:='assigned';
 ELSIF NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN kind:='payment';
 ELSE RETURN NEW; END IF;
 INSERT INTO private.order_events(restaurant_id,order_id,order_number,actor_id,event,details)
 VALUES(NEW.restaurant_id,NEW.id,NEW.order_number,auth.uid(),kind,
  jsonb_build_object('status',NEW.status,'payment_received',NEW.payment_received,'driver_id',NEW.assigned_driver_id,'archived',NEW.archived_at IS NOT NULL));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.log_order_event() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS log_staff_order_event ON public.orders;
CREATE TRIGGER log_staff_order_event AFTER INSERT OR UPDATE OF status,archived_at,assigned_driver_id,paid_at ON public.orders
 FOR EACH ROW EXECUTE FUNCTION private.log_order_event();

CREATE OR REPLACE FUNCTION private.order_action(tenant uuid,target uuid,action text,note text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE staff text:=private.staff_role(tenant); actor uuid:=auth.uid(); item public.orders%ROWTYPE; changed integer;
BEGIN
 IF actor IS NULL OR coalesce(staff,'') NOT IN ('admin','superadmin','kds','livreur') THEN RAISE EXCEPTION 'Action refusée' USING ERRCODE='42501'; END IF;
 IF action='archive_completed' THEN
  IF staff NOT IN ('admin','superadmin') THEN RAISE EXCEPTION 'Archivage refusé' USING ERRCODE='42501'; END IF;
  UPDATE public.orders SET archived_at=now(),archived_by=actor WHERE restaurant_id=tenant AND status IN ('delivered','cancelled') AND archived_at IS NULL;
  GET DIAGNOSTICS changed=ROW_COUNT;
  RETURN jsonb_build_object('archived',changed);
 END IF;
 SELECT * INTO item FROM public.orders WHERE id=target AND restaurant_id=tenant FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Commande inaccessible' USING ERRCODE='42501'; END IF;
 IF action='claim' THEN
  IF staff NOT IN ('livreur','admin','superadmin') OR item.mode<>'delivery' OR item.status NOT IN ('ready','delivering') OR item.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Course indisponible'; END IF;
  IF item.assigned_driver_id IS NOT NULL AND item.assigned_driver_id<>actor THEN RAISE EXCEPTION 'Course déjà attribuée à un autre livreur'; END IF;
  UPDATE public.orders SET assigned_driver_id=actor,status='delivering' WHERE id=target;
 ELSIF action='complete' THEN
  IF item.mode='delivery' THEN
   IF staff NOT IN ('livreur','admin','superadmin') OR item.assigned_driver_id IS DISTINCT FROM actor THEN RAISE EXCEPTION 'Course non attribuée à votre compte' USING ERRCODE='42501'; END IF;
  ELSIF staff NOT IN ('admin','superadmin','kds') THEN RAISE EXCEPTION 'Clôture refusée' USING ERRCODE='42501'; END IF;
  IF item.status='delivered' THEN RETURN to_jsonb(item); END IF;
  IF item.archived_at IS NOT NULL OR (item.mode='delivery' AND item.status<>'delivering') OR (item.mode<>'delivery' AND item.status<>'ready') THEN RAISE EXCEPTION 'Commande non prête'; END IF;
  IF note IS DISTINCT FROM 'payment_confirmed' THEN RAISE EXCEPTION 'Confirmez la réception du paiement'; END IF;
  UPDATE public.orders SET status='delivered',paid_at=coalesce(paid_at,now()),paid_by=coalesce(paid_by,actor),payment_received=total WHERE id=target;
 ELSIF action IN ('archive','unarchive') THEN
  IF staff NOT IN ('admin','superadmin') THEN RAISE EXCEPTION 'Archivage refusé' USING ERRCODE='42501'; END IF;
  IF item.status NOT IN ('delivered','cancelled') THEN RAISE EXCEPTION 'Une commande active doit être traitée ou annulée avant archivage'; END IF;
  UPDATE public.orders SET archived_at=CASE WHEN action='archive' THEN coalesce(archived_at,now()) ELSE NULL END,archived_by=CASE WHEN action='archive' THEN coalesce(archived_by,actor) ELSE NULL END WHERE id=target;
 ELSE
  IF staff NOT IN ('admin','superadmin','kds') OR item.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Action refusée' USING ERRCODE='42501'; END IF;
  IF action='cancel' THEN
   IF item.status='cancelled' THEN RETURN to_jsonb(item); END IF;
   IF item.status='delivered' AND staff NOT IN ('admin','superadmin') THEN RAISE EXCEPTION 'Annulation d’une commande clôturée réservée au gérant' USING ERRCODE='42501'; END IF;
   IF coalesce(length(trim(note)),0) NOT BETWEEN 3 AND 300 THEN RAISE EXCEPTION 'Motif d’annulation requis (3 à 300 caractères)'; END IF;
   UPDATE public.orders SET status='cancelled' WHERE id=target;
   INSERT INTO private.order_events(restaurant_id,order_id,order_number,actor_id,event,details) VALUES(tenant,target,item.order_number,actor,'cancellation_reason',jsonb_build_object('reason',trim(note),'payment_to_reconcile',item.paid_at IS NOT NULL));
  ELSIF action='prepare' AND item.status IN ('new','accepted') THEN UPDATE public.orders SET status='preparing' WHERE id=target;
  ELSIF action='ready' AND item.status='preparing' THEN UPDATE public.orders SET status='ready' WHERE id=target;
  ELSIF action='undo_ready' AND item.status='ready' AND item.paid_at IS NULL THEN UPDATE public.orders SET status='preparing' WHERE id=target;
  ELSE RAISE EXCEPTION 'Transition de commande refusée'; END IF;
 END IF;
 SELECT * INTO item FROM public.orders WHERE id=target;
 RETURN to_jsonb(item);
END $$;
REVOKE ALL ON FUNCTION private.order_action(uuid,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.order_action(uuid,uuid,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.order_action(tenant uuid,target uuid,action text,note text DEFAULT NULL) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.order_action($1,$2,$3,$4) $$;
REVOKE ALL ON FUNCTION public.order_action(uuid,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.order_action(uuid,uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION private.staff_order_queue(tenant uuid,courier boolean DEFAULT false,history_limit integer DEFAULT 50,include_archived boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE staff text:=private.staff_role(tenant); result jsonb;
BEGIN
 IF coalesce(staff,'') NOT IN ('admin','superadmin','kds','livreur') OR (courier AND staff='kds') OR (NOT courier AND staff='livreur') THEN RAISE EXCEPTION 'Accès refusé' USING ERRCODE='42501'; END IF;
 IF courier IS NULL OR include_archived IS NULL OR history_limit IS NULL OR history_limit NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Requête invalide'; END IF;
 WITH scoped AS (
  SELECT o.* FROM public.orders o WHERE o.restaurant_id=tenant AND (NOT courier OR (o.mode='delivery' AND
   (o.assigned_driver_id=auth.uid() OR (o.assigned_driver_id IS NULL AND o.status IN ('ready','delivering')))))
 ), active AS (
  SELECT * FROM scoped WHERE archived_at IS NULL AND status NOT IN ('delivered','cancelled')
 ), history AS (
  SELECT * FROM scoped WHERE status IN ('delivered','cancelled') AND (courier OR (include_archived AND archived_at IS NOT NULL) OR (NOT include_archived AND archived_at IS NULL))
  ORDER BY created_at DESC,id DESC LIMIT history_limit
 ), rows AS (
  SELECT 'active' AS section,a.* FROM active a UNION ALL SELECT 'history',h.* FROM history h
 ), enriched AS (
  SELECT section,created_at,id,(to_jsonb(rows)-'section')||jsonb_build_object('order_items',coalesce((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.id) FROM public.order_items i WHERE i.order_id=rows.id),'[]'::jsonb)) AS data FROM rows
 ) SELECT jsonb_build_object('role',staff,'user_id',auth.uid(),
  'active',coalesce((SELECT jsonb_agg(data ORDER BY created_at,id) FROM enriched WHERE section='active'),'[]'::jsonb),
  'history',coalesce((SELECT jsonb_agg(data ORDER BY created_at DESC,id DESC) FROM enriched WHERE section='history'),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION private.staff_order_queue(uuid,boolean,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.staff_order_queue(uuid,boolean,integer,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.staff_order_queue(tenant uuid,courier boolean DEFAULT false,history_limit integer DEFAULT 50,include_archived boolean DEFAULT false) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.staff_order_queue($1,$2,$3,$4) $$;
REVOKE ALL ON FUNCTION public.staff_order_queue(uuid,boolean,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.staff_order_queue(uuid,boolean,integer,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION private.order_event_log(tenant uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF coalesce(private.staff_role(tenant),'') NOT IN ('admin','superadmin') THEN RAISE EXCEPTION 'Journal inaccessible' USING ERRCODE='42501'; END IF;
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC,e.id DESC) FROM (SELECT * FROM private.order_events WHERE restaurant_id=tenant ORDER BY created_at DESC,id DESC LIMIT 100) e),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION private.order_event_log(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.order_event_log(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.order_event_log(tenant uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.order_event_log($1) $$;
REVOKE ALL ON FUNCTION public.order_event_log(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.order_event_log(uuid) TO authenticated;
COMMIT;
