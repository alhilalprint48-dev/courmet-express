'use client';

import React from 'react';
import { Product } from '@/types';
import { useApp } from '@/context/AppContext';
import { Plus, SlidersHorizontal, AlertCircle } from 'lucide-react';
import Image from 'next/image';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { language, t, openProductModal, addToCart } = useApp();

  const hasOptions = product.optionGroups && product.optionGroups.length > 0;

  const handleAction = () => {
    if (!product.isAvailable) return;
    if (hasOptions) {
      openProductModal(product);
    } else {
      addToCart(product, [], 1);
    }
  };

  return (
    <div
      onClick={handleAction}
      className={`bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col transition-all group ${
        product.isAvailable
          ? 'hover:shadow-md hover:border-orange-200/80 cursor-pointer'
          : 'opacity-65 grayscale-[30%] cursor-not-allowed'
      }`}
    >
      {/* Product Image */}
      <div className="relative w-full h-44 sm:h-48 overflow-hidden bg-gray-100">
        <Image
          src={product.image}
          alt={product.name[language]}
          fill
          unoptimized={product.image.startsWith('data:')}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Price Tag Pill */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full shadow-md">
          <span className="font-black text-gray-950 text-sm">
            {product.price} <span className="text-xs font-semibold text-primary-600">{t.currency}</span>
          </span>
        </div>

        {/* Out of Stock Overlay */}
        {!product.isAvailable && (
          <div className="absolute inset-0 bg-dark-900/60 backdrop-blur-[2px] flex items-center justify-center p-3 text-center">
            <span className="bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {t.product.outOfStock}
            </span>
          </div>
        )}

        {/* Customizable Badge */}
        {product.isAvailable && hasOptions && (
          <div className="absolute top-3 right-3 bg-dark-900/80 text-white backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow">
            <SlidersHorizontal className="w-3 h-3 text-primary-400" />
            <span>{t.product.customize}</span>
          </div>
        )}
      </div>

      {/* Product Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-extrabold text-base text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1">
            {product.name[language]}
          </h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            {product.description[language]}
          </p>

          {/* Allergens tags */}
          {product.allergens.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {product.allergens.map((allergen) => (
                <span
                  key={allergen}
                  className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-md font-medium"
                >
                  {allergen}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Bottom */}
        <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400">
            {hasOptions ? t.product.customize : t.product.addToCart}
          </span>
          <button
            disabled={!product.isAvailable}
            className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${
              !product.isAvailable
                ? 'bg-gray-200 text-gray-400'
                : hasOptions
                ? 'bg-orange-100 text-primary-700 hover:bg-primary-600 hover:text-white'
                : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-600/30'
            }`}
          >
            {hasOptions ? (
              <SlidersHorizontal className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
