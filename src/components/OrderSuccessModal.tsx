'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { 
  CheckCircle2, 
  MessageCircle, 
  ArrowLeft, 
  Clock, 
  MapPin, 
  Receipt,
  Phone,
  Banknote
} from 'lucide-react';
import { RESTAURANT_INFO } from '@/data/mockData';

export const OrderSuccessModal: React.FC = () => {
  const { currentOrder, setCurrentOrder, language, t } = useApp();

  if (!currentOrder) return null;

  // Generate WhatsApp message content
  const generateWhatsAppMessage = () => {
    const itemsList = currentOrder.items
      .map(
        (item) =>
          `• ${item.quantity}x ${item.product.name[language]} ${
            item.selectedOptions.length > 0
              ? `(${item.selectedOptions.map((o) => o.optionName[language]).join(', ')})`
              : ''
          } - ${item.totalPrice} DH`
      )
      .join('\n');

    const paymentText =
      currentOrder.customer.paymentMethod === 'cash'
        ? `Espèces (Prévu: ${currentOrder.customer.cashChangeAmount || 'Appoint exact'})`
        : 'Carte Bancaire (TPE)';

    const gpsLink = currentOrder.customer.gpsCoords
      ? `https://maps.google.com/?q=${currentOrder.customer.gpsCoords.lat},${currentOrder.customer.gpsCoords.lng}`
      : 'Non spécifié';

    const text = `🍽️ *NOUVELLE COMMANDE - ${currentOrder.orderNumber}*
------------------------------
👤 *Client:* ${currentOrder.customer.fullName}
📞 *Tél:* ${currentOrder.customer.phone}
📍 *Mode:* ${currentOrder.mode === 'delivery' ? 'Livraison à Domicile' : 'À emporter'}
🏠 *Adresse:* ${currentOrder.customer.address}
${currentOrder.customer.landmark ? `🏢 *Repère:* ${currentOrder.customer.landmark}\n` : ''}${currentOrder.customer.specialInstructions ? `📝 *Consigne:* ${currentOrder.customer.specialInstructions}\n` : ''}🗺️ *Lien GPS:* ${gpsLink}
------------------------------
🛒 *Détail des plats :*
${itemsList}

💰 *Sous-total:* ${currentOrder.subtotal} DH
🛵 *Frais de livraison:* ${currentOrder.deliveryFee} DH
💳 *TOTAL À RÉGLER:* *${currentOrder.total} DH*
💵 *Mode de paiement:* ${paymentText}
------------------------------
Merci de confirmer la prise en charge !`;

    return encodeURIComponent(text);
  };

  const handleOpenWhatsApp = () => {
    const message = generateWhatsAppMessage();
    const url = `https://wa.me/${RESTAURANT_INFO.whatsappNumber}?text=${message}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] shadow-2xl overflow-hidden flex flex-col border border-gray-100">
        {/* Success Header banner */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white text-center relative">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-3 ring-4 ring-white/30 animate-bounce">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {t.success.title}
          </h2>
          <p className="text-emerald-100 text-xs mt-1">
            {t.success.subtitle}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider">
            <span>{t.success.orderNumber} :</span>
            <span className="text-amber-300 font-black">{currentOrder.orderNumber}</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {/* WhatsApp Direct Action Button */}
          <div className="bg-emerald-50 border-2 border-emerald-500/40 p-4 rounded-2xl space-y-2.5 text-center">
            <button
              onClick={handleOpenWhatsApp}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2.5 text-sm transition-all active:scale-[0.98]"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              <span>{t.success.sendWhatsApp}</span>
            </button>
            <p className="text-[11px] text-emerald-800 font-medium">
              {t.success.whatsappHint}
            </p>
          </div>

          {/* Amount to prepare */}
          <div className="bg-orange-50 border border-orange-200/80 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-600 text-white rounded-xl">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-gray-600 font-semibold block">
                  {t.success.payNotice}
                </span>
                <span className="text-xs text-gray-500">
                  {currentOrder.customer.paymentMethod === 'cash'
                    ? currentOrder.customer.cashChangeAmount || 'Appoint exact'
                    : 'Carte bancaire (TPE)'}
                </span>
              </div>
            </div>
            <span className="text-xl font-black text-primary-700">
              {currentOrder.total} {t.currency}
            </span>
          </div>

          {/* Order Details Accordion / Summary */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3 text-xs">
            <div className="flex items-center justify-between font-bold text-gray-700 border-b border-gray-200 pb-2">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-gray-500" />
                Détail de votre commande
              </span>
              <span className="text-gray-500">{currentOrder.createdAt}</span>
            </div>

            <div className="space-y-2">
              {currentOrder.items.map((item) => (
                <div key={item.cartItemId} className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-gray-900">
                      {item.quantity}x {item.product.name[language]}
                    </span>
                    {item.selectedOptions.length > 0 && (
                      <span className="text-gray-500 block text-[11px]">
                        ({item.selectedOptions.map((o) => o.optionName[language]).join(', ')})
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-gray-800">{item.totalPrice} {t.currency}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-gray-200 space-y-1 text-gray-600">
              <div className="flex justify-between">
                <span>{t.cart.subtotal}</span>
                <span>{currentOrder.subtotal} {t.currency}</span>
              </div>
              {currentOrder.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span>{t.cart.deliveryFee}</span>
                  <span>{currentOrder.deliveryFee} {t.currency}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-sm text-gray-900 pt-1 border-t border-gray-200">
                <span>{t.cart.total}</span>
                <span className="text-primary-600">{currentOrder.total} {t.currency}</span>
              </div>
            </div>
          </div>

          {/* Delivery & Tracking info */}
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-600 shrink-0" />
              <span>{t.success.estimatedTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-600 shrink-0" />
              <span className="truncate">{currentOrder.customer.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary-600 shrink-0" />
              <span>{currentOrder.customer.phone} ({currentOrder.customer.fullName})</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={() => setCurrentOrder(null)}
            className="w-full py-3 rounded-2xl bg-gray-200 hover:bg-gray-300 font-bold text-gray-800 text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.success.backToMenu}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
