'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Trash2,
  RotateCcw,
  History
} from 'lucide-react';
import { Order, OrderStatus } from '@/types';
import { useApp } from '@/context/AppContext';
import { useStaffOrders } from '@/hooks/useStaffOrders';
import { ServiceConnection } from '@/components/ServiceConnection';
import { unseenOrderIds } from '@/lib/order-utils.mjs';
import { supabase } from '@/lib/supabase';
import { StaffAuthGate } from '@/components/StaffAuthGate';

function KdsPage() {
  const { restaurant } = useApp();
  const [showArchives, setShowArchives] = useState(false);
  const queue = useStaffOrders(restaurant.id, false, showArchives);
  const orders = queue.orders;
  const manager = ['admin', 'superadmin'].includes(queue.role);
  const [kdsTab, setKdsTab] = useState<'active' | 'completed'>('active');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedTicketOrder, setSelectedTicketOrder] = useState<Order | null>(null);
  const [ticketType, setTicketType] = useState<'kitchen' | 'delivery'>('kitchen');
  const seenIds = React.useRef(new Set<string>());
  const audio = React.useRef<AudioContext | null>(null);
  const [actionError, setActionError] = useState('');
  useEffect(() => { seenIds.current = new Set(); }, [restaurant.id]);
  const playAlertSound = useCallback(() => {
    const context = audio.current;
    if (!context || context.state !== 'running') return;
    const osc = context.createOscillator(), gain = context.createGain();
    osc.connect(gain); gain.connect(context.destination);
    osc.frequency.setValueAtTime(880, context.currentTime); gain.gain.setValueAtTime(0.2, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.4); osc.start(); osc.stop(context.currentTime + 0.4);
  }, []);
  const activateSound = async () => {
    try {
      if (!audio.current) audio.current = new window.AudioContext();
      await audio.current.resume(); setSoundEnabled(true); playAlertSound();
    } catch { setActionError('Son indisponible : gardez les alertes visuelles à l’écran.'); }
  };
  useEffect(() => {
    if (soundEnabled && unseenOrderIds(seenIds.current, orders).length) playAlertSound();
    for (const order of orders) seenIds.current.add(order.id);
  }, [orders, soundEnabled, playAlertSound]);
  useEffect(() => () => { void audio.current?.close(); }, []);
  const perform = async (target: string | null, action: string, note: string | null = null) => {
    setActionError('');
    const { error } = await supabase.rpc('order_action', { tenant: restaurant.id, target, action, note });
    if (error) setActionError(error.message || 'Action refusée.');
    queue.refresh();
  };
  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    const order = orders.find(item => item.id === id);
    const action = status === 'preparing' ? (order?.status === 'ready' ? 'undo_ready' : 'prepare') : status === 'ready' ? 'ready' : status === 'delivered' ? 'complete' : 'claim';
    await perform(id, action, action === 'complete' ? 'payment_confirmed' : null);
  };
  const deleteOrder = async (id: string) => {
    const order = orders.find(item => item.id === id);
    if (!order) return;
    if (['delivered','cancelled'].includes(order.status)) await perform(id, order.archivedAt ? 'unarchive' : 'archive');
    else {
      const reason = window.prompt('Motif d’annulation (la commande restera dans l’historique) :');
      if (reason) await perform(id, 'cancel', reason);
    }
  };
  const clearDeliveredOrders = async () => { await perform(null, 'archive_completed'); };

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
            CLÔTURÉE
          </span>
        );
      case 'cancelled': return <span className="bg-slate-600 text-white text-xs rounded px-2 py-1">ANNULÉE</span>;
      default:
        return null;
    }
  };

  return (
    <>
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
              <h1 className="text-xl font-black tracking-tight">{restaurant.name} — Cuisine</h1>
              <p className="text-xs text-slate-400">Flux de production temps réel & Impression tickets 80mm</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => { if (soundEnabled) setSoundEnabled(false); else void activateSound(); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              soundEnabled ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'Son activé' : 'Activer les alertes sonores'}</span>
          </button>

          <button
            onClick={activateSound}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-700"
          >
            Test Bip
          </button>
        </div>
      </div>

      <ServiceConnection loading={queue.loading} error={queue.error} lastSuccess={queue.lastSuccess} refresh={queue.refresh} />
      {actionError && <p role="alert" className="p-3 bg-red-950 text-red-200">{actionError}</p>}
      <label className="print:hidden text-xs flex gap-2 items-center my-2"><input type="checkbox" checked={showArchives} onChange={event => { setShowArchives(event.target.checked); setKdsTab('completed'); }} />Consulter les archives (50 dernières commandes)</label>
      {/* Filter Tabs: En Cuisine vs Terminées */}
      {(() => {
        const activeOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
        const completedOrders = orders.filter((o) => ['delivered','cancelled'].includes(o.status));
        const displayedOrders = kdsTab === 'active' ? activeOrders : completedOrders;

        return (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 pb-2 border-b border-slate-800/80">
              <div className="flex gap-2">
                {/* Tab 1: Active orders */}
                <button
                  type="button"
                  onClick={() => setKdsTab('active')}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                    kdsTab === 'active'
                      ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                      : 'bg-slate-800/90 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <ChefHat className="w-4 h-4" />
                  <span>En Cuisine / À Préparer</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      kdsTab === 'active' ? 'bg-orange-800 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {activeOrders.length}
                  </span>
                </button>

                {/* Tab 2: Completed / Served orders */}
                <button
                  type="button"
                  onClick={() => setKdsTab('completed')}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                    kdsTab === 'completed'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-800/90 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Commandes Terminées</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      kdsTab === 'completed' ? 'bg-emerald-800 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {completedOrders.length}
                  </span>
                </button>
              </div>

              {/* Action on completed tab: Purge history */}
              {kdsTab === 'completed' && completedOrders.length > 0 && manager && !showArchives && (
                <button
                  type="button"
                  onClick={clearDeliveredOrders}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 text-xs font-bold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Archiver les commandes terminées</span>
                </button>
              )}
            </div>

            {/* Orders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-6 flex-1">
              {queue.loading && orders.length === 0 ? <p role="status">Chargement…</p> : queue.error && orders.length === 0 ? <p>Commandes indisponibles. Réessayez avant de conclure que la file est vide.</p> : displayedOrders.length === 0 ? (
                <div className="col-span-full py-16 text-center bg-slate-800/40 border border-slate-700/60 rounded-3xl p-8">
                  {kdsTab === 'active' ? (
                    <>
                      <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="w-7 h-7" />
                      </div>
                      <h3 className="text-lg font-black text-white">Toutes les commandes sont prêtes et servies !</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        La cuisine est à jour. Les nouvelles commandes apparaîtront ici automatiquement dès validation par les clients.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 bg-slate-700/50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                        <History className="w-7 h-7" />
                      </div>
                      <h3 className="text-lg font-black text-white">Aucune commande terminée non archivée</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Dès qu&apos;une commande sur place est marquée &quot;Servie à table&quot; ou qu&apos;une livraison est clôturée, elle sera automatiquement déplacée ici.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                displayedOrders.map((order) => {
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
                    disabled={!manager && ['delivered','cancelled'].includes(order.status)}
                    onClick={() => deleteOrder(order.id)}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/30 text-red-400 hover:text-red-200 transition-colors ml-1"
                    title="Annuler ou archiver cette commande"
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
                {['new','accepted'].includes(order.status) && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-black py-2.5 rounded-xl transition-colors"
                  >
                    {order.mode === 'dine_in' ? 'Accepter la table & préparer' : 'WhatsApp reçu : accepter & préparer'}
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
                    <span>Paiement reçu : servir à la {order.tableNumber || 'Table'} & clôturer</span>
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
                {order.status === 'ready' && order.mode === 'delivery' && manager && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'delivering')}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-black py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-purple-900/30"
                  >
                    <Bike className="w-4 h-4" />
                    <span>Prendre cette course avec mon compte</span>
                  </button>
                )}

                {order.status === 'delivering' && order.mode === 'delivery' && order.assignedDriverId === queue.userId && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'delivered')}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Valider Paiement & Clôturer</span>
                  </button>
                )}

                {order.status === 'delivered' && (
                  <div className="space-y-2">
                    <div className="text-center text-xs text-emerald-400 font-bold py-1 bg-emerald-950/40 rounded-xl border border-emerald-800/40">
                      ✓ {order.mode === 'dine_in' ? 'Commande servie à table et clôturée' : order.mode === 'takeaway' ? 'Commande remise au client et clôturée' : 'Commande livrée et clôturée'}
                    </div>
                    <p className="text-xs text-slate-400">{order.paidAt ? `Encaissement tracé : ${order.paymentReceived} DH` : 'Commande historique : encaissement non tracé.'}</p>

                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
            </div>
          </>
        );
      })()}

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
            <h2 className="text-sm font-black">{restaurant.name.toUpperCase()}</h2>
            <p className="text-[10px]">{restaurant.address}</p>
            <p className="text-[10px]">Tél: {restaurant.phone}</p>
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
              {!!selectedTicketOrder.discountAmount && <div className="flex justify-between"><span>Fidélité ({selectedTicketOrder.pointsRedeemed} points):</span><span>−{selectedTicketOrder.discountAmount} DH</span></div>}
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
    </>
  );
}

export default function ProtectedPage() { return <StaffAuthGate role="kds" title="Cuisine & KDS" subtitle="Connectez-vous avec votre compte cuisine"><KdsPage /></StaffAuthGate>; }
