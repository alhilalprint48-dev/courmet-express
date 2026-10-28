import assert from 'node:assert/strict';
import {resolveStaffAccess} from '../src/lib/staff-access.mjs';
let checks=0;
const fake=({role=null,user=true,identityError=null,claimError=null,roleError=null}={})=>({auth:{getUser:async()=>({data:{user:user?{id:'fixture'}:null},error:identityError})},rpc:async(name,args)=>{if(name==='claim_platform_access')return {error:claimError};assert.equal(args.tenant,'restaurant-a');return {data:role,error:roleError};}});
for(const [name,options,wanted,expected] of [
 ['missing session requests login',{user:false},'kds',false],
 ['missing-session error requests login',{user:false,identityError:{name:'AuthSessionMissingError'}},'kds',false],
 ['kitchen role allowed',{role:'kds'},'kds',true],
 ['driver cannot open kitchen',{role:'livreur'},'kds',false],
 ['manager can open courier screen',{role:'admin'},'livreur',true],
 ['manager cannot open platform admin',{role:'admin'},'superadmin',false],
 ['platform admin can open kitchen',{role:'superadmin'},'kds',true],
 ['customer has no staff access',{role:null},'admin',false],
 ]){assert.equal(await resolveStaffAccess(fake(options),'restaurant-a',wanted),expected,name);checks++;console.log('PASS',name);}
for(const [name,options] of [['identity outage',{user:false,identityError:{name:'AuthRetryableFetchError'}}],['claim outage',{claimError:{message:'network'}}],['role outage',{roleError:{message:'network'}}]]){await assert.rejects(()=>resolveStaffAccess(fake(options),'restaurant-a','kds'),/unavailable/);checks++;console.log('PASS',name+' is an explicit failure, not a role denial');}
await assert.rejects(()=>resolveStaffAccess(fake(),'', 'kds'),/unavailable/);checks++;
const thrown={auth:{getUser:async()=>{throw new Error('network');}}};
await assert.rejects(()=>resolveStaffAccess(thrown,'restaurant-a','kds'),/network/);checks++;
console.log(`${checks} staff access checks passed; provider mocked, no permissions changed.`);
