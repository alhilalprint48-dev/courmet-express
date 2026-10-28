'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Bike, 
  Phone, 
  Navigation, 
  CheckCircle, 
  Banknote, 
  CreditCard, 
  MapPin, 
  Clock, 
  AlertCircle,
  ExternalLink,
  ArrowLeft,
  DollarSign
} from 'lucide-react';
import { Order } from '@/types';
import { supabase } from '@/lib/supabase';
import { StaffAuthGate } from '@/components/StaffAuthGate';

function DeliveryPage() {
  const [deliveries, setDeliveries] = useState<Order[]>([]);
  const [collectedAmounts, setCollectedAmounts] = useState<{ [key: string]: boolean }>({});

  const fetchDeliveries = async () => {
    try {
      // 1. Fetch live delivery orders from Supabase
      const { data: supaOrders } = await supabase
        .from('orders')
        .select(`*, order_items (*)`)
        .eq('mode', 'delivery')
        .in('status', ['new', 'preparing', 'ready', 'delivering'])
        .order('created_at', { ascending: false });

      if (supaOrders && supaOrders.length > 0) {
        const formatted: Order[] = supaOrders.map((o) => {
          const createdAtDate = new Date(o.created_at);
          const timeStr = createdAtDate.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          });

          const items = (o.order_items || []).map((oi: any) => ({
            cartItemId: oi.id,
            product: {
              id: oi.product_id || oi.id,
              categoryId: '',
              name: { fr: oi.product_name_fr, ar: oi.product_name_fr },
              description: { fr: '', ar: '' },
              price: Number(oi.unit_price) || 0,
              image: '',
              allergens: [],
              isAvailable: true,
            },
            selectedOptions: [],
            quantity: Number(oi.quantity) || 1,
            unitPrice: Number(oi.unit_price) || 0,
            totalPrice: Number(oi.total_price) || 0,
            specialInstructions: oi.special_instructions,
          }));

          return {
            id: o.id,
            orderNumber: o.order_number,
            createdAt: timeStr,
            status: o.status,
            mode: 'delivery',
            items: items.length > 0 ? items : [
              {
                cartItemId: o.id + '_item',
                product: {
                  id: 'p1',
                  categoryId: '',
                  name: { fr: 'Commande Livraison', ar: '' },
                  description: { fr: '', ar: '' },
                  price: Number(o.subtotal) || 0,
                  image: '',
                  allergens: [],
                  isAvailable: true,
                },
                selectedOptions: [],
                quantity: 1,
                unitPrice: Number(o.subtotal) || 0,
                totalPrice: Number(o.subtotal) || 0,
              }
            ],
            discountAmount: Number(o.discount_amount || 0), pointsRedeemed: Number(o.points_redeemed || 0),
            subtotal: Number(o.subtotal) || 0,
            deliveryFee: Number(o.delivery_fee ?? 0),
            total: Number(o.total) || 0,
            customer: {
              fullName: o.customer_name || 'Client',
              phone: o.customer_phone || '-',
              address: o.customer_address || '',
              landmark: o.customer_landmark,
              specialInstructions: o.special_instructions,
              deliveryTimeSlot: o.delivery_timeslot,
              paymentMethod: o.payment_method || 'cash',
              cashChangeAmount: o.cash_change_amount,
              gpsCoords: o.gps_lat ? { lat: Number(o.gps_lat), lng: Number(o.gps_lng) } : undefined,
            },
          };
        });

        setDeliveries(formatted);
        return;
      }

      setDeliveries([]);
    } catch (e) {
      console.warn("Failed to fetch deliveries:", e);
    }
  };

  React.useEffect(() => {
    fetchDeliveries();
    const interval = setInterval(fetchDeliveries, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleCollected = (orderId: string) => {
    setCollectedAmounts((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const handleFinishDelivery = async (orderId: string) => {
    const { data, error } = await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId).select('id');
    if (error || !data?.length) alert('Clôture refusée. Vérifiez vos droits et le statut.');
    await fetchDeliveries();
  };

  const openGpsNavigation = (order: Order) => {
    if (order.customer.gpsCoords) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${order.customer.gpsCoords.lat},${order.customer.gpsCoords.lng}`,
        '_blank'
      );
    } else {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          order.customer.address + ', Casablanca'
        )}`,
        '_blank'
      );
    }
  };

  const activeDeliveries = deliveries.filter((d) => d.status !== 'delivered');
  const finishedDeliveries = deliveries.filter((d) => d.status === 'delivered');

  return (
    <>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans max-w-lg mx-auto">
      {/* Header Livreur */}
      <div className="bg-slate-800 border-b border-slate-700/80 p-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="p-2 bg-emerald-600 text-white rounded-xl">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-black text-base leading-tight">Module Coursier</h1>
              <span className="text-[11px] text-emerald-400 font-bold">Livreur #04 (En service)</span>
            </div>
          </div>

          <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-mono font-bold">
            <span className="text-orange-400">{activeDeliveries.length}</span> en cours
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4 flex-1">
        {activeDeliveries.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/60 rounded-3xl border border-slate-700 p-6 space-y-3">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-base text-white">Toutes les livraisons sont terminées !</h3>
            <p className="text-xs text-slate-400">En attente de nouvelles commandes de la cuisine...</p>
          </div>
        ) : (
          activeDeliveries.map((order) => {
            const isCash = order.customer.paymentMethod === 'cash';
            const isPaid = collectedAmounts[order.id] || false;

            return (
              <div
                key={order.id}
                className="bg-slate-800 rounded-3xl border-2 border-slate-700 overflow-hidden shadow-xl"
              >
                {/* Order Top Bar */}
                <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-white">{order.orderNumber}</span>
                    <span className="text-xs bg-orange-500/20 text-orange-400 font-bold px-2 py-0.5 rounded-full border border-orange-500/30">
                      {order.status === 'delivering' ? 'En cours' : 'Prête resto'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-emerald-400 block">{order.total} DH</span>
                    <span className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                      {isCash ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                      {isCash ? 'Espèces' : 'TPE CB'}
                    </span>
                  </div>
                </div>

                {/* Customer & Address Details */}
                <div className="p-4 space-y-3 text-xs">
                  {/* Name & Phone */}
                  <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-700/60">
                    <div>
                      <span className="font-bold text-white text-sm block">{order.customer.fullName}</span>
                      <span className="text-slate-400 text-xs font-mono">{order.customer.phone}</span>
                    </div>

                    {/* Direct Call Button (1 clic) */}
                    <a
                      href={`tel:${order.customer.phone}`}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3.5 py-2 rounded-xl text-xs shadow-md shadow-emerald-600/30 transition-all active:scale-95"
                    >
                      <Phone className="w-4 h-4 fill-current" />
                      <span>Appeler</span>
                    </a>
                  </div>

                  {/* Delivery Address */}
                  <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-700/60 space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-100 text-xs leading-relaxed">{order.customer.address}</p>
                        {order.customer.landmark && (
                          <p className="text-orange-300 font-medium text-[11px] mt-0.5">
                            Repère : {order.customer.landmark}
                          </p>
                        )}
                        {order.customer.specialInstructions && (
                          <p className="text-amber-400 text-[11px] mt-1 bg-amber-950/40 px-2 py-1 rounded border border-amber-800/30">
                            Note : {order.customer.specialInstructions}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Direct GPS Navigation Button (Google Maps / Waze) */}
                    <button
                      type="button"
                      onClick={() => openGpsNavigation(order)}
                      className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs shadow-md shadow-blue-600/30 transition-all active:scale-95"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Ouvrir dans Google Maps / Waze</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                    </button>
                  </div>

                  {/* Cash Change info if applicable */}
                  {isCash && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl text-amber-300">
                      <span className="font-bold block text-[11px]">Attention Monnaie :</span>
                      <p className="text-xs font-semibold">{order.customer.cashChangeAmount || 'Prévoir monnaie'}</p>
                    </div>
                  )}

                  {/* Collection Checklist Box */}
                  <div className="pt-2">
                    <label
                      onClick={() => handleToggleCollected(order.id)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                        isPaid
                          ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                          isPaid
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-500 bg-slate-800'
                        }`}
                      >
                        {isPaid && <CheckCircle className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <span className="font-bold text-xs block">
                          Montant encaissé : <strong className="text-white text-sm">{order.total} DH</strong>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {isCash ? 'Espèces reçues du client' : 'Ticket TPE bancaire validé'}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Final Button */}
                <div className="p-3 bg-slate-800/80 border-t border-slate-700">
                  <button
                    disabled={!isPaid}
                    onClick={() => handleFinishDelivery(order.id)}
                    className={`w-full py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                      isPaid
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 active:scale-[0.98]'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Valider & Clôturer la livraison</span>
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* History / Finished Deliveries summary */}
        {finishedDeliveries.length > 0 && (
          <div className="pt-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Livraisons terminées ({finishedDeliveries.length})
            </h3>
            <div className="space-y-2">
              {finishedDeliveries.map((d) => (
                <div
                  key={d.id}
                  className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/60 flex items-center justify-between text-xs opacity-75"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-bold text-white block">{d.orderNumber} - {d.customer.fullName}</span>
                      <span className="text-[10px] text-slate-400">{d.customer.address}</span>
                    </div>
                  </div>
                  <span className="font-black text-emerald-400">{d.total} DH</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

export default function ProtectedPage() { return <StaffAuthGate role="livreur" title="Espace Coursier & Livreur" subtitle="Connectez-vous avec votre compte livreur"><DeliveryPage /></StaffAuthGate>; }
