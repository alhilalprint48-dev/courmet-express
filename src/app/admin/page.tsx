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
  Printer,
  BarChart3,
  FileSpreadsheet,
  Receipt,
  PiggyBank,
  CheckCircle2,
  FolderPlus,
  Folder,
  Beef,
  Pizza,
  UtensilsCrossed,
  CupSoda,
  Cake,
  Salad,
  Sandwich,
  Flame,
  Coffee,
  Fish,
  Soup,
  Sparkles,
  Users,
  Smartphone,
  KeyRound,
  Layers
} from 'lucide-react';
import QRCode from 'qrcode';
import { useApp } from '@/context/AppContext';
import { RESTAURANT_INFO, CATEGORIES } from '@/data/mockData';
import { Product, ProductOptionGroup, ProductOption } from '@/types';
import { StaffAuthGate } from '@/components/StaffAuthGate';
import { compressAndResizeImage, MAX_IMAGE_SIZE_KB } from '@/lib/imageUtils';

export default function AdminPage() {
  const { 
    categories, 
    addCategory, 
    deleteCategory, 
    products, 
    toggleProductAvailability, 
    addProduct, 
    deleteProduct,
    updateProductOptionGroups,
    requirePhoneVerification,
    setRequirePhoneVerification,
    sharedTeamPin,
    setSharedTeamPin,
    blacklist,
    addToBlacklist,
    removeFromBlacklist
  } = useApp();
  const [activeTab, setActiveTab] = useState<'catalog' | 'settings' | 'antifraud' | 'qrcodes' | 'analytics'>('catalog');
  const [search, setSearch] = useState('');

  // Category Creation State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatNameFr, setNewCatNameFr] = useState('');
  const [newCatNameAr, setNewCatNameAr] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('UtensilsCrossed');

  const AVAILABLE_ICONS = [
    { id: 'UtensilsCrossed', label: 'Couverts' },
    { id: 'Beef', label: 'Burger / Viande' },
    { id: 'Pizza', label: 'Pizza' },
    { id: 'Sandwich', label: 'Sandwich / Tacos' },
    { id: 'Salad', label: 'Salade' },
    { id: 'Flame', label: 'Grillades / Épicé' },
    { id: 'Fish', label: 'Poisson' },
    { id: 'CupSoda', label: 'Boissons' },
    { id: 'Coffee', label: 'Café / Chaud' },
    { id: 'Cake', label: 'Desserts' },
    { id: 'Sparkles', label: 'Spécialités' },
  ];

  const getCatIcon = (iconName: string) => {
    switch (iconName) {
      case 'Beef': return <Beef className="w-3.5 h-3.5" />;
      case 'Pizza': return <Pizza className="w-3.5 h-3.5" />;
      case 'UtensilsCrossed': return <UtensilsCrossed className="w-3.5 h-3.5" />;
      case 'CupSoda': return <CupSoda className="w-3.5 h-3.5" />;
      case 'Cake': return <Cake className="w-3.5 h-3.5" />;
      case 'Salad': return <Salad className="w-3.5 h-3.5" />;
      case 'Sandwich': return <Sandwich className="w-3.5 h-3.5" />;
      case 'Flame': return <Flame className="w-3.5 h-3.5" />;
      case 'Coffee': return <Coffee className="w-3.5 h-3.5" />;
      case 'Fish': return <Fish className="w-3.5 h-3.5" />;
      case 'Soup': return <Soup className="w-3.5 h-3.5" />;
      case 'Sparkles': return <Sparkles className="w-3.5 h-3.5" />;
      default: return <UtensilsCrossed className="w-3.5 h-3.5" />;
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatNameFr.trim()) return;
    await addCategory(newCatNameFr.trim(), newCatNameAr.trim() || newCatNameFr.trim(), newCatIcon);
    setNewCatNameFr('');
    setNewCatNameAr('');
    setIsAddingCategory(false);
  };

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
  const [newBlacklistPhone, setNewBlacklistPhone] = useState('');

  // Team Shared Credentials State
  const [teamPinInput, setTeamPinInput] = useState(sharedTeamPin);
  const [teamPinSaved, setTeamPinSaved] = useState(false);

  React.useEffect(() => {
    setTeamPinInput(sharedTeamPin);
  }, [sharedTeamPin]);

  // Add Product Form State
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [newNameFr, setNewNameFr] = useState('');
  const [newNameAr, setNewNameAr] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('burgers');
  const [newImage, setNewImage] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageCompressing, setImageCompressing] = useState(false);
  const [imageSizeInfo, setImageSizeInfo] = useState<{ sizeKb: number; originalSizeKb: number } | null>(null);
  const [newDescFr, setNewDescFr] = useState('');

  // Product Option Groups Builder State
  const [newOptionGroups, setNewOptionGroups] = useState<ProductOptionGroup[]>([]);
  const [editingProductOptions, setEditingProductOptions] = useState<Product | null>(null);
  const [optionsSavedToast, setOptionsSavedToast] = useState(false);

  const addOptionPreset = (presetType: 'cooking' | 'sauce' | 'extras', isEdit: boolean = false) => {
    let presetGroup: ProductOptionGroup;
    if (presetType === 'cooking') {
      presetGroup = {
        id: 'og_' + Date.now(),
        name: { fr: 'Cuisson du Steak', ar: 'درجة طهي اللحم' },
        required: true,
        minSelect: 1,
        maxSelect: 1,
        options: [
          { id: 'opt_1', name: { fr: 'Saignant', ar: 'نصف طهي' }, price: 0 },
          { id: 'opt_2', name: { fr: 'À point', ar: 'طهي متوسط' }, price: 0 },
          { id: 'opt_3', name: { fr: 'Bien cuit', ar: 'مطبوخ جيدا' }, price: 0 },
        ],
      };
    } else if (presetType === 'sauce') {
      presetGroup = {
        id: 'og_' + Date.now(),
        name: { fr: 'Sauce au choix (Offerte)', ar: 'اختيار الصلصة' },
        required: false,
        minSelect: 0,
        maxSelect: 2,
        options: [
          { id: 'opt_s1', name: { fr: 'Sauce Algérienne', ar: 'صلصة جزائرية' }, price: 0 },
          { id: 'opt_s2', name: { fr: 'Sauce Burger Maison', ar: 'صلصة برجر' }, price: 0 },
          { id: 'opt_s3', name: { fr: 'Mayonnaise Ail', ar: 'مايونيز ثوم' }, price: 0 },
          { id: 'opt_s4', name: { fr: 'Barbecue Fumée', ar: 'باربيكيو' }, price: 0 },
        ],
      };
    } else {
      presetGroup = {
        id: 'og_' + Date.now(),
        name: { fr: 'Suppléments Gourmands', ar: 'إضافات مميزة' },
        required: false,
        minSelect: 0,
        maxSelect: 4,
        options: [
          { id: 'opt_sup1', name: { fr: 'Double Cheddar Fondu', ar: 'جبن شيدر مضاعف' }, price: 8 },
          { id: 'opt_sup2', name: { fr: 'Bacon Grillé Croustillant', ar: 'بيكون مقرمش' }, price: 10 },
          { id: 'opt_sup3', name: { fr: 'Oignons Caramélisés', ar: 'بصل مكرمل' }, price: 5 },
          { id: 'opt_sup4', name: { fr: 'Champignons Sautés', ar: 'فطر مطهو' }, price: 7 },
        ],
      };
    }

    if (isEdit && editingProductOptions) {
      setEditingProductOptions({
        ...editingProductOptions,
        optionGroups: [...(editingProductOptions.optionGroups || []), presetGroup],
      });
    } else {
      setNewOptionGroups((prev) => [...prev, presetGroup]);
    }
  };

  // Handle local file upload with auto-compression under 300 Ko
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert("Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).");
        return;
      }
      try {
        setImageCompressing(true);
        const res = await compressAndResizeImage(file, 800, 800, 0.82);
        setNewImage(res.dataUrl);
        setPreviewImage(res.dataUrl);
        setImageSizeInfo({ sizeKb: res.sizeKb, originalSizeKb: res.originalSizeKb });
      } catch (err: any) {
        alert(err.message || "Erreur de compression d'image");
      } finally {
        setImageCompressing(false);
      }
    }
  };

  // Toggle Stock Availability in 1 click (Persisted to Supabase)
  const handleToggleStock = async (productId: string) => {
    await toggleProductAvailability(productId);
  };

  // Delete a product from catalog (Persisted to Supabase)
  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm("Voulez-vous vraiment supprimer définitivement ce produit du catalogue ?")) {
      await deleteProduct(productId);
    }
  };

  // Add a new product (Persisted to Supabase with Option Groups)
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameFr || !newPrice) return;

    await addProduct({
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
      optionGroups: newOptionGroups,
    });

    setIsAddingProduct(false);
    setNewNameFr('');
    setNewNameAr('');
    setNewPrice('');
    setNewDescFr('');
    setNewImage('');
    setPreviewImage(null);
    setImageSizeInfo(null);
    setNewOptionGroups([]);
  };

  const handleAddBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlacklistPhone) return;
    await addToBlacklist(newBlacklistPhone);
    setNewBlacklistPhone('');
  };

  const handleRemoveBlacklist = async (num: string) => {
    await removeFromBlacklist(num);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.fr.toLowerCase().includes(search.toLowerCase()) ||
      p.categoryId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <StaffAuthGate role="admin" title="Console Gérant & Admin" subtitle="Authentification requise pour gérer la carte, les stocks et les règles anti-fraude">
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
            <span>QR Codes Tables</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-3 text-xs font-black border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'analytics'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span>📊 Chiffre d&apos;Affaires & Rapports</span>
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

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <FolderPlus className="w-4 h-4 text-orange-400" />
                  <span>+ Nouvelle Catégorie</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddingProduct(!isAddingProduct)}
                  className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-700 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Ajouter un Plat</span>
                </button>
              </div>
            </div>

            {/* Category Management Bar & Creation Form */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-orange-600" />
                  <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                    Catégories du Menu ({categories.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingCategory ? 'Fermer le formulaire' : 'Créer une catégorie'}</span>
                </button>
              </div>

              {/* Add Category Form */}
              {isAddingCategory && (
                <form
                  onSubmit={handleSaveCategory}
                  className="bg-orange-50/70 p-4 rounded-2xl border-2 border-orange-200 space-y-3 animate-fade-in"
                >
                  <h4 className="font-black text-xs text-orange-950 flex items-center gap-1.5">
                    <FolderPlus className="w-4 h-4 text-orange-600" />
                    <span>Créer une nouvelle catégorie de menu</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Nom (Français) *
                      </label>
                      <input
                        type="text"
                        required
                        value={newCatNameFr}
                        onChange={(e) => setNewCatNameFr(e.target.value)}
                        placeholder="ex: Tacos, Salades, Plats..."
                        className="w-full p-2 text-xs border rounded-xl bg-white font-medium outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Nom en Arabe
                      </label>
                      <input
                        type="text"
                        dir="rtl"
                        value={newCatNameAr}
                        onChange={(e) => setNewCatNameAr(e.target.value)}
                        placeholder="مثال: تاكوس، سلطات..."
                        className="w-full p-2 text-xs border rounded-xl bg-white font-medium outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Icône représentative
                      </label>
                      <select
                        value={newCatIcon}
                        onChange={(e) => setNewCatIcon(e.target.value)}
                        className="w-full p-2 text-xs border rounded-xl bg-white font-bold outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        {AVAILABLE_ICONS.map((ic) => (
                          <option key={ic.id} value={ic.id}>
                            {ic.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(false)}
                      className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200/80 rounded-xl transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors"
                    >
                      Enregistrer la Catégorie
                    </button>
                  </div>
                </form>
              )}

              {/* Categories Pills Carousel */}
              <div className="flex flex-wrap gap-2 pt-1">
                {categories.map((c) => {
                  const prodCount = products.filter((p) => p.categoryId === c.id).length;
                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-xl border border-slate-200 text-xs transition-colors"
                    >
                      <span className="text-orange-600">{getCatIcon(c.iconName)}</span>
                      <span className="font-bold text-slate-800">{c.name.fr}</span>
                      <span className="text-[10px] bg-white px-1.5 py-0.5 rounded-md text-slate-500 font-bold border border-slate-200">
                        {prodCount} plats
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Supprimer la catégorie "${c.name.fr}" ?`)) {
                            deleteCategory(c.id);
                          }
                        }}
                        className="text-slate-400 hover:text-red-600 ml-1 p-0.5 transition-colors"
                        title="Supprimer la catégorie"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
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
                      className="w-full p-2 text-xs border rounded-xl bg-white font-bold"
                    >
                      {categories.map((c) => (
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
                              setImageSizeInfo(null);
                            }}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow hover:bg-red-700 transition-colors"
                            title="Supprimer la photo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <span className="absolute bottom-2 left-2 bg-slate-900/90 text-white text-[10px] px-2 py-0.5 rounded-md backdrop-blur-xs font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" />
                            {imageSizeInfo ? `${imageSizeInfo.sizeKb} Ko (Compressé < 300 Ko)` : 'Photo sélectionnée ✓'}
                          </span>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white group">
                          <Upload className="w-6 h-6 text-slate-400 group-hover:text-orange-500 mb-1 transition-colors" />
                          <span className="text-xs font-bold text-slate-700 group-hover:text-orange-600">
                            {imageCompressing ? 'Compression et optimisation en cours...' : 'Cliquez pour choisir une photo (JPG, PNG, WebP)'}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Compression automatique sous 300 Ko pour affichage mobile ultra-rapide
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={imageCompressing}
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

                {/* Options & Personnalisations du plat (Cuisson, Sauces, Suppléments...) */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-orange-600" />
                        <span>Options & Personnalisations du plat ({newOptionGroups.length})</span>
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Ajoutez des options de personnalisation directement depuis l&apos;admin (sans code ni SQL)
                      </p>
                    </div>

                    {/* Quick Presets Buttons */}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => addOptionPreset('cooking')}
                        className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1"
                      >
                        <span>🥩 + Cuisson</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addOptionPreset('sauce')}
                        className="px-2.5 py-1 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1"
                      >
                        <span>🥣 + Sauces</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addOptionPreset('extras')}
                        className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1"
                      >
                        <span>🧀 + Suppléments</span>
                      </button>
                    </div>
                  </div>

                  {/* List of Option Groups configured for this new product */}
                  {newOptionGroups.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                      Aucune option configurée. Cliquez sur un modèle ci-dessus pour ajouter des options en 1 clic.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {newOptionGroups.map((group, gIdx) => (
                        <div
                          key={group.id}
                          className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs text-slate-800">{group.name.fr}</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  group.required
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {group.required ? 'Obligatoire (Choix unique)' : 'Optionnel (Choix multiple)'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setNewOptionGroups((prev) => prev.filter((_, idx) => idx !== gIdx))
                              }
                              className="text-red-500 hover:text-red-700 text-xs font-bold"
                            >
                              Supprimer
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {group.options.map((opt) => (
                              <span
                                key={opt.id}
                                className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 font-medium"
                              >
                                <span>{opt.name.fr}</span>
                                {opt.price > 0 && (
                                  <span className="font-bold text-orange-600">+{opt.price} DH</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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

                    {/* Right: Rupture Immédiate (1 clic) button, Options & Delete */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProductOptions(product);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
                        title="Personnaliser les options du plat (cuisson, sauces, suppléments...)"
                      >
                        <Sliders className="w-3.5 h-3.5 text-orange-600" />
                        <span>Options ({(product.optionGroups || []).length})</span>
                      </button>

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

                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                        title="Supprimer ce produit"
                      >
                        <Trash2 className="w-4 h-4" />
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

              {/* Personnel : Accès & Mot de passe partagé de l'équipe */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-100 text-orange-700 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">Personnel & Mot de passe Unique Équipe</h4>
                    <p className="text-xs text-slate-500">Un seul code partagé pour toute votre équipe (Cuisine, Livreurs, Gérant)</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Code PIN / Mot de passe partagé de l&apos;équipe
                  </label>
                  <div className="flex gap-2 max-w-sm">
                    <input
                      type="text"
                      value={teamPinInput}
                      onChange={(e) => setTeamPinInput(e.target.value)}
                      placeholder="1234"
                      className="flex-1 p-2.5 text-sm border rounded-xl font-mono font-black tracking-wider bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSharedTeamPin(teamPinInput);
                        setTeamPinSaved(true);
                        setTimeout(() => setTeamPinSaved(false), 3000);
                      }}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Enregistrer</span>
                    </button>
                  </div>
                  {teamPinSaved && (
                    <p className="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Code partagé mis à jour avec succès ! Toute l&apos;équipe peut l&apos;utiliser dès maintenant.
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Ce code unique permet à n&apos;importe quel membre du personnel de déverrouiller l&apos;écran Cuisine (/kds), l&apos;espace Livreur (/livreur) et la console Gérant (/admin).
                  </p>
                </div>
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
                <span>Enregistrer les Paramètres du Restaurant</span>
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

              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl mt-0.5">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-800 block">
                        Vérification SMS par Code OTP (4 chiffres)
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Exiger que chaque client valide un code SMS à 4 chiffres avant de pouvoir confirmer sa commande.
                      </span>
                      <span className="text-[10px] font-bold mt-1 block">
                        {requirePhoneVerification ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ✓ Actif (Protection anti-fraude maximale par SMS)
                          </span>
                        ) : (
                          <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            ✗ Désactivé (Commande directe sans code SMS)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={requirePhoneVerification}
                    onChange={(e) => setRequirePhoneVerification(e.target.checked)}
                    className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                </div>
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

        {/* TAB 5: ANALYTICS & CAISSE CLOSING */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 max-w-5xl">
            {/* SaaS Value Proposition Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-emerald-100 mb-1">
                  <PiggyBank className="w-4 h-4 text-amber-300" />
                  <span>0% de Commission RestoFlow SaaS</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                  Vous avez économisé +5 052 DH ce mois-ci !
                </h3>
                <p className="text-xs text-emerald-100 max-w-xl">
                  En recevant vos commandes en direct plutôt que via des applications tierces prélevant 30%, votre abonnement SaaS est déjà rentabilisé à plus de 850%.
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8," 
                      + "Numero,Date,Client,Telephone,Mode,Paiement,Total_DH\n"
                      + "CMD-1042,2026-10-26,Karim Bennani,0661234567,Livraison,Especes,211\n"
                      + "CMD-1045,2026-10-26,Sarah Alami,0672889900,A emporter,TPE,90\n"
                      + "CMD-1048,2026-10-26,Amine Chraibi,0661998877,Livraison,Especes,151\n"
                      + "CMD-1051,2026-10-26,Nadia Berrada,0650443322,Livraison,Especes,135\n";
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `cloture_caisse_${new Date().toISOString().slice(0,10)}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 backdrop-blur-sm border border-white/20 transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-white text-emerald-900 hover:bg-emerald-50 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4 text-emerald-700" />
                  <span>Imprimer Z de Caisse (80 mm)</span>
                </button>
              </div>
            </div>

            {/* Financial Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Chiffre d&apos;Affaires Réalisé
                </span>
                <span className="text-2xl font-black text-slate-900 block">
                  16 840 <span className="text-xs font-bold text-emerald-600">DH</span>
                </span>
                <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
                  +18% vs mois précédent
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Commandes Validées
                </span>
                <span className="text-2xl font-black text-slate-900 block">
                  112
                </span>
                <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                  0 commande refusée
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Ticket Moyen
                </span>
                <span className="text-2xl font-black text-slate-900 block">
                  150.35 <span className="text-xs font-bold text-slate-400">DH</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                  ~2.3 plats par commande
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Économies Réalisées
                </span>
                <span className="text-2xl font-black text-emerald-600 block">
                  +5 052 <span className="text-xs font-bold text-emerald-700">DH</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-bold mt-1 block">
                  Gain net sans commission
                </span>
              </div>
            </div>

            {/* Breakdown Sections */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Payment Methods */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center justify-between">
                  <span>Répartition des Encaissements</span>
                  <Receipt className="w-4 h-4 text-slate-400" />
                </h4>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span className="text-slate-700">Espèces (Cash à la livraison)</span>
                      <span className="text-slate-900 font-black">11 450 DH (68%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '68%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span className="text-slate-700">Carte Bancaire sur TPE mobile</span>
                      <span className="text-slate-900 font-black">5 390 DH (32%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '32%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Channels Breakdown */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center justify-between">
                  <span>Répartition par Canal</span>
                  <BarChart3 className="w-4 h-4 text-slate-400" />
                </h4>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span className="text-slate-700">Livraison à domicile</span>
                      <span className="text-slate-900 font-black">83 commandes (74%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: '74%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span className="text-slate-700">À emporter & QR Code en salle</span>
                      <span className="text-slate-900 font-black">29 commandes (26%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '26%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: Gestion des Options & Personnalisations du Plat (Sans SQL) */}
      {editingProductOptions && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-100 text-orange-700 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    Options du Plat : {editingProductOptions.name.fr}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cuisson, sauces, suppléments, garnitures...
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProductOptions(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-xs font-black text-slate-700 block">
                Ajouter un modèle d&apos;options en 1 clic :
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addOptionPreset('cooking', true)}
                  className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <span>🥩 + Cuisson du Steak</span>
                </button>
                <button
                  type="button"
                  onClick={() => addOptionPreset('sauce', true)}
                  className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-900 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <span>🥣 + Sauces au choix</span>
                </button>
                <button
                  type="button"
                  onClick={() => addOptionPreset('extras', true)}
                  className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <span>🧀 + Suppléments Gourmands</span>
                </button>
              </div>
            </div>

            {/* List of Option Groups */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-800">
                Groupes d&apos;options configurés ({(editingProductOptions.optionGroups || []).length})
              </h4>

              {(editingProductOptions.optionGroups || []).length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Ce plat n&apos;a encore aucune option personnalisable. Utilisez les boutons ci-dessus pour en ajouter.
                </div>
              ) : (
                (editingProductOptions.optionGroups || []).map((group, gIdx) => (
                  <div
                    key={group.id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-slate-800">{group.name.fr}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            group.required
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {group.required ? 'Obligatoire (1 choix)' : 'Optionnel (Multiple)'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (editingProductOptions.optionGroups || []).filter(
                            (_, idx) => idx !== gIdx
                          );
                          setEditingProductOptions({
                            ...editingProductOptions,
                            optionGroups: updated,
                          });
                        }}
                        className="text-red-500 hover:text-red-700 text-xs font-bold"
                      >
                        Supprimer
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {group.options.map((opt) => (
                        <span
                          key={opt.id}
                          className="inline-flex items-center gap-1 text-[11px] bg-white text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 font-medium shadow-xs"
                        >
                          <span>{opt.name.fr}</span>
                          {opt.price > 0 && (
                            <span className="font-bold text-orange-600">+{opt.price} DH</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {optionsSavedToast && (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-200">
                <Check className="w-4 h-4" />
                Options enregistrées et synchronisées avec le menu client !
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingProductOptions(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={async () => {
                  await updateProductOptionGroups(
                    editingProductOptions.id,
                    editingProductOptions.optionGroups || []
                  );
                  setOptionsSavedToast(true);
                  setTimeout(() => {
                    setOptionsSavedToast(false);
                    setEditingProductOptions(null);
                  }, 1200);
                }}
                className="px-5 py-2.5 text-xs font-black bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-md shadow-orange-600/30 transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer les Options</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </StaffAuthGate>
  );
}
