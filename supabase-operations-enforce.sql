-- Run only after the new staff UI is live. Prevent destructive cleanup and untracked status/payment changes.
BEGIN;
REVOKE DELETE ON public.orders,public.order_items,public.restaurants FROM authenticated;
REVOKE UPDATE ON public.orders FROM authenticated;
REVOKE UPDATE(status) ON public.orders FROM authenticated;
DROP POLICY IF EXISTS staff_orders ON public.orders;
CREATE POLICY staff_orders ON public.orders FOR SELECT TO authenticated USING(
 private.staff_role(restaurant_id) IN ('admin','kds','superadmin') OR
 (private.staff_role(restaurant_id)='livreur' AND mode='delivery' AND
  ((assigned_driver_id=auth.uid() AND status IN ('delivering','delivered','cancelled')) OR (assigned_driver_id IS NULL AND status IN ('ready','delivering')))));
COMMIT;
