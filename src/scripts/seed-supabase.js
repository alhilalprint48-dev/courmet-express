const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xonihnqotjbnirwpajyu.supabase.co';
const supabaseKey = 'sb_publishable_Y9bA01yHf430LRCfQhzD9g_08kG8bN2';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding Supabase database...');

  // 1. Get restaurant
  const { data: restaurants, error: rErr } = await supabase
    .from('restaurants')
    .select('id, slug')
    .limit(1);

  if (rErr || !restaurants.length) {
    console.error('Restaurant not found:', rErr);
    return;
  }

  const restaurantId = restaurants[0].id;
  console.log('Found Restaurant ID:', restaurantId);

  // 2. Categories
  const categoriesData = [
    { restaurant_id: restaurantId, name_fr: 'Burgers Gourmet', name_ar: 'برجر غورمي', icon_name: 'Beef', sort_order: 1 },
    { restaurant_id: restaurantId, name_fr: 'Pizzas au Feu de Bois', name_ar: 'بيتزا إيطالية', icon_name: 'Pizza', sort_order: 2 },
    { restaurant_id: restaurantId, name_fr: 'Formules & Menus', name_ar: 'وجبات كاملة', icon_name: 'UtensilsCrossed', sort_order: 3 },
    { restaurant_id: restaurantId, name_fr: 'Boissons Fraîches', name_ar: 'مشروبات باردة', icon_name: 'CupSoda', sort_order: 4 },
    { restaurant_id: restaurantId, name_fr: 'Desserts Maison', name_ar: 'حلويات منزلية', icon_name: 'Cake', sort_order: 5 },
  ];

  const { data: insertedCats, error: catErr } = await supabase
    .from('categories')
    .insert(categoriesData)
    .select();

  if (catErr) {
    console.error('Error inserting categories:', catErr);
    return;
  }
  console.log(`Inserted ${insertedCats.length} categories.`);

  const catMap = {};
  insertedCats.forEach(c => {
    catMap[c.name_fr] = c.id;
  });

  // 3. Products
  const productsData = [
    {
      restaurant_id: restaurantId,
      category_id: catMap['Burgers Gourmet'],
      name_fr: 'Le Truffe & Bacon Burger',
      name_ar: 'برجر الكمأة ولحم البقر المقدد',
      description_fr: 'Pur bœuf haché façon bouchère (150g), cheddar affiné 9 mois, sauce truffée maison, bacon croustillant.',
      description_ar: 'لحم بقري مفروم طازج (150 غ)، جبن شيدر معتق، صلصة الكمأة المنزلية.',
      price: 68.00,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
      allergens: ['Gluten', 'Lait', 'Moutarde'],
      is_available: true,
    },
    {
      restaurant_id: restaurantId,
      category_id: catMap['Burgers Gourmet'],
      name_fr: 'Smoky Crispy Chicken',
      name_ar: 'تشيكن كريسبي المدخن',
      description_fr: 'Filet de poulet mariné pané aux cornflakes croustillants, salade croquante, pickles, sauce barbecue.',
      description_ar: 'صدر دجاج مقرمش متبل، خس طازج، مخلل، صلصة باربيكيو مدخنة.',
      price: 58.00,
      image: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=800&q=80',
      allergens: ['Gluten', 'Œufs', 'Lait'],
      is_available: true,
    },
    {
      restaurant_id: restaurantId,
      category_id: catMap['Pizzas au Feu de Bois'],
      name_fr: 'Pizza Burrata & Pesto',
      name_ar: 'بيتزا البوراتا والبيستو الإيطالية',
      description_fr: 'Pâte 48h, sauce tomate San Marzano, mozzarella fior di latte, cœur de burrata, roquette et pesto basilic.',
      description_ar: 'عجينة متخمرة، صلصة طماطم، موزاريلا، كرة بوراتا طازجة، جرجير وبيستو.',
      price: 75.00,
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
      allergens: ['Gluten', 'Lait', 'Fruits à coque'],
      is_available: true,
    },
    {
      restaurant_id: restaurantId,
      category_id: catMap['Formules & Menus'],
      name_fr: 'Formule Menu Burger Complet',
      name_ar: 'وجبة البرجر الكاملة',
      description_fr: '1 Burger au choix + 1 Grande portion de frites maison + 1 Boisson 33cl fraîche au choix.',
      description_ar: 'برجر من اختيارك + بطاطس مقلية مقرمشة + مشروب غازي 33 مل.',
      price: 85.00,
      image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80',
      allergens: ['Gluten', 'Lait'],
      is_available: true,
    },
    {
      restaurant_id: restaurantId,
      category_id: catMap['Boissons Fraîches'],
      name_fr: 'Limonade Maison Menthe & Citron',
      name_ar: 'ليموناضة طبيعية بالنعناع والليمون',
      description_fr: 'Citrons pressés minute, feuilles de menthe fraîche pilées, glace pilée.',
      description_ar: 'عصير ليمون طازج معصور مع أوراق نعناع ومجروش الثلج.',
      price: 22.00,
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
      allergens: [],
      is_available: true,
    },
    {
      restaurant_id: restaurantId,
      category_id: catMap['Desserts Maison'],
      name_fr: 'Tiramisu Artisanal Spéculoos',
      name_ar: 'تيراميسو بالقهوة وبسكويت اللوتس',
      description_fr: 'Crème mascarpone onctueuse, biscuits imbibés espresso et éclats spéculoos.',
      description_ar: 'كريمة المسكربون الغنية مع بسكويت مشبع بالإسبريسو وفتات اللوتس.',
      price: 28.00,
      image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80',
      allergens: ['Gluten', 'Lait', 'Œufs'],
      is_available: true,
    }
  ];

  const { data: insertedProds, error: prodErr } = await supabase
    .from('products')
    .insert(productsData)
    .select();

  if (prodErr) {
    console.error('Error inserting products:', prodErr);
    return;
  }
  console.log(`Inserted ${insertedProds.length} products.`);
  console.log('Database successfully seeded with multi-tenant data!');
}

seed().catch(console.error);
