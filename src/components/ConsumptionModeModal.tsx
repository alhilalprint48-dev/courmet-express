'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  ShoppingBag, 
  Bike, 
  MapPin, 
  Navigation, 
  Check, 
  X, 
  Clock,
  UtensilsCrossed,
  Sparkles
} from 'lucide-react';


export const ConsumptionModeModal: React.FC = () => {
  const { 
    isModeModalOpen, 
    setIsModeModalOpen, 
    mode, 
    setMode, 
    tableNumber,
    setTableNumber,
    deliveryAddress, 
    setDeliveryAddress, 
    deliveryTimeSlot, 
    setDeliveryTimeSlot, 
    setGpsCoords, 
    restaurant,
    t 
  } = useApp();

  const [tempMode, setTempMode] = useState(mode);
  const [tempTable, setTempTable] = useState(tableNumber || 'Table 1');
  const [tempAddress, setTempAddress] = useState(deliveryAddress);
  const tempSlot = 'Au plus vite — délai à confirmer par le restaurant';
  const [isLocating, setIsLocating] = useState(false);
  const [locSuccess, setLocSuccess] = useState(false);

  if (!isModeModalOpen) return null;

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setGpsCoords({ lat: latitude, lng: longitude });
        setLocSuccess(true);
        setIsLocating(false);
        if (!tempAddress) {
          setTempAddress(`Position GPS détectée (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        }
      },
      (error) => {
        setIsLocating(false);
        console.warn("Erreur géolocalisation:", error.message);
        alert("Impossible de récupérer la position GPS. Veuillez renseigner l'adresse manuellement.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleConfirm = () => {
    setMode(tempMode);
    if (tempMode === 'dine_in') {
      setTableNumber(tempTable || 'Table 1');
    } else if (tempMode === 'delivery') {
      setDeliveryAddress(tempAddress.trim());
    } else {
      setDeliveryTimeSlot(tempSlot);
    }
    setIsModeModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-5 sm:p-6 text-white relative">
          <button
            onClick={() => setIsModeModalOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
            {t.modeSelection.title}
          </h2>
          <p className="text-orange-100 text-xs mt-1">
            {t.modeSelection.subtitle}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* 3 Choice cards: Dine-In, Delivery, Takeaway */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {/* 1. Dine-In (Sur place à table) */}
            <button
              type="button"
              onClick={() => setTempMode('dine_in')}
              className={`p-3 sm:p-4 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1.5 relative ${
                tempMode === 'dine_in'
                  ? 'border-orange-600 bg-orange-50/80 text-orange-950 shadow-md ring-2 ring-orange-500/20'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              {tempMode === 'dine_in' && (
                <div className="absolute top-1.5 right-1.5 bg-orange-600 text-white p-0.5 rounded-full">
                  <Check className="w-2.5 h-2.5" />
                </div>
              )}
              <div className={`p-2 sm:p-2.5 rounded-2xl ${tempMode === 'dine_in' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="font-extrabold text-xs block leading-tight">{t.modeSelection.dineIn}</span>
                <span className="text-[10px] text-gray-500 leading-tight block mt-0.5 hidden sm:block">
                  {t.modeSelection.dineInDesc}
                </span>
              </div>
            </button>

            {/* 2. Delivery */}
            <button
              type="button"
              onClick={() => setTempMode('delivery')}
              className={`p-3 sm:p-4 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1.5 relative ${
                tempMode === 'delivery'
                  ? 'border-orange-600 bg-orange-50/80 text-orange-950 shadow-md ring-2 ring-orange-500/20'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              {tempMode === 'delivery' && (
                <div className="absolute top-1.5 right-1.5 bg-orange-600 text-white p-0.5 rounded-full">
                  <Check className="w-2.5 h-2.5" />
                </div>
              )}
              <div className={`p-2 sm:p-2.5 rounded-2xl ${tempMode === 'delivery' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <Bike className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="font-extrabold text-xs block leading-tight">{t.modeSelection.delivery}</span>
                <span className="text-[10px] text-gray-500 leading-tight block mt-0.5 hidden sm:block">
                  {t.modeSelection.deliveryDesc}
                </span>
              </div>
            </button>

            {/* 3. Click & Collect (Takeaway) */}
            <button
              type="button"
              onClick={() => setTempMode('takeaway')}
              className={`p-3 sm:p-4 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1.5 relative ${
                tempMode === 'takeaway'
                  ? 'border-orange-600 bg-orange-50/80 text-orange-950 shadow-md ring-2 ring-orange-500/20'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              {tempMode === 'takeaway' && (
                <div className="absolute top-1.5 right-1.5 bg-orange-600 text-white p-0.5 rounded-full">
                  <Check className="w-2.5 h-2.5" />
                </div>
              )}
              <div className={`p-2 sm:p-2.5 rounded-2xl ${tempMode === 'takeaway' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="font-extrabold text-xs block leading-tight">{t.modeSelection.takeaway}</span>
                <span className="text-[10px] text-gray-500 leading-tight block mt-0.5 hidden sm:block">
                  {t.modeSelection.takeawayDesc}
                </span>
              </div>
            </button>
          </div>

          {/* Conditional Inputs based on chosen mode */}
          {tempMode === 'dine_in' && (
            <div className="space-y-3 bg-orange-50/60 p-4 rounded-2xl border border-orange-100 animate-fade-in">
              <label className="block text-xs font-bold text-gray-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-orange-600" />
                  {t.modeSelection.enterTable}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  0 DH Frais de livraison
                </span>
              </label>

              {/* Quick Select Table Pills */}
              <div className="flex flex-wrap gap-1.5">
                {['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Terrasse 1', 'Terrasse 2'].map((tbl) => (
                  <button
                    key={tbl}
                    type="button"
                    onClick={() => setTempTable(tbl)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                      tempTable === tbl
                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {tbl}
                  </button>
                ))}
              </div>

              {/* Custom table number input */}
              <input
                type="text"
                value={tempTable}
                onChange={(e) => setTempTable(e.target.value)}
                placeholder={t.modeSelection.tablePlaceholder}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white font-bold"
              />

              <p className="text-[11px] text-gray-500 text-center">
                🍽️ Votre commande sera préparée et servie directement à votre table.
              </p>
            </div>
          )}

          {tempMode === 'delivery' && (
            <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 animate-fade-in">
              <label className="block text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-600" />
                {t.modeSelection.enterAddress}
              </label>
              <input
                type="text"
                value={tempAddress}
                onChange={(e) => setTempAddress(e.target.value)}
                placeholder="Quartier, Rue, Résidence..."
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              />
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isLocating}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  locSuccess
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                }`}
              >
                <Navigation className={`w-3.5 h-3.5 text-orange-600 ${isLocating ? 'animate-spin' : ''}`} />
                {isLocating
                  ? t.modeSelection.detectingLocation
                  : locSuccess
                  ? 'Position GPS enregistrée ✓'
                  : t.modeSelection.locateMe}
              </button>
              <p className="text-[11px] text-gray-400 text-center">
                Frais fixes de livraison : {restaurant.delivery_fee} {restaurant.currency}
              </p>
            </div>
          )}

          {tempMode === 'takeaway' && (
            <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 animate-fade-in">
              <label className="block text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-600" />
                {t.modeSelection.selectTimeslot}
              </label>
              <p className="text-sm font-bold">{t.modeSelection.asap}</p>
              <p className="text-xs text-slate-600">{t.modeSelection.pickupNotice}</p>
              <p className="text-[11px] text-gray-400 text-center">
                Adresse de retrait : {restaurant.address}
              </p>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-orange-600/30 transition-all active:scale-[0.99] text-xs sm:text-sm"
          >
            {t.modeSelection.confirmChoice}
          </button>
        </div>
      </div>
    </div>
  );
};
