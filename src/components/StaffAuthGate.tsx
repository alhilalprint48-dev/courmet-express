'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { resolveStaffAccess } from '@/lib/staff-access.mjs';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';

export type StaffRole = 'kds' | 'livreur' | 'admin' | 'superadmin';
interface Props { role: StaffRole; title: string; subtitle: string; children: React.ReactNode }

export function StaffAuthGate({ role, title, children }: Props) {
  const { restaurant, isLoadingProducts, restaurantError, reloadRestaurant } = useApp();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [verificationError,setVerificationError] = useState(false);
  const [revision,setRevision] = useState(0);

  useEffect(() => {
    if (!restaurant.id || isLoadingProducts || restaurantError) { setAllowed(false); setChecking(true); return; }
    let active = true;
    let generation = 0;
    const check = async () => {
      const attempt = ++generation;
      try {
        const access=await resolveStaffAccess(supabase,restaurant.id,role);
        if(!active||attempt!==generation)return;
        setAllowed(access);setVerificationError(false);
      } catch {
        if(!active||attempt!==generation)return;
        setAllowed(false);setVerificationError(true);
      } finally {if(active&&attempt===generation)setChecking(false);}

    };
    setChecking(true); setAllowed(false);
    void check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Invalidate requests from the previous identity before leaving the Auth lock.
      ++generation;setChecking(true);setAllowed(false);
      setTimeout(() => { if (active) void check(); }, 0);
    });
    const timer = setInterval(() => { void check(); }, 60000);
    return () => { active = false; subscription.unsubscribe(); clearInterval(timer); };
  }, [role, restaurant.id, isLoadingProducts, restaurantError, revision]);

  if (restaurantError) return <main className="p-6"><p role="alert">{restaurantError}</p><button onClick={reloadRestaurant}>Réessayer</button><Link href="/">Menu principal</Link></main>;
  if (checking || isLoadingProducts) return <div className="min-h-screen grid place-items-center">Vérification de la session…</div>;
  if(verificationError)return <main className="min-h-screen bg-slate-950 text-white grid place-items-center p-6"><div className="max-w-sm space-y-4"><h1 className="text-2xl font-bold">{title}</h1><p role="alert">La session ou les droits ne peuvent pas être vérifiés. Vérifiez votre connexion puis réessayez.</p><button onClick={()=>setRevision(value=>value+1)} className="bg-orange-600 rounded-xl p-3 font-bold">Réessayer la vérification</button><Link className="block underline" href={`/compte?r=${encodeURIComponent(restaurant.slug)}`}>Mon compte</Link></div></main>;
  if (allowed) return <>
    <div className="fixed top-2 right-2 z-50 print:hidden flex gap-2">
      <Link href={`/compte?r=${encodeURIComponent(restaurant.slug)}`} className="rounded-xl px-4 py-2 bg-white text-slate-900 border">Mon compte</Link>
      <button className="rounded-xl px-4 py-2 bg-slate-900 text-white" onClick={async () => {
        setAllowed(false);
        try {const {error}=await supabase.auth.signOut();if(error)setVerificationError(true);} catch {setVerificationError(true);}
      }}>Se déconnecter</button>
    </div>
    {children}
  </>;
  return <main className="min-h-screen bg-slate-950 text-white grid place-items-center p-6">
    <div className="w-full max-w-sm space-y-4">
      <Link href={`/?r=${encodeURIComponent(restaurant.slug)}`}>Retour au menu</Link>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p>Connectez-vous depuis Mon compte. Cet espace est réservé au personnel autorisé.</p>
      <Link href={`/compte?r=${encodeURIComponent(restaurant.slug)}`} className="block text-center w-full p-3 bg-orange-600 rounded-xl font-bold">Mon compte</Link>
    </div>
  </main>;
}
