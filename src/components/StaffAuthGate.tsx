'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';

export type StaffRole = 'kds' | 'livreur' | 'admin' | 'superadmin';
interface Props { role: StaffRole; title: string; subtitle: string; children: React.ReactNode }

export function StaffAuthGate({ role, title, children }: Props) {
  const { restaurant } = useApp();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
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
  }, [role, restaurant.id]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setPassword('');
      if (error) setError('Connexion refusée. Vérifiez vos identifiants.');
      else setError('Les droits de votre compte sont vérifiés. Si cet écran reste affiché, contactez le responsable.');
    } catch { setError('Connexion indisponible. Réessayez.'); }
    finally { setBusy(false); }
  };

  const signup = async () => {
    setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      setPassword('');
      setError(error ? 'Création indisponible. Vérifiez votre adresse et utilisez un mot de passe fort.' :
        'Vérifiez votre messagerie et confirmez votre adresse avant de vous connecter. Les droits sont réservés aux comptes autorisés.');
    } catch { setError('Création indisponible. Réessayez.'); }
    finally { setBusy(false); }
  };

  if (checking) return <div className="min-h-screen grid place-items-center">Vérification de la session…</div>;
  if (allowed) return <>
    <div className="fixed top-2 right-2 z-50 print:hidden">
      <button className="rounded-xl px-4 py-2 bg-slate-900 text-white" onClick={async () => {
        setAllowed(false); await supabase.auth.signOut();
      }}>Se déconnecter</button>
    </div>
    {children}
  </>;
  return <main className="min-h-screen bg-slate-950 text-white grid place-items-center p-6">
    <form onSubmit={login} className="w-full max-w-sm space-y-4">
      <Link href="/">Retour au menu</Link>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p>Connectez-vous avec votre compte personnel.</p>
      <label className="block">Adresse e-mail<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 rounded-xl text-slate-900" /></label>
      <label className="block">Mot de passe<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 rounded-xl text-slate-900" /></label>
      <button disabled={busy} className="w-full p-3 bg-orange-600 rounded-xl">{busy ? 'Connexion…' : 'Se connecter'}</button>
      <button disabled={busy || !email || password.length < 12} type="button" onClick={signup}>Créer mon accès personnel (mot de passe de 12 caractères minimum)</button>
      <button type="button" onClick={async () => { await supabase.auth.signOut(); setError('Session fermée.'); }}>Fermer la session actuelle</button>
      {error && <p role="alert">{error}</p>}
    </form>
  </main>;
}
