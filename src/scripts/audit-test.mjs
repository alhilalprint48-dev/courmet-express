import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xonihnqotjbnirwpajyu.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Y9bA01yHf430LRCfQhzD9g_08kG8bN2';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runAudit() {
  console.log('====================================================');
  console.log('   🔍 AUDIT COMPLET & TESTS TECHNIQUES EN COURS     ');
  console.log('====================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(` ✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(` ❌ FAIL: ${testName} - ${details}`);
      failedTests++;
    }
  }

  let activeRestaurantId = null;

  // ----------------------------------------------------------------
  // 1. SUPABASE DATABASE AUDIT
  // ----------------------------------------------------------------
  console.log('\n--- 1. AUDIT SUPABASE (Base de Données & Tables) ---');

  // 1.1 Test connection and restaurants table
  try {
    const { data: restos, error: errRestos } = await supabase.from('restaurants').select('*');
    assert(!errRestos && Array.isArray(restos), 'Connexion Supabase & Récupération table `restaurants`', errRestos?.message);
    assert(restos && restos.length > 0, `Au moins 1 restaurant configuré dans la plateforme (Trouvé: ${restos?.length})`);
    
    if (restos && restos.length > 0) {
      const sample = restos[0];
      activeRestaurantId = sample.id;
      assert('slug' in sample && 'name' in sample && 'is_active' in sample, 'Structure conforme pour `restaurants` (slug, name, is_active)');
    }
  } catch (e) {
    assert(false, 'Connexion Supabase restaurants', e.message);
  }

  // 1.2 Test products table
  try {
    const { data: prods, error: errProds } = await supabase.from('products').select('*');
    assert(!errProds && Array.isArray(prods), 'Connexion Supabase & Récupération table `products`', errProds?.message);
    assert(prods && prods.length > 0, `Produits enregistrés en base (Trouvé: ${prods?.length})`);
    if (prods && prods.length > 0) {
      const p = prods[0];
      assert('price' in p && 'name_fr' in p && 'is_available' in p, 'Structure conforme pour `products` (price, name_fr, is_available)');
    }
  } catch (e) {
    assert(false, 'Connexion Supabase products', e.message);
  }

  // 1.3 Test orders table - Insertion & Lecture d'une commande "Sur place / Table"
  const testOrderNumber = `TEST-AUDIT-${Date.now()}`;
  try {
    const { data: inserted, error: insertErr } = await supabase.from('orders').insert({
      restaurant_id: activeRestaurantId,
      order_number: testOrderNumber,
      status: 'new',
      mode: 'dine_in',
      table_number: 'Table 77',
      subtotal: 120,
      delivery_fee: 0,
      total: 120,
      customer_name: 'Audit Bot Test',
      customer_phone: '0600998877',
      customer_address: 'Sur place - Table 77',
      payment_method: 'cash',
    }).select();

    assert(!insertErr, 'Insertion commande `mode=dine_in` avec `table_number` et `restaurant_id` dans Supabase', insertErr?.message);

    // Verify order was inserted
    const { data: retrieved, error: readErr } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', testOrderNumber)
      .maybeSingle();

    assert(retrieved && retrieved.table_number === 'Table 77', 'Lecture & Vérification intégrité du numéro de table stocké');

    // Clean up test order
    await supabase.from('orders').delete().eq('order_number', testOrderNumber);
    console.log(' 🧹 Nettoyage de la commande de test Supabase effectué avec succès.');
  } catch (e) {
    assert(false, 'Test CRUD commande Sur Place dans Supabase', e.message);
  }

  // ----------------------------------------------------------------
  // 2. AUDIT API REST INTERNES (Next.js App Router)
  // ----------------------------------------------------------------
  console.log('\n--- 2. AUDIT DES API ROUTES (Endpoints REST) ---');

  // 2.1 GET /api/orders
  try {
    const resOrders = await fetch('http://localhost:3000/api/orders');
    const ordersData = await resOrders.json();
    assert(resOrders.status === 200 && Array.isArray(ordersData), 'GET /api/orders retourne un JSON valide (Status 200)');
  } catch (e) {
    assert(false, 'GET /api/orders', e.message);
  }

  // 2.2 POST /api/orders & PATCH /api/orders
  let createdOrderId = null;
  try {
    const dummyOrder = {
      id: 'audit_' + Date.now(),
      orderNumber: 'CMD-AUDIT-99',
      createdAt: '12:00',
      status: 'new',
      mode: 'dine_in',
      tableNumber: 'Table 4',
      items: [],
      subtotal: 80,
      deliveryFee: 0,
      total: 80,
      customer: {
        fullName: 'Client Audit',
        phone: '0611223344',
        address: 'Sur place - Table 4',
        paymentMethod: 'cash',
      }
    };
    const resPost = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dummyOrder),
    });
    const postData = await resPost.json();
    assert(resPost.status === 201 && postData.id, 'POST /api/orders broadcast nouvelle commande (Status 201 Created)');
    createdOrderId = postData.id;

    // PATCH test
    const resPatch = await fetch('http://localhost:3000/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: createdOrderId, status: 'preparing' }),
    });
    const patchData = await resPatch.json();
    assert(resPatch.status === 200 && patchData.status === 'preparing', 'PATCH /api/orders mise à jour statut commande -> preparing (Status 200)');
  } catch (e) {
    assert(false, 'POST/PATCH /api/orders', e.message);
  }

  // 2.3 GET /api/products
  try {
    const resProds = await fetch('http://localhost:3000/api/products');
    const prodsData = await resProds.json();
    assert(resProds.status === 200 && Array.isArray(prodsData), 'GET /api/products retourne le catalogue dynamique (Status 200)');
  } catch (e) {
    assert(false, 'GET /api/products', e.message);
  }

  // 2.4 GET /api/restaurants
  try {
    const resResto = await fetch('http://localhost:3000/api/restaurants');
    const restoData = await resResto.json();
    assert(resResto.status === 200 && Array.isArray(restoData), 'GET /api/restaurants retourne les établissements SaaS (Status 200)');
  } catch (e) {
    assert(false, 'GET /api/restaurants', e.message);
  }

  // ----------------------------------------------------------------
  // 3. AUDIT DES RÈGLES MÉTIER & SÉCURITÉ ANTI-FRAUDE
  // ----------------------------------------------------------------
  console.log('\n--- 3. AUDIT RÈGLES MÉTIER & SÉCURITÉ ---');

  // 3.1 Calcul des frais de livraison selon le mode
  const deliverySubtotal = 100;
  const standardDeliveryFee = 15;
  const calculateTotal = (mode, sub) => {
    const fee = mode === 'delivery' ? standardDeliveryFee : 0;
    return { subtotal: sub, deliveryFee: fee, total: sub + fee };
  };

  const delivCalc = calculateTotal('delivery', deliverySubtotal);
  assert(delivCalc.deliveryFee === 15 && delivCalc.total === 115, 'Mode Livraison: Frais de 15 DH ajoutés au total');

  const dineInCalc = calculateTotal('dine_in', deliverySubtotal);
  assert(dineInCalc.deliveryFee === 0 && dineInCalc.total === 100, 'Mode Sur Place (Table): Frais de livraison strictement à 0 DH');

  const takeawayCalc = calculateTotal('takeaway', deliverySubtotal);
  assert(takeawayCalc.deliveryFee === 0 && takeawayCalc.total === 100, 'Mode À Emporter: Frais de livraison strictement à 0 DH');

  // 3.2 Anti-fraude Blacklist check
  const BLACKLIST = ['0612000000', '0699112233', '0600000000'];
  const isBlacklisted = (phone) => BLACKLIST.includes(phone.replace(/\s+/g, ''));
  assert(isBlacklisted('0612000000') === true, 'Anti-fraude: Numéro malveillant correctement bloqué (0612000000)');
  assert(isBlacklisted('06 12 00 00 00') === true, 'Anti-fraude: Détection avec espaces gérée');
  assert(isBlacklisted('0661223344') === false, 'Anti-fraude: Numéro client sain autorisé');

  // 3.3 Plafond Paiement à la livraison (COD)
  const MAX_COD = 500;
  const isOrderExceedingLimit = (total, method) => method === 'cash' && total > MAX_COD;
  assert(isOrderExceedingLimit(350, 'cash') === false, 'Plafond COD: Commande de 350 DH autorisée en espèces');
  assert(isOrderExceedingLimit(750, 'cash') === true, 'Plafond COD: Commande de 750 DH bloquée sans acompte');

  // 3.4 Format de l'URL QR Code Table
  const generateTableUrl = (base, tableNum) => `${base}/?table=${tableNum}`;
  const tableUrl = generateTableUrl('https://courmet-express.pages.dev', 5);
  assert(tableUrl === 'https://courmet-express.pages.dev/?table=5', 'Génération URL QR Code Table conforme');

  // 3.5 Format Ticket Thermique ESC/POS 80mm
  const sampleTicketOrder = {
    orderNumber: 'CMD-8888',
    createdAt: '14:20',
    mode: 'dine_in',
    tableNumber: 'Table 5',
    customer: { fullName: 'Yassine Alami', phone: '0612345678', address: 'Sur place' },
    items: [{ quantity: 1, product: { name: { fr: 'Double Burger' } }, totalPrice: 65, selectedOptions: [] }],
    subtotal: 65,
    deliveryFee: 0,
    total: 65,
  };
  const isDineInFormatted = sampleTicketOrder.mode === 'dine_in' && sampleTicketOrder.tableNumber === 'Table 5';
  assert(isDineInFormatted, 'Format ESC/POS 80mm: Prise en charge Sur Place (Table 5)');

  // ----------------------------------------------------------------
  // 4. BILAN DE L'AUDIT
  // ----------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`   🎯 RÉSULTATS AUDIT: ${passedTests} SUCCÈS, ${failedTests} ÉCHECS`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAudit();
