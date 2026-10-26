'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Header } from '@/components/Header';
import { ConsumptionModeModal } from '@/components/ConsumptionModeModal';
import { CategoryNav } from '@/components/CategoryNav';
import { ProductCard } from '@/components/ProductCard';
import { ProductModal } from '@/components/ProductModal';
import { CheckoutModal } from '@/components/CheckoutModal';
import { OrderSuccessModal } from '@/components/OrderSuccessModal';
import { FloatingCartBar } from '@/components/FloatingCartBar';
import { LiveOrderTracker } from '@/components/LiveOrderTracker';
import { RestaurantSuspendedScreen } from '@/components/RestaurantSuspendedScreen';
import { Search, Flame, ShieldCheck, Clock, Bike } from 'lucide-react';

export default function HomePage() {
  const { language, t, restaurant, isRestaurantSuspended, products, isLoadingProducts } = useApp();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // If this restaurant has been suspended by SaaS Super-Admin
  if (isRestaurantSuspended) {
    return <RestaurantSuspendedScreen restaurantName={restaurant.name} phone={restaurant.phone} />;
  }

  // Filter products by category and search
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      activeCategory === 'all' || product.categoryId === activeCategory;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;

    const nameMatch = product.name[language]?.toLowerCase().includes(q);
    const descMatch = product.description[language]?.toLowerCase().includes(q);

    return matchesCategory && (nameMatch || descMatch);
  });

  return (
    <div className="min-h-screen flex flex-col pb-24 sm:pb-12 bg-slate-50 w-full max-w-full overflow-x-hidden">
      {/* Universal Header */}
      <Header />

      {/* Hero / Promo Banner */}
      <section className="bg-gradient-to-br from-dark-900 via-dark-800 to-primary-950 text-white px-3 sm:px-4 py-5 sm:py-8 shadow-inner w-full max-w-full overflow-hidden">
        <div className="max-w-5xl mx-auto space-y-4 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-primary-600/30 border border-primary-500/40 text-primary-300 px-3 py-1 rounded-full text-xs font-bold mb-2">
                <Flame className="w-3.5 h-3.5 text-primary-400" />
                <span>{language === 'ar' ? 'أشهى المأكولات الطازجة' : 'Cuisine 100% Fraîche & Fait Maison'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                {language === 'ar' ? 'اطلب الآن وادفع عند الاستلام' : 'Commandez en direct & Payez à la réception'}
              </h2>
              <p className="text-gray-300 text-xs sm:text-sm mt-1 max-w-xl">
                {language === 'ar'
                  ? 'برجر، بيتزا، وأطباق مميزة محضرة بعناية. بدون وسيط أو عمولات زائدة.'
                  : 'Burgers gourmets, pizzas croustillantes et formules express livrés chez vous en moins de 35 min.'}
              </p>
            </div>

            {/* Quick Guarantees Badges */}
            <div className="grid grid-cols-3 gap-2 bg-white/5 border border-white/10 p-3 rounded-2xl backdrop-blur-sm shrink-0">
              <div className="text-center p-1">
                <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <span className="text-[10px] text-gray-300 block font-medium">~30 min</span>
              </div>
              <div className="text-center p-1 border-x border-white/10">
                <Bike className="w-4 h-4 text-primary-400 mx-auto mb-1" />
                <span className="text-[10px] text-gray-300 block font-medium">Suivi direct</span>
              </div>
              <div className="text-center p-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <span className="text-[10px] text-gray-300 block font-medium">Cash / TPE</span>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative pt-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full bg-white text-gray-900 placeholder-gray-400 pl-10 pr-4 py-3 rounded-2xl text-xs sm:text-sm font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500 border border-gray-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Horizontal Sticky Category Bar */}
      <CategoryNav
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
      />

      {/* Products Grid */}
      <main className="max-w-5xl mx-auto px-4 py-6 flex-1 w-full">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-8 shadow-xs">
            <div className="w-14 h-14 bg-orange-50 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-800">
              {language === 'ar' ? 'لا توجد وجبات مطابقة للبحث' : 'Aucun produit trouvé'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {language === 'ar' ? 'جرب البحث بكلمة أخرى' : 'Essayez avec un autre mot-clé ou catégorie.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      {/* Modals & Drawers */}
      <ConsumptionModeModal />
      <ProductModal />
      <CheckoutModal />
      <OrderSuccessModal />

      {/* Mobile Floating Cart Summary */}
      <FloatingCartBar />

      {/* Real-time Order Tracking Drawer */}
      <LiveOrderTracker />
    </div>
  );
}
