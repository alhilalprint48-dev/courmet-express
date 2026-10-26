'use client';

import React from 'react';
import { AlertOctagon, Phone, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Props {
  restaurantName: string;
  phone?: string;
}

export const RestaurantSuspendedScreen: React.FC<Props> = ({ restaurantName, phone }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 max-w-md w-full p-8 rounded-3xl text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto ring-4 ring-rose-500/30">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-black tracking-tight">{restaurantName}</h2>
        <p className="text-slate-300 text-xs leading-relaxed">
          Cet établissement est actuellement indisponible pour les commandes en ligne.
        </p>

        {phone && (
          <div className="pt-2">
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-xl text-xs font-bold text-slate-200 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-orange-400" />
              <span>Contacter par téléphone : {phone}</span>
            </a>
          </div>
        )}

        <div className="pt-4 border-t border-slate-700/80">
          <Link
            href="/saas"
            className="text-xs text-orange-400 hover:underline flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Découvrir la solution RestoFlow SaaS</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
