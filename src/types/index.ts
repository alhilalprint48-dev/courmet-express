export type Language = 'fr' | 'ar';

export type ConsumptionMode = 'delivery' | 'takeaway' | 'dine_in';

export type PaymentMethod = 'cash' | 'tpe';

export interface ProductOption {
  id: string;
  name: {
    fr: string;
    ar: string;
  };
  price: number; // 0 if included
}

export interface ProductOptionGroup {
  id: string;
  name: {
    fr: string;
    ar: string;
  };
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: ProductOption[];
}

export interface Product {
  id: string;
  categoryId: string;
  name: {
    fr: string;
    ar: string;
  };
  description: {
    fr: string;
    ar: string;
  };
  price: number;
  image: string;
  allergens: string[];
  isAvailable: boolean;
  optionGroups?: ProductOptionGroup[];
}

export interface Category {
  id: string;
  name: {
    fr: string;
    ar: string;
  };
  iconName: string;
}

export interface SelectedOptionChoice {
  groupId: string;
  groupName: {
    fr: string;
    ar: string;
  };
  optionId: string;
  optionName: {
    fr: string;
    ar: string;
  };
  price: number;
}

export interface CartItem {
  cartItemId: string;
  product: Product;
  selectedOptions: SelectedOptionChoice[];
  quantity: number;
  unitPrice: number; // base price + selected options
  totalPrice: number;
  specialInstructions?: string;
}

export interface CustomerDetails {
  fullName: string;
  phone: string;
  address: string;
  tableNumber?: string;
  floorDoor?: string;
  landmark?: string;
  gpsCoords?: {
    lat: number;
    lng: number;
  };
  specialInstructions?: string;
  deliveryTimeSlot?: string;
  paymentMethod: PaymentMethod;
  cashChangeAmount?: string; // e.g. "200 DH"
}

export type OrderStatus =
  | 'new'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'delivering'
  | 'delivered'
  | 'cancelled';

export interface Order {
  trackingToken?: string;
  id: string;
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  mode: ConsumptionMode;
  tableNumber?: string;
  items: CartItem[];
  subtotal: number;
  discountAmount?: number;
  pointsRedeemed?: number;
  deliveryFee: number;
  total: number;
  customer: CustomerDetails;
}
