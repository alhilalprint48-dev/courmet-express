'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Event = { id: number; order_number: string; actor_id: string | null; event: string; details: { reason?: string; payment_received?: number; payment_to_reconcile?: boolean; archived?: boolean }; created_at: string };
export function OrderJournal({ tenant }: { tenant: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setEvents([]); setError('');
    Promise.resolve(supabase.rpc('order_event_log', { tenant })).then(({ data, error: failure }) => {
      if (!active) return;
      if (failure || !Array.isArray(data)) setError('Journal indisponible. Réessayez.');
      else setEvents(data);
      setLoading(false);
    }).catch(() => { if (active) { setError('Journal indisponible. Réessayez.'); setLoading(false); } });
    return () => { active = false; };
  }, [tenant, revision]);
  return <section className="bg-white border rounded-2xl p-5 space-y-3">
    <div className="flex justify-between gap-3"><h3 className="font-bold">Journal des commandes</h3><button onClick={() => setRevision(value => value + 1)} className="underline text-sm">Actualiser</button></div>
    <p className="text-xs text-slate-500">Les 100 derniers événements de cet établissement. Les encaissements sont déclarés par le personnel ; les remboursements bancaires ou espèces restent à rapprocher.</p>
    {loading && <p role="status">Chargement…</p>}{error && <p role="alert">{error}</p>}
    {!loading && !error && events.length === 0 && <p>Aucun événement enregistré depuis l’activation du journal.</p>}
    <ul className="space-y-2">{events.map(event => <li key={event.id} className="border-t pt-2 text-xs space-y-1">
      <p className="font-bold">{event.order_number} · {event.event}</p>
      <p>{new Date(event.created_at).toLocaleString('fr-MA', { timeZone: 'Africa/Casablanca' })} · {event.actor_id ? `Compte ${event.actor_id.slice(0,8)}` : 'Invité / système'}</p>
      {event.details.reason && <p>Motif : {event.details.reason}</p>}
      {event.details.payment_received != null && <p>Paiement déclaré : {event.details.payment_received} DH</p>}
      {event.details.payment_to_reconcile && <p className="text-amber-800 font-bold">Annulation après encaissement : remboursement à rapprocher.</p>}
    </li>)}</ul>
  </section>;
}
