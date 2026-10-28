'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  Language, 
  ConsumptionMode, 
  CartItem, 
  Product, 
  Category,
  ProductOptionGroup,
  SelectedOptionChoice, 
  Order, 
  CustomerDetails 
} from '@/types';
import { translations } from '@/lib/translations';
import { RESTAURANT_INFO } from '@/data/mockData';
import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase';
import { fetchRestaurantData } from '@/lib/restaurant-data.mjs';
import { roundMoney } from '@/lib/order-utils.mjs';
import { acceptingOrders, emptySchedule } from '@/lib/opening-hours.mjs';
import { normalizePhone } from '@/lib/phone';

export interface RestaurantData {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  phone: string;
  whatsapp_number: string;
  address: string;
  currency: string;
  delivery_fee: number;
  min_delivery_amount: number;
  max_cash_amount: number;
  is_active: boolean;
  is_open: boolean;
  manual_open?: boolean;
  schedule_enabled: boolean;
  weekly_schedule: { start: string; end: string }[][];
  open_hours: string;
  closed_message: string;
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.fr;
  isRtl: boolean;

  // Multi-Tenant Restaurant Data
  restaurant: RestaurantData;
  availableRestaurants: { id: string; slug: string; name: string }[];
  switchRestaurant: (slug: string) => void;
  updateCashLimit: (amount: number) => Promise<void>;
  updateRestaurantSettings: (fee: number, minimum: number, whatsapp: string) => Promise<void>;
  isRestaurantSuspended: boolean;
  updateRestaurantAvailability: (accepting: boolean) => Promise<void>;
  updateRestaurantProfile: (details: Pick<RestaurantData, 'name' | 'address' | 'phone' | 'open_hours' | 'closed_message'>) => Promise<void>;

  // Categories & Products from Supabase
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  addCategory: (nameFr: string, nameAr: string, iconName?: string) => Promise<Category>;
  deleteCategory: (categoryId: string) => Promise<void>;
  products: Product[];
  isLoadingProducts: boolean;
  restaurantError: string;
  reloadRestaurant: () => void;
  toggleProductAvailability: (productId: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<Product>;
  deleteProduct: (productId: string) => Promise<void>;
  updateProductOptionGroups: (productId: string, groups: ProductOptionGroup[]) => Promise<void>;

  // Anti-fraud Blacklist
  blacklist: string[];
  addToBlacklist: (phone: string) => Promise<void>;
  removeFromBlacklist: (phone: string) => Promise<void>;
  
  // Consumption Mode
  mode: ConsumptionMode;
  setMode: (mode: ConsumptionMode) => void;
  tableNumber: string;
  setTableNumber: (table: string) => void;
  deliveryAddress: string;
  setDeliveryAddress: (address: string) => void;
  deliveryTimeSlot: string;
  setDeliveryTimeSlot: (slot: string) => void;
  gpsCoords?: { lat: number; lng: number };
  setGpsCoords: (coords?: { lat: number; lng: number }) => void;
  isModeModalOpen: boolean;
  setIsModeModalOpen: (open: boolean) => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, selectedOptions: SelectedOptionChoice[], quantity: number, instructions?: string) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, newQty: number) => void;
  clearCart: () => void;
  subtotal: number;
  deliveryFee: number;
  total: number;
  totalItemCount: number;

  // Product Customize Modal
  selectedProductForModal: Product | null;
  openProductModal: (product: Product) => void;
  closeProductModal: () => void;

  // Checkout & Order
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  currentOrder: Order | null;
  setCurrentOrder: (order: Order | null) => void;
  liveTrackingOrder: Order | null;
  setLiveTrackingOrder: (order: Order | null) => void;
  placeOrder: (customer: CustomerDetails, captchaToken: string, redeemPoints?: boolean) => Promise<Order>;
}

