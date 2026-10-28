'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';

export type StaffRole = 'kds' | 'livreur' | 'admin' | 'superadmin';
interface Props { role: StaffRole; title: string; subtitle: string; children: React.ReactNode }

export function StaffAuthGate({ role, title, children }: Props) {
  const { restaurant, isLoadingProducts, restaurantError, reloadRestaurant } = useApp();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!restaurant.id || isLoadingProducts || restaurantError) { setAllowed(false); setChecking(true); return; }
    let active = true;
    let generation = 0;
    const check = async () => {
      const attempt = ++generation;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.rpc('claim_platform_access');
      const { data, error: denied } = user
        ? await supabase.rpc('current_staff_role', { tenant: restaurant.id })
        : { data: null, error: null };
      if (!active || attempt !== generation) return;
      setAllowed(!denied && (data === 'superadmin' || data === role || (data === 'admin' && role !== 'superadmin')));
      setChecking(false);
    };
    void check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Run outside the Auth callback's lock.
      setAllowed(false);
      setTimeout(() => { if (active) void check(); }, 0);
    });
    const timer = setInterval(() => { void check(); }, 60000);
    return () => { active = false; subscription.unsubscribe(); clearInterval(timer); };
  }, [role, restaurant.id, isLoadingProducts, restaurantError]);

  if (restaurantError) return <main className="p-6"><p role="alert">{restaurantError}</p><button onClick={reloadRestaurant}>Réessayer</button><Link href="/">Menu principal</Link></main>;
  if (checking || isLoadingProducts) return <div className="min-h-screen grid place-items-center">Vérification de la session…</div>;
  if (allowed) return <>
    <div className="fixed top-2 right-2 z-50 print:hidden flex gap-2">
      <Link href={`/compte?r=${encodeURIComponent(restaurant.slug)}`} className="rounded-xl px-4 py-2 bg-white text-slate-900 border">Mon compte</Link>
      <button className="rounded-xl px-4 py-2 bg-slate-900 text-white" onClick={async () => {
        setAllowed(false); await supabase.auth.signOut();
      }}>Se déconnecter</button>
    </div>
    {children}
  </>;
  return <main className="min-h-screen bg-slate-950 text-white grid place-items-center p-6">
    <div className="w-full max-w-sm space-y-4">
      <Link href="/">Retour au menu</Link>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p>Connectez-vous depuis Mon compte. Cet espace est réservé au personnel autorisé.</p>
      <Link href={`/compte?r=${encodeURIComponent(restaurant.slug)}`} className="block text-center w-full p-3 bg-orange-600 rounded-xl font-bold">Mon compte</Link>
    </div>
  </main>;
}
