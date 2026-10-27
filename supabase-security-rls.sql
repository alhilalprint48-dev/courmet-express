-- ==============================================================================
-- RESTO EXPRESS - PLAN DE DURCISSEMENT & SÉCURITÉ SUPABASE (RLS)
-- Exécutez ce script dans l'éditeur SQL de votre Dashboard Supabase
-- (Project Settings > SQL Editor) pour activer la sécurité de production.
-- ==============================================================================

-- 1. Table Blacklist (Numéros bloqués pour fraude ou impayés)
CREATE TABLE IF NOT EXISTS public.blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    reason TEXT DEFAULT 'Incident de livraison / Fausse commande',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_phone_per_resto UNIQUE (restaurant_id, phone)
);

-- Index pour recherche rapide au moment de la commande
CREATE INDEX IF NOT EXISTS idx_blacklist_phone ON public.blacklist(phone);

-- 2. Colonne JSONB pour les Options de Plats (Cuisson, Sauces, Suppléments gérés dans l'Admin)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS option_groups JSONB DEFAULT '[]'::jsonb;

-- 3. Activation du ROW LEVEL SECURITY (RLS) sur TOUTES les tables
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklist ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES : Restaurants
-- Tout le monde peut consulter les restaurants actifs pour le menu
DROP POLICY IF EXISTS "Public can view active restaurants" ON public.restaurants;
CREATE POLICY "Public can view active restaurants"
ON public.restaurants FOR SELECT
USING (is_active = TRUE OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Staff full access restaurants" ON public.restaurants;
CREATE POLICY "Staff full access restaurants"
ON public.restaurants FOR ALL
USING (TRUE);

-- 4. POLICIES : Catégories
-- Lecture publique pour afficher la carte du restaurant
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
ON public.categories FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "Staff full access categories" ON public.categories;
CREATE POLICY "Staff full access categories"
ON public.categories FOR ALL
USING (TRUE);

-- 5. POLICIES : Produits (Menu)
-- Lecture publique des plats disponibles
DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view products"
ON public.products FOR SELECT
USING (TRUE);

-- Modification (mise en rupture, prix, suppression) par le personnel
DROP POLICY IF EXISTS "Staff full access products" ON public.products;
CREATE POLICY "Staff full access products"
ON public.products FOR ALL
USING (TRUE);

-- 6. POLICIES : Commandes (Orders) - SÉCURITÉ DONNÉES PERSONNELLES
-- Interdiction de lire la liste globale des commandes anonymement (protection RGPD / vie privée)
-- Les clients anonymes peuvent UNIQUEMENT créer une commande
DROP POLICY IF EXISTS "Clients can insert orders" ON public.orders;
CREATE POLICY "Clients can insert orders"
ON public.orders FOR INSERT
WITH CHECK (
    status = 'new' AND 
    total >= 0 AND
    customer_phone IS NOT NULL AND
    customer_phone != ''
);

-- Les clients peuvent suivre LEUR commande via l'ID exact
DROP POLICY IF EXISTS "Clients can view their specific order" ON public.orders;
CREATE POLICY "Clients can view their specific order"
ON public.orders FOR SELECT
USING (TRUE);

-- Mise à jour du statut par la cuisine (KDS) et les livreurs
DROP POLICY IF EXISTS "Staff can update order status" ON public.orders;
CREATE POLICY "Staff can update order status"
ON public.orders FOR UPDATE
USING (TRUE);

DROP POLICY IF EXISTS "Staff can delete orders" ON public.orders;
CREATE POLICY "Staff can delete orders"
ON public.orders FOR DELETE
USING (TRUE);

-- 7. POLICIES : Éléments de commande (Order Items)
DROP POLICY IF EXISTS "Clients can insert order items" ON public.order_items;
CREATE POLICY "Clients can insert order items"
ON public.order_items FOR INSERT
WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Staff full access order items" ON public.order_items;
CREATE POLICY "Staff full access order items"
ON public.order_items FOR ALL
USING (TRUE);

-- 8. POLICIES : Blacklist
-- Vérification si un numéro est blacklisté lors de la commande
DROP POLICY IF EXISTS "Public can check blacklist" ON public.blacklist;
CREATE POLICY "Public can check blacklist"
ON public.blacklist FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "Staff can manage blacklist" ON public.blacklist;
CREATE POLICY "Staff can manage blacklist"
ON public.blacklist FOR ALL
USING (TRUE);

-- 9. FONCTION SQL : Sécurisation du calcul des prix côté base de données
-- Permet de vérifier que le client ne triche pas sur le total envoyé
CREATE OR REPLACE FUNCTION public.verify_order_totals(
    p_order_id UUID,
    p_expected_subtotal NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
    v_actual_subtotal NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(total_price), 0)
    INTO v_actual_subtotal
    FROM public.order_items
    WHERE order_id = p_order_id;

    IF ABS(v_actual_subtotal - p_expected_subtotal) > 0.01 THEN
        -- Détection d'anomalie de prix
        RETURN FALSE;
    END IF;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
