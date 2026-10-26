'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Language, 
  ConsumptionMode, 
  CartItem, 
  Product, 
  SelectedOptionChoice, 
  Order, 
  CustomerDetails 
} from '@/types';
import { translations } from '@/lib/translations';
import { RESTAURANT_INFO, PRODUCTS as FALLBACK_PRODUCTS } from '@/data/mockData';
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

  // Products from Supabase
  products: Product[];
  isLoadingProducts: boolean;
  
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

      // 3. Fetch products of this restaurant
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
      items: [...cart],
      subtotal,
      deliveryFee,
      total,
      customer,
    };
    
    // 1. Broadcast to in-memory API
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
        subtotal,
        delivery_fee: deliveryFee,
        total,
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

      if (insertedOrder && cart.length > 0) {
        const orderItemsToInsert = cart.map(item => ({
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
        products,
        isLoadingProducts,
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
