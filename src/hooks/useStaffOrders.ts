'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { mapOrder } from '@/lib/order-utils.mjs';
import type { Order } from '@/types';

type Queue = { orders: Order[]; loading: boolean; error: string; lastSuccess: string | null; role: string; userId: string };
const empty: Queue = { orders: [], loading: true, error: '', lastSuccess: null, role: '', userId: '' };
export function useStaffOrders(tenant: string, courier = false, includeArchived = false) {
  const [state, setState] = useState<Queue>(empty);
  const reload = useRef<() => void>(() => {});
  const refreshNow = useCallback(() => reload.current(), []);
  useEffect(() => {
    let active = true, generation = 0;
    setState(empty);
    if (!tenant) return;
    const load = async () => {
      if (document.hidden) return;
      const attempt = ++generation;
      if (!navigator.onLine) { setState(prev => ({ ...prev, loading: false, error: 'Connexion perdue. Les dernières données sont conservées.' })); return; }
      try {
        const { data, error } = await supabase.rpc('staff_order_queue', { tenant, courier, history_limit: 50, include_archived: includeArchived });
        if (!active || attempt !== generation) return;
        if (error?.code === '42501' || error?.code === 'PGRST301') { setState({ ...empty, loading: false, error: 'Accès refusé : reconnectez votre compte personnel.' }); return; }
        if (error || !Array.isArray(data?.active) || !Array.isArray(data?.history)) throw new Error('queue');
        setState({ orders: [...data.active, ...data.history].map(mapOrder) as Order[], loading: false, error: '', lastSuccess: new Date().toISOString(), role: data.role, userId: data.user_id });
      } catch {
        if (active && attempt === generation) setState(prev => ({ ...prev, loading: false, error: 'Actualisation impossible. Vérifiez la connexion ; les dernières données sont conservées.' }));
      }
    };
    const refresh = () => { void load(); };
    reload.current = refresh;
    refresh();
    const timer = setInterval(refresh, 10000);
    window.addEventListener('online', refresh); window.addEventListener('offline', refresh); window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    const channel = supabase.channel(`staff-${courier ? 'courier' : 'kitchen'}-${tenant}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${tenant}` }, refresh).subscribe();
    return () => { active = false; ++generation; clearInterval(timer); window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); void supabase.removeChannel(channel); };
  }, [tenant, courier, includeArchived]);
  return { ...state, refresh: refreshNow };
}
