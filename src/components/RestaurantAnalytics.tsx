'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Period = { revenue: number; order_count: number; cancelled_count: number; pending_count: number };
type Analytics = {
  generated_at: string;
  periods: Record<'day' | 'week' | 'month', Period>;
  top_products: { product_id: string | null; name: string; quantity: number; revenue: number }[];
};

export function RestaurantAnalytics({ restaurantId, currency }: { restaurantId: string; currency: string }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setData(null);
    setError('');
    Promise.resolve(supabase.rpc('restaurant_analytics', { tenant: restaurantId })).then(({ data: result, error: failure }) => {
      if (!active) return;
      if (failure || !result) setError('Impossible de charger les statistiques. Réessayez.');
      else setData(result as Analytics);
      setLoading(false);
    }).catch(() => {
      if (active) { setError('Impossible de charger les statistiques. Réessayez.'); setLoading(false); }
    });
    return () => { active = false; };
  }, [restaurantId, revision]);
  const money = (amount: number) => `${Number(amount).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  return <section className="space-y-5 max-w-5xl" aria-label="Chiffre d’affaires du restaurant">
    <div className="flex items-center justify-between gap-4">
      <h3 className="font-extrabold text-base">Chiffre d’affaires des commandes clôturées</h3>
      <button type="button" disabled={loading} onClick={() => setRevision(value => value + 1)} className="border rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50">Actualiser</button>
    </div>
    <p className="text-xs text-slate-600">Commandes au statut « livré / terminé » uniquement, classées par date de création. Frais de livraison inclus. Jour, semaine depuis lundi et mois en cours selon l’heure du Maroc. Les commandes annulées ou en attente sont exclues du chiffre d’affaires. Ces montants ne constituent pas un rapprochement bancaire.</p>
    {loading && <p role="status">Chargement des commandes…</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {data && <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {([['day', 'Aujourd’hui'], ['week', 'Cette semaine'], ['month', 'Ce mois']] as const).map(([key, label]) => <div key={key} className="bg-white p-5 rounded-2xl border space-y-2">
          <h4 className="text-sm font-bold">{label}</h4>
          <p className="text-2xl font-black">{money(data.periods[key].revenue)}</p>
          <p className="text-xs">{data.periods[key].order_count} commande(s) clôturée(s)</p>
          <p className="text-xs text-slate-500">{data.periods[key].pending_count} en attente / en cours · {data.periods[key].cancelled_count} annulée(s)</p>
        </div>)}
      </div>
      <p className="text-sm">Ticket moyen ce mois : <strong>{data.periods.month.order_count ? money(data.periods.month.revenue / data.periods.month.order_count) : 'Aucune commande clôturée'}</strong></p>
      <div className="bg-white p-5 rounded-2xl border overflow-x-auto">
        <h4 className="font-bold mb-3">Produits les plus vendus ce mois</h4>
        {data.top_products.length === 0 ? <p className="text-sm text-slate-500">Aucun produit vendu dans les commandes clôturées ce mois.</p> : <table className="w-full text-sm text-left">
          <thead><tr><th scope="col" className="py-2">Produit</th><th scope="col">Quantité</th><th scope="col">Montant produits</th></tr></thead>
          <tbody>{data.top_products.map(product => <tr key={`${product.product_id}:${product.name}`} className="border-t"><td className="py-2">{product.name}</td><td>{product.quantity}</td><td>{money(product.revenue)}</td></tr>)}</tbody>
        </table>}
      </div>
      <p className="text-xs text-slate-500">Mis à jour le {new Date(data.generated_at).toLocaleString('fr-MA', { timeZone: 'Africa/Casablanca' })}. Les commandes supprimées ne figurent plus dans ces statistiques.</p>
    </>}
  </section>;
}
