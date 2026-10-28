'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { SelectedOptionChoice } from '@/types';
import { X, Plus, Minus, Check, MessageSquare } from 'lucide-react';
import Image from 'next/image';

export const ProductModal: React.FC = () => {
  const { restaurant, selectedProductForModal, closeProductModal, addToCart, language, t } = useApp();

  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptionChoice[]>([]);
  const [instructions, setInstructions] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize defaults when modal opens
  useEffect(() => {
    if (selectedProductForModal) {
      setQuantity(1);
      setInstructions('');
      setValidationError(null);

      // Pre-select first choice for mandatory single-choice groups
      const initialChoices: SelectedOptionChoice[] = [];
      selectedProductForModal.optionGroups?.forEach((group) => {
        if (group.required && group.minSelect === 1 && group.maxSelect === 1 && group.options.length > 0) {
          const firstOpt = group.options[0];
          initialChoices.push({
            groupId: group.id,
            groupName: group.name,
            optionId: firstOpt.id,
            optionName: firstOpt.name,
            price: firstOpt.price,
          });
        }
      });
      setSelectedOptions(initialChoices);
    }
  }, [selectedProductForModal]);

  if (!selectedProductForModal) return null;

  const product = selectedProductForModal;

  const handleOptionToggle = (
    group: NonNullable<typeof product.optionGroups>[0],
    opt: typeof group.options[0]
  ) => {
    setValidationError(null);
    if (group.maxSelect === 1) {
      // Single select (radio-style)
      setSelectedOptions((prev) => [
        ...prev.filter((o) => o.groupId !== group.id),
        {
          groupId: group.id,
          groupName: group.name,
          optionId: opt.id,
          optionName: opt.name,
          price: opt.price,
        },
      ]);
    } else {
      // Multi-select (checkbox-style)
      const isAlreadySelected = selectedOptions.some((o) => o.optionId === opt.id);
      if (isAlreadySelected) {
        setSelectedOptions((prev) => prev.filter((o) => o.optionId !== opt.id));
      } else {
        const currentCountInGroup = selectedOptions.filter((o) => o.groupId === group.id).length;
        if (currentCountInGroup >= group.maxSelect) {
          return; // Max reached
        }
        setSelectedOptions((prev) => [
          ...prev,
          {
            groupId: group.id,
            groupName: group.name,
            optionId: opt.id,
            optionName: opt.name,
            price: opt.price,
          },
        ]);
      }
    }
  };

  const optionsTotal = selectedOptions.reduce((sum, opt) => sum + opt.price, 0);
  const unitPrice = product.price + optionsTotal;
  const totalPrice = unitPrice * quantity;

  const handleAddToCart = () => {
    // Validate required groups
    for (const group of product.optionGroups || []) {
      if (group.required) {
        const count = selectedOptions.filter((o) => o.groupId === group.id).length;
        if (count < group.minSelect) {
          setValidationError(
            language === 'ar'
              ? `يرجى تحديد اختيار في "${group.name.ar}"`
              : `Veuillez sélectionner une option pour "${group.name.fr}"`
          );
          return;
        }
      }
    }

    addToCart(product, selectedOptions, quantity, instructions.trim() || undefined);
    closeProductModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header with Image */}
        <div className="relative h-48 sm:h-56 w-full bg-gray-100 shrink-0">
          <Image
            src={product.image}
            alt={product.name[language]}
            fill
            unoptimized={product.image.startsWith('data:')}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 via-transparent to-black/30" />
          <button
            onClick={closeProductModal}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h2 className="text-xl font-extrabold tracking-tight drop-shadow-sm">
              {product.name[language]}
            </h2>
            <p className="text-white/80 text-xs mt-1 line-clamp-2">
              {product.description[language]}
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 divide-y divide-gray-100">
          {/* Options Groups */}
          {product.optionGroups?.map((group) => {
            const isSingle = group.maxSelect === 1;
            return (
              <div key={group.id} className="pt-4 first:pt-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">
                      {group.name[language]}
                    </h4>
                    <p className="text-[11px] text-gray-400">
                      {isSingle
                        ? t.product.pickOne
                        : `Jusqu'à ${group.maxSelect} choix`}
                    </p>
                  </div>
                  {group.required ? (
                    <span className="bg-red-50 text-red-600 border border-red-200 text-[10px] font-black px-2 py-0.5 rounded-full">
                      {t.product.requiredBadge}
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {t.product.optionalBadge}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {group.options.map((opt) => {
                    const isSelected = selectedOptions.some((o) => o.optionId === opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleOptionToggle(group, opt)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border text-sm transition-all ${
                          isSelected
                            ? 'border-primary-600 bg-orange-50/60 font-bold text-primary-950 ring-1 ring-primary-500'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-${isSingle ? 'full' : 'md'} border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-primary-600 border-primary-600 text-white'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <span>{opt.name[language]}</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-500">
                          {opt.price > 0 ? `+${opt.price} ${t.currency}` : 'Inclus'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Special Kitchen Notes */}
          <div className="pt-4 space-y-2">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-primary-600" />
              {t.product.specialInstructionsPlaceholder}
            </label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Ex: Sans oignons, sauce à part..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          {/* Error message */}
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold animate-shake">
              {validationError}
            </div>
          )}
        </div>

        {/* Modal Footer (Quantity & Add Button) */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center gap-4 shrink-0">
          {/* Quantity Selector */}
          <div className="flex items-center bg-white border border-gray-200 rounded-2xl p-1 shadow-xs">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all text-gray-600"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-black text-sm text-gray-900">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all text-gray-600"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add Button */}
          <button
            disabled={!restaurant.is_open}
            onClick={handleAddToCart}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-lg shadow-primary-600/25 flex items-center justify-between text-sm transition-all active:scale-[0.99]"
          >
            <span>{t.product.addToCart}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-black">
              {totalPrice} {t.currency}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
