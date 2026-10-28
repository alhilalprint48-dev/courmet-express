import assert from 'node:assert/strict';
import { buildMenuUrl, unseenOrderIds, navigationUrl, mapOrder } from '../src/lib/order-utils.mjs';
import { fetchRestaurantData } from '../src/lib/restaurant-data.mjs';
let checks=0;
const eq=(name,actual,expected)=>{assert.deepEqual(actual,expected,name);checks++;console.log('PASS',name);};
const qr=new URL(buildMenuUrl('https://example.com/?old=1&table=old','restaurant-b','5 & VIP'));
eq('QR preserves selected restaurant',qr.searchParams.get('r'),'restaurant-b');
eq('QR encodes table separately',qr.searchParams.get('table'),'5 & VIP');
eq('general QR removes previous table',new URL(buildMenuUrl(qr.toString(),'restaurant-c')).searchParams.has('table'),false);
assert.throws(()=>buildMenuUrl('javascript:alert(1)','b','5'));checks++;
const old=Array.from({length:40},(_,i)=>({id:'old-'+i,status:'new'}));
eq('first incoming order alerts from empty queue',unseenOrderIds(new Set(),[old[0]]),['old-0']);
eq('new order alerts even when total count stays constant',unseenOrderIds(new Set(old.map(o=>o.id)),[...old.slice(1),{id:'fresh',status:'new'}]),['fresh']);
eq('repeated snapshot does not alert twice',unseenOrderIds(new Set(old.map(o=>o.id)),old),[]);
eq('GPS at equator/Greenwich is retained',new URL(navigationUrl({gpsCoords:{lat:0,lng:0},address:'Oujda'})).searchParams.get('destination'),'0,0');
eq('address navigation does not force Casablanca',new URL(navigationUrl({address:'Rue Test, Oujda'})).searchParams.get('query'),'Rue Test, Oujda');
const mapped=mapOrder({id:'1',order_number:'T',created_at:'2026-10-28T12:00:00Z',status:'delivered',mode:'delivery',subtotal:10,total:0,delivery_fee:0,discount_amount:10,points_redeemed:100,gps_lat:0,gps_lng:0,assigned_driver_id:'driver',paid_at:'2026-10-28T12:00:00Z',payment_received:0,order_items:[]});
eq('mapper retains free order and zero paid amount',[mapped.total,mapped.paymentReceived,mapped.deliveryFee],[0,0,0]);
eq('mapper retains driver and zero coordinates',[mapped.assignedDriverId,mapped.customer.gpsCoords],['driver',{lat:0,lng:0}]);
const fake=(responses)=>({from(table){const value=responses[table];const result=Array.isArray(value)?value.shift():value;const chain={select(){return chain;},eq(){return chain;},order(){return Promise.resolve(result);},single(){return Promise.resolve(result);},then(resolve,reject){return Promise.resolve(result).then(resolve,reject);}};return chain;}});
const restaurant={id:'b',slug:'b',name:'B'};
const empty=await fetchRestaurantData(fake({restaurants:[{data:restaurant},{data:[restaurant]}],products:{data:[],error:null},categories:{data:[],error:null}}),'b');
eq('empty real menu remains empty without demo products',[empty.products,empty.categories],[[],[]]);
await assert.rejects(()=>fetchRestaurantData(fake({restaurants:[{data:null,error:{message:'not found'}},{data:[]}]}),'unknown'),/introuvable/);checks++;
await assert.rejects(()=>fetchRestaurantData(fake({restaurants:[{data:restaurant},{data:[restaurant]}],products:{data:null,error:{message:'network'}},categories:{data:[]}}),'b'),/chargée/);checks++;


const {scheduleOpen,acceptingOrders,emptySchedule}=await import('../src/lib/opening-hours.mjs');
const weekly=emptySchedule();weekly[1]=[{start:'11:30',end:'14:00'},{start:'19:00',end:'02:00'}];
for(const [label,moment,expected] of [
 ['opens at exact start','2026-10-26T11:30:00Z',true],
 ['closed at lunch end','2026-10-26T14:00:00Z',false],
 ['closed between services','2026-10-26T16:00:00Z',false],
 ['overnight carries into Tuesday','2026-10-27T01:30:00Z',true],
 ['overnight closes at exact end','2026-10-27T02:00:00Z',false],
 ['closed Sunday','2026-10-25T12:00:00Z',false],
 ['summer follows Casablanca time zone','2026-07-06T10:30:00Z',true],
 ['Ramadan follows Casablanca time zone','2026-02-23T11:00:00Z',false],
 ]){assert.equal(scheduleOpen(weekly,new Date(moment)),expected,label);checks++;console.log('PASS',label);}
assert.equal(acceptingOrders({is_active:true,is_open:false,schedule_enabled:true,weekly_schedule:weekly},new Date('2026-10-26T11:00:00Z')),false);checks++;
assert.equal(acceptingOrders({is_active:false,is_open:true,schedule_enabled:false}),false);checks++;
assert.equal(acceptingOrders({is_active:true,is_open:true,schedule_enabled:false}),true);checks++;
assert.equal(scheduleOpen(null),false);checks++;
console.log(`${checks} client regression checks passed.`);
