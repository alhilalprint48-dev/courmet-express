'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Sliders, 
  Plus, 
  Power, 
  Check, 
  Trash2, 
  Settings, 
  ShieldAlert, 
  MapPin, 
  DollarSign, 
  ArrowLeft,
  Utensils,
  Search,
  Save,
  AlertOctagon,
  Phone,
  Upload,
  Link2,
  ImageIcon,
  X,
  QrCode,
  Download,
  Printer
} from 'lucide-react';
import QRCode from 'qrcode';
import { PRODUCTS as DEFAULT_PRODUCTS, RESTAURANT_INFO, CATEGORIES } from '@/data/mockData';
import { Product } from '@/types';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'settings' | 'antifraud' | 'qrcodes'>('catalog');
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [search, setSearch] = useState('');

  // QR Code Generation State
  const [qrBaseUrl, setQrBaseUrl] = useState('http://localhost:3000');
  const [qrType, setQrType] = useState<'general' | 'table'>('table');
  const [tableNumber, setTableNumber] = useState('5');
  const [generatedQrDataUrl, setGeneratedQrDataUrl] = useState<string>('');

  // Update base URL from window location on client
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setQrBaseUrl(window.location.origin);
    }
  }, []);

  // Generate QR Code dynamically
  const generateQRCode = React.useCallback(async () => {
    try {
      const targetUrl = qrType === 'table' 
        ? `${qrBaseUrl}/?table=${tableNumber}`
        : qrBaseUrl;

      const dataUrl = await QRCode.toDataURL(targetUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      setGeneratedQrDataUrl(dataUrl);
    } catch (err) {
      console.error("QR Code generation error:", err);
    }
  }, [qrBaseUrl, qrType, tableNumber]);

  React.useEffect(() => {
    generateQRCode();
  }, [generateQRCode]);

  // Settings State
  const [deliveryFee, setDeliveryFee] = useState(RESTAURANT_INFO.deliveryFee);
  const [minOrder, setMinOrder] = useState(RESTAURANT_INFO.minDeliveryAmount);
  const [whatsapp, setWhatsapp] = useState(RESTAURANT_INFO.whatsappNumber);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Anti-fraud State
  const [maxCodLimit, setMaxCodLimit] = useState(500); // 500 DH max COD
  const [requirePhoneVerification, setRequirePhoneVerification] = useState(true);
  const [blacklist, setBlacklist] = useState<string[]>([
    '0612000000',
    '0699112233',
  ]);
  const [newBlacklistPhone, setNewBlacklistPhone] = useState('');

  // Add Product Form State
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [newNameFr, setNewNameFr] = useState('');
  const [newNameAr, setNewNameAr] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('burgers');
  const [newImage, setNewImage] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [newDescFr, setNewDescFr] = useState('');

  // Handle local file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert("Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setNewImage(result);
        setPreviewImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle Stock Availability in 1 click
  const handleToggleStock = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, isAvailable: !p.isAvailable } : p
      )
    );
  };

  // Add a new product
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameFr || !newPrice) return;

    const newProd: Product = {
      id: 'p_' + Date.now(),
      categoryId: newCategory,
      name: {
        fr: newNameFr,
        ar: newNameAr || newNameFr,
      },
      description: {
        fr: newDescFr || 'Nouvelle recette savoureuse.',
        ar: '',
      },
      price: parseFloat(newPrice),
      image:
        newImage ||
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
      allergens: [],
      isAvailable: true,
    };

    setProducts([newProd, ...products]);
    setIsAddingProduct(false);
    setNewNameFr('');
    setNewNameAr('');
    setNewPrice('');
    setNewDescFr('');
    setNewImage('');
    setPreviewImage(null);
  };

  const handleAddBlacklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlacklistPhone) return;
    const clean = newBlacklistPhone.replace(/\s+/g, '');
    if (!blacklist.includes(clean)) {
      setBlacklist([...blacklist, clean]);
    }
    setNewBlacklistPhone('');
  };

  const handleRemoveBlacklist = (num: string) => {
    setBlacklist(blacklist.filter((n) => n !== num));
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.fr.toLowerCase().includes(search.toLowerCase()) ||
      p.categoryId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      {/* Admin Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-extrabold text-lg text-slate-900 tracking-tight leading-tight flex items-center gap-2">
                <Sliders className="w-5 h-5 text-orange-600" />
                Back-Office & Gestion Restaurant
              </h1>
              <p className="text-xs text-slate-500">Menu, Rupture Immédiate & Anti-Fraude COD</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/kds"
              className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Écran KDS
            </Link>
            <Link
              href="/livreur"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
            >
              App Livreur
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-5xl mx-auto px-4 flex gap-4 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`py-3 text-xs font-black border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'catalog'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Catalogue & Rupture ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 text-xs font-black border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'settings'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Zones & Paramètres Livraison</span>
          </button>

          <button
            onClick={() => setActiveTab('antifraud')}
            className={`py-3 text-xs font-black border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'antifraud'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span>Sécurité & Anti-Fraude COD</span>
          </button>

          <button
            onClick={() => setActiveTab('qrcodes')}
            className={`py-3 text-xs font-black border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'qrcodes'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="w-4 h-4 text-primary-600" />
            <span>QR Codes Tables & Vitrine</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* TAB 1: CATALOG & IMMEDIATE OUT-OF-STOCK */}
        {activeTab === 'catalog' && (
          <div className="space-y-5">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filtrer les plats..."
                  className="w-full bg-slate-50 pl-9 pr-3 py-2 rounded-xl text-xs border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <button
                onClick={() => setIsAddingProduct(!isAddingProduct)}
                className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un Plat au Menu</span>
              </button>
            </div>

            {/* Add Product Modal/Form */}
            {isAddingProduct && (
              <form
                onSubmit={handleCreateProduct}
                className="bg-white p-5 rounded-2xl border-2 border-orange-200 shadow-md space-y-4 animate-fade-in"
              >
                <h3 className="font-black text-sm text-slate-900">Nouveau Plat au Menu</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Nom du plat (Français) *</label>
                    <input
                      type="text"
                      required
                      value={newNameFr}
                      onChange={(e) => setNewNameFr(e.target.value)}
                      placeholder="ex: Burger Signature Double Beef"
                      className="w-full p-2 text-xs border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Nom en Arabe</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={newNameAr}
                      onChange={(e) => setNewNameAr(e.target.value)}
                      placeholder="اسم الوجبة بالعربية"
                      className="w-full p-2 text-xs border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Prix de vente (DH) *</label>
                    <input
                      type="number"
                      required
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="ex: 65"
                      className="w-full p-2 text-xs border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Catégorie</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full p-2 text-xs border rounded-xl bg-white"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name.fr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Photo Selection: Upload Local OR Web URL */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-orange-600" />
                      <span>Photo HD du plat</span>
                    </label>

                    {/* Mode Switcher Pills */}
                    <div className="flex bg-slate-200 p-0.5 rounded-xl text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setImageMode('upload');
                        }}
                        className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                          imageMode === 'upload'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Upload className="w-3 h-3" />
                        <span>Fichier Local (Upload)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImageMode('url');
                        }}
                        className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                          imageMode === 'url'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Link2 className="w-3 h-3" />
                        <span>Lien URL Web</span>
                      </button>
                    </div>
                  </div>

                  {/* Input Based on Mode */}
                  {imageMode === 'upload' ? (
                    <div>
                      {previewImage ? (
                        <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-300 group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewImage}
                            alt="Aperçu du plat"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setNewImage('');
                              setPreviewImage(null);
                            }}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow hover:bg-red-700 transition-colors"
                            title="Supprimer la photo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <span className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded-md backdrop-blur-xs font-semibold">
                            Photo locale sélectionnée ✓
                          </span>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white group">
                          <Upload className="w-6 h-6 text-slate-400 group-hover:text-orange-500 mb-1 transition-colors" />
                          <span className="text-xs font-bold text-slate-700 group-hover:text-orange-600">
                            Cliquez pour choisir une photo (JPG, PNG, WebP)
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Depuis votre PC ou appareil mobile
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={newImage.startsWith('data:') ? '' : newImage}
                          onChange={(e) => {
                            setNewImage(e.target.value);
                            setPreviewImage(e.target.value);
                          }}
                          placeholder="https://images.unsplash.com/photo-..."
                          className="w-full p-2 text-xs border rounded-xl bg-white outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      {previewImage && !previewImage.startsWith('data:') && (
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewImage}
                            alt="Aperçu URL"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
                  <input
                    type="text"
                    value={newDescFr}
                    onChange={(e) => setNewDescFr(e.target.value)}
                    placeholder="Ingrédients, portion, préparation..."
                    className="w-full p-2 text-xs border rounded-xl"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingProduct(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-black bg-orange-600 text-white rounded-xl hover:bg-orange-700"
                  >
                    Enregistrer le Plat
                  </button>
                </div>
              </form>
            )}

            {/* Products Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="divide-y divide-slate-100">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      !product.isAvailable ? 'bg-red-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Left: Image & Info */}
                    <div className="flex items-center gap-3">
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        <Image
                          src={product.image}
                          alt={product.name.fr}
                          fill
                          unoptimized={product.image.startsWith('data:')}
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{product.name.fr}</h4>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase">
                            {product.categoryId}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1">{product.description.fr}</p>
                        <span className="font-black text-xs text-orange-600 mt-0.5 block">
                          {product.price} DH
                        </span>
                      </div>
                    </div>

                    {/* Right: Rupture Immédiate (1 clic) button */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleToggleStock(product.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-all ${
                          product.isAvailable
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                            : 'bg-red-600 text-white shadow-md shadow-red-600/30'
                        }`}
                        title="Activer ou désactiver immédiatement le plat pour les clients"
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>
                          {product.isAvailable ? 'En Vente (Cliquer pour Rupture)' : 'EN RUPTURE IMMÉDIATE'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SETTINGS & DELIVERY ZONES */}
        {activeTab === 'settings' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-xl space-y-5">
            <h3 className="font-extrabold text-base text-slate-900">Paramètres Généraux & Livraison</h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Frais de livraison fixes (DH)
                </label>
                <input
                  type="number"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(Number(e.target.value))}
                  className="w-full p-2.5 text-sm border rounded-xl"
                />
                <p className="text-[11px] text-slate-400 mt-1">Appliqué automatiquement lors du calcul du panier.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Montant minimum de commande (DH)
                </label>
                <input
                  type="number"
                  value={minOrder}
                  onChange={(e) => setMinOrder(Number(e.target.value))}
                  className="w-full p-2.5 text-sm border rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Numéro WhatsApp de réception des commandes
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="212600000000"
                  className="w-full p-2.5 text-sm border rounded-xl font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">Format international sans le signe + (ex: 212600000000).</p>
              </div>

              {settingsSaved && (
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Paramètres sauvegardés avec succès !
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setSettingsSaved(true);
                  setTimeout(() => setSettingsSaved(false), 3000);
                }}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-3 rounded-xl text-xs shadow-md shadow-orange-600/30 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer les Paramètres</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: ANTI-FRAUD COD */}
        {activeTab === 'antifraud' && (
          <div className="space-y-5 max-w-2xl">
            {/* COD Fraud Notice */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                <span className="font-bold block">Sécurisation du Paiement à la Livraison (Cash-on-Delivery)</span>
                Le système filtre automatiquement les numéros douteux et plafonne le montant maximal sans pré-paiement pour éliminer les fausses commandes ou refus de livraison.
              </div>
            </div>

            {/* Limits */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900">Règles & Plafonnement</h3>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Plafond maximum autorisé pour paiement à la livraison (DH)
                </label>
                <input
                  type="number"
                  value={maxCodLimit}
                  onChange={(e) => setMaxCodLimit(Number(e.target.value))}
                  className="w-full p-2.5 text-sm border rounded-xl max-w-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Au-delà de ce montant, la commande nécessite une confirmation téléphonique préalable du gérant.
                </p>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requirePhoneVerification}
                    onChange={(e) => setRequirePhoneVerification(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Statut « En attente de confirmation téléphonique »
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Activer un statut intermédiaire pour appeler systématiquement les nouveaux clients avant de lancer la cuisson.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Blacklist Management */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Liste Noire (Blacklist Numéros)</h3>
                  <p className="text-xs text-slate-400">Numéros bloqués suite à faux commandes ou refus de livraison</p>
                </div>
                <span className="bg-red-50 text-red-600 font-mono font-bold text-xs px-2.5 py-1 rounded-full border border-red-200">
                  {blacklist.length} bloqués
                </span>
              </div>

              <form onSubmit={handleAddBlacklist} className="flex gap-2">
                <input
                  type="tel"
                  value={newBlacklistPhone}
                  onChange={(e) => setNewBlacklistPhone(e.target.value)}
                  placeholder="ex: 0612345678"
                  className="flex-1 p-2 text-xs border rounded-xl"
                />
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Bloquer ce Numéro</span>
                </button>
              </form>

              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
                {blacklist.map((phone) => (
                  <div key={phone} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-mono font-bold text-slate-800">
                      <Phone className="w-3.5 h-3.5 text-red-500" />
                      <span>{phone}</span>
                      <span className="text-[10px] text-red-500 bg-red-50 px-2 py-0.5 rounded font-sans">
                        Refus abusif
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveBlacklist(phone)}
                      className="text-slate-400 hover:text-red-600 p-1"
                      title="Débloquer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: QR CODES GENERATOR */}
        {activeTab === 'qrcodes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {/* Left: Configuration */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-orange-600" />
                Générateur de QR Codes Restaurant
              </h3>
              <p className="text-xs text-slate-500">
                Générez des QR codes prêts à imprimer pour vos tables, chevalets de comptoir ou emballages de livraison.
              </p>

              {/* QR Type Choice */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Type de QR Code</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQrType('table')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      qrType === 'table'
                        ? 'border-orange-600 bg-orange-50 text-orange-950 ring-1 ring-orange-500'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Pour Table (Sur Place)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrType('general')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      qrType === 'general'
                        ? 'border-orange-600 bg-orange-50 text-orange-950 ring-1 ring-orange-500'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Menu Général (Flyer / Vitrine)
                  </button>
                </div>
              </div>

              {/* Conditional Table Number */}
              {qrType === 'table' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Numéro de Table</label>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="ex: 1, 2, Terrasse 4..."
                    className="w-full p-2.5 text-sm border rounded-xl font-bold text-slate-800"
                  />
                  <p className="text-[11px] text-slate-400">
                    Lors du scan par le client, la table sera automatiquement identifiée sur le ticket cuisine.
                  </p>
                </div>
              )}

              {/* Target URL */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Lien URL généré</label>
                <input
                  type="text"
                  readOnly
                  value={qrType === 'table' ? `${qrBaseUrl}/?table=${tableNumber}` : qrBaseUrl}
                  className="w-full p-2 text-xs border rounded-xl bg-slate-50 font-mono text-slate-600"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {generatedQrDataUrl && (
                  <a
                    href={generatedQrDataUrl}
                    download={`qrcode-${qrType === 'table' ? `table-${tableNumber}` : 'menu'}.png`}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger l&apos;image PNG</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer Chevalet</span>
                </button>
              </div>
            </div>

            {/* Right: Table Stand Preview Card */}
            <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-orange-50/50 to-white rounded-3xl border-2 border-dashed border-orange-200 text-center shadow-xs">
              <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 max-w-xs w-full flex flex-col items-center space-y-3">
                <span className="font-extrabold text-sm text-slate-900 uppercase tracking-widest">
                  {RESTAURANT_INFO.name}
                </span>

                {qrType === 'table' ? (
                  <div className="bg-orange-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    Table N° {tableNumber}
                  </div>
                ) : (
                  <div className="bg-slate-900 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    Menu & Commande Directe
                  </div>
                )}

                {/* QR Code Canvas/Image */}
                {generatedQrDataUrl && (
                  <div className="p-2 bg-white rounded-xl shadow-inner border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={generatedQrDataUrl}
                      alt="QR Code"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                )}

                <div className="text-xs text-slate-600 space-y-0.5">
                  <p className="font-bold text-slate-800">Scannez pour commander</p>
                  <p className="text-[11px] text-slate-400">Sans téléchargement d&apos;application</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
