'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  ChefHat, 
  Bike, 
  QrCode, 
  Printer, 
  ShieldCheck, 
  Check, 
  ArrowRight, 
  Utensils, 
  Smartphone, 
  Zap, 
  TrendingUp, 
  CheckCircle2, 
  Building2, 
  Phone, 
  MapPin,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SaasLandingPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    restaurantName: '',
    ownerName: '',
    phone: '',
    city: 'Casablanca',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdRestaurant, setCreatedRestaurant] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Generate slug
      const slug = formData.restaurantName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + '-' + Math.floor(100 + Math.random() * 900);

      // 2. Insert into Supabase
      const { data: newResto, error: rErr } = await supabase
        .from('restaurants')
        .insert({
          slug,
          name: formData.restaurantName,
          tagline: `Cuisine & Livraison à ${formData.city}`,
          phone: formData.phone,
          whatsapp_number: formData.phone.replace(/\D/g, ''),
          address: `${formData.city}`,
          currency: 'DH',
          delivery_fee: 15.00,
          min_delivery_amount: 50.00,
          is_active: true,
        })
        .select()
        .single();

      if (rErr) throw rErr;

      // 3. Seed default categories for this restaurant
      await supabase.from('categories').insert([
        { restaurant_id: newResto.id, name_fr: 'Plats Principaux', name_ar: 'الأطباق الرئيسية', icon_name: 'UtensilsCrossed', sort_order: 1 },
        { restaurant_id: newResto.id, name_fr: 'Boissons Fraîches', name_ar: 'مشروبات باردة', icon_name: 'CupSoda', sort_order: 2 },
        { restaurant_id: newResto.id, name_fr: 'Desserts Maison', name_ar: 'حلويات منزلية', icon_name: 'Cake', sort_order: 3 },
      ]);

      setCreatedRestaurant(newResto);
      setIsSubmitting(false);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || "Erreur lors de la création du compte.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-orange-500 selection:text-white">
      {/* SaaS Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 font-black text-xl">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight block leading-none">RestoFlow SaaS</span>
              <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">Solution Restauration</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-bold text-slate-300 hover:text-white transition-colors hidden sm:block"
            >
              Voir la Démo Live
            </Link>
            <button
              onClick={() => setIsRegistering(true)}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-orange-600/30 transition-all active:scale-95"
            >
              Essai Gratuit 14 Jours
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-600/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center space-y-6 relative">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-4 py-1.5 rounded-full text-xs font-bold animate-bounce">
            <Sparkles className="w-3.5 h-3.5" />
            <span>0% de Commission sur vos commandes</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            La Plateforme Complète de <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">Commande QR Code, KDS & Livraison</span> pour votre Restaurant
          </h1>

          <p className="text-slate-300 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Supprimez les commissions exorbitantes des applications tierces (30%). Offrez à vos clients une commande fluide sur smartphone, avec écran cuisine en direct et module livreur connecté.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setIsRegistering(true)}
              className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black px-8 py-4 rounded-2xl text-sm shadow-xl shadow-orange-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span>Créer mon Restaurant en 2 min</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <Link
              href="/"
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-6 py-4 rounded-2xl text-sm border border-slate-700 flex items-center justify-center gap-2 transition-all"
            >
              <span>Tester la Démo Client</span>
              <ExternalLink className="w-4 h-4 opacity-70" />
            </Link>
          </div>

          {/* Guarantees */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400" /> Sans engagement</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400" /> Essai gratuit 14 jours</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400" /> Installation en 2 minutes</span>
          </div>
        </div>
      </section>

      {/* 4 Pillars of the SaaS */}
      <section className="py-16 px-4 bg-slate-950/60 border-y border-slate-800">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black">Tout ce dont votre restaurant a besoin</h2>
            <p className="text-slate-400 text-xs sm:text-sm">Une suite logicielle complète pour booster vos ventes et fluidifier la cuisine.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Feature 1 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-3 hover:border-orange-500/50 transition-colors">
              <div className="p-3 bg-orange-500/10 text-orange-400 w-fit rounded-2xl">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base">Menu PWA Mobile & QR</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pas d&apos;application à télécharger. Vos clients scannent le QR code de table ou commandent depuis Instagram/WhatsApp en 3 clics.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-3 hover:border-orange-500/50 transition-colors">
              <div className="p-3 bg-amber-500/10 text-amber-400 w-fit rounded-2xl">
                <ChefHat className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base">Écran Cuisine KDS</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Signal sonore instantané à chaque nouvelle commande. Suivi en temps réel de la cuisson sans aucun ticket papier égaré.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-3 hover:border-orange-500/50 transition-colors">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 w-fit rounded-2xl">
                <Bike className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base">Module Coursier Dédié</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Appel direct au client en 1 clic, itinéraire GPS automatique Waze / Google Maps et validation obligatoire de l&apos;encaissement.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-3 hover:border-orange-500/50 transition-colors">
              <div className="p-3 bg-blue-500/10 text-blue-400 w-fit rounded-2xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base">Anti-Fraude COD</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Filtrage automatique par liste noire (Blacklist) et validation OTP SMS pour éliminer définitivement les fausses commandes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black">Des tarifs simples, transparents et rentables</h2>
            <p className="text-slate-400 text-xs sm:text-sm">Rentabilisé dès vos 5 premières commandes sans commission.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Plan Starter</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">290</span>
                  <span className="text-xs text-slate-400 font-bold">DH / mois</span>
                </div>
                <p className="text-xs text-slate-400">Idéal pour les snacks et cafés qui démarrent.</p>
                <div className="space-y-2.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Menu QR Code Digital</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Relais Commandes WhatsApp</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Jusqu&apos;à 150 commandes/mois</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Multilingue Français / Arabe</div>
                </div>
              </div>
              <button
                onClick={() => setIsRegistering(true)}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-white transition-colors"
              >
                Choisir Starter
              </button>
            </div>

            {/* Pro - Recommended */}
            <div className="bg-gradient-to-b from-orange-950/40 to-slate-900 border-2 border-orange-500 p-6 rounded-3xl flex flex-col justify-between space-y-6 relative shadow-2xl shadow-orange-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-600 text-white font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
                Le Plus Populaire
              </div>
              <div className="space-y-4">
                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">Plan Pro</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">590</span>
                  <span className="text-xs text-slate-400 font-bold">DH / mois</span>
                </div>
                <p className="text-xs text-slate-400">Pour les restaurants avec service en salle et livraison.</p>
                <div className="space-y-2.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> <strong>Commandes illimitées</strong></div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> <strong>Écran Cuisine KDS en direct</strong></div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> <strong>Application Coursier / Livreur</strong></div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Impression tickets 80 mm (ESC/POS)</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Module Anti-Fraude & Blacklist</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Bouton Rupture Immédiate (1 clic)</div>
                </div>
              </div>
              <button
                onClick={() => setIsRegistering(true)}
                className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 font-black text-xs text-white shadow-lg shadow-orange-600/30 transition-all active:scale-95"
              >
                Essai Gratuit 14 Jours
              </button>
            </div>

            {/* Franchise */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Franchise & Chaînes</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">1 190</span>
                  <span className="text-xs text-slate-400 font-bold">DH / mois</span>
                </div>
                <p className="text-xs text-slate-400">Pour les réseaux multi-établissements.</p>
                <div className="space-y-2.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Multi-succursales & points de vente</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Validation SMS OTP automatique</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Domaine personnalisé (.com / .ma)</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Support dédié 7j/7</div>
                </div>
              </div>
              <button
                onClick={() => setIsRegistering(true)}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-white transition-colors"
              >
                Contacter l&apos;équipe
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Registration Modal (Onboarding Libre-Service) */}
      {isRegistering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setIsRegistering(false);
                setCreatedRestaurant(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            {createdRestaurant ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black">Félicitations !</h3>
                <p className="text-xs text-slate-300">
                  Le restaurant <strong>{createdRestaurant.name}</strong> a été créé avec succès dans votre base de données Supabase.
                </p>

                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-left text-xs space-y-1 font-mono">
                  <span className="text-[10px] text-slate-400 block font-sans">Identifiant unique du restaurant :</span>
                  <span className="text-orange-400 font-bold break-all">{createdRestaurant.id}</span>
                </div>

                <div className="pt-2">
                  <Link
                    href="/"
                    className="w-full block bg-orange-600 hover:bg-orange-500 text-white font-black py-3 rounded-xl text-xs transition-colors"
                  >
                    Accéder à mon Restaurant
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <h3 className="text-lg font-black tracking-tight">Créer mon Restaurant</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Commencez vos 14 jours d&apos;essai gratuit immédiatement.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Nom du Restaurant *</label>
                    <input
                      type="text"
                      required
                      value={formData.restaurantName}
                      onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                      placeholder="ex: Burger Gourmet Maarif"
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Nom du Responsable *</label>
                    <input
                      type="text"
                      required
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      placeholder="ex: Youssef El Amrani"
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Téléphone portable / WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="06 12 34 56 78"
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Ville</label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="Casablanca">Casablanca</option>
                      <option value="Rabat">Rabat</option>
                      <option value="Marrakech">Marrakech</option>
                      <option value="Tanger">Tanger</option>
                      <option value="Fès">Fès</option>
                      <option value="Agadir">Agadir</option>
                    </select>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-2.5 bg-red-500/20 border border-red-500/40 text-red-300 text-xs rounded-xl font-bold">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-3.5 rounded-xl text-xs shadow-lg shadow-orange-600/30 transition-all disabled:opacity-50 mt-2"
                >
                  {isSubmitting ? 'Création en cours...' : 'Activer mon Compte Restaurant'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
