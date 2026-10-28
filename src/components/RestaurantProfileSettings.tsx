'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { normalizePhone } from '@/lib/phone';

export function RestaurantProfileSettings() {
  const { restaurant, updateRestaurantProfile, updateRestaurantAvailability } = useApp();
  const [name, setName] = useState(restaurant.name);
  const [address, setAddress] = useState(restaurant.address);
  const [phone, setPhone] = useState(restaurant.phone);
  const [hours, setHours] = useState(restaurant.open_hours);
  const [closedMessage, setClosedMessage] = useState(restaurant.closed_message);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    setName(restaurant.name); setAddress(restaurant.address); setPhone(restaurant.phone);
    setHours(restaurant.open_hours); setClosedMessage(restaurant.closed_message);
  }, [restaurant.name, restaurant.address, restaurant.phone, restaurant.open_hours, restaurant.closed_message]);
  const toggle = async () => {
    setToggling(true); setFeedback(''); setError('');
    try {
      const accepting = !restaurant.is_open;
      await updateRestaurantAvailability(accepting);
      setFeedback(accepting ? 'Les nouvelles commandes sont ouvertes.' : 'Les nouvelles commandes sont fermées. Les commandes existantes restent à traiter.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Modification refusée.'); }
    finally { setToggling(false); }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setFeedback(''); setError('');
    try {
      await updateRestaurantProfile({ name: name.trim(), address: address.trim(), phone: normalizePhone(phone), open_hours: hours.trim(), closed_message: closedMessage.trim() });
      setFeedback('Informations du restaurant enregistrées.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Enregistrement refusé.'); }
    finally { setSaving(false); }
  };
  return <section className="bg-white p-6 rounded-2xl border max-w-xl space-y-5">
    <h3 className="font-extrabold text-base">Ouverture et informations du restaurant</h3>
    <div className={`rounded-xl p-4 space-y-3 ${restaurant.is_open ? 'bg-emerald-50' : 'bg-amber-50'}`}>
      <p className="font-bold" role="status">{restaurant.is_open ? 'Ouvert — commandes acceptées' : 'Fermé — nouvelles commandes bloquées'}</p>
      <button type="button" role="switch" aria-checked={restaurant.is_open} aria-label="Accepter les nouvelles commandes" disabled={toggling || !restaurant.is_active}
        onClick={toggle} className="bg-slate-900 text-white rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50">
        {toggling ? 'Mise à jour…' : restaurant.is_open ? 'Fermer les commandes maintenant' : 'Ouvrir les commandes maintenant'}
      </button>
      <p className="text-xs">Le menu reste visible pendant la fermeture. Le suivi des commandes existantes reste disponible.</p>
      {!restaurant.is_active && <p className="text-xs text-red-700">Restaurant suspendu : contactez le responsable de la plateforme.</p>}
    </div>
    <form onSubmit={save} className="space-y-4">
      <label className="block text-xs font-bold">Nom du restaurant<input required maxLength={255} value={name} onChange={event => setName(event.target.value)} className="block w-full mt-1 border rounded-xl p-2.5 text-sm" /></label>
      <label className="block text-xs font-bold">Adresse<textarea required maxLength={1000} value={address} onChange={event => setAddress(event.target.value)} className="block w-full mt-1 border rounded-xl p-2.5 text-sm" /></label>
      <label className="block text-xs font-bold">Téléphone<input required type="tel" maxLength={32} value={phone} onChange={event => setPhone(event.target.value)} className="block w-full mt-1 border rounded-xl p-2.5 text-sm" /></label>
      <label className="block text-xs font-bold">Horaires affichés aux clients<input required maxLength={128} value={hours} placeholder="Lun–sam : 11:30–23:30 ; dimanche fermé" onChange={event => setHours(event.target.value)} className="block w-full mt-1 border rounded-xl p-2.5 text-sm" /></label>
      <p className="text-xs text-slate-600">Les horaires sont informatifs. L’interrupteur ci-dessus pilote la prise de commandes ; aucune fermeture automatique n’est programmée.</p>
      <label className="block text-xs font-bold">Message de fermeture (facultatif)<textarea maxLength={300} value={closedMessage} placeholder="Ex. : Nous rouvrons à 18 h." onChange={event => setClosedMessage(event.target.value)} className="block w-full mt-1 border rounded-xl p-2.5 text-sm" /></label>
      <button type="submit" disabled={saving} className="bg-orange-600 text-white rounded-xl px-4 py-3 text-xs font-bold disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer les informations du restaurant'}</button>
    </form>
    {feedback && <p role="status" className="text-sm text-emerald-700">{feedback}</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
