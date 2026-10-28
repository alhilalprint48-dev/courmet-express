import { Category, Product } from '@/types';

export const RESTAURANT_INFO = {
  name: "Le Gourmet Express",
  phone: "+212 600-000000",
  whatsappNumber: "212600000000", // International format without +
  address: "142 Boulevard d'Anfa, Casablanca",
  deliveryFee: 15, // DH
  minDeliveryAmount: 50, // DH
  openHours: "11:30 - 23:30",
};

export const CATEGORIES: Category[] = [
  { id: 'burgers', name: { fr: 'Burgers Gourmet', ar: 'برجر غورمي' }, iconName: 'Beef' },
  { id: 'pizzas', name: { fr: 'Pizzas au Feu de Bois', ar: 'بيتزا إيطالية' }, iconName: 'Pizza' },
  { id: 'formulas', name: { fr: 'Formules & Menus', ar: 'وجبات كاملة' }, iconName: 'UtensilsCrossed' },
  { id: 'drinks', name: { fr: 'Boissons Fraîches', ar: 'مشروبات باردة' }, iconName: 'CupSoda' },
  { id: 'desserts', name: { fr: 'Desserts Maison', ar: 'حلويات منزلية' }, iconName: 'Cake' },
];

export const PRODUCTS: Product[] = [
  {
    id: 'b1',
    categoryId: 'burgers',
    name: {
      fr: 'Le Truffe & Bacon Burger',
      ar: 'برجر الكمأة ولحم البقر المقدد'
    },
    description: {
      fr: 'Pur bœuf haché façon bouchère (150g), cheddar affiné 9 mois, sauce truffée maison, bacon de bœuf croustillant, oignons caramélisés.',
      ar: 'لحم بقري مفروم طازج (150 غ)، جبن شيدر معتق، صلصة الكمأة المنزلية، مقدد بقري مقرمش، بصل مكرمل.'
    },
    price: 68,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    allergens: ['Gluten', 'Lait', 'Moutarde'],
    isAvailable: true,
    optionGroups: [
      {
        id: 'meat_cooking',
        name: { fr: 'Cuisson de la viande (Obligatoire)', ar: 'درجة طهي اللحم (إجباري)' },
        required: true,
        minSelect: 1,
        maxSelect: 1,
        options: [
          { id: 'saignant', name: { fr: 'Saignant', ar: 'نصف استواء (أحمر)' }, price: 0 },
          { id: 'apoint', name: { fr: 'À point', ar: 'استواء متوسط' }, price: 0 },
          { id: 'biencuit', name: { fr: 'Bien cuit', ar: 'كامل الاستواء' }, price: 0 },
        ]
      },
      {
        id: 'supplements',
        name: { fr: 'Suppléments gourmands', ar: 'إضافات لذيذة' },
        required: false,
        minSelect: 0,
        maxSelect: 3,
        options: [
          { id: 'extra_cheddar', name: { fr: 'Double Cheddar fondu', ar: 'جبن شيدر إضافي' }, price: 8 },
          { id: 'extra_bacon', name: { fr: 'Bacon de bœuf croustillant', ar: 'مقدد بقري إضافي' }, price: 10 },
          { id: 'extra_sauce', name: { fr: 'Pot Sauce Truffe Maison', ar: 'صلصة كمأة إضافية' }, price: 6 },
        ]
      }
    ]
  },
  {
    id: 'b2',
    categoryId: 'burgers',
    name: {
      fr: 'Smoky Crispy Chicken',
      ar: 'تشيكن كريسبي المدخن'
    },
    description: {
      fr: 'Filet de poulet mariné pané aux cornflakes croustillants, salade croquante, pickles, sauce barbecue fumée et mayonnaise ciboulette.',
      ar: 'صدر دجاج مقرمش متبل، خس طازج، مخلل، صلصة باربيكيو مدخنة ومايونيز بالأعشاب.'
    },
    price: 58,
    image: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=800&q=80',
    allergens: ['Gluten', 'Œufs', 'Lait'],
    isAvailable: true,
    optionGroups: [
      {
        id: 'spicy_level',
        name: { fr: 'Niveau d\'épices', ar: 'مستوى التوابل والحار' },
        required: true,
        minSelect: 1,
        maxSelect: 1,
        options: [
          { id: 'mild', name: { fr: 'Doux', ar: 'عادي (غير حار)' }, price: 0 },
          { id: 'spicy', name: { fr: 'Épicé (Hot)', ar: 'حار (Spicy)' }, price: 0 },
        ]
      },
      {
        id: 'supplements_chicken',
        name: { fr: 'Suppléments', ar: 'إضافات' },
        required: false,
        minSelect: 0,
        maxSelect: 2,
        options: [
          { id: 'extra_cheese', name: { fr: 'Tranche de Gouda fondu', ar: 'شريحة جبن غودا' }, price: 6 },
          { id: 'extra_jalapeno', name: { fr: 'Piments Jalapeños marinés', ar: 'فلفل هالبينو حار' }, price: 5 },
        ]
      }
    ]
  },
  {
    id: 'p1',
    categoryId: 'pizzas',
    name: {
      fr: 'Pizza Burrata & Pesto',
      ar: 'بيتزا البوراتا والبيستو الإيطالية'
    },
    description: {
      fr: 'Pâte à fermentation lente 48h, sauce tomate San Marzano, mozzarella fior di latte, cœur de burrata crémeuse, roquette fraîche et pesto au basilic.',
      ar: 'عجينة متخمرة لمدة 48 ساعة، صلصة طماطم سان مارزانو، موزاريلا إيطالية، كرة بوراتا طازجة، جرجير وبيستو ريحان.'
    },
    price: 75,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    allergens: ['Gluten', 'Lait', 'Fruits à coque'],
    isAvailable: true,
    optionGroups: [
      {
        id: 'crust',
        name: { fr: 'Type de pâte', ar: 'نوع العجينة' },
        required: true,
        minSelect: 1,
        maxSelect: 1,
        options: [
          { id: 'fine', name: { fr: 'Pâte fine traditionnelle napolitaine', ar: 'عجينة رقيقة تقليدية' }, price: 0 },
          { id: 'cheese_crust', name: { fr: 'Croûte fourrée au fromage mozzarella', ar: 'حواف محشوة بجبن الموزاريلا' }, price: 15 },
        ]
      }
    ]
  },
  {
    id: 'p2',
    categoryId: 'pizzas',
    name: {
      fr: 'Pizza Diavola Piquante',
      ar: 'بيتزا ديافولا الحارة'
    },
    description: {
      fr: 'Sauce tomate douce, mozzarella filante, saucisson épicé artisanal de bœuf, piments doux, origan sauvage de Calabre.',
      ar: 'صلصة طماطم، جبن موزاريلا، سجق بقري حار، فلفل حار، زعتر بري.'
    },
    price: 65,
    image: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=800&q=80',
    allergens: ['Gluten', 'Lait'],
    isAvailable: true,
  },
  {
    id: 'f1',
    categoryId: 'formulas',
    name: {
      fr: 'Formule Menu Burger Complet',
      ar: 'وجبة البرجر الكاملة'
    },
    description: {
      fr: '1 Burger au choix + 1 Grande portion de frites maison croustillantes + 1 Boisson 33cl fraîche au choix.',
      ar: 'برجر من اختيارك + بطاطس مقلية مقرمشة حجم كبير + مشروب غازي 33 مل مثلج.'
    },
    price: 85,
    image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80',
    allergens: ['Gluten', 'Lait', 'Moutarde'],
    isAvailable: true,
    optionGroups: [
      {
        id: 'formula_burger',
        name: { fr: 'Votre Burger', ar: 'اختر البرجر' },
        required: true,
        minSelect: 1,
        maxSelect: 1,
        options: [
          { id: 'f_b1', name: { fr: 'Le Truffe & Bacon', ar: 'تروف وبايسون' }, price: 0 },
          { id: 'f_b2', name: { fr: 'Smoky Crispy Chicken', ar: 'دجاج مقرمش' }, price: 0 },
        ]
      },
      {
        id: 'formula_drink',
        name: { fr: 'Votre Boisson', ar: 'اختر المشروب' },
        required: true,
        minSelect: 1,
        maxSelect: 1,
        options: [
          { id: 'coca', name: { fr: 'Coca-Cola 33cl', ar: 'كوكا كولا 33 مل' }, price: 0 },
          { id: 'coca_zero', name: { fr: 'Coca-Cola Zéro 33cl', ar: 'كوكا كولا زيرو 33 مل' }, price: 0 },
          { id: 'sprite', name: { fr: 'Sprite 33cl', ar: 'سبرايت 33 مل' }, price: 0 },
          { id: 'eau', name: { fr: 'Eau Minérale 50cl', ar: 'ماء معدني 50 مل' }, price: 0 },
        ]
      }
    ]
  },
  {
    id: 'd1',
    categoryId: 'drinks',
    name: {
      fr: 'Limonade Maison Menthe & Citron',
      ar: 'ليموناضة طبيعية بالنعناع والليمون'
    },
    description: {
      fr: 'Citrons pressés minute, feuilles de menthe fraîche pilées, sirop de canne léger et glace pilée.',
      ar: 'عصير ليمون طازج معصور، أوراق نعناع مهروسة، شراب قصب خفيف ومجروش الثلج.'
    },
    price: 22,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
    allergens: [],
    isAvailable: true,
  },
  {
    id: 'd2',
    categoryId: 'drinks',
    name: {
      fr: 'Soda Canette 33cl',
      ar: 'مشروب غازي 33 مل'
    },
    description: {
      fr: 'Servi très frais avec glaçons et rondelle de citron.',
      ar: 'يقدم مثلجاً مع قطع الثلج وشريحة ليمون.'
    },
    price: 15,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
    allergens: [],
    isAvailable: true,
    optionGroups: [
      {
        id: 'soda_type',
        name: { fr: 'Choix du parfum', ar: 'اختر النكهة' },
        required: true,
        minSelect: 1,
        maxSelect: 1,
        options: [
          { id: 'coke', name: { fr: 'Coca-Cola Original', ar: 'كوكا كولا' }, price: 0 },
          { id: 'zero', name: { fr: 'Coca-Cola Sans Sucre', ar: 'كوكا كولا بدون سكر' }, price: 0 },
          { id: 'fanta', name: { fr: 'Fanta Orange', ar: 'فانتا برتقال' }, price: 0 },
          { id: 'hawai', name: { fr: 'Hawai Tropical', ar: 'هاواي' }, price: 0 },
        ]
      }
    ]
  },
  {
    id: 'ds1',
    categoryId: 'desserts',
    name: {
      fr: 'Tiramisu Artisanal Spéculoos & Café',
      ar: 'تيراميسو بالقهوة وبسكويت اللوتس'
    },
    description: {
      fr: 'Crème mascarpone onctueuse, biscuits imbibés d\'espresso italien et éclats croustillants de spéculoos.',
      ar: 'كريمة المسكربون الغنية مع بسكويت مشبع بالإسبريسو وفتات اللوتس المقرمش.'
    },
    price: 28,
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80',
    allergens: ['Gluten', 'Lait', 'Œufs'],
    isAvailable: true,
  },
  {
    id: 'ds2',
    categoryId: 'desserts',
    name: {
      fr: 'Fondant Cœur Coulant Chocolat Noir',
      ar: 'كعكة فوندان الشوكولاتة الذائبة'
    },
    description: {
      fr: 'Chocolat noir 70% pur beurre de cacao, cœur coulant intense, servi tiède.',
      ar: 'شوكولاتة سوداء فاخرة بنسبة 70% مع قلب شوكولاتة ذائب يقدم دافئاً.'
    },
    price: 32,
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80',
    allergens: ['Gluten', 'Lait', 'Œufs'],
    isAvailable: false, // Épuisé pour tester l'état rupture
  }
];
