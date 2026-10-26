import { Product, Order, OrderStatus } from '@/types';
import { PRODUCTS as INITIAL_PRODUCTS, RESTAURANT_INFO } from '@/data/mockData';

// In-memory persistent state across all API requests during runtime
class AppStore {
  private static instance: AppStore;
  public products: Product[] = [...INITIAL_PRODUCTS];
  public orders: Order[] = [
    {
      id: 'ord_1',
      orderNumber: 'CMD-1042',
      createdAt: '13:12',
      status: 'delivering',
      mode: 'delivery',
      items: [
        {
          cartItemId: '1',
          product: INITIAL_PRODUCTS[0],
          selectedOptions: [
            { groupId: 'meat_cooking', groupName: { fr: 'Cuisson', ar: 'الطهي' }, optionId: 'apoint', optionName: { fr: 'À point', ar: 'متوسط' }, price: 0 },
            { groupId: 'supplements', groupName: { fr: 'Supplément', ar: 'إضافة' }, optionId: 'extra_cheddar', optionName: { fr: 'Double Cheddar', ar: 'شيدر إضافي' }, price: 8 },
          ],
          quantity: 2,
          unitPrice: 76,
          totalPrice: 152,
          specialInstructions: 'Sans sauce pimentée SVP',
        },
        {
          cartItemId: '2',
          product: INITIAL_PRODUCTS[5],
          selectedOptions: [],
          quantity: 2,
          unitPrice: 22,
          totalPrice: 44,
        }
      ],
      subtotal: 196,
      deliveryFee: 15,
      total: 211,
      customer: {
        fullName: 'Karim Bennani',
        phone: '0661234567',
        address: '24 Rue Ibn Sina, Résidence Les Fleurs, Imm B, 4ème étage',
        landmark: 'En face de la Banque Populaire',
        specialInstructions: 'Sonnette en panne, merci d\'appeler à l\'arrivée',
        paymentMethod: 'cash',
        cashChangeAmount: 'Billet de 200 DH (prévoir 39 DH de monnaie)',
        gpsCoords: { lat: 33.589886, lng: -7.603869 }
      }
    },
    {
      id: 'ord_2',
      orderNumber: 'CMD-1045',
      createdAt: '13:25',
      status: 'new',
      mode: 'takeaway',
      items: [
        {
          cartItemId: '3',
          product: INITIAL_PRODUCTS[2],
          selectedOptions: [
            { groupId: 'crust', groupName: { fr: 'Pâte', ar: 'العجين' }, optionId: 'cheese_crust', optionName: { fr: 'Croûte au fromage', ar: 'محشوة بالجبن' }, price: 15 },
          ],
          quantity: 1,
          unitPrice: 90,
          totalPrice: 90,
        }
      ],
      subtotal: 90,
      deliveryFee: 0,
      total: 90,
      customer: {
        fullName: 'Sarah Alami',
        phone: '0672889900',
        address: RESTAURANT_INFO.address,
        deliveryTimeSlot: '13:30 - 13:45',
        paymentMethod: 'tpe',
      }
    }
  ];

  private constructor() {}

  public static getInstance(): AppStore {
    if (!AppStore.instance) {
      AppStore.instance = new AppStore();
    }
    return AppStore.instance;
  }

  public addOrder(order: Order): Order {
    this.orders.unshift(order);
    return order;
  }

  public updateOrderStatus(orderId: string, status: OrderStatus): Order | null {
    const order = this.orders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      return order;
    }
    return null;
  }

  public toggleProductStock(productId: string): Product | null {
    const prod = this.products.find(p => p.id === productId);
    if (prod) {
      prod.isAvailable = !prod.isAvailable;
      return prod;
    }
    return null;
  }

  public addProduct(product: Product): Product {
    this.products.unshift(product);
    return product;
  }
}

export const store = AppStore.getInstance();
