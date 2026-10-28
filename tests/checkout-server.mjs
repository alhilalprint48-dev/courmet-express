import assert from 'node:assert/strict';
import { createHandler } from '../supabase/functions/create-order/handler.mjs';
const host='courmet-express.pages.dev', origin='https://'+host;
const uid='10000000-0000-0000-0000-000000000001';
const env=name=>({SUPABASE_URL:'https://test.supabase.co',SUPABASE_SECRET_KEYS:'{"default":"sb_secret_test"}',SUPABASE_PUBLISHABLE_KEYS:'{"default":"sb_publishable_test"}'}[name]);
let checks=0;
const response=(body,status=200)=>new Response(JSON.stringify(body),{status});
function fixture({verdict={success:true,action:'checkout',hostname:host},identityStatus=200,network=false}={}) {
 const calls=[]; const used=new Set();
 const request=async(url,options)=>{
  calls.push({url,options});
  if(network) throw new Error('network');
  if(url.endsWith('/checkout_turnstile_secret'))return response('unit-test-secret');
  if(url.includes('siteverify')){
   assert.equal(options.body.get('secret'),'unit-test-secret');
   const token=options.body.get('response');
   if(used.has(token))return response({success:false,'error-codes':['timeout-or-duplicate']});
   used.add(token);return response(verdict);
  }
  if(url.endsWith('/auth/v1/user'))return response({id:uid},identityStatus);
  if(url.endsWith('/server_create_order'))return response({id:'order',total:84,status:'new'});
  throw new Error('Unexpected endpoint');
 };
 return {handler:createHandler({env,request}),calls};
}
const req=(data={},headers={},method='POST')=>new Request(origin+'/functions/v1/create-order',{method,headers:{origin,...headers},...(method==='POST'?{body:JSON.stringify({captchaToken:'fresh',payload:{items:[]},...data})}:{})});
for(const [name,verdict] of [['failed',{success:false}],['wrong action',{success:true,action:'signup',hostname:host}],['wrong hostname',{success:true,action:'checkout',hostname:'evil.test'}]]) {
 const {handler,calls}=fixture({verdict}); assert.equal((await handler(req())).status,403);assert.equal(calls.some(x=>x.url.endsWith('server_create_order')),false);checks++;console.log('PASS',name);
}
{
 const {handler,calls}=fixture();
 assert.equal((await handler(req({captchaToken:''}))).status,403);assert.equal(calls.length,0);checks++;
 assert.equal((await handler(req({}, {origin:'https://evil.test'}))).status,403);assert.equal(calls.length,0);checks++;
 assert.equal((await handler(req({}, {},'GET'))).status,405);checks++;
 assert.equal((await handler(req({}, {},'OPTIONS'))).status,200);checks++;
 assert.equal((await handler(req({captchaToken:'x'.repeat(2049)}))).status,403);checks++;
 assert.equal((await handler(req({payload:{long:'x'.repeat(131073)}}))).status,413);checks++;
}
{
 const {handler,calls}=fixture();
 assert.equal((await handler(req({payload:{verified_customer:uid,customer_user_id:uid}}))).status,200);
 const rpc=calls.find(x=>x.url.endsWith('server_create_order'));
 assert.equal(JSON.parse(rpc.options.body).verified_customer,null);
 assert.equal(rpc.options.headers.apikey,'sb_secret_test');
 assert.equal(rpc.options.headers.Authorization,undefined);checks++;console.log('PASS guest cannot choose ownership');
 assert.equal((await handler(req())).status,403);checks++;console.log('PASS replay is rejected');
}
{
 const {handler,calls}=fixture();
 assert.equal((await handler(req({}, {authorization:'Bearer signed-user-token'}))).status,200);
 assert.equal(JSON.parse(calls.find(x=>x.url.endsWith('server_create_order')).options.body).verified_customer,uid);checks++;console.log('PASS verified Auth identity attached');
}
{
 const {handler,calls}=fixture({identityStatus:401});
 assert.equal((await handler(req({}, {authorization:'Bearer forged'}))).status,401);
 assert.equal(calls.some(x=>x.url.endsWith('server_create_order')),false);checks++;
}
{
 const {handler}=fixture({network:true});assert.equal((await handler(req())).status,503);checks++;
}
console.log(`${checks} server checks passed; providers mocked, no real messages or orders.`);
