'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  UtensilsCrossed, 
  ChevronUp, 
  ChevronDown, 
  X, 
  Flame, 
  Bell, 
  Receipt,
  Sparkles,
  Bike
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { OrderStatus } from '@/types';

export const LiveOrderTracker: React.FC = () => {
  const { liveTrackingOrder, setLiveTrackingOrder, language, t } = useApp();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [status, setStatus] = useState<OrderStatus>(liveTrackingOrder?.status || 'new');
  const [lastNotification, setLastNotification] = useState<string | null>(null);

  // Sync state if liveTrackingOrder changes
  useEffect(() => {
    if (liveTrackingOrder) {
      setStatus(liveTrackingOrder.status);
    }
  }, [liveTrackingOrder]);

  // Real-time polling / Supabase sync to listen for status changes from KDS
  useEffect(() => {
    if (!liveTrackingOrder) return;

    const checkOrderStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('status')
          .eq('id', liveTrackingOrder.id)
          .maybeSingle();

        if (data && data.status && data.status !== status) {
          const newStatus = data.status as OrderStatus;
          setStatus(newStatus);
          
          // Update in context & localStorage
          setLiveTrackingOrder({
            ...liveTrackingOrder,
            status: newStatus
          });

          // Play subtle beep if ready
          if (newStatus === 'ready') {
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(600, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
              gain.gain.setValueAtTime(0.3, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.3);
            } catch (e) {}
          }
        }
      } catch (err) {
        // Silent catch
      }
    };

    const interval = setInterval(checkOrderStatus, 4000);
    return () => clearInterval(interval);
  }, [liveTrackingOrder, status, setLiveTrackingOrder]);

  if (!liveTrackingOrder) return null;

  const isDineIn = liveTrackingOrder.mode === 'dine_in';
  const table = liveTrackingOrder.tableNumber || 'Table';

  // Status step calculations
  const steps: { key: OrderStatus; labelFr: string; labelAr: string; icon: any }[] = [
    { key: 'new', labelFr: 'Reçue', labelAr: 'مستلم', icon: Clock },
    { key: 'preparing', labelFr: 'En cuisine', labelAr: 'في المطبخ', icon: Flame },
    { key: 'ready', labelFr: isDineIn ? 'Prête à servir' : 'Prête', labelAr: 'جاهز للتقديم', icon: ChefHat },
    { key: 'delivered', labelFr: isDineIn ? 'Servie à table' : 'Livrée', labelAr: 'تم التسليم', icon: CheckCircle2 },
  ];

  const getStepIndex = (st: OrderStatus) => {
    switch (st) {
      case 'new': return 0;
      case 'preparing': return 1;
      case 'ready': return 2;
      case 'delivered': return 3;
      case 'cancelled': return -1;
      default: return 0;
    }
  };

  const currentIndex = getStepIndex(status);

  return (
    <aside 
      aria-label={language === 'ar' ? 'تتبع الطلب المباشر' : 'Suivi de commande en direct'}
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-md animate-slide-up"
    >
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-primary-500 overflow-hidden ring-4 ring-primary-500/10">
        {/* Tracker Header */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-gradient-to-r from-dark-950 via-dark-900 to-dark-800 text-white p-3.5 flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-wider text-orange-400">
                  {liveTrackingOrder.orderNumber}
                </span>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-bold text-gray-300">
                  {isDineIn ? `🍽️ ${table}` : liveTrackingOrder.mode === 'delivery' ? '🛵 Livraison' : '🛍️ À emporter'}
                </span>
              </div>
              <p className="text-[11px] text-gray-300 font-medium">
                {status === 'new' && (language === 'ar' ? 'جاري تحويل طلبك للمطبخ...' : 'Commande transmise en cuisine...')}
                {status === 'preparing' && (language === 'ar' ? 'الطلب قيد التحضير في المطبخ الآن 🔥' : 'En cours de préparation / cuisson 🔥')}
                {status === 'ready' && (language === 'ar' ? 'طلبك جاهز ! يُقدم إلى طاولتك الآن ✨' : 'Prête ! Le serveur arrive à votre table ✨')}
                {status === 'delivered' && (language === 'ar' ? 'بالهناء والشفاء ! شهية طيبة' : 'Servie à table. Bon appétit ! 😋')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLiveTrackingOrder(null);
              }}
              className="p-1 rounded-full bg-white/10 hover:bg-red-500/50 text-gray-300 hover:text-white transition-colors"
              title="Fermer le suivi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stepper Bar & Progress (Always visible) */}
        <div className="bg-orange-50/60 p-3 border-b border-orange-100">
          <div className="relative flex justify-between items-center max-w-sm mx-auto">
            {/* Background connecting bar */}
            <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1 bg-gray-200 -z-0">
              <div 
                className="h-full bg-primary-600 transition-all duration-700 ease-out"
                style={{ width: `${(Math.max(0, currentIndex) / (steps.length - 1)) * 100}%` }}
              />
            </div>

            {/* Stepper Points */}
            {steps.map((st, i) => {
              const Icon = st.icon;
              const isPast = i < currentIndex;
              const isCurrent = i === currentIndex;
              return (
                <div key={st.key} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs ${
                      isCurrent
                        ? 'bg-primary-600 text-white ring-4 ring-primary-200 scale-110'
                        : isPast
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-gray-400 border border-gray-300'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <span
                    className={`text-[9px] font-bold mt-1 text-center whitespace-nowrap ${
                      isCurrent ? 'text-primary-700 font-black' : isPast ? 'text-emerald-700' : 'text-gray-400'
                    }`}
                  >
                    {language === 'ar' ? st.labelAr : st.labelFr}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expanded Details Drawer */}
        {isExpanded && (
          <div className="p-4 space-y-3 max-h-56 overflow-y-auto bg-white text-gray-800">
            {/* Live Message Badge */}
            <div className="bg-amber-50 rounded-2xl p-2.5 border border-amber-200/80 flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 animate-spin" />
              <p className="text-xs text-amber-950 font-medium">
                {isDineIn ? (
                  <span>
                    Vous êtes assis à la <strong>{table}</strong>. Détendez-vous, notre équipe prépare vos plats chauds à la minute !
                  </span>
                ) : (
                  <span>Votre commande est suivie en temps réel par notre cuisine.</span>
                )}
              </p>
            </div>

            {/* Items Summary */}
            <div className="space-y-1.5 divide-y divide-gray-100 text-xs">
              <span className="font-bold text-[10px] uppercase tracking-wider text-gray-400 block pt-1">
                Articles commandés ({liveTrackingOrder.items.length})
              </span>
              {liveTrackingOrder.items.map((item, idx) => (
                <div key={idx} className="pt-1.5 flex justify-between items-center">
                  <div className="truncate max-w-[240px]">
                    <span className="font-bold text-gray-900">{item.quantity}x </span>
                    <span className="text-gray-700">{item.product.name[language]}</span>
                  </div>
                  <span className="font-extrabold text-gray-900 shrink-0">
                    {item.totalPrice} {t.currency}
                  </span>
                </div>
              ))}
            </div>

            {/* Total Footer */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs font-bold">
              <span className="text-gray-500">Total réglé / à régler :</span>
              <span className="text-primary-600 font-black text-sm">{liveTrackingOrder.total} {t.currency}</span>
            </div>

            {/* Dismiss or hide button */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors text-center"
              >
                {language === 'ar' ? 'تصغير' : 'Réduire la fenêtre'}
              </button>
              {status === 'delivered' && (
                <button
                  type="button"
                  onClick={() => setLiveTrackingOrder(null)}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors text-center shadow-xs"
                >
                  {language === 'ar' ? 'إنهاء الطلب' : 'Terminer'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
