'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { 
  ShoppingBag, 
  MapPin, 
  Clock, 
  Languages, 
  Utensils,
  UtensilsCrossed
} from 'lucide-react';
import { RESTAURANT_INFO } from '@/data/mockData';

export const Header: React.FC = () => {
  const { 
    language, 
    setLanguage, 
    t, 
    restaurant,
    availableRestaurants,
    switchRestaurant,
    mode, 
    tableNumber,
    deliveryAddress, 
    deliveryTimeSlot, 
    setIsModeModalOpen, 
    totalItemCount, 
    total, 
    setIsCheckoutOpen 
  } = useApp();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs transition-all w-full max-w-full overflow-hidden">
      {/* Top Banner / Restaurant Info */}
      <div className="bg-dark-900 text-white text-xs py-1.5 px-3 sm:px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-emerald-400 text-[11px] sm:text-xs">
              {language === 'ar' ? 'مفتوح للطلبات' : 'Ouvert pour commandes'}
            </span>
            <span className="text-gray-400 hidden sm:inline">• {RESTAURANT_INFO.openHours}</span>
          </div>

          {/* Top shortcuts: KDS, Livreur, Admin & Lang */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <a
              href="/saas"
              className="hidden lg:flex items-center gap-1 text-[11px] bg-gradient-to-r from-orange-600/40 to-amber-600/40 hover:from-orange-600/60 hover:to-amber-600/60 text-orange-200 px-2.5 py-0.5 rounded-full border border-orange-500/40 transition-colors font-bold"
            >
              <span>⭐ Devenir Partenaire SaaS</span>
            </a>
            <a
              href="/kds"
              className="hidden md:flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-0.5 rounded-full border border-slate-700 transition-colors"
            >
              <span>Cuisine (KDS)</span>
            </a>
            <a
              href="/livreur"
              className="hidden md:flex items-center gap-1 text-[11px] bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-800 transition-colors"
            >
              <span>Livreur</span>
            </a>
            <a
              href="/admin"
              className="hidden sm:flex items-center gap-1 text-[11px] bg-primary-600/40 hover:bg-primary-600/70 text-orange-200 px-2.5 py-0.5 rounded-full border border-primary-500/40 transition-colors"
            >
              <span>Back-Office</span>
            </a>
            <button
              onClick={() => setLanguage(language === 'fr' ? 'ar' : 'fr')}
              className="flex items-center gap-1 text-[11px] bg-dark-800 hover:bg-dark-700 px-2 py-0.5 rounded-full text-gray-200 transition-colors font-medium border border-dark-700"
              title="Changer de langue / تغيير اللغة"
            >
              <Languages className="w-3 h-3 text-primary-500" />
              <span>{t.common.switchLanguage}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Logo & Name */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-primary-500/20 shrink-0">
              <Utensils className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              {availableRestaurants.length > 1 ? (
                <div className="flex items-center gap-1">
                  <select
                    value={restaurant.slug}
                    onChange={(e) => switchRestaurant(e.target.value)}
                    className="font-extrabold text-sm sm:text-base text-gray-900 bg-transparent outline-none cursor-pointer border-b border-dashed border-gray-300 pr-1 max-w-[150px] sm:max-w-[200px] truncate"
                    title="Changer de restaurant partenaire"
                  >
                    {availableRestaurants.map((r) => (
                      <option key={r.id} value={r.slug}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <h1 className="font-extrabold text-sm sm:text-lg text-gray-900 tracking-tight leading-none truncate">
                  {restaurant.name}
                </h1>
              )}
              <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block mt-0.5">
                {restaurant.tagline}
              </p>
            </div>
          </div>

          {/* Desktop Mode Selector Pill */}
          <div className="hidden sm:block">
            <button
              onClick={() => setIsModeModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200/80 rounded-xl text-xs text-gray-800 hover:bg-orange-100/70 transition-all text-left shadow-xs"
            >
              {mode === 'dine_in' ? (
                <UtensilsCrossed className="w-4 h-4 text-orange-600 shrink-0" />
              ) : mode === 'delivery' ? (
                <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-orange-600 shrink-0" />
              )}
              <div className="truncate max-w-[160px]">
                <span className="font-bold text-primary-700 block text-[11px] leading-tight">
                  {mode === 'dine_in' ? 'Sur place (À table)' : mode === 'delivery' ? t.modeSelection.delivery : t.modeSelection.takeaway}
                </span>
                <span className="text-gray-600 truncate block text-[10px]">
                  {mode === 'dine_in' ? (tableNumber || 'Table') : mode === 'delivery' ? (deliveryAddress || t.modeSelection.enterAddress) : deliveryTimeSlot}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-primary-600 bg-white px-1.5 py-0.5 rounded border border-orange-200 ml-1">
                {t.common.changeMode}
              </span>
            </button>
          </div>

          {/* Cart Button */}
          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="relative flex items-center gap-1.5 sm:gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl shadow-md shadow-primary-600/25 transition-transform active:scale-95 shrink-0"
          >
            <div className="relative">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              {totalItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow">
                  {totalItemCount}
                </span>
              )}
            </div>
            <span className="text-xs sm:text-sm font-black">
              {total > 0 ? `${total} ${t.currency}` : t.cart.title}
            </span>
          </button>
        </div>

        {/* Mobile-only Mode Selector Sub-Bar */}
        <div className="sm:hidden mt-2 pt-1.5 border-t border-gray-100">
          <button
            onClick={() => setIsModeModalOpen(true)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 bg-orange-50/80 border border-orange-200/70 rounded-xl text-left"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {mode === 'dine_in' ? (
                <UtensilsCrossed className="w-3.5 h-3.5 text-primary-600 shrink-0" />
              ) : mode === 'delivery' ? (
                <MapPin className="w-3.5 h-3.5 text-primary-600 shrink-0" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-primary-600 shrink-0" />
              )}
              <div className="truncate">
                <span className="font-bold text-primary-700 text-[11px] mr-1">
                  {mode === 'dine_in'
                    ? (t.modeSelection.dineIn || 'Sur place')
                    : mode === 'delivery'
                    ? t.modeSelection.delivery
                    : t.modeSelection.takeaway} :
                </span>
                <span className="text-gray-600 text-[10px] truncate">
                  {mode === 'dine_in'
                    ? (tableNumber ? `${tableNumber}` : (t.modeSelection.enterTable || 'Sélectionner'))
                    : mode === 'delivery'
                    ? (deliveryAddress || t.modeSelection.enterAddress)
                    : deliveryTimeSlot}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-primary-600 bg-white px-2 py-0.5 rounded-lg border border-orange-200 shrink-0 ml-1">
              {t.common.changeMode}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
