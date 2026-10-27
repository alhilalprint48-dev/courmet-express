'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Power, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  Plus, 
  Search, 
  ArrowLeft,
  Shield,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StaffAuthGate } from '@/components/StaffAuthGate';

interface RestaurantTenant {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  phone?: string;
  whatsapp_number?: string;
  address?: string;
  currency: string;
  is_active: boolean;
  created_at: string;
}

function SuperAdminPage() {
  const [restaurants, setRestaurants] = useState<RestaurantTenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New restaurant form state
  const [newResto, setNewResto] = useState({
    name: '',
    phone: '',
    address: 'Casablanca',
    currency: 'DH',
  });
  const [isCreating, setIsCreating] = useState(false);

  const fetchRestaurants = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRestaurants(data || []);
    } catch (err) {
      console.error('Error fetching restaurants:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  // Toggle active status in Supabase (1 clic)
  const handleToggleStatus = async (restaurantId: string, currentStatus: boolean) => {
    try {
      // Optimistic update
      setRestaurants(prev =>
        prev.map(r => r.id === restaurantId ? { ...r, is_active: !currentStatus } : r)
      );

      const { error } = await supabase
        .from('restaurants')
        .update({ is_active: !currentStatus })
        .eq('id', restaurantId);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to toggle status:', err);
      fetchRestaurants(); // rollback
    }
  };

  // Add new restaurant manually
  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResto.name || !newResto.phone) return;
    setIsCreating(true);

    try {
      const slug = newResto.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + '-' + Math.floor(100 + Math.random() * 900);

      const { data, error } = await supabase
        .from('restaurants')
        .insert({
          slug,
          name: newResto.name,
          tagline: `Cuisine & Livraison à ${newResto.address}`,
          phone: newResto.phone,
          whatsapp_number: newResto.phone.replace(/\D/g, ''),
          address: newResto.address,
          currency: newResto.currency,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Seed categories
      await supabase.from('categories').insert([
        { restaurant_id: data.id, name_fr: 'Plats Principaux', name_ar: 'الأطباق الرئيسية', icon_name: 'UtensilsCrossed', sort_order: 1 },
        { restaurant_id: data.id, name_fr: 'Boissons Fraîches', name_ar: 'مشروبات باردة', icon_name: 'CupSoda', sort_order: 2 },
        { restaurant_id: data.id, name_fr: 'Desserts Maison', name_ar: 'حلويات منزلية', icon_name: 'Cake', sort_order: 3 },
      ]);

      setRestaurants([data, ...restaurants]);
      setShowAddModal(false);
      setNewResto({ name: '', phone: '', address: 'Casablanca', currency: 'DH' });
    } catch (err) {
      console.error('Error creating restaurant:', err);
      alert('Erreur lors de la création');
    } finally {
      setIsCreating(false);
    }
  };

  // Metrics
  const totalCount = restaurants.length;
  const activeCount = restaurants.filter(r => r.is_active).length;
  const suspendedCount = totalCount - activeCount;
  // Estimated MRR assuming average 590 DH / month per active restaurant
  const estimatedMrr = activeCount * 590;

  const filtered = restaurants.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.address && r.address.toLowerCase().includes(search.toLowerCase())) ||
    (r.phone && r.phone.includes(search))
  );

  return (
    <>
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/saas"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Retour à la vitrine SaaS"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl text-white shadow-md shadow-purple-600/20">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight leading-none flex items-center gap-2">
                  <span>Portail Super-Admin SaaS</span>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold px-2 py-0.5 rounded-full">
                    Fondateur
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">Pilotage des restaurants clients & Abonnements récurrents</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchRestaurants}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
              title="Actualiser les données"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Ajouter un Restaurant</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards / Business Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: MRR */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Revenu Mensuel (MRR)</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400">
              {estimatedMrr.toLocaleString()} <span className="text-xs font-bold text-slate-400">DH/mois</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Sur base moyenne de 590 DH/client</span>
          </div>

          {/* Card 2: Total Restaurants */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total Établissements</span>
              <Building2 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {totalCount}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Inscrits dans Supabase</span>
          </div>

          {/* Card 3: Active Subscriptions */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Abonnements Actifs</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400">
              {activeCount}
            </div>
            <span className="text-[10px] text-emerald-500/80 mt-1 block">Génèrent des revenus</span>
          </div>

          {/* Card 4: Suspended / Churn */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Suspendus / Impayés</span>
              <AlertCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-400">
              {suspendedCount}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Accès temporairement coupé</span>
          </div>
        </div>

        {/* Search Bar & Action Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, ville, téléphone..."
              className="w-full bg-slate-950 pl-9 pr-3 py-2 rounded-xl text-xs border border-slate-800 text-white outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <span className="text-xs font-bold text-slate-400">
            {filtered.length} restaurant{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Restaurants Table */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Chargement des restaurants depuis Supabase...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2">
              <Building2 className="w-8 h-8 mx-auto text-slate-600" />
              <p>Aucun restaurant trouvé.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {filtered.map((resto) => (
                <div
                  key={resto.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors"
                >
                  {/* Left: Info */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-extrabold text-sm sm:text-base text-white">{resto.name}</h3>
                      <span className="font-mono text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                        /{resto.slug}
                      </span>
                      {resto.is_active ? (
                        <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          ABONNEMENT ACTIF
                        </span>
                      ) : (
                        <span className="text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                          SUSPENDU
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      {resto.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-500" /> {resto.phone}
                        </span>
                      )}
                      {resto.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" /> {resto.address}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Calendar className="w-3 h-3" /> Inscrit le {new Date(resto.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    {/* Access Client View */}
                    <Link
                      href="/"
                      target="_blank"
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 transition-colors border border-slate-700"
                      title="Voir le menu client de ce restaurant"
                    >
                      <span>Menu</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>

                    {/* Access KDS Kitchen */}
                    <Link
                      href="/kds"
                      target="_blank"
                      className="px-2.5 py-1.5 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 text-xs font-bold flex items-center gap-1 transition-colors border border-orange-500/30"
                      title="Accéder à l'écran KDS cuisine de ce restaurant"
                    >
                      <span>KDS</span>
                    </Link>

                    {/* Suspend / Activate Toggle Button (1 clic) */}
                    <button
                      onClick={() => handleToggleStatus(resto.id, resto.is_active)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                        resto.is_active
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-600 hover:text-white'
                          : 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-400'
                      }`}
                      title={resto.is_active ? 'Couper l\'accès en cas d\'impayé' : 'Réactiver l\'abonnement'}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{resto.is_active ? 'Suspendre' : 'Réactiver'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Manual Add Restaurant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <h3 className="text-lg font-black tracking-tight mb-1">Nouveau Restaurant Client</h3>
            <p className="text-xs text-slate-400 mb-4">Créez un établissement directement depuis le Super-Admin.</p>

            <form onSubmit={handleCreateRestaurant} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nom de l&apos;établissement *</label>
                <input
                  type="text"
                  required
                  value={newResto.name}
                  onChange={(e) => setNewResto({ ...newResto, name: e.target.value })}
                  placeholder="ex: Pizzeria Bella Napoli"
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Téléphone de contact *</label>
                <input
                  type="tel"
                  required
                  value={newResto.phone}
                  onChange={(e) => setNewResto({ ...newResto, phone: e.target.value })}
                  placeholder="06 00 00 00 00"
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Ville / Adresse</label>
                <input
                  type="text"
                  value={newResto.address}
                  onChange={(e) => setNewResto({ ...newResto, address: e.target.value })}
                  placeholder="Casablanca, Maarif"
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:bg-slate-800 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 text-xs font-black bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
                >
                  {isCreating ? 'Enregistrement...' : 'Créer le Restaurant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default function ProtectedPage() { return <StaffAuthGate role="superadmin" title="Console SaaS Super-Admin" subtitle="Authentification requise pour administrer les restaurants partenaires"><SuperAdminPage /></StaffAuthGate>; }
