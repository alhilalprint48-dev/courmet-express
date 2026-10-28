'use client';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {useApp} from '@/context/AppContext';
import {emptySchedule} from '@/lib/opening-hours.mjs';
type Period={start:string;end:string};
export function OpeningScheduleSettings(){
 const {restaurant,reloadRestaurant}=useApp();
 const scheduleKey=JSON.stringify(restaurant.weekly_schedule);
 const [enabled,setEnabled]=useState(restaurant.schedule_enabled);
 const [schedule,setSchedule]=useState<Period[][]>(restaurant.weekly_schedule || emptySchedule());
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setEnabled(restaurant.schedule_enabled);setSchedule(JSON.parse(scheduleKey) || emptySchedule());},[restaurant.id,restaurant.schedule_enabled,scheduleKey]);
 const update=(day:number,index:number,key:'start'|'end',value:string)=>setSchedule(prev=>prev.map((periods,d)=>d===day?periods.map((p,i)=>i===index?{...p,[key]:value}:p):periods));
 const save=async(event:React.FormEvent)=>{event.preventDefault();setBusy(true);setError('');try{
  const {error}=await supabase.rpc('update_opening_schedule',{tenant:restaurant.id,enabled,schedule});
  if(error)throw new Error(error.message);reloadRestaurant();
 }catch(failure){setError(failure instanceof Error?failure.message:'Enregistrement impossible.');}finally{setBusy(false);}};
 return <form onSubmit={save} className="bg-white p-6 rounded-2xl border space-y-4 max-w-3xl">
 <h3 className="font-bold">Horaires automatiques de prise de commande</h3>
 <p className="text-sm">Heure du Maroc. Une plage 19:00–02:00 se termine le lendemain. Sans plage, le jour est fermé. L’interrupteur manuel permet toujours une fermeture immédiate.</p>
 <label className="flex gap-2 font-bold"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>Appliquer automatiquement ces horaires</label>
 {[1,2,3,4,5,6,0].map(day=><div key={day} className="border-t pt-3 space-y-2"><p className="font-bold">{['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][day]}</p>
 {schedule[day].length===0&&<p className="text-xs">Fermé</p>}
 {schedule[day].map((period,index)=><div key={index} className="flex flex-wrap items-center gap-2"><input aria-label={`Ouverture ${day} plage ${index+1}`} required type="time" value={period.start} onChange={e=>update(day,index,'start',e.target.value)} className="border rounded p-2"/><span>à</span><input aria-label={`Fermeture ${day} plage ${index+1}`} required type="time" value={period.end} onChange={e=>update(day,index,'end',e.target.value)} className="border rounded p-2"/><button type="button" onClick={()=>setSchedule(prev=>prev.map((ps,d)=>d===day?ps.filter((_,i)=>i!==index):ps))} className="text-red-700 text-sm">Retirer la plage</button></div>)}
 {schedule[day].length<4&&<button type="button" onClick={()=>setSchedule(prev=>prev.map((ps,d)=>d===day?[...ps,{start:'11:30',end:'23:30'}]:ps))} className="text-orange-700 text-sm underline">Ajouter une plage</button>}</div>)}
 {error&&<p role="alert" className="text-red-700">{error}</p>}<button disabled={busy} className="bg-orange-600 text-white p-3 rounded-xl font-bold disabled:opacity-50">{busy?'Enregistrement…':'Enregistrer les horaires'}</button>
 </form>;
}
