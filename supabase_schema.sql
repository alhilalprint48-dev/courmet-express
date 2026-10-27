BEGIN;
-- ==============================================================================
-- SCHEMA MULTI-TENANT SAAS POUR FOOD ORDERING & KDS
-- Projet Supabase : https://xonihnqotjbnirwpajyu.supabase.co
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLE RESTAURANTS (TENANTS)
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(64) UNIQUE NOT NULL, -- ex: "le-gourmet-express", "tacos-city"
    name VARCHAR(255) NOT NULL,
    tagline VARCHAR(255),
    logo_url TEXT,
    phone VARCHAR(32),
    whatsapp_number VARCHAR(32),
    address TEXT,
    currency VARCHAR(16) DEFAULT 'DH',
    delivery_fee NUMERIC(10, 2) DEFAULT 15.00,
    min_delivery_amount NUMERIC(10, 2) DEFAULT 50.00,
    open_hours VARCHAR(128) DEFAULT '11:30 - 23:30',
    theme_color VARCHAR(32) DEFAULT '#ea580c',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLE CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name_fr VARCHAR(128) NOT NULL,
    name_ar VARCHAR(128) NOT NULL,
    icon_name VARCHAR(64) DEFAULT 'UtensilsCrossed',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLE PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name_fr VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    description_fr TEXT,
    description_ar TEXT,
    price NUMERIC(10, 2) NOT NULL,
    image TEXT,
    allergens TEXT[] DEFAULT '{}',
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLE PRODUCT OPTION GROUPS (Cuissons, Suppléments, Sauces)
CREATE TABLE IF NOT EXISTS public.product_option_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name_fr VARCHAR(128) NOT NULL,
    name_ar VARCHAR(128) NOT NULL,
    required BOOLEAN DEFAULT FALSE,
    min_select INT DEFAULT 0,
    max_select INT DEFAULT 1,
    sort_order INT DEFAULT 0
);

-- 6. TABLE PRODUCT OPTIONS
CREATE TABLE IF NOT EXISTS public.product_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.product_option_groups(id) ON DELETE CASCADE,
    name_fr VARCHAR(128) NOT NULL,
    name_ar VARCHAR(128) NOT NULL,
    price NUMERIC(10, 2) DEFAULT 0.00
);

-- 7. TABLE ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    order_number VARCHAR(32) NOT NULL,
    status VARCHAR(32) DEFAULT 'new', -- 'new', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'
    mode VARCHAR(32) DEFAULT 'delivery', -- 'delivery', 'takeaway'
    table_number VARCHAR(32), -- Pour les commandes sur place par QR code
    subtotal NUMERIC(10, 2) NOT NULL,
    delivery_fee NUMERIC(10, 2) DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL,
    
    -- Client
    customer_name VARCHAR(128) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    customer_address TEXT,
    customer_landmark TEXT,
    special_instructions TEXT,
    delivery_timeslot VARCHAR(64),
    
    -- Paiement & Anti-fraude
    payment_method VARCHAR(32) DEFAULT 'cash', -- 'cash', 'tpe'
    cash_change_amount VARCHAR(64),
    gps_lat DOUBLE PRECISION,
    gps_lng DOUBLE PRECISION,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLE ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name_fr VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    selected_options JSONB DEFAULT '[]'::jsonb,
    special_instructions TEXT
);

-- 9. TABLE BLACKLIST (Anti-fraude par restaurant ou global)
CREATE TABLE IF NOT EXISTS public.blacklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    phone VARCHAR(32) NOT NULL,
    reason TEXT DEFAULT 'Refus abusif de commande COD',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TEMPS RÉEL (REALTIME) POUR LE KDS CUISINE ET LES COURSIERS
-- ==============================================================================
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS(
 SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='orders') THEN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
 END IF;
END $$;

-- ==============================================================================
-- INSERTION DU PREMIER RESTAURANT (LE GOURMET EXPRESS) POUR TESTS IMMÉDIATS
-- ==============================================================================
INSERT INTO public.restaurants (slug, name, tagline, phone, whatsapp_number, address, delivery_fee, min_delivery_amount)
VALUES (
    'gourmet-express',
    'Le Gourmet Express',
    'Cuisine artisanale & Livraison rapide',
    '+212 600-000000',
    '212600000000',
    '142 Boulevard d''Anfa, Casablanca',
    15.00,
    50.00
) ON CONFLICT (slug) DO NOTHING;

-- Fail closed on fresh installations, before the explicit policies are applied.
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklists ENABLE ROW LEVEL SECURITY;
COMMIT;
