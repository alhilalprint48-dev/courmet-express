'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  Banknote, 
  CreditCard, 
  MapPin, 
  User, 
  Phone, 
  FileText, 
  Bike, 
  ShoppingBag, 
  Navigation, 
  ShieldCheck,
  AlertCircle,
  UtensilsCrossed,
  CheckCircle2
} from 'lucide-react';
import { PaymentMethod } from '@/types';
import { RESTAURANT_INFO } from '@/data/mockData';

export const CheckoutModal: React.FC = () => {
  const { 
    isCheckoutOpen, 
    setIsCheckoutOpen, 
    cart, 
    removeFromCart, 
    updateQuantity, 
    subtotal, 
    deliveryFee, 
    total, 
    mode, 
    tableNumber,
    setIsModeModalOpen,
    deliveryAddress, 
    setDeliveryAddress, 
    deliveryTimeSlot, 
    gpsCoords, 
    setGpsCoords, 
    placeOrder, 
    language, 
    t,
    blacklist
  } = useApp();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState(deliveryAddress);
  const [landmark, setLandmark] = useState('');
  const [instructions, setInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashChangeOption, setCashChangeOption] = useState<'exact' | '100' | '200' | 'other'>('200');
  const [customCashAmount, setCustomCashAmount] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Anti-fraud & OTP Verification State
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [otpToast, setOtpToast] = useState<string | null>(null);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const MAX_COD_LIMIT = 500; // 500 DH max COD sans acompte

  if (!isCheckoutOpen) return null;

  const handleSendOtp = () => {
    const cleaned = phone.replace(/\s+/g, '');
    if (cleaned.length < 8) {
      setErrorMessage(
        language === 'ar'
          ? 'يرجى إدخال رقم هاتف صحيح لإرسال رمز التحقق'
          : 'Veuillez saisir un numéro de téléphone valide pour recevoir le code.'
      );
      return;
    }

    // Check blacklist from database/admin
    if (blacklist.includes(cleaned)) {
      setErrorMessage(
        language === 'ar'
          ? 'عذراً، هذا الرقم محظور بسبب سوابق عدم استلام الطلبات. يرجى الاتصال بالمطعم مباشرة.'
          : 'Ce numéro de téléphone est bloqué suite à des incidents de livraison. Veuillez contacter le restaurant directement.'
      );
      return;
    }

    const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(randomOtp);
    setOtpAttempts(0);
    setIsOtpSent(true);
    setOtpError(null);
    setErrorMessage(null);
    setOtpToast(`📱 SMS Resto Express pour ${cleaned} : Votre code de validation est [ ${randomOtp} ]`);
  };

  const handleVerifyOtp = () => {
    if (!generatedOtp) {
      setOtpError("Veuillez demander l'envoi d'un nouveau code.");
      return;
    }

    if (otpAttempts >= 2 && otpCode.trim() !== generatedOtp) {
      setOtpError("Nombre maximal de tentatives dépassé. Veuillez redemander un code SMS.");
      setIsOtpSent(false);
      setGeneratedOtp(null);
      setOtpToast(null);
      return;
    }

    if (otpCode.trim() === generatedOtp) {
      setIsPhoneVerified(true);
      setOtpError(null);
      setOtpToast(null);
    } else {
      const nextAttempts = otpAttempts + 1;
      setOtpAttempts(nextAttempts);
      setOtpError(
        language === 'ar'
          ? `رمز التحقق غير صحيح. تبقى لك ${3 - nextAttempts} محاولة.`
          : `Code OTP incorrect. Il vous reste ${3 - nextAttempts} tentative(s).`
      );
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setGpsCoords({ lat: latitude, lng: longitude });
        setIsLocating(false);
        if (!address) {
          setAddress(`Position GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn(err);
      },
      { timeout: 8000 }
    );
  };

  const handleConfirmOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const isDineIn = mode === 'dine_in';
    let finalFullName = fullName.trim();
    let cleanedPhone = phone.replace(/\s+/g, '');

    if (isDineIn) {
      // Pour les clients à table, le nom et le téléphone sont optionnels
      if (!finalFullName) {
        finalFullName = language === 'ar' ? `زبون ${tableNumber}` : `Client ${tableNumber}`;
      }
      if (!cleanedPhone) {
        cleanedPhone = '-';
      }
    } else {
      // Obligatoire uniquement pour la livraison et le à emporter
      if (!finalFullName || !cleanedPhone) {
        setErrorMessage(t.checkout.errorRequiredFields);
        return;
      }

      if (mode === 'delivery' && !address.trim()) {
        setErrorMessage(t.checkout.errorRequiredFields);
        return;
      }

      // Phone simple sanity check (format marocain ou international)
      if (cleanedPhone.length < 8) {
        setErrorMessage(
          language === 'ar'
            ? 'يرجى إدخال رقم هاتف صحيح مكون من 8 أرقام على الأقل'
            : 'Veuillez saisir un numéro de téléphone valide.'
        );
        return;
      }

      // Anti-fraud Blacklist check
      if (blacklist.includes(cleanedPhone)) {
        setErrorMessage(
          language === 'ar'
            ? 'عذراً، هذا الرقم مسجل في القائمة السوداء للمطعم. يرجى التواصل هاتفياً.'
            : 'Ce numéro de téléphone est bloqué (Blacklisté). Veuillez contacter le restaurant par téléphone.'
        );
        return;
      }

      // Anti-fraud COD Limit check
      if (total > MAX_COD_LIMIT && paymentMethod === 'cash') {
        setErrorMessage(
          language === 'ar'
            ? `المبلغ يتجاوز ${MAX_COD_LIMIT} درهم. يرجى تأكيد الطلب هاتفياً أو تقليص الكمية.`
            : `Le montant total dépasse le plafond autorisé de ${MAX_COD_LIMIT} DH en paiement à la livraison sans acompte.`
        );
        return;
      }
    }

    let cashChangeText = undefined;
    if (paymentMethod === 'cash') {
      if (cashChangeOption === 'exact') cashChangeText = "Appoint exact";
      else if (cashChangeOption === '100') cashChangeText = "Billet de 100 DH";
      else if (cashChangeOption === '200') cashChangeText = "Billet de 200 DH";
      else cashChangeText = customCashAmount ? `Billet de ${customCashAmount} DH` : "Autre billet";
    }

    placeOrder({
      fullName: finalFullName,
      phone: cleanedPhone,
      address: isDineIn ? `Sur place - ${tableNumber}` : mode === 'delivery' ? address.trim() : RESTAURANT_INFO.address,
      landmark: landmark.trim() || undefined,
      specialInstructions: instructions.trim() || undefined,
      paymentMethod,
      cashChangeAmount: cashChangeText,
      gpsCoords: isDineIn ? undefined : gpsCoords,
      deliveryTimeSlot: mode === 'takeaway' ? deliveryTimeSlot : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-dark-900 to-dark-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-600 rounded-xl text-white">
              {mode === 'dine_in' ? (
                <UtensilsCrossed className="w-5 h-5" />
              ) : mode === 'delivery' ? (
                <Bike className="w-5 h-5" />
              ) : (
                <ShoppingBag className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {t.checkout.title}
              </h2>
              <p className="text-xs text-gray-300">
                {mode === 'dine_in'
                  ? `${t.modeSelection.dineIn || 'Sur place à table'} • ${tableNumber}`
                  : mode === 'delivery'
                  ? t.modeSelection.delivery
                  : t.modeSelection.takeaway}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCheckoutOpen(false)}
            className="p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Cart Summary Section */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-3">
              {t.cart.title} ({cart.length})
            </h3>
            {cart.length === 0 ? (
              <p className="text-sm text-gray-400 py-3 text-center">{t.cart.emptyTitle}</p>
            ) : (
              <div className="space-y-3 divide-y divide-gray-200/60">
                {cart.map((item) => (
                  <div key={item.cartItemId} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-gray-900 leading-snug">
                        {item.product.name[language]}
                      </h4>
                      {/* Options selected */}
                      {item.selectedOptions.length > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.selectedOptions.map((o) => o.optionName[language]).join(', ')}
                        </p>
                      )}
                      {item.specialInstructions && (
                        <p className="text-[11px] text-amber-600 italic mt-0.5">
                          Note: {item.specialInstructions}
                        </p>
                      )}
                      <span className="font-extrabold text-xs text-primary-600 block mt-1">
                        {item.totalPrice} {t.currency}
                      </span>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl p-1 shadow-2xs">
                      <button
                        onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-600"
                      >
                        {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-red-500" /> : <Minus className="w-3.5 h-3.5" />}
                      </button>
                      <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-600"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Financial Breakdown */}
            {cart.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200 text-xs space-y-1.5 text-gray-600">
                <div className="flex justify-between">
                  <span>{t.cart.subtotal}</span>
                  <span className="font-bold">{subtotal} {t.currency}</span>
                </div>
                {mode === 'delivery' && (
                  <div className="flex justify-between">
                    <span>{t.cart.deliveryFee}</span>
                    <span className="font-bold">{deliveryFee} {t.currency}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-gray-900 pt-1 border-t border-gray-200">
                  <span>{t.cart.total}</span>
                  <span className="text-primary-600 font-black">{total} {t.currency}</span>
                </div>
              </div>
            )}
          </div>

          {/* Customer Details Form */}
          {cart.length > 0 && (
            <form onSubmit={handleConfirmOrder} className="space-y-4">
              {/* DINE-IN MODE: Zero-Friction 1-Click Ordering */}
              {mode === 'dine_in' ? (
                <div className="space-y-3">
                  {/* Table Identification Banner */}
                  <div className="bg-amber-50/90 border border-amber-200/90 p-3.5 rounded-2xl flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-xs">
                        <UtensilsCrossed className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-amber-900 block uppercase tracking-wider">
                          {language === 'ar' ? 'طلب مباشر على الطاولة' : 'Commande directe à table'}
                        </span>
                        <span className="text-sm font-black text-amber-950">
                          {tableNumber}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsModeModalOpen(true)}
                      className="text-xs font-bold text-amber-900 bg-white border border-amber-300 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-colors shadow-2xs"
                    >
                      {language === 'ar' ? 'تغيير الطاولة' : 'Changer de table'}
                    </button>
                  </div>

                  {/* Express Table Notice (No Name/Phone required) */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-start gap-2.5 text-emerald-900 text-xs">
                    <span className="text-base leading-none mt-0.5">⚡</span>
                    <div>
                      <p className="font-bold">
                        {language === 'ar'
                          ? 'طلب فوري ومباشر بدون استمارة'
                          : 'Commande Express sans formulaire'}
                      </p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        {language === 'ar'
                          ? 'أنت جالس بالفعل على الطاولة! لا داعي لإدخال اسمك أو هاتفك، طلبك يرسل فوراً إلى شاشة المطبخ.'
                          : 'Vous êtes déjà installé à table. Aucun nom ni téléphone obligatoire : votre commande part immédiatement en cuisine !'}
                      </p>
                    </div>
                  </div>

                  {/* Optional personalization fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">
                        {language === 'ar' ? 'الاسم أو اللقب (اختياري)' : 'Votre prénom (optionnel)'}
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={language === 'ar' ? `افتراضي: زبون ${tableNumber}` : `Par défaut: Client ${tableNumber}`}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 block mb-1">
                        {language === 'ar' ? 'رقم الواتساب للتذكرة (اختياري)' : 'WhatsApp pour le reçu (optionnel)'}
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="ex: 06 12 34 56 78"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                      />
                    </div>
                  </div>

                  {/* Special Kitchen Instructions */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-primary-600" />
                      {language === 'ar' ? 'ملاحظة خاصة للمطبخ (اختياري)' : 'Remarque pour la cuisine (optionnel)'}
                    </label>
                    <input
                      type="text"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder={language === 'ar' ? 'مثال: بدون بصل، صوص جانبي، طهي جيد...' : 'Ex: Sans oignons, bien cuit, sauce à part...'}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                    />
                  </div>
                </div>
              ) : (
                /* DELIVERY & TAKEAWAY MODES: Customer Details Form */
                <>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500">
                    {t.checkout.customerInfo}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Full Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-primary-600" />
                        {t.checkout.fullName} *
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="ex: Youssef El Amrani"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-primary-600" />
                          {t.checkout.phone} *
                        </label>
                        {isPhoneVerified && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            ✓ Numéro Vérifié
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            setIsPhoneVerified(false);
                            setIsOtpSent(false);
                          }}
                          placeholder={t.checkout.phonePlaceholder}
                          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                        {!isPhoneVerified && (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-primary-700 rounded-xl text-xs font-bold whitespace-nowrap transition-colors"
                          >
                            {isOtpSent ? 'Renvoyer code' : 'Code SMS'}
                          </button>
                        )}
                      </div>

                      {/* Live SMS Toast Simulation */}
                      {otpToast && (
                        <div className="bg-emerald-950 text-emerald-200 border border-emerald-800 p-2.5 rounded-xl text-xs flex items-center gap-2 animate-fadeIn shadow-md">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="font-mono text-[11px]">{otpToast}</span>
                        </div>
                      )}

                      {/* OTP Code Input Box */}
                      {isOtpSent && !isPhoneVerified && (
                        <div className="bg-orange-50 p-3 rounded-xl border border-orange-200 space-y-2 mt-1 animate-fade-in">
                          <span className="text-[11px] font-semibold text-orange-950 block">
                            {language === 'ar' ? 'أدخل رمز التحقق المكون من 4 أرقام :' : 'Saisissez le code SMS reçu à 4 chiffres :'}
                          </span>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={4}
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value)}
                              placeholder="••••"
                              className="w-24 text-center font-mono font-black text-sm p-2 border rounded-lg bg-white tracking-widest"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyOtp}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                              Valider
                            </button>
                          </div>
                          {otpError && (
                            <p className="text-[11px] font-bold text-red-600">{otpError}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Special Instructions for Takeaway */}
                  {mode === 'takeaway' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-primary-600" />
                        {language === 'ar' ? 'ملاحظة للمطبخ (اختياري)' : 'Remarque pour la cuisine (optionnel)'}
                      </label>
                      <input
                        type="text"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder={language === 'ar' ? 'مثال: بدون بصل، صوص جانبي...' : 'Ex: Sans oignons, bien cuit, sauce à part...'}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                      />
                    </div>
                  )}

                  {/* Delivery specific fields */}
                  {mode === 'delivery' && (
                    <div className="space-y-3 bg-orange-50/50 p-3.5 rounded-2xl border border-orange-100">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-primary-600" />
                            {t.checkout.address} *
                          </label>
                          <button
                            type="button"
                            onClick={handleLocateMe}
                            className="text-[11px] font-bold text-primary-700 flex items-center gap-1 hover:underline"
                          >
                            <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                            {gpsCoords ? '✓ GPS activé' : t.modeSelection.locateMe}
                          </button>
                        </div>
                        <input
                          type="text"
                          required
                          value={address}
                          onChange={(e) => {
                            setAddress(e.target.value);
                            setDeliveryAddress(e.target.value);
                          }}
                          placeholder={t.checkout.addressPlaceholder}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                          placeholder={t.checkout.landmark}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                        />
                        <input
                          type="text"
                          value={instructions}
                          onChange={(e) => setInstructions(e.target.value)}
                          placeholder={t.checkout.instructionsPlaceholder}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Payment Method Selector (Default: Pay on Delivery) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    {t.checkout.paymentTitle}
                  </label>
                  <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {t.cart.deliveryNotice}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Cash Option */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-primary-600 bg-orange-50 font-bold text-primary-950 ring-1 ring-primary-500'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    <Banknote className="w-5 h-5 text-primary-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold block">{t.checkout.cash}</span>
                      <span className="text-[10px] text-gray-500 block leading-tight">
                        {mode === 'dine_in' 
                          ? (language === 'ar' ? 'نقداً للنادل' : 'Au serveur à table')
                          : 'À la réception'}
                      </span>
                    </div>
                  </button>

                  {/* TPE Option */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('tpe')}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                      paymentMethod === 'tpe'
                        ? 'border-primary-600 bg-orange-50 font-bold text-primary-950 ring-1 ring-primary-500'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-primary-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold block">{t.checkout.tpe}</span>
                      <span className="text-[10px] text-gray-500 block leading-tight">
                        {mode === 'dine_in'
                          ? (language === 'ar' ? 'TPE على الطاولة' : 'TPE à table')
                          : 'Sans contact'}
                      </span>
                    </div>
                  </button>
                </div>

                {/* Cash change sub-options (only for delivery/takeaway) */}
                {paymentMethod === 'cash' && mode !== 'dine_in' && (
                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 space-y-2 mt-2">
                    <label className="text-[11px] font-bold text-gray-600 block">
                      {t.checkout.cashNeedChange}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: '200', label: t.checkout.cashBill200 },
                        { id: '100', label: t.checkout.cashBill100 },
                        { id: 'exact', label: t.checkout.cashExact },
                        { id: 'other', label: t.checkout.cashOther },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCashChangeOption(item.id as any)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition-all ${
                            cashChangeOption === item.id
                              ? 'bg-primary-600 text-white border-primary-600 font-bold shadow-xs'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    {cashChangeOption === 'other' && (
                      <input
                        type="number"
                        value={customCashAmount}
                        onChange={(e) => setCustomCashAmount(e.target.value)}
                        placeholder="Ex: 500 DH"
                        className="w-full mt-2 px-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-primary-500 bg-white"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Error message */}
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 px-4 rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-between text-base transition-all active:scale-[0.99] mt-4"
              >
                <span>
                  {mode === 'dine_in'
                    ? (language === 'ar' ? `إرسال الطلب للمطبخ (${tableNumber}) ⚡` : `Envoyer en cuisine (${tableNumber}) ⚡`)
                    : t.checkout.placeOrder}
                </span>
                <span className="bg-emerald-700 px-3 py-1 rounded-xl text-sm font-extrabold">
                  {total} {t.currency}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
