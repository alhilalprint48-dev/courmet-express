// The backend still enforces authorization independently through RLS and RPCs.
export async function resolveStaffAccess(client, tenant, requiredRole) {
  if (!tenant) throw new Error('Restaurant unavailable');
  const {data:{user},error:identityError}=await client.auth.getUser();
  if(identityError?.name==='AuthSessionMissingError') return false;
  if(identityError) throw new Error('Session verification unavailable');
  if(!user) return false;
  const claim=await client.rpc('claim_platform_access');
  if(claim.error) throw new Error('Role initialization unavailable');
  const access=await client.rpc('current_staff_role',{tenant});
  if(access.error) throw new Error('Role verification unavailable');
  return access.data==='superadmin'||access.data===requiredRole||(access.data==='admin'&&requiredRole!=='superadmin');
}