const DEFAULT_RESTAURANT: RestaurantData = {
  id: '',
  slug: 'gourmet-express',
  name: RESTAURANT_INFO.name,
  tagline: 'Cuisine artisanale & Livraison rapide',
  phone: RESTAURANT_INFO.phone,
  whatsapp_number: RESTAURANT_INFO.whatsappNumber,
  address: RESTAURANT_INFO.address,
  currency: 'DH',
  delivery_fee: RESTAURANT_INFO.deliveryFee,
  min_delivery_amount: RESTAURANT_INFO.minDeliveryAmount,
  max_cash_amount: 500,
  is_active: false,
  is_open: false,
  schedule_enabled: false, weekly_schedule: emptySchedule(),
  open_hours: '',
  closed_message: '',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [, setClockTick] = useState(0);
  useEffect(() => { const timer = setInterval(() => setClockTick(t => t + 1), 30000); return () => clearInterval(timer); }, []);
  const [language, setLanguageState] = useState<Language>('fr');
  const [restaurant, setRestaurant] = useState<RestaurantData>(DEFAULT_RESTAURANT);
  const restaurantMutationVersion = useRef(0);
  const [availableRestaurants, setAvailableRestaurants] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [restaurantError, setRestaurantError] = useState('');
  const restaurantLoadGeneration = useRef(0);
  const requestedSlug = useRef('gourmet-express');

  const [mode, setMode] = useState<ConsumptionMode>('delivery');
  const [tableNumber, setTableNumber] = useState<string>('Table 1');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState<string>('Au plus vite — délai à confirmer par le restaurant');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [isModeModalOpen, setIsModeModalOpen] = useState<boolean>(true);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [liveTrackingOrder, setLiveTrackingOrder] = useState<Order | null>(null);

  const [blacklist, setBlacklist] = useState<string[]>([]);
  const refreshBlacklist = useCallback(async () => {
    if (!restaurant.id) { setBlacklist([]); return; }
    const { data, error } = await supabase.from('blacklist').select('phone').eq('restaurant_id', restaurant.id);
    setBlacklist(error ? [] : (data || []).map(row => row.phone));
  }, [restaurant.id]);
  useEffect(() => {
    void refreshBlacklist();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      setBlacklist([]);
      if (event === 'SIGNED_OUT') {
        setCurrentOrder(null); setLiveTrackingOrder(null);
        sessionStorage.removeItem('resto_live_order');
      }
      setTimeout(() => { void refreshBlacklist(); }, 0);
    });
    return () => subscription.unsubscribe();
  }, [refreshBlacklist]);
  const addToBlacklist = async (phone: string) => {
    const { error } = await supabase.from('blacklist').insert({ phone: normalizePhone(phone), restaurant_id: restaurant.id });
    if (error) throw new Error('Ajout refusé. Vérifiez vos droits.');
    await refreshBlacklist();
  };
  const removeFromBlacklist = async (phone: string) => {
    const { error } = await supabase.from('blacklist').delete().eq('phone', phone).eq('restaurant_id', restaurant.id);
    if (error) throw new Error('Suppression refusée. Vérifiez vos droits.');
    await refreshBlacklist();
  };

  const isRtl = language === 'ar';
  const t = translations[language];

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof document !== 'undefined') {
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  };

  // Load active restaurant from URL ?r=slug or default
  const loadRestaurant = async (slugToLoad = 'gourmet-express') => {
    const generation = ++restaurantLoadGeneration.current;
    requestedSlug.current = slugToLoad;
    setIsLoadingProducts(true); setRestaurantError(''); setProducts([]); setCategories([]);
    setRestaurant(DEFAULT_RESTAURANT); setIsCheckoutOpen(false); setSelectedProductForModal(null);
    try {
      const data = await fetchRestaurantData(supabase, slugToLoad);
      if (generation !== restaurantLoadGeneration.current) return;
      const row = data.restaurant;
      setAvailableRestaurants(data.available);
      setRestaurant({ id: row.id, slug: row.slug, name: row.name, tagline: row.tagline || '', phone: row.phone || '',
        whatsapp_number: row.whatsapp_number || '', address: row.address || '', currency: row.currency || 'DH',
        delivery_fee: Number(row.delivery_fee ?? 0), min_delivery_amount: Number(row.min_delivery_amount ?? 0),
        max_cash_amount: Number(row.max_cash_amount ?? 500), is_active: row.is_active, is_open: row.is_open, schedule_enabled: row.schedule_enabled || false, weekly_schedule: row.weekly_schedule || emptySchedule(),
        open_hours: row.open_hours || '', closed_message: row.closed_message || '' });
      setCategories(data.categories.map((category: any) => ({ id: category.id, name: { fr: category.name_fr, ar: category.name_ar || category.name_fr }, iconName: category.icon_name || 'UtensilsCrossed' })));
      setProducts(data.products.map((product: any) => ({ id: product.id, categoryId: product.category_id || '',
        name: { fr: product.name_fr, ar: product.name_ar || product.name_fr }, description: { fr: product.description_fr || '', ar: product.description_ar || '' },
        price: Number(product.price), image: product.image || '/placeholder-product.svg', allergens: product.allergens || [], isAvailable: product.is_available, optionGroups: product.option_groups || [] })));
      try { localStorage.setItem('resto_preferred_slug', row.slug); } catch {}
    } catch (failure) {
      if (generation === restaurantLoadGeneration.current) setRestaurantError(failure instanceof Error ? failure.message : 'Chargement impossible.');
    } finally { if (generation === restaurantLoadGeneration.current) setIsLoadingProducts(false); }
  };
  const reloadRestaurant = () => { void loadRestaurant(requestedSlug.current); };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const slug = params.get('r');
      const tableParam = params.get('table');

      if (tableParam) {
        setMode('dine_in');
        setTableNumber(`Table ${tableParam}`);
        setIsModeModalOpen(false); // Direct access if scanned table QR code
      }

      try {
        localStorage.removeItem('resto_live_order');
        localStorage.removeItem('resto_shared_team_pin');
        localStorage.removeItem('resto_blacklist');
        const saved = sessionStorage.getItem('resto_live_order');
        if (saved) {
          setLiveTrackingOrder(JSON.parse(saved));
        }
      } catch (e) {}

      let preferred: string | undefined;
      try { if (window.location.pathname === '/compte') preferred = localStorage.getItem('resto_preferred_slug') || undefined; } catch {}
      void loadRestaurant(slug || preferred || undefined);
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        if (liveTrackingOrder) {
          sessionStorage.setItem('resto_live_order', JSON.stringify(liveTrackingOrder));
        } else {
          sessionStorage.removeItem('resto_live_order');
        }
      }
    } catch (e) {}
  }, [liveTrackingOrder]);

  const switchRestaurant = (slug: string) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('r', slug);
      window.history.pushState({}, '', url.toString());
    }
    clearCart(); setCurrentOrder(null);
    void loadRestaurant(slug);
  };

  // Refresh public restaurant state on existing tabs, even without Realtime setup.
  useEffect(() => {
    let active = true;
    if (!restaurant.id) return;
    const refresh = async () => {
      if (document.hidden) return;
      const revision = restaurantMutationVersion.current;
      const { data, error } = await supabase.from('restaurants')
        .select('id,name,address,phone,open_hours,is_open,schedule_enabled,weekly_schedule,closed_message,is_active,delivery_fee,min_delivery_amount,whatsapp_number,max_cash_amount')
        .eq('id', restaurant.id).maybeSingle();
      if (!active || error || revision !== restaurantMutationVersion.current) return;
      if (!data) { setRestaurant(prev => prev.id === restaurant.id ? { ...prev, is_active: false } : prev); return; }
      setAvailableRestaurants(prev => prev.map(item => item.id === data.id ? { ...item, name: data.name } : item));
      setRestaurant(prev => prev.id === data.id ? { ...prev, ...data,
        delivery_fee: Number(data.delivery_fee ?? 0), min_delivery_amount: Number(data.min_delivery_amount ?? 0),
        max_cash_amount: Number(data.max_cash_amount ?? 500), open_hours: data.open_hours || '', closed_message: data.closed_message || '' } : prev);
    };
    const onFocus = () => { void refresh().catch(() => {}); };
    const timer = setInterval(onFocus, 30000);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus); };
  }, [restaurant.id]);

  const addToCart = (
    product: Product,
    selectedOptions: SelectedOptionChoice[],
    quantity: number,
    instructions?: string
  ) => {
    if (!acceptingOrders(restaurant)) return;
    const optionsTotal = selectedOptions.reduce((acc, opt) => acc + opt.price, 0);
    const unitPrice = roundMoney(product.price + optionsTotal);
    const totalPrice = unitPrice * quantity;
    
    const optionsKey = selectedOptions
      .map(o => o.optionId)
      .sort()
      .join('-');
    const cartItemId = `${product.id}-${optionsKey}-${instructions || ''}`;

    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.cartItemId === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          totalPrice: newQty * unitPrice,
        };
        return updated;
      }
      return [
        ...prev,
        {
          cartItemId,
          product,
          selectedOptions,
          quantity,
          unitPrice,
          totalPrice,
          specialInstructions: instructions,
        }
      ];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.cartItemId === cartItemId
          ? { ...item, quantity: newQty, totalPrice: newQty * item.unitPrice }
          : item
      )
    );
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const deliveryFee = mode === 'delivery' && subtotal > 0 ? restaurant.delivery_fee : 0;
  const total = subtotal + deliveryFee;
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const openProductModal = (product: Product) => {
    setSelectedProductForModal(product);
  };

  const closeProductModal = () => {
    setSelectedProductForModal(null);
  };

  const placeOrder = async (customer: CustomerDetails, captchaToken: string, redeemPoints = false): Promise<Order> => {
    if (!acceptingOrders(restaurant)) throw new Error('Restaurant fermé.');
    const payload = {
      restaurantId: restaurant.id, redeemPoints, mode, tableNumber: mode === 'dine_in' ? tableNumber : null,
      customer: { ...customer, phone: mode === 'dine_in' ? '' : normalizePhone(customer.phone) },
      items: cart.map(item => ({ productId: item.product.id, quantity: item.quantity, expectedUnitPrice: roundMoney(item.unitPrice),
        options: item.selectedOptions.map(opt => ({ groupId: opt.groupId, optionId: opt.optionId })),
        specialInstructions: item.specialInstructions })),
    };
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string,string> = { 'Content-Type': 'application/json', apikey: supabaseAnonKey! };
    if (session) headers.Authorization = 'Bearer ' + session.access_token;
    const response = await fetch(supabaseUrl + '/functions/v1/create-order', {
      method: 'POST', headers, body: JSON.stringify({ payload, captchaToken }),
    });
    const data = await response.json();
    if (!response.ok || !data?.id) throw new Error(data?.error || 'Commande non enregistrée. Réessayez.');
    const newOrder: Order = {
      id: data.id, trackingToken: data.tracking_token, orderNumber: data.order_number, createdAt: data.created_at, status: data.status,
      mode: data.mode, tableNumber: data.table_number || undefined,
      discountAmount: Number(data.discount_amount || 0), pointsRedeemed: Number(data.points_redeemed || 0),
      subtotal: Number(data.subtotal), deliveryFee: Number(data.delivery_fee), total: Number(data.total),
      customer: { ...customer, phone: data.customer_phone, deliveryTimeSlot: data.delivery_timeslot || undefined },
      items: data.items.map((line: any, index: number) => ({
        cartItemId: data.id + '-' + index,
        product: { id: line.productId, name: line.name, price: Number(line.unitPrice),
          categoryId: '', description: { fr: '', ar: '' }, image: '', allergens: [], isAvailable: true },
        quantity: line.quantity, unitPrice: Number(line.unitPrice), totalPrice: Number(line.totalPrice),
        selectedOptions: line.selectedOptions, specialInstructions: line.specialInstructions,
      })),
    };
    setCurrentOrder(newOrder); setLiveTrackingOrder(newOrder); clearCart(); setIsCheckoutOpen(false);
    return newOrder;
  };

  // Mutations use the authenticated session. RLS enforces tenant and role.
  const toggleProductAvailability = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const { data, error } = await supabase.from('products').update({ is_available: !product.isAvailable })
      .eq('id', productId).eq('restaurant_id', restaurant.id).select('id').single();
    if (error || !data) throw new Error('Modification refusée.');
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, isAvailable: !p.isAvailable } : p));
  };
  const addProduct = async (newProd: Omit<Product, 'id'>): Promise<Product> => {
    const { data, error } = await supabase.from('products').insert({
      restaurant_id: restaurant.id, category_id: newProd.categoryId,
      name_fr: newProd.name.fr, name_ar: newProd.name.ar || newProd.name.fr,
      description_fr: newProd.description.fr, description_ar: newProd.description.ar,
      price: newProd.price, image: newProd.image, allergens: newProd.allergens || [],
      is_available: newProd.isAvailable, option_groups: newProd.optionGroups || [],
    }).select('id').single();
    if (error || !data) throw new Error('Création du produit refusée.');
    const product = { ...newProd, id: data.id };
    setProducts(prev => [product, ...prev]); return product;
  };
  const updateProductOptionGroups = async (productId: string, groups: ProductOptionGroup[]) => {
    const { data, error } = await supabase.from('products').update({ option_groups: groups })
      .eq('id', productId).eq('restaurant_id', restaurant.id).select('id').single();
    if (error || !data) throw new Error('Modification des options refusée.');
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, optionGroups: groups } : p));
  };
  const deleteProduct = async (productId: string) => {
    const { data, error } = await supabase.from('products').delete().eq('id', productId)
      .eq('restaurant_id', restaurant.id).select('id').single();
    if (error || !data) throw new Error('Suppression du produit refusée.');
    setProducts(prev => prev.filter(p => p.id !== productId));
  };
  const addCategory = async (nameFr: string, nameAr: string, iconName = 'UtensilsCrossed'): Promise<Category> => {
    const { data, error } = await supabase.from('categories').insert({ restaurant_id: restaurant.id,
      name_fr: nameFr, name_ar: nameAr || nameFr, icon_name: iconName, sort_order: categories.length + 1,
    }).select('id').single();
    if (error || !data) throw new Error('Création de catégorie refusée.');
    const category = { id: data.id, name: { fr: nameFr, ar: nameAr || nameFr }, iconName };
    setCategories(prev => [...prev, category]); return category;
  };
  const deleteCategory = async (categoryId: string) => {
    const { data, error } = await supabase.from('categories').delete().eq('id', categoryId)
      .eq('restaurant_id', restaurant.id).select('id').single();
    if (error || !data) throw new Error('Suppression de catégorie refusée.');
    setCategories(prev => prev.filter(c => c.id !== categoryId));
  };

  const updateRestaurantAvailability = async (accepting: boolean) => {
    const tenant = restaurant.id;
    const { data, error } = await supabase.rpc('update_restaurant_availability', { tenant, accepting });
    if (error || typeof data !== 'boolean') throw new Error('Modification de l’ouverture refusée.');
    restaurantMutationVersion.current += 1;
    setRestaurant(prev => prev.id === tenant ? { ...prev, is_open: data } : prev);
  };
  const updateRestaurantProfile = async (details: Pick<RestaurantData, 'name' | 'address' | 'phone' | 'open_hours' | 'closed_message'>) => {
    const tenant = restaurant.id;
    const { data, error } = await supabase.rpc('update_restaurant_profile', { tenant, details });
    if (error || !data) throw new Error('Enregistrement de la fiche refusé. Vérifiez les champs.');
    restaurantMutationVersion.current += 1;
    setRestaurant(prev => prev.id === tenant ? { ...prev, ...data } : prev);
    setAvailableRestaurants(prev => prev.map(item => item.id === tenant ? { ...item, name: data.name } : item));
  };

  const updateRestaurantSettings = async (fee: number, minimum: number, whatsapp: string) => {
    const tenant = restaurant.id;
    const { data, error } = await supabase.rpc('update_restaurant_settings', { tenant, fee, minimum, whatsapp });
    if (error || !data) throw new Error('Enregistrement refusé. Vérifiez les montants et le numéro WhatsApp.');
    restaurantMutationVersion.current += 1;
    setRestaurant(prev => prev.id === tenant ? { ...prev, delivery_fee: Number(data.delivery_fee),
      min_delivery_amount: Number(data.min_delivery_amount), whatsapp_number: data.whatsapp_number } : prev);
  };

  const updateCashLimit = async (amount: number) => {
    const { data, error } = await supabase.rpc('update_cash_limit', { tenant: restaurant.id, amount });
    if (error || data == null) throw new Error('Enregistrement du plafond refusé.');
    restaurantMutationVersion.current += 1;
    setRestaurant(prev => ({ ...prev, max_cash_amount: Number(data) }));
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isRtl,
        restaurant: { ...restaurant, manual_open: restaurant.is_open, is_open: acceptingOrders(restaurant) },
        availableRestaurants,
        switchRestaurant,
        updateCashLimit,
        updateRestaurantSettings,
        updateRestaurantAvailability,
        updateRestaurantProfile,
        isRestaurantSuspended: !restaurant.is_active,
        categories,
        setCategories,
        addCategory,
        deleteCategory,
        products,
        isLoadingProducts,
        restaurantError,
        reloadRestaurant,
        toggleProductAvailability,
        addProduct,
        deleteProduct,
        updateProductOptionGroups,
        blacklist,
        addToBlacklist,
        removeFromBlacklist,
        mode,
        setMode,
        tableNumber,
        setTableNumber,
        deliveryAddress,
        setDeliveryAddress,
        deliveryTimeSlot,
        setDeliveryTimeSlot,
        gpsCoords,
        setGpsCoords,
        isModeModalOpen,
        setIsModeModalOpen,
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        subtotal,
        deliveryFee,
        total,
        totalItemCount,
        selectedProductForModal,
        openProductModal,
        closeProductModal,
        isCheckoutOpen,
        setIsCheckoutOpen,
        currentOrder,
        setCurrentOrder,
        liveTrackingOrder,
        setLiveTrackingOrder,
        placeOrder,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
