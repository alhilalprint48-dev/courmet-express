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
import { RESTAURANT_INFO } from '@/data/mockData';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.fr;
  isRtl: boolean;
  
  // Consumption Mode
  mode: ConsumptionMode;
  setMode: (mode: ConsumptionMode) => void;
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
  placeOrder: (customer: CustomerDetails) => Order;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');
  const [mode, setMode] = useState<ConsumptionMode>('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState<string>('Au plus vite (~25-35 min)');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [isModeModalOpen, setIsModeModalOpen] = useState<boolean>(true); // Open on first load as required
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

  const isRtl = language === 'ar';
  const t = translations[language];

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof document !== 'undefined') {
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    }
  }, [language, isRtl]);

  const addToCart = (
    product: Product,
    selectedOptions: SelectedOptionChoice[],
    quantity: number,
    instructions?: string
  ) => {
    const optionsTotal = selectedOptions.reduce((acc, opt) => acc + opt.price, 0);
    const unitPrice = product.price + optionsTotal;
    const totalPrice = unitPrice * quantity;
    
    // Unique ID based on product ID and selected option IDs
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
  const deliveryFee = mode === 'delivery' && subtotal > 0 ? RESTAURANT_INFO.deliveryFee : 0;
  const total = subtotal + deliveryFee;
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const openProductModal = (product: Product) => {
    setSelectedProductForModal(product);
  };

  const closeProductModal = () => {
    setSelectedProductForModal(null);
  };

  const placeOrder = (customer: CustomerDetails): Order => {
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
      items: [...cart],
      subtotal,
      deliveryFee,
      total,
      customer,
    };
    
    // Broadcast order to shared backend API
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder),
    }).catch(err => console.error("Could not sync order to API:", err));

    setCurrentOrder(newOrder);
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
        mode,
        setMode,
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
