'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Loyalty = { userId: string | null; points: number | null; canRedeem: boolean; loading: boolean; error: boolean };
const empty: Loyalty = { userId: null, points: null, canRedeem: false, loading: false, error: false };
export function useCheckoutLoyalty(tenant: string, open: boolean) {
  const [state, setState] = useState<Loyalty>(empty);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let active = true, generation = 0;
    if (!open) { setState(empty); return; }
    const load = async () => {
      const current = ++generation;
      setState(previous => ({ ...previous, canRedeem: false, loading: true, error: false }));
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!active || current !== generation) return;
        if (!user) { setState(empty); return; }
        if (error) throw error;
        const { data, error: failure } = await supabase.rpc('customer_loyalty', { tenant });
        if (!active || current !== generation) return;
        if (failure || !data) throw failure || new Error('loyalty');
        setState({ userId: user.id, points: Number(data.points), canRedeem: data.canRedeem === true, loading: false, error: false });
      } catch {
        if (active && current === generation) setState({ ...empty, error: true });
      }
    };
    void load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'TOKEN_REFRESHED') return;
      ++generation;
      setState({ ...empty, loading: true });
      setTimeout(() => { if (active) void load(); }, 0);
    });
    return () => { active = false; ++generation; subscription.unsubscribe(); };
  }, [tenant, open, revision]);
  return { ...state, refresh };
}
