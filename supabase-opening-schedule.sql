-- Additive: scheduling remains disabled until the manager saves and enables it.
BEGIN;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS schedule_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS weekly_schedule jsonb NOT NULL DEFAULT '[[],[],[],[],[],[],[]]';
CREATE OR REPLACE FUNCTION private.valid_weekly_schedule(schedule jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE day jsonb; period jsonb;
BEGIN
 IF jsonb_typeof(schedule) IS DISTINCT FROM 'array' OR jsonb_array_length(schedule)<>7 THEN RETURN false; END IF;
 FOR day IN SELECT value FROM jsonb_array_elements(schedule) LOOP
  IF jsonb_typeof(day) IS DISTINCT FROM 'array' OR jsonb_array_length(day)>4 THEN RETURN false; END IF;
  FOR period IN SELECT value FROM jsonb_array_elements(day) LOOP
   IF jsonb_typeof(period) IS DISTINCT FROM 'object' OR coalesce(period->>'start','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    OR coalesce(period->>'end','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR period->>'start'=period->>'end' THEN RETURN false; END IF;
  END LOOP;
 END LOOP;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
REVOKE ALL ON FUNCTION private.valid_weekly_schedule(jsonb) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.weekly_schedule_open(schedule jsonb,moment timestamptz DEFAULT now()) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE local_time timestamp:=moment AT TIME ZONE 'Africa/Casablanca'; day int:=extract(dow FROM local_time); minute int:=extract(hour FROM local_time)::int*60+extract(minute FROM local_time)::int;
 period jsonb; first_minute int; last_minute int; offset_day int;
BEGIN
 IF NOT private.valid_weekly_schedule(schedule) THEN RETURN false; END IF;
 FOR offset_day IN 0..1 LOOP
  FOR period IN SELECT value FROM jsonb_array_elements(schedule->((day-offset_day+7)%7)) LOOP
   first_minute:=split_part(period->>'start',':',1)::int*60+split_part(period->>'start',':',2)::int;
   last_minute:=split_part(period->>'end',':',1)::int*60+split_part(period->>'end',':',2)::int;
   IF offset_day=0 AND ((first_minute<last_minute AND minute>=first_minute AND minute<last_minute) OR (first_minute>last_minute AND minute>=first_minute)) THEN RETURN true; END IF;
   IF offset_day=1 AND first_minute>last_minute AND minute<last_minute THEN RETURN true; END IF;
  END LOOP;
 END LOOP;
 RETURN false;
END $$;
REVOKE ALL ON FUNCTION private.weekly_schedule_open(jsonb,timestamptz) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.update_opening_schedule(tenant uuid,enabled boolean,schedule jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE saved jsonb;
BEGIN
 IF coalesce(private.staff_role(tenant),'') NOT IN ('admin','superadmin') THEN RAISE EXCEPTION 'Modification refusée' USING ERRCODE='42501'; END IF;
 IF enabled IS NULL OR NOT private.valid_weekly_schedule(schedule) THEN RAISE EXCEPTION 'Horaires invalides'; END IF;
 IF enabled AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(schedule) day WHERE jsonb_array_length(day)>0) THEN RAISE EXCEPTION 'Ajoutez au moins une plage d’ouverture'; END IF;
 UPDATE public.restaurants SET schedule_enabled=enabled,weekly_schedule=schedule,updated_at=now() WHERE id=tenant
 RETURNING jsonb_build_object('schedule_enabled',schedule_enabled,'weekly_schedule',weekly_schedule) INTO saved;
 IF saved IS NULL THEN RAISE EXCEPTION 'Restaurant introuvable'; END IF;
 RETURN saved;
END $$;
REVOKE ALL ON FUNCTION private.update_opening_schedule(uuid,boolean,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.update_opening_schedule(uuid,boolean,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.update_opening_schedule(tenant uuid,enabled boolean,schedule jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.update_opening_schedule($1,$2,$3) $$;
REVOKE ALL ON FUNCTION public.update_opening_schedule(uuid,boolean,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_opening_schedule(uuid,boolean,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION private.enforce_order_opening() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.restaurants%ROWTYPE;
BEGIN
 SELECT * INTO r FROM public.restaurants WHERE id=NEW.restaurant_id FOR SHARE;
 IF NOT FOUND OR NOT r.is_active OR NOT r.is_open OR (r.schedule_enabled AND NOT private.weekly_schedule_open(r.weekly_schedule,now())) THEN RAISE EXCEPTION 'Restaurant fermé. Les commandes sont temporairement indisponibles.'; END IF;
 -- No promise of an unvalidated pickup appointment is accepted from the browser.
 IF NEW.mode='takeaway' THEN NEW.delivery_timeslot:='Au plus vite — délai à confirmer par le restaurant'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.enforce_order_opening() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS enforce_order_opening ON public.orders;
CREATE TRIGGER enforce_order_opening BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION private.enforce_order_opening();
COMMIT;
