'use client';

export function ServiceConnection({ loading, error, lastSuccess, refresh }: { loading: boolean; error: string; lastSuccess: string | null; refresh: () => void }) {
  return <div className={`print:hidden rounded-xl border p-3 my-3 text-xs flex flex-wrap gap-3 items-center justify-between ${error ? 'bg-red-950 text-red-200 border-red-700' : 'bg-slate-800 text-slate-200 border-slate-700'}`}>
    <p role={error ? 'alert' : 'status'}>{error || (loading ? 'Chargement des commandes…' : 'Connexion active')}{lastSuccess && <> · Dernière lecture réussie : {new Date(lastSuccess).toLocaleTimeString('fr-MA', { timeZone: 'Africa/Casablanca' })}</>}</p>
    <button type="button" onClick={refresh} className="underline font-bold">Actualiser</button>
  </div>;
}
