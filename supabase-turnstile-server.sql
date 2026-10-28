-- Install before the Edge Function. Enforce only after the new frontend is live.
BEGIN;
GRANT USAGE ON SCHEMA private TO service_role;
CREATE OR REPLACE FUNCTION private.checkout_turnstile_secret() RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 RETURN (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='courmet_turnstile_checkout');
END $$;
REVOKE ALL ON FUNCTION private.checkout_turnstile_secret() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.checkout_turnstile_secret() TO service_role;
CREATE OR REPLACE FUNCTION public.checkout_turnstile_secret() RETURNS text
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.checkout_turnstile_secret() $$;
REVOKE ALL ON FUNCTION public.checkout_turnstile_secret() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_turnstile_secret() TO service_role;
CREATE OR REPLACE FUNCTION private.server_create_order(payload jsonb, verified_customer uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF verified_customer IS NOT NULL AND NOT EXISTS(SELECT 1 FROM auth.users WHERE id=verified_customer) THEN
  RAISE EXCEPTION 'Session invalide' USING ERRCODE='42501';
 END IF;
 PERFORM set_config('request.jwt.claim.sub',coalesce(verified_customer::text,''),true);
 RETURN private.create_order(payload);
END $$;
REVOKE ALL ON FUNCTION private.server_create_order(jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.server_create_order(jsonb,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.server_create_order(payload jsonb, verified_customer uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.server_create_order(payload,verified_customer) $$;
REVOKE ALL ON FUNCTION public.server_create_order(jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_create_order(jsonb,uuid) TO service_role;
COMMIT;
