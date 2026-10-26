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
  Clock 
} from 'lucide-react';
import { TIME_SLOTS, RESTAURANT_INFO } from '@/data/mockData';

export const ConsumptionModeModal: React.FC = () => {
  const { 
    isModeModalOpen, 
    setIsModeModalOpen, 
    mode, 
    setMode, 
    deliveryAddress, 
    setDeliveryAddress, 
    deliveryTimeSlot, 
    setDeliveryTimeSlot, 
    setGpsCoords, 
    t 
  } = useApp();

  const [tempMode, setTempMode] = useState(mode);
  const [tempAddress, setTempAddress] = useState(deliveryAddress);
  const [tempSlot, setTempSlot] = useState(deliveryTimeSlot);
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
    if (tempMode === 'delivery') {
      setDeliveryAddress(tempAddress || "Casablanca centre");
    } else {
      setDeliveryTimeSlot(tempSlot);
    }
    setIsModeModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6 text-white relative">
          <button
            onClick={() => setIsModeModalOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-extrabold tracking-tight">
            {t.modeSelection.title}
          </h2>
          <p className="text-orange-100 text-xs mt-1">
            {t.modeSelection.subtitle}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Choice cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Delivery Option */}
            <button
              type="button"
              onClick={() => setTempMode('delivery')}
              className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col items-center justify-center text-center gap-2 relative ${
                tempMode === 'delivery'
                  ? 'border-primary-600 bg-orange-50/70 text-primary-950 shadow-md ring-2 ring-primary-500/20'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              {tempMode === 'delivery' && (
                <div className="absolute top-2 right-2 bg-primary-600 text-white p-0.5 rounded-full">
                  <Check className="w-3 h-3" />
                </div>
              )}
              <div className={`p-3 rounded-full ${tempMode === 'delivery' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <Bike className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-sm block">{t.modeSelection.delivery}</span>
                <span className="text-[11px] text-gray-500 leading-tight block mt-0.5">
                  {t.modeSelection.deliveryDesc}
                </span>
              </div>
            </button>

            {/* Click & Collect Option */}
            <button
              type="button"
              onClick={() => setTempMode('takeaway')}
              className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col items-center justify-center text-center gap-2 relative ${
                tempMode === 'takeaway'
                  ? 'border-primary-600 bg-orange-50/70 text-primary-950 shadow-md ring-2 ring-primary-500/20'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              {tempMode === 'takeaway' && (
                <div className="absolute top-2 right-2 bg-primary-600 text-white p-0.5 rounded-full">
                  <Check className="w-3 h-3" />
                </div>
              )}
              <div className={`p-3 rounded-full ${tempMode === 'takeaway' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-sm block">{t.modeSelection.takeaway}</span>
                <span className="text-[11px] text-gray-500 leading-tight block mt-0.5">
                  {t.modeSelection.takeawayDesc}
                </span>
              </div>
            </button>
          </div>

          {/* Conditional Inputs */}
          {tempMode === 'delivery' ? (
            <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <label className="block text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary-600" />
                {t.modeSelection.enterAddress}
              </label>
              <input
                type="text"
                value={tempAddress}
                onChange={(e) => setTempAddress(e.target.value)}
                placeholder="Quartier, Rue, Résidence..."
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
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
                <Navigation className={`w-3.5 h-3.5 text-primary-600 ${isLocating ? 'animate-spin' : ''}`} />
                {isLocating
                  ? t.modeSelection.detectingLocation
                  : locSuccess
                  ? 'Position GPS enregistrée ✓'
                  : t.modeSelection.locateMe}
              </button>
              <p className="text-[11px] text-gray-400 text-center">
                Frais fixes de livraison : {RESTAURANT_INFO.deliveryFee} {t.currency}
              </p>
            </div>
          ) : (
            <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <label className="block text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary-600" />
                {t.modeSelection.selectTimeslot}
              </label>
              <select
                value={tempSlot}
                onChange={(e) => setTempSlot(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white font-medium"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 text-center">
                Adresse de retrait : {RESTAURANT_INFO.address}
              </p>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-primary-600/30 transition-all active:scale-[0.99] text-sm"
          >
            {t.modeSelection.confirmChoice}
          </button>
        </div>
      </div>
    </div>
  );
};
