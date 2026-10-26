import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET all active restaurants
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new restaurant (SaaS Self-Service Onboarding)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, whatsapp_number, address, city, currency = 'DH' } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Nom et téléphone requis' }, { status: 400 });
    }

    // Generate URL-friendly slug
    let slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    // Add random suffix if short
    if (slug.length < 3) slug += '-' + Math.floor(100 + Math.random() * 900);

    // 1. Insert Restaurant into Supabase
    const { data: newRestaurant, error: rErr } = await supabase
      .from('restaurants')
      .insert({
        slug,
        name,
        tagline: `Cuisine & Livraison à ${city || 'Casablanca'}`,
        phone,
        whatsapp_number: whatsapp_number || phone.replace(/\D/g, ''),
        address: address || `${city || 'Casablanca'}`,
        currency,
        delivery_fee: 15.00,
        min_delivery_amount: 50.00,
        is_active: true,
      })
      .select()
      .single();

    if (rErr) throw rErr;

    // 2. Seed default categories for this new restaurant
    const defaultCategories = [
      { restaurant_id: newRestaurant.id, name_fr: 'Plats Principaux', name_ar: 'الأطباق الرئيسية', icon_name: 'UtensilsCrossed', sort_order: 1 },
      { restaurant_id: newRestaurant.id, name_fr: 'Boissons', name_ar: 'مشروبات', icon_name: 'CupSoda', sort_order: 2 },
      { restaurant_id: newRestaurant.id, name_fr: 'Desserts', name_ar: 'حلويات', icon_name: 'Cake', sort_order: 3 },
    ];

    await supabase.from('categories').insert(defaultCategories);

    return NextResponse.json(newRestaurant, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
