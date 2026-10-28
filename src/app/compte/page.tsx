'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { UserRound, Gift, ChefHat, Bike, Settings, ArrowLeft, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import type { StaffRole } from '@/components/StaffAuthGate';

type History = { id: string; order_number: string; status: string; total: number; discount_amount: number; points_redeemed: number; created_at: string };
export default function AccountPage() {
  const { language, setLanguage, restaurant } = useApp();
  const ar = language === 'ar';
  const text = (fr: string, darija: string) => ar ? darija : fr;
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<StaffRole | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [signup, setSignup] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [points, setPoints] = useState<number | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [accountError,setAccountError] = useState(false);
  const [historyError,setHistoryError] = useState(false);
  const [staffError,setStaffError] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true, generation = 0;
    const load = async () => {
      const current = ++generation;
      setChecking(true); setAccountError(false); setHistoryError(false); setStaffError(false);
      try {
      const { data: { user: signedIn }, error: identityError } = await supabase.auth.getUser();
      if (identityError && identityError.name !== "AuthSessionMissingError") throw identityError;
      if (!active || current !== generation) return;
      setUser(signedIn); setRole(null); setPoints(null); setHistory([]);
      if (signedIn && restaurant.id) {
        await supabase.rpc('claim_platform_access');
        const [access, loyalty, orders] = await Promise.all([
          supabase.rpc('current_staff_role', { tenant: restaurant.id }),
          supabase.rpc('customer_loyalty', { tenant: restaurant.id }),
          supabase.from('orders').select('id,order_number,status,total,discount_amount,points_redeemed,created_at')
            .eq('customer_user_id', signedIn.id).eq('restaurant_id', restaurant.id)
            .order('created_at', { ascending: false }).limit(20),
        ]);
        if (!active || current !== generation) return;
        setStaffError(Boolean(access.error));
        setHistoryError(Boolean(orders.error));
        if (!access.error && ['admin','superadmin','kds','livreur'].includes(access.data)) setRole(access.data);
        if (!loyalty.error) setPoints(Number(loyalty.data?.points || 0));
        if (!orders.error) setHistory(orders.data || []);
      }
      } catch { if (active && current === generation) {setAccountError(true);setRole(null);setPoints(null);setHistory([]);} }
      finally {if (active && current === generation) setChecking(false);}
    };
    void load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') setRecovery(false);
      ++generation; setUser(null); setRole(null); setPoints(null); setHistory([]); setChecking(true);
      setTimeout(() => { if (active) void load(); }, 0);
    });
    const focus = () => { void load(); };
    window.addEventListener('focus', focus);
    return () => { active = false; ++generation; subscription.unsubscribe(); window.removeEventListener('focus', focus); };
  }, [restaurant.id, refresh]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (params.get('type') === 'recovery') setRecovery(true);
    if (params.has('error')) {
      setMessage(ar ? 'رابط التأكيد سالات الصلاحية ديالو. طلب رابط جديد من هنا.' : 'Le lien de confirmation est invalide ou expiré. Demandez un nouveau lien ici.');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [ar]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      const { error } = signup
        ? await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/compte` } })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setPassword('');
      if (error) setMessage(text('Connexion ou inscription impossible. Vérifiez vos identifiants et la confirmation de votre e-mail.', 'ما قدرناش ندخلوك ولا نكملو التسجيل. تأكد من المعلومات ومن تأكيد البريد ديالك.'));
      else if (signup) setMessage(text('Vérifiez votre messagerie et confirmez votre adresse avant de vous connecter.', 'شوف البريد ديالك وأكد العنوان قبل ما تدخل للحساب.'));
    } catch { setMessage(text('Service indisponible. Réessayez.', 'الخدمة ما خداماش دابا. عاود المحاولة.')); }
    finally { setBusy(false); }
  };
  const resend = async () => {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/compte` } });
      setMessage(error ? text('Envoi indisponible. Réessayez plus tard.', 'ما تصيفطش الرابط. عاود من بعد.') : text('Si un compte attend confirmation, un lien vous sera envoyé.', 'إلا كان الحساب باقي ما تأكدش، غادي يوصلك الرابط.'));
    } catch { setMessage(text('Envoi indisponible.', 'الإرسال ما خدامش دابا.')); }
    finally { setBusy(false); }
  };
  const forgotPassword = async () => {
    if (!email.trim()) { setMessage(text('Saisissez votre adresse e-mail.', 'دخل البريد الإلكتروني ديالك.')); return; }
    setBusy(true); setMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/compte` });
      setMessage(error ? text('Envoi indisponible. Réessayez plus tard.', 'الإرسال ما خدامش دابا. عاود من بعد.') : text('Si un compte correspond à cette adresse, vous recevrez un lien de réinitialisation.', 'إلا كان الحساب بهاد البريد، غادي يوصلك رابط تبديل كلمة السر.'));
    } catch { setMessage(text('Envoi indisponible.', 'الإرسال ما خدامش دابا.')); }
    finally { setBusy(false); }
  };
  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage('');
    if (password.length < 12 || password !== passwordConfirmation) { setMessage(text('Les deux mots de passe doivent être identiques et contenir au moins 12 caractères.', 'خاص كلمتي السر يكونو بحال بحال وفيهم 12 حرف على الأقل.')); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword(''); setPasswordConfirmation(''); setRecovery(false);
      setMessage(text('Mot de passe modifié.', 'كلمة السر تبدلات.'));
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch { setMessage(text('Modification impossible. Demandez un nouveau lien de réinitialisation.', 'ما تبدلاتش كلمة السر. طلب رابط جديد.')); }
    finally { setBusy(false); }
  };
  const statuses: Record<string, string> = ar
    ? { new:'كيتسنى التأكيد', accepted:'تقبل', preparing:'كيتوجد', ready:'واجد', delivering:'فالطريق', delivered:'تسالا', cancelled:'تلغى' }
    : { new:'En attente', accepted:'Acceptée', preparing:'En préparation', ready:'Prête', delivering:'En livraison', delivered:'Terminée', cancelled:'Annulée' };
  const manager = role === 'admin' || role === 'superadmin';
  return <main dir={ar ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-50 px-4 py-6 sm:py-10">
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/?r=${encodeURIComponent(restaurant.slug)}`} className="flex items-center gap-2 text-sm font-bold text-orange-700"><ArrowLeft size={17} />{text('Retour au menu','رجع للقائمة')}</Link>
        <button className="text-sm px-3 py-2 rounded-xl bg-white border" onClick={() => setLanguage(ar ? 'fr' : 'ar')}>{ar ? 'Français' : 'عربي'}</button>
      </div>
      <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center gap-3"><UserRound className="text-orange-600" /><h1 className="text-2xl font-extrabold">{text('Mon compte','حسابي')}</h1></div>
        {checking ? <p>{text('Vérification de la session…','كنتأكدو من الحساب…')}</p> : accountError ? <div role="alert" className="space-y-3"><p>{text('Votre compte ne peut pas être chargé. Vérifiez la connexion puis réessayez.','ما قدرناش نجيبو الحساب. تأكد من الاتصال وعاود المحاولة.')}</p><button onClick={()=>setRefresh(x=>x+1)} className="underline">{text('Réessayer','عاود المحاولة')}</button></div> : recovery && user ? <form onSubmit={changePassword} className="space-y-4">
          <h2 className="font-bold">{text('Choisir un nouveau mot de passe','اختار كلمة سر جديدة')}</h2>
          <label className="block">{text('Nouveau mot de passe','كلمة السر الجديدة')}<input type="password" minLength={12} required autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="block w-full border rounded-xl p-3 mt-1" /></label>
          <label className="block">{text('Confirmer le mot de passe','أكد كلمة السر')}<input type="password" minLength={12} required autoComplete="new-password" value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)} className="block w-full border rounded-xl p-3 mt-1" /></label>
          <button disabled={busy} className="bg-orange-600 text-white rounded-xl p-3 font-bold">{text('Enregistrer le nouveau mot de passe','سجل كلمة السر الجديدة')}</button>
        </form> : !user ? <>
          <p className="text-sm text-slate-600">{text('Un même accès pour les clients et le personnel. Les clients cumulent des points de fidélité ; le personnel retrouve ses espaces autorisés.', 'نفس المدخل للزبناء وللعاملين. الزبون كيجمع نقاط الوفاء والعامل كيلقى غير الصفحات المسموح ليه بها.')}</p>
          <div className="flex gap-2">
            {[false, true].map(value => <button key={String(value)} onClick={() => { setSignup(value); setMessage(''); }} className={`flex-1 p-3 rounded-xl font-bold text-sm ${signup===value ? 'bg-orange-600 text-white' : 'bg-slate-100'}`}>{value ? text('Créer mon compte','نفتح حساب') : text('Se connecter','ندخل للحساب')}</button>)}
          </div>
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-semibold">{text('Adresse e-mail','البريد الإلكتروني')}<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 block w-full border rounded-xl p-3" /></label>
            <label className="block text-sm font-semibold">{text('Mot de passe','كلمة السر')}<input type="password" required minLength={signup ? 12 : undefined} autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 block w-full border rounded-xl p-3" /></label>
            {signup && <p className="text-xs text-slate-500">{text('12 caractères minimum. Confirmez ensuite votre adresse par e-mail.', '12 حرف على الأقل. من بعد أكد البريد الإلكتروني ديالك.')}</p>}
            <button disabled={busy} className="w-full bg-orange-600 text-white font-bold p-3 rounded-xl disabled:opacity-50">{busy ? text('Patientez…','تسنى شوية…') : signup ? text('Créer mon compte client','نفتح حساب زبون') : text('Se connecter','ندخل للحساب')}</button>
          </form>
          <button type="button" disabled={busy} onClick={forgotPassword} className="block text-sm text-orange-700 underline">{text('Mot de passe oublié ?','نسيتي كلمة السر؟')}</button>
          <button disabled={busy || !email.trim()} onClick={resend} className="text-sm text-orange-700 underline disabled:opacity-50">{text('Renvoyer le lien de confirmation','عاود صيفط رابط التأكيد')}</button>
        </> : <>
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm break-all">{user.email}</p><button onClick={async()=>{setBusy(true); try { const {error}=await supabase.auth.signOut(); if(error) setMessage(text('Déconnexion impossible. Réessayez.','ما قدرناش نخرجو الحساب. عاود المحاولة.')); } finally {setBusy(false);} }} disabled={busy} className="flex gap-2 items-center text-sm font-bold text-slate-600"><LogOut size={16}/>{text('Se déconnecter','نخرج')}</button></div>
          {staffError && <p role="alert">{text("Accès du personnel indisponible. Actualisez pour réessayer.","ولوج العاملين ما خدامش دابا. عاود حدّث الصفحة.")}</p>}
          {role && <div className="rounded-2xl bg-slate-950 p-4 text-white space-y-3">
            <h2 className="font-bold">{text('Espace du personnel','فضاء العاملين')}</h2>
            <div className="grid sm:grid-cols-3 gap-2">
              {manager && <Link href={`/admin?r=${encodeURIComponent(restaurant.slug)}`} className="flex items-center gap-2 bg-orange-600 rounded-xl p-3 text-sm font-bold"><Settings size={17}/>{text('Administration','الإدارة')}</Link>}
              {(manager || role==='kds') && <Link href={`/kds?r=${encodeURIComponent(restaurant.slug)}`} className="flex items-center gap-2 bg-slate-800 rounded-xl p-3 text-sm font-bold"><ChefHat size={17}/>{text('Cuisine','المطبخ')}</Link>}
              {(manager || role==='livreur') && <Link href={`/livreur?r=${encodeURIComponent(restaurant.slug)}`} className="flex items-center gap-2 bg-slate-800 rounded-xl p-3 text-sm font-bold"><Bike size={17}/>{text('Livraison','التوصيل')}</Link>}
            </div>
            {role==='superadmin' && <Link className="text-sm underline block" href="/super-admin">{text('Gestion des établissements','تسيير المطاعم')}</Link>}
          </div>}
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 space-y-2">
            <h2 className="flex items-center gap-2 text-orange-800 font-bold"><Gift size={21}/>{text('Mes points de fidélité','نقاط الوفاء ديالي')}</h2>
            <p className="text-4xl font-black text-orange-700">{points===null ? '—' : points} <span className="text-base">{text('points','نقطة')}</span></p>
            {points===null && <p className="text-sm">{text('Solde indisponible. Actualisez pour réessayer.','الرصيد ما بانش دابا. عاود حدّث الصفحة.')}</p>}
            <p className="text-sm text-slate-600">{text('1 point pour 10 DH de produits après remise, hors livraison, à la fin de la commande. Connectez-vous avant de commander. Les commandes invitées ne rapportent pas de points.', 'نقطة لكل 10 دراهم ديال الماكلة من بعد التخفيض، بلا مصاريف التوصيل، ملي كيتسالا الطلب. دخل للحساب قبل ما تطلب. الطلبات بلا حساب ما كتجمعش النقط.')}</p>
            <p className="text-xs text-slate-500">{text('100 points = 10 DH de réduction. Cochez la récompense au moment de confirmer une commande, dès 10 DH de produits. Une utilisation par commande, dans ce restaurant. Les points sont rendus en cas d’annulation.','100 نقطة كتساوي تخفيض 10 دراهم. اختار التخفيض ملي كتأكد الطلب، من 10 دراهم ديال الماكلة. مرة فالطلب وفنفس المطعم. إلا تلغى الطلب النقط كيرجعو.')}</p>
          </div>
          <div className="flex justify-between items-center gap-3"><h2 className="font-bold">{text('Mes dernières commandes','آخر الطلبات ديالي')}</h2><button onClick={()=>setRefresh(x=>x+1)} className="text-sm text-orange-700 font-semibold">{text('Actualiser','حدّث')}</button></div>
          {historyError ? <p role="alert" className="text-red-700">{text("Historique indisponible. Il ne s’agit pas d’un historique vide. Actualisez pour réessayer.","ما قدرناش نجيبو الطلبات. هاد الشي ما كيعنيش ما عندك حتى طلب. عاود حدّث الصفحة.")}</p> : !history.length ? <p className="text-sm text-slate-500">{text('Aucune commande récente pour ce compte dans ce restaurant.','ما كاين حتى طلب جديد لهاد الحساب فهاد المطعم.')}</p> : <ul className="space-y-2">{history.map(order=><li key={order.id} className="rounded-xl border p-3 flex justify-between gap-3 text-sm"><div><p className="font-mono text-xs break-all">{order.order_number}</p><p className="text-slate-500 mt-1">{new Date(order.created_at).toLocaleDateString(ar ? 'ar-MA' : 'fr-MA')} · {statuses[order.status] || text('En cours','كيتمعالج')}</p>{Number(order.points_redeemed)>0 && <p className="text-emerald-700 text-xs mt-1">{order.status === 'cancelled' ? text('Récompense annulée : points rendus','التخفيض تلغى والنقط رجعو') : <>{order.points_redeemed} {text('points utilisés · remise','نقطة مستعملة · تخفيض')} {Number(order.discount_amount).toFixed(2)} DH</>}</p>}</div><strong className="shrink-0">{Number(order.total).toFixed(2)} {text('DH','درهم')}</strong></li>)}</ul>}
        </>}
        {message && <p role="status" className="rounded-xl bg-slate-100 p-3 text-sm">{message}</p>}
      </section>
    </div>
  </main>;
}
