'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';

export const FloatingCartBar: React.FC = () => {
  const { restaurant, language, totalItemCount, total, setIsCheckoutOpen, isRtl, t } = useApp();

  if (totalItemCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-20 max-w-lg mx-auto sm:hidden animate-slide-up">
      <button
        disabled={!restaurant.is_open}
        onClick={() => setIsCheckoutOpen(true)}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-2xl p-4 shadow-xl shadow-primary-600/40 flex items-center justify-between font-bold text-sm transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="relative bg-white/20 p-2 rounded-xl">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
              {totalItemCount}
            </span>
          </div>
          <div className="text-left">
            <span className="text-xs text-orange-100 block">
              {totalItemCount} {t.common.items}
            </span>
            <span className="font-black text-base">{total} {t.currency}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-xl text-xs font-black">
          <span>{restaurant.is_open ? t.cart.checkout : language === 'ar' ? 'المطعم مسدود' : 'Restaurant fermé'}</span>
          {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </div>
      </button>
    </div>
  );
};
