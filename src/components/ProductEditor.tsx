'use client';
import {useState} from 'react';
import type {Product} from '@/types';
import {useApp} from '@/context/AppContext';
import {supabase} from '@/lib/supabase';
export function ProductEditor({product,close}:{product:Product;close:()=>void}){
 const {restaurant,categories,reloadRestaurant}=useApp();
 const [nameFr,setNameFr]=useState(product.name.fr),[nameAr,setNameAr]=useState(product.name.ar);
 const [descriptionFr,setDescriptionFr]=useState(product.description.fr),[descriptionAr,setDescriptionAr]=useState(product.description.ar);
 const [price,setPrice]=useState(String(product.price)),[category,setCategory]=useState(product.categoryId),[image,setImage]=useState(product.image);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const save=async(event:React.FormEvent)=>{event.preventDefault();setBusy(true);setError('');try{
  const value=Number(price);
  if(!nameFr.trim()||!price.trim()||!Number.isFinite(value)||value<0||value>100000||Math.abs(value*100-Math.round(value*100))>0.000001)throw new Error('Nom requis et prix entre 0 et 100 000 DH, avec deux décimales maximum.');
  if(image!==product.image&&image.trim()&&!/^https?:\/\//i.test(image.trim()))throw new Error('Utilisez une adresse d’image https:// ou http://.');
  const {data,error}=await supabase.from('products').update({name_fr:nameFr.trim(),name_ar:nameAr.trim()||nameFr.trim(),description_fr:descriptionFr.trim(),description_ar:descriptionAr.trim(),price:value,category_id:category||null,image:image.trim()||null,updated_at:new Date().toISOString()}).eq('id',product.id).eq('restaurant_id',restaurant.id).select('id').single();
  if(error||!data)throw new Error('Modification refusée ou connexion interrompue. Réessayez.');
  close();reloadRestaurant();
 }catch(failure){setError(failure instanceof Error?failure.message:'Enregistrement impossible.');}finally{setBusy(false);}};
 return <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><section role="dialog" aria-modal="true" aria-labelledby="edit-product-title" className="bg-white rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-4">
 <h2 id="edit-product-title" className="text-xl font-bold">Modifier le plat</h2><p className="text-xs">Les commandes déjà enregistrées conservent leurs prix et libellés. Les nouveaux prix sont contrôlés par le serveur lors de la commande.</p>
 <form onSubmit={save} className="space-y-3">
 <label className="block text-sm">Nom français<input required maxLength={255} value={nameFr} onChange={e=>setNameFr(e.target.value)} className="block border rounded p-2 w-full"/></label>
 <label className="block text-sm">Nom arabe<input maxLength={255} dir="auto" value={nameAr} onChange={e=>setNameAr(e.target.value)} className="block border rounded p-2 w-full"/></label>
 <label className="block text-sm">Description française<textarea maxLength={4000} value={descriptionFr} onChange={e=>setDescriptionFr(e.target.value)} className="block border rounded p-2 w-full"/></label>
 <label className="block text-sm">Description arabe<textarea maxLength={4000} dir="auto" value={descriptionAr} onChange={e=>setDescriptionAr(e.target.value)} className="block border rounded p-2 w-full"/></label>
 <label className="block text-sm">Prix ({restaurant.currency})<input required type="number" min="0" max="100000" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} className="block border rounded p-2 w-full"/></label>
 <label className="block text-sm">Catégorie<select value={category} onChange={e=>setCategory(e.target.value)} className="block border rounded p-2 w-full"><option value="">Sans catégorie</option>{categories.map(c=><option value={c.id} key={c.id}>{c.name.fr}</option>)}</select></label>
 <label className="block text-sm">Adresse de la photo<input value={image} onChange={e=>setImage(e.target.value)} className="block border rounded p-2 w-full"/></label>
 {error&&<p role="alert" className="text-red-700">{error}</p>}
 <div className="flex gap-3"><button disabled={busy} className="bg-orange-600 text-white rounded p-3 font-bold disabled:opacity-50">{busy?'Enregistrement…':'Enregistrer le plat'}</button><button type="button" disabled={busy} onClick={close} className="border rounded p-3">Annuler</button></div>
 </form></section></div>;
}
