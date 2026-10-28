-- Run only after server configuration, deployment and frontend checks.
-- These revocations close the direct RPC bypass; RLS/table grants stay unchanged.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.create_order(jsonb) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION private.create_order(jsonb) FROM PUBLIC,anon,authenticated;
COMMIT;
