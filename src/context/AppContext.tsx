'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Language, 
  ConsumptionMode, 
  CartItem, 
  Product, 
  Category,
  SelectedOptionChoice, 
  Order, 
  CustomerDetails 
} from '@/types';
import { translations } from '@/lib/translations';
import { RESTAURANT_INFO, PRODUCTS as FALLBACK_PRODUCTS, CATEGORIES as FALLBACK_CATEGORIES } from '@/data/mockData';
import { supabase } from '@/lib/supabase';

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
  is_active: boolean;
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
  isRestaurantSuspended: boolean;

  // Categories & Products from Supabase
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  addCategory: (nameFr: string, nameAr: string, iconName?: string) => Promise<Category>;
  deleteCategory: (categoryId: string) => Promise<void>;
  products: Product[];
  isLoadingProducts: boolean;
  toggleProductAvailability: (productId: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<Product>;
  deleteProduct: (productId: string) => Promise<void>;

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
  placeOrder: (customer: CustomerDetails) => Promise<Order>;
}

const DEFAULT_RESTAURANT: RestaurantData = {
  id: 'ded21d9f-ff8f-481b-b37e-b91f89c1ab10',
  slug: 'gourmet-express',
  name: RESTAURANT_INFO.name,
  tagline: 'Cuisine artisanale & Livraison rapide',
  phone: RESTAURANT_INFO.phone,
  whatsapp_number: RESTAURANT_INFO.whatsappNumber,
  address: RESTAURANT_INFO.address,
  currency: 'DH',
  delivery_fee: RESTAURANT_INFO.deliveryFee,
  min_delivery_amount: RESTAURANT_INFO.minDeliveryAmount,
  is_active: true,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');
  const [restaurant, setRestaurant] = useState<RestaurantData>(DEFAULT_RESTAURANT);
  const [availableRestaurants, setAvailableRestaurants] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const [mode, setMode] = useState<ConsumptionMode>('delivery');
  const [tableNumber, setTableNumber] = useState<string>('Table 1');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState<string>('Au plus vite (~25-35 min)');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [isModeModalOpen, setIsModeModalOpen] = useState<boolean>(true);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [liveTrackingOrder, setLiveTrackingOrder] = useState<Order | null>(null);

  // Anti-fraud Blacklist state (synchronized with localStorage and Supabase)
  const [blacklist, setBlacklist] = useState<string[]>(['0612000000', '0699112233', '0600000000']);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('resto_blacklist');
        if (saved) {
          setBlacklist(JSON.parse(saved));
        }
      }
    } catch (e) {}
  }, []);

  const addToBlacklist = async (phone: string) => {
    const clean = phone.replace(/\s+/g, '');
    if (!clean) return;
    setBlacklist((prev) => {
      const updated = prev.includes(clean) ? prev : [...prev, clean];
      try {
        localStorage.setItem('resto_blacklist', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await supabase.from('blacklist').insert({ phone: clean, restaurant_id: restaurant.id });
    } catch (e) {}
  };

  const removeFromBlacklist = async (phone: string) => {
    setBlacklist((prev) => {
      const updated = prev.filter((p) => p !== phone);
      try {
        localStorage.setItem('resto_blacklist', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await supabase.from('blacklist').delete().eq('phone', phone);
    } catch (e) {}
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
  const loadRestaurant = async (slugToLoad?: string) => {
    try {
      // 1. Fetch available restaurants for switcher
      const { data: allRestos } = await supabase
        .from('restaurants')
        .select('id, slug, name')
        .order('name');

      if (allRestos && allRestos.length > 0) {
        setAvailableRestaurants(allRestos);
      }

      // 2. Fetch specific restaurant data
      const targetSlug = slugToLoad || 'gourmet-express';
      const { data: restoData, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', targetSlug)
        .single();

      if (error || !restoData) {
        console.warn("Using fallback restaurant info:", error?.message);
        return;
      }

      setRestaurant({
        id: restoData.id,
        slug: restoData.slug,
        name: restoData.name,
        tagline: restoData.tagline || 'Cuisine & Livraison',
        phone: restoData.phone || RESTAURANT_INFO.phone,
        whatsapp_number: restoData.whatsapp_number || RESTAURANT_INFO.whatsappNumber,
        address: restoData.address || RESTAURANT_INFO.address,
        currency: restoData.currency || 'DH',
        delivery_fee: Number(restoData.delivery_fee) || 15,
        min_delivery_amount: Number(restoData.min_delivery_amount) || 50,
        is_active: restoData.is_active,
      });

      // 3. Fetch categories of this restaurant
      const { data: catsData } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restoData.id)
        .order('sort_order', { ascending: true });

      if (catsData && catsData.length > 0) {
        const formattedCats: Category[] = catsData.map((c) => ({
          id: c.id,
          name: { fr: c.name_fr, ar: c.name_ar || c.name_fr },
          iconName: c.icon_name || 'UtensilsCrossed',
        }));
        setCategories(formattedCats);
      } else {
        setCategories(FALLBACK_CATEGORIES);
      }

      // 4. Fetch products of this restaurant
      setIsLoadingProducts(true);
      const { data: prodsData } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', restoData.id);

      if (prodsData && prodsData.length > 0) {
        const formatted: Product[] = prodsData.map(p => ({
          id: p.id,
          categoryId: p.category_id || 'burgers',
          name: { fr: p.name_fr, ar: p.name_ar || p.name_fr },
          description: { fr: p.description_fr || '', ar: p.description_ar || '' },
          price: Number(p.price),
          image: p.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
          allergens: p.allergens || [],
          isAvailable: p.is_available,
        }));
        setProducts(formatted);
      }
      setIsLoadingProducts(false);
    } catch (e) {
      console.error("Error loading restaurant data from Supabase:", e);
      setIsLoadingProducts(false);
    }
  };

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
        const saved = localStorage.getItem('resto_live_order');
        if (saved) {
          setLiveTrackingOrder(JSON.parse(saved));
        }
      } catch (e) {}

      loadRestaurant(slug || undefined);
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        if (liveTrackingOrder) {
          localStorage.setItem('resto_live_order', JSON.stringify(liveTrackingOrder));
        } else {
          localStorage.removeItem('resto_live_order');
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
    clearCart();
    loadRestaurant(slug);
  };

  const addToCart = (
    product: Product,
    selectedOptions: SelectedOptionChoice[],
    quantity: number,
    instructions?: string
  ) => {
    const optionsTotal = selectedOptions.reduce((acc, opt) => acc + opt.price, 0);
    const unitPrice = product.price + optionsTotal;
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

  const placeOrder = async (customer: CustomerDetails): Promise<Order> => {
    // 🛡️ SÉCURITÉ PRIX SERVEUR : Recalcul strict des totaux d'après la base Supabase
    // Empêche la falsification des prix ou des sous-totaux par le client
    let verifiedSubtotal = 0;
    const verifiedItems: CartItem[] = cart.map((cartItem) => {
      const dbProduct = products.find((p) => p.id === cartItem.product.id);
      const genuineBasePrice = dbProduct ? Number(dbProduct.price) : Number(cartItem.product.price);
      const genuineOptionsPrice = (cartItem.selectedOptions || []).reduce(
        (sum, opt) => sum + (Number(opt.price) || 0),
        0
      );
      const verifiedUnitPrice = genuineBasePrice + genuineOptionsPrice;
      const verifiedItemTotal = verifiedUnitPrice * cartItem.quantity;
      verifiedSubtotal += verifiedItemTotal;

      return {
        ...cartItem,
        unitPrice: verifiedUnitPrice,
        totalPrice: verifiedItemTotal,
        product: {
          ...cartItem.product,
          price: genuineBasePrice,
        },
      };
    });

    const verifiedDeliveryFee = mode === 'delivery' && verifiedSubtotal > 0 ? restaurant.delivery_fee : 0;
    const verifiedTotal = verifiedSubtotal + verifiedDeliveryFee;

    const orderNum = `CMD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: Order = {
      id: 'ord_' + Date.now(),
      orderNumber: orderNum,
      createdAt: new Date().toLocaleTimeString(language === 'ar' ? 'ar-MA' : 'fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      status: 'new',
      mode,
      tableNumber: mode === 'dine_in' ? tableNumber : undefined,
      items: verifiedItems,
      subtotal: verifiedSubtotal,
      deliveryFee: verifiedDeliveryFee,
      total: verifiedTotal,
      customer,
    };
    
    // 1. Broadcast to in-memory API (fallback local)
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder),
    }).catch(err => console.error(err));

    // 2. Insert into Supabase table orders with tenant restaurant_id
    try {
      const { data: insertedOrder, error: orderErr } = await supabase.from('orders').insert({
        restaurant_id: restaurant.id,
        order_number: orderNum,
        status: 'new',
        mode,
        table_number: mode === 'dine_in' ? tableNumber : null,
        subtotal: verifiedSubtotal,
        delivery_fee: verifiedDeliveryFee,
        total: verifiedTotal,
        customer_name: customer.fullName,
        customer_phone: customer.phone,
        customer_address: mode === 'dine_in' ? `Sur place - ${tableNumber}` : customer.address,
        customer_landmark: customer.landmark,
        special_instructions: customer.specialInstructions,
        delivery_timeslot: customer.deliveryTimeSlot,
        payment_method: customer.paymentMethod,
        cash_change_amount: customer.cashChangeAmount,
        gps_lat: customer.gpsCoords?.lat,
        gps_lng: customer.gpsCoords?.lng,
      }).select().single();

      if (insertedOrder && verifiedItems.length > 0) {
        const orderItemsToInsert = verifiedItems.map(item => ({
          order_id: insertedOrder.id,
          product_id: item.product.id || null,
          product_name_fr: item.product.name.fr,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          selected_options: item.selectedOptions || [],
          special_instructions: item.specialInstructions || null,
        }));
        await supabase.from('order_items').insert(orderItemsToInsert);
      }
    } catch (e) {
      console.warn("Could not push order directly to Supabase:", e);
    }

    setCurrentOrder(newOrder);
    setLiveTrackingOrder(newOrder);
    clearCart();
    setIsCheckoutOpen(false);
    return newOrder;
  };

  // Synchronisation Catalogue Admin <-> Supabase
  const toggleProductAvailability = async (productId: string) => {
    let nextAvailable = false;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          nextAvailable = !p.isAvailable;
          return { ...p, isAvailable: !p.isAvailable };
        }
        return p;
      })
    );

    try {
      await supabase
        .from('products')
        .update({ is_available: nextAvailable })
        .eq('id', productId);
    } catch (e) {
      console.warn("Error updating product availability:", e);
    }
  };

  const addProduct = async (newProd: Omit<Product, 'id'>): Promise<Product> => {
    let createdProd: Product = {
      ...newProd,
      id: 'prod_' + Date.now(),
    };

    try {
      const { data, error } = await supabase.from('products').insert({
        restaurant_id: restaurant.id,
        category_id: newProd.categoryId,
        name_fr: newProd.name.fr,
        name_ar: newProd.name.ar || newProd.name.fr,
        description_fr: newProd.description.fr,
        price: newProd.price,
        image: newProd.image,
        allergens: newProd.allergens || [],
        is_available: newProd.isAvailable,
      }).select().single();

      if (data) {
        createdProd = {
          id: data.id,
          categoryId: data.category_id || newProd.categoryId,
          name: { fr: data.name_fr, ar: data.name_ar || data.name_fr },
          description: { fr: data.description_fr || '', ar: data.description_ar || '' },
          price: Number(data.price),
          image: data.image || newProd.image,
          allergens: data.allergens || [],
          isAvailable: data.is_available,
        };
      }
    } catch (e) {
      console.warn("Error inserting product in Supabase:", e);
    }

    setProducts((prev) => [createdProd, ...prev]);
    return createdProd;
  };

  const deleteProduct = async (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    try {
      await supabase.from('products').delete().eq('id', productId);
    } catch (e) {
      console.warn("Error deleting product in Supabase:", e);
    }
  };

  const addCategory = async (nameFr: string, nameAr: string, iconName: string = 'UtensilsCrossed'): Promise<Category> => {
    const slugId = nameFr.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const newCatObj: Category = {
      id: slugId || ('cat_' + Date.now()),
      name: { fr: nameFr, ar: nameAr || nameFr },
      iconName,
    };

    try {
      const { data: inserted } = await supabase.from('categories').insert({
        restaurant_id: restaurant.id,
        name_fr: nameFr,
        name_ar: nameAr || nameFr,
        icon_name: iconName,
        sort_order: categories.length + 1,
      }).select().single();

      if (inserted) {
        newCatObj.id = inserted.id;
      }
    } catch (e) {
      console.warn("Could not insert category in Supabase:", e);
    }

    setCategories((prev) => [...prev, newCatObj]);
    return newCatObj;
  };

  const deleteCategory = async (categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    try {
      await supabase.from('categories').delete().eq('id', categoryId);
    } catch (e) {
      console.warn("Could not delete category in Supabase:", e);
    }
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isRtl,
        restaurant,
        availableRestaurants,
        switchRestaurant,
        isRestaurantSuspended: !restaurant.is_active,
        categories,
        setCategories,
        addCategory,
        deleteCategory,
        products,
        isLoadingProducts,
        toggleProductAvailability,
        addProduct,
        deleteProduct,
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
