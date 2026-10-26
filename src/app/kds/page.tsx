'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ChefHat, 
  Printer, 
  Volume2, 
  VolumeX, 
  Clock, 
  MapPin, 
  Phone, 
  CheckCircle, 
  Bike, 
  ArrowLeft, 
  ShoppingBag,
  Banknote,
  CreditCard,
  AlertTriangle,
  UtensilsCrossed,
  Trash2
} from 'lucide-react';
import { Order, OrderStatus } from '@/types';
import { RESTAURANT_INFO } from '@/data/mockData';
import { supabase } from '@/lib/supabase';

// Mock initial live orders for demo
const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord_1',
    orderNumber: 'CMD-1042',
    createdAt: '13:12',
    status: 'new',
    mode: 'delivery',
    items: [
      {
        cartItemId: '1',
        product: {
          id: 'b1',
          categoryId: 'burgers',
          name: { fr: 'Le Truffe & Bacon Burger', ar: 'برجر الكمأة' },
          description: { fr: '', ar: '' },
          price: 68,
          image: '',
          allergens: [],
          isAvailable: true,
        },
        selectedOptions: [
          { groupId: '1', groupName: { fr: 'Cuisson', ar: '' }, optionId: '1', optionName: { fr: 'À point', ar: '' }, price: 0 },
          { groupId: '2', groupName: { fr: 'Supplément', ar: '' }, optionId: '2', optionName: { fr: 'Double Cheddar', ar: '' }, price: 8 },
        ],
        quantity: 2,
        unitPrice: 76,
        totalPrice: 152,
        specialInstructions: 'Sans sauce pimentée SVP',
      },
      {
        cartItemId: '2',
        product: {
          id: 'd1',
          categoryId: 'drinks',
          name: { fr: 'Limonade Maison Menthe & Citron', ar: '' },
          description: { fr: '', ar: '' },
          price: 22,
          image: '',
          allergens: [],
          isAvailable: true,
        },
        selectedOptions: [],
        quantity: 2,
        unitPrice: 22,
        totalPrice: 44,
      }
    ],
    subtotal: 196,
    deliveryFee: 15,
    total: 211,
    customer: {
      fullName: 'Karim Bennani',
      phone: '06 61 23 45 67',
      address: '24 Rue Ibn Sina, Résidence Les Fleurs, 4ème étage',
      landmark: 'Près de la Banque Populaire',
      specialInstructions: 'Sonnette en panne, merci d\'appeler à l\'arrivée',
      paymentMethod: 'cash',
      cashChangeAmount: 'Billet de 200 DH + appoint',
    }
  },
  {
    id: 'ord_2',
    orderNumber: 'CMD-1041',
    createdAt: '12:58',
    status: 'preparing',
    mode: 'takeaway',
    items: [
      {
        cartItemId: '3',
        product: {
          id: 'p1',
          categoryId: 'pizzas',
          name: { fr: 'Pizza Burrata & Pesto', ar: '' },
          description: { fr: '', ar: '' },
          price: 75,
          image: '',
          allergens: [],
          isAvailable: true,
        },
        selectedOptions: [
          { groupId: '1', groupName: { fr: 'Pâte', ar: '' }, optionId: '1', optionName: { fr: 'Croûte au fromage', ar: '' }, price: 15 },
        ],
        quantity: 1,
        unitPrice: 90,
        totalPrice: 90,
      }
    ],
    subtotal: 90,
    deliveryFee: 0,
    total: 90,
    customer: {
      fullName: 'Sarah Alami',
      phone: '06 72 88 99 00',
      address: RESTAURANT_INFO.address,
      deliveryTimeSlot: '13:30 - 13:45',
      paymentMethod: 'tpe',
    }
  }
];

