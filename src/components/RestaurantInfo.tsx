'use client';

import { useApp } from '@/context/AppContext';

export function RestaurantInfo() {
  const { restaurant, language } = useApp();
  const ar = language === 'ar';
  return <section aria-label={ar ? 'معلومات المطعم' : 'Informations du restaurant'} className="max-w-5xl mx-auto w-full px-4 py-4 space-y-2">
    <div role="status" aria-live="polite" className={`rounded-xl p-3 text-sm ${restaurant.is_open ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-100 text-amber-950'}`}>
      <p className="font-bold">{restaurant.is_open ? (ar ? 'المطعم محلول — كنقبلو الطلبات' : 'Ouvert — commandes acceptées') : (ar ? 'المطعم مسدود — الطلبات موقفين مؤقتاً' : 'Restaurant fermé — commandes temporairement indisponibles')}</p>
      {!restaurant.is_open && <>
        <p className="text-xs mt-1">{ar ? 'تقدر تشوف المينيو وتتبع الطلبات اللي دازت.' : 'Vous pouvez consulter le menu et suivre vos commandes déjà enregistrées.'}</p>
        {restaurant.closed_message && <p className="text-sm mt-1 whitespace-pre-line">{restaurant.closed_message}</p>}
      </>}
    </div>
    <div className="text-xs text-slate-700 space-y-1">
      {restaurant.open_hours && <p><strong>{ar ? 'التوقيت : ' : 'Horaires : '}</strong>{restaurant.open_hours}</p>}
      {restaurant.address && <p>{restaurant.address}</p>}
      {restaurant.phone && <a className="inline-block underline font-semibold" href={`tel:${restaurant.phone}`}>{ar ? 'اتصل : ' : 'Téléphone : '}{restaurant.phone}</a>}
    </div>
  </section>;
}