export default function KdsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedTicketOrder, setSelectedTicketOrder] = useState<Order | null>(null);
  const [ticketType, setTicketType] = useState<'kitchen' | 'delivery'>('kitchen');
  const previousOrdersCount = React.useRef<number>(0);

  // Fetch orders from Supabase (Persistent Database) with fallback to shared API
  const fetchOrders = async () => {
    try {
      // 1. Fetch from Supabase
      const { data: supaOrders, error: supaErr } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false })
        .limit(35);

      if (supaOrders && supaOrders.length > 0) {
        const mappedOrders: Order[] = supaOrders.map((o) => {
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
            selectedOptions: (oi.selected_options || []).map((so: any) => ({
              groupId: so.groupId || '',
              groupName: so.groupName || { fr: '', ar: '' },
              optionId: so.optionId || '',
              optionName: so.optionName || { fr: so.optionName?.fr || '', ar: '' },
              price: Number(so.price) || 0,
            })),
            quantity: Number(oi.quantity) || 1,
            unitPrice: Number(oi.unit_price) || 0,
            totalPrice: Number(oi.total_price) || 0,
            specialInstructions: oi.special_instructions,
          }));

          // Fallback if order_items was not yet populated for older records
          const finalItems = items.length > 0 ? items : [
            {
              cartItemId: o.id + '_gen',
              product: {
                id: 'prod_gen',
                categoryId: '',
                name: { 
                  fr: o.mode === 'dine_in' 
                    ? `Commande Sur Place (${o.table_number || 'À Table'})` 
                    : `Commande ${o.mode === 'delivery' ? 'Livraison' : 'À emporter'}`, 
                  ar: '' 
                },
                description: { fr: '', ar: '' },
                price: Number(o.subtotal) || Number(o.total) || 0,
                image: '',
                allergens: [],
                isAvailable: true,
              },
              selectedOptions: [],
              quantity: 1,
              unitPrice: Number(o.subtotal) || Number(o.total) || 0,
              totalPrice: Number(o.subtotal) || Number(o.total) || 0,
              specialInstructions: o.special_instructions,
            }
          ];

          return {
            id: o.id,
            orderNumber: o.order_number,
            createdAt: timeStr,
            status: o.status as OrderStatus,
            mode: o.mode,
            tableNumber: o.table_number || (o.mode === 'dine_in' ? 'Table' : undefined),
            items: finalItems,
            subtotal: Number(o.subtotal) || 0,
            deliveryFee: Number(o.delivery_fee) || 0,
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

        // Trigger alert if new orders arrived
        if (previousOrdersCount.current > 0 && mappedOrders.length > previousOrdersCount.current) {
          playAlertSound();
        }
        previousOrdersCount.current = mappedOrders.length;
        setOrders(mappedOrders);
        return;
      }

      // 2. Fallback to API endpoint if Supabase has 0 orders
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data: Order[] = await res.json();
        if (previousOrdersCount.current > 0 && data.length > previousOrdersCount.current) {
          playAlertSound();
        }
        previousOrdersCount.current = data.length;
        setOrders(data);
      }
    } catch (e) {
      console.warn("Failed to fetch KDS orders:", e);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);

    // Supabase Realtime channel subscription for instant live push
    const channel = supabase
      .channel('kds-live-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  // Audio beep generator using Web Audio API (no external asset needed)
  const playAlertSound = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.15); // High beep
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn("Audio Context blocked:", e);
    }
  };

  const updateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    // Optimistic UI update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );

    try {
      // 1. Update in Supabase cloud database
      await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId);

      // 2. Update local API in-memory
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: nextStatus }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer définitivement cette commande ?")) {
      return;
    }

    // Optimistic UI update
    setOrders((prev) => prev.filter((o) => o.id !== orderId));

    try {
      // 1. Delete associated order_items first
      await supabase.from('order_items').delete().eq('order_id', orderId);
      // 2. Delete order from Supabase
      await supabase.from('orders').delete().eq('id', orderId);
      // 3. Delete in local API
      await fetch(`/api/orders?orderId=${orderId}`, { method: 'DELETE' }).catch(() => {});
    } catch (err) {
      console.error("Failed to delete order:", err);
    }
  };

  const clearDeliveredOrders = async () => {
    const delivered = orders.filter((o) => o.status === 'delivered');
    if (delivered.length === 0) {
      alert("Aucune commande terminée à nettoyer.");
      return;
    }
    if (!window.confirm(`Supprimer les ${delivered.length} commande(s) terminée(s) / archivée(s) ?`)) {
      return;
    }

    setOrders((prev) => prev.filter((o) => o.status !== 'delivered'));

    try {
      for (const o of delivered) {
        await supabase.from('order_items').delete().eq('order_id', o.id);
        await supabase.from('orders').delete().eq('id', o.id);
        await fetch(`/api/orders?orderId=${o.id}`, { method: 'DELETE' }).catch(() => {});
      }
    } catch (err) {
      console.error("Error clearing delivered orders:", err);
    }
  };

  const handlePrint = (order: Order, type: 'kitchen' | 'delivery') => {
    setSelectedTicketOrder(order);
    setTicketType(type);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const getStatusBadge = (status: OrderStatus, mode: string = 'delivery') => {
    switch (status) {
      case 'new':
        return <span className="bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full animate-pulse">NOUVELLE</span>;
      case 'preparing':
        return <span className="bg-amber-500 text-white text-xs font-black px-2.5 py-1 rounded-full">EN CUISINE</span>;
      case 'ready':
        return (
          <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded-full">
            {mode === 'dine_in' ? 'PRÊTE À SERVIR' : 'PRÊTE'}
          </span>
        );
      case 'delivering':
        return <span className="bg-purple-600 text-white text-xs font-black px-2.5 py-1 rounded-full">EN ROUTE</span>;
      case 'delivered':
        return (
          <span className="bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded-full">
            {mode === 'dine_in' ? 'SERVIE & RÉGLÉE' : mode === 'takeaway' ? 'RÉCUPÉRÉE' : 'LIVRÉE & PAYÉE'}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-6 flex flex-col font-sans">
      {/* KDS Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Menu Client</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-600 rounded-xl text-white">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">KDS & Écran Caisse</h1>
              <p className="text-xs text-slate-400">Flux de production temps réel & Impression tickets 80mm</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={async () => {
              // Generate a simulated realistic live order
              const sampleCustomers = [
                { name: 'Amine Chraibi', phone: '0661998877', addr: '12 Rue Normandie, Gauthier', note: 'Sonnette A3', change: 'Billet de 200 DH' },
                { name: 'Nadia Berrada', phone: '0650443322', addr: '88 Bd Zerktouni, 5ème étage', note: '', change: 'Appoint exact' },
                { name: 'Omar Kabbaj', phone: '0677112233', addr: '34 Rue Jean Jaurès', note: 'Appeler avant de monter', change: 'Billet de 100 DH' },
              ];
              const sample = sampleCustomers[Math.floor(Math.random() * sampleCustomers.length)];
              const simOrder: Order = {
                id: 'sim_' + Date.now(),
                orderNumber: `CMD-${Math.floor(2000 + Math.random() * 8000)}`,
                createdAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                status: 'new',
                mode: 'delivery',
                items: [
                  {
                    cartItemId: 'sim_it_1',
                    product: {
                      id: 'b1',
                      categoryId: 'burgers',
                      name: { fr: 'Le Truffe & Bacon Burger', ar: '' },
                      description: { fr: '', ar: '' },
                      price: 68,
                      image: '',
                      allergens: [],
                      isAvailable: true,
                    },
                    selectedOptions: [
                      { groupId: '1', groupName: { fr: 'Cuisson', ar: '' }, optionId: '1', optionName: { fr: 'Saignant', ar: '' }, price: 0 },
                    ],
                    quantity: 2,
                    unitPrice: 68,
                    totalPrice: 136,
                    specialInstructions: 'Bien chaud SVP',
                  }
                ],
                subtotal: 136,
                deliveryFee: 15,
                total: 151,
                customer: {
                  fullName: sample.name,
                  phone: sample.phone,
                  address: sample.addr,
                  specialInstructions: sample.note,
                  paymentMethod: 'cash',
                  cashChangeAmount: sample.change,
                }
              };

              await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(simOrder),
              });
              fetchOrders();
            }}
            className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs font-bold text-white shadow flex items-center gap-1.5 transition-colors"
            title="Injecter une commande de test pour simuler la charge de travail"
          >
            <span>+ Simuler Commande Live</span>
          </button>

          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playAlertSound();
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              soundEnabled ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>Son {soundEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={clearDeliveredOrders}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-slate-700 text-xs font-bold transition-colors"
            title="Supprimer les commandes terminées / archivées"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purger terminées</span>
          </button>

          <button
            onClick={playAlertSound}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-700"
          >
            Test Bip
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-6 flex-1">
        {orders.map((order) => {
          const isNew = order.status === 'new';
          return (
            <div
              key={order.id}
              className={`rounded-2xl border flex flex-col justify-between overflow-hidden shadow-xl transition-all ${
                isNew
                  ? 'border-orange-500 bg-slate-800/90 ring-2 ring-orange-500/30'
                  : 'border-slate-800 bg-slate-800/50'
              }`}
            >
              {/* Order Card Header */}
              <div className="p-4 bg-slate-800 border-b border-slate-700/80 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-black text-white">{order.orderNumber}</span>
                    {getStatusBadge(order.status, order.mode)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Reçu à {order.createdAt}</span>
                    <span>•</span>
                    <span className="text-orange-400 font-bold uppercase">
                      {order.mode === 'dine_in' 
                        ? `🍽️ ${order.tableNumber || 'À Table'}` 
                        : order.mode === 'delivery' 
                        ? 'Livraison' 
                        : 'À emporter'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-base font-black text-emerald-400 block">{order.total} DH</span>
                    <span className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                      {order.customer.paymentMethod === 'cash' ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                      {order.customer.paymentMethod === 'cash' ? 'Espèces' : 'TPE'}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteOrder(order.id)}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/30 text-red-400 hover:text-red-200 transition-colors ml-1"
                    title="Supprimer cette commande"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-72">
                {order.items.map((item, idx) => (
                  <div key={idx} className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50">
                    <div className="flex items-center justify-between font-bold text-sm text-white">
                      <span>{item.quantity}x {item.product.name.fr}</span>
                      <span className="text-slate-400 text-xs">{item.totalPrice} DH</span>
                    </div>

                    {/* Options list */}
                    {item.selectedOptions.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.selectedOptions.map((opt, i) => (
                          <span key={i} className="bg-orange-500/20 text-orange-300 text-[11px] px-2 py-0.5 rounded font-medium border border-orange-500/30">
                            {opt.optionName.fr}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Kitchen Instructions */}
                    {item.specialInstructions && (
                      <div className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-300 bg-amber-950/40 px-2 py-1 rounded border border-amber-800/40">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>Note cuisine : {item.specialInstructions}</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Customer summary */}
                <div className="pt-2 text-xs text-slate-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Phone className="w-3.5 h-3.5 text-primary-400" />
                    <span>{order.customer.fullName} ({order.customer.phone})</span>
                  </div>
                  {order.mode === 'dine_in' && (
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold bg-amber-950/40 px-2 py-1 rounded border border-amber-800/40">
                      <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{order.tableNumber || order.customer.address}</span>
                    </div>
                  )}
                  {order.mode === 'delivery' && (
                    <div className="flex items-start gap-1.5 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-primary-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{order.customer.address}</span>
                    </div>
                  )}
                  {order.customer.cashChangeAmount && (
                    <p className="text-emerald-400 font-medium text-[11px]">
                      Prévoir monnaie : {order.customer.cashChangeAmount}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons & Printing */}
              <div className="p-3 bg-slate-800/80 border-t border-slate-700/80 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handlePrint(order, 'kitchen')}
                    className="flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-2 rounded-xl border border-slate-600 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Ticket Cuisine</span>
                  </button>
                  <button
                    onClick={() => handlePrint(order, 'delivery')}
                    className="flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-2 rounded-xl border border-slate-600 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>
                      {order.mode === 'dine_in' 
                        ? 'Addition Table' 
                        : order.mode === 'takeaway' 
                        ? 'Ticket Caisse' 
                        : 'Ticket Livreur'}
                    </span>
                  </button>
                </div>

                {/* Status Advancement Button tailored per mode */}
                {order.status === 'new' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-black py-2.5 rounded-xl transition-colors"
                  >
                    Accepter & Lancer en Cuisine
                  </button>
                )}

                {order.status === 'preparing' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'ready')}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-black py-2.5 rounded-xl transition-colors"
                  >
                    {order.mode === 'dine_in' 
                      ? `Marquer Prête (À Servir à la ${order.tableNumber || 'Table'})` 
                      : order.mode === 'takeaway' 
                      ? 'Marquer Prête (Prêt au Comptoir)' 
                      : 'Marquer Prête (Prêt pour Livreur)'}
                  </button>
                )}

                {/* DINE-IN: Direct Table Service (No courier!) */}
                {order.status === 'ready' && order.mode === 'dine_in' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'delivered')}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/30"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Servie à la {order.tableNumber || 'Table'} & Clôturer</span>
                  </button>
                )}

                {/* TAKEAWAY: Direct Pickup at Counter (No courier!) */}
                {order.status === 'ready' && order.mode === 'takeaway' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'delivered')}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/30"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Remis au Client (Comptoir) & Clôturer</span>
                  </button>
                )}

                {/* DELIVERY ONLY: Assign to Courier */}
                {order.status === 'ready' && order.mode === 'delivery' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'delivering')}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-black py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-purple-900/30"
                  >
                    <Bike className="w-4 h-4" />
                    <span>Assigner au Livreur (En cours de route)</span>
                  </button>
                )}

                {order.status === 'delivering' && order.mode === 'delivery' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'delivered')}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Valider Paiement & Clôturer</span>
                  </button>
                )}

                {order.status === 'delivered' && (
                  <div className="text-center text-xs text-emerald-400 font-bold py-1">
                    ✓ {order.mode === 'dine_in' ? 'Commande servie à table et archivée' : order.mode === 'takeaway' ? 'Commande remise au client et archivée' : 'Commande livrée et archivée'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hidden Thermal Printable Section (ESC/POS 80mm format) */}
      {selectedTicketOrder && (
        <div id="thermal-ticket" className="hidden print:block fixed inset-0 bg-white text-black font-mono text-xs p-2">
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #thermal-ticket, #thermal-ticket * {
                visibility: visible;
              }
              #thermal-ticket {
                position: absolute;
                left: 0;
                top: 0;
                width: 80mm;
                margin: 0;
                padding: 4mm;
                color: #000;
                background: #fff;
              }
            }
          `}</style>

          <div className="text-center border-b border-dashed border-black pb-2 mb-2">
            <h2 className="text-sm font-black">{RESTAURANT_INFO.name.toUpperCase()}</h2>
            <p className="text-[10px]">{RESTAURANT_INFO.address}</p>
            <p className="text-[10px]">Tél: {RESTAURANT_INFO.phone}</p>
            <p className="font-bold text-base mt-1">
              *** TICKET {ticketType === 'kitchen' ? 'CUISINE' : selectedTicketOrder.mode === 'dine_in' ? 'ADDITION TABLE' : selectedTicketOrder.mode === 'takeaway' ? 'CAISSE / COMPTOIR' : 'LIVREUR & CLIENT'} ***
            </p>
            <p className="font-black text-lg">{selectedTicketOrder.orderNumber}</p>
            <p className="text-[11px]">
              {selectedTicketOrder.createdAt} - {selectedTicketOrder.mode === 'dine_in' ? `SUR PLACE (${selectedTicketOrder.tableNumber || 'À TABLE'})` : selectedTicketOrder.mode === 'delivery' ? 'LIVRAISON' : 'À EMPORTER'}
            </p>
          </div>

          <div className="border-b border-dashed border-black pb-2 mb-2 space-y-1">
            <p><strong>CLIENT:</strong> {selectedTicketOrder.customer.fullName}</p>
            <p><strong>TÉL:</strong> {selectedTicketOrder.customer.phone}</p>
            {selectedTicketOrder.mode === 'dine_in' && (
              <p><strong>TABLE:</strong> {selectedTicketOrder.tableNumber || 'Table'}</p>
            )}
            {selectedTicketOrder.mode === 'delivery' && (
              <>
                <p><strong>ADRESSE:</strong> {selectedTicketOrder.customer.address}</p>
                {selectedTicketOrder.customer.landmark && <p><strong>REPÈRE:</strong> {selectedTicketOrder.customer.landmark}</p>}
                {selectedTicketOrder.customer.specialInstructions && <p><strong>CONSIGNE:</strong> {selectedTicketOrder.customer.specialInstructions}</p>}
              </>
            )}
          </div>

          {/* Items */}
          <div className="border-b border-dashed border-black pb-2 mb-2 space-y-1">
            {selectedTicketOrder.items.map((it, idx) => (
              <div key={idx}>
                <div className="flex justify-between font-bold">
                  <span>{it.quantity}x {it.product.name.fr}</span>
                  {ticketType === 'delivery' && <span>{it.totalPrice} DH</span>}
                </div>
                {it.selectedOptions.map((op, oidx) => (
                  <p key={oidx} className="text-[10px] pl-3">- {op.optionName.fr}</p>
                ))}
                {it.specialInstructions && (
                  <p className="text-[10px] pl-3 font-bold">** NOTE: {it.specialInstructions} **</p>
                )}
              </div>
            ))}
          </div>

          {/* Totals (delivery ticket) */}
          {ticketType === 'delivery' && (
            <div className="space-y-1 border-b border-dashed border-black pb-2 mb-2">
              <div className="flex justify-between">
                <span>Sous-total:</span>
                <span>{selectedTicketOrder.subtotal} DH</span>
              </div>
              <div className="flex justify-between">
                <span>Livraison:</span>
                <span>{selectedTicketOrder.deliveryFee} DH</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-1">
                <span>TOTAL À ENCAISSER:</span>
                <span>{selectedTicketOrder.total} DH</span>
              </div>
              <p className="pt-1 text-[10px]">
                Mode: {selectedTicketOrder.customer.paymentMethod === 'cash' ? `Espèces (${selectedTicketOrder.customer.cashChangeAmount || 'Exact'})` : 'Carte bancaire (TPE)'}
              </p>
            </div>
          )}

          <div className="text-center pt-2 text-[10px]">
            <p>Merci de votre confiance !</p>
            <p>Bon appétit</p>
          </div>
        </div>
      )}
    </div>
  );
}
