export async function fetchRestaurantData(client, slug) {
  const [selection, listing] = await Promise.all([
    client.from('restaurants').select('*').eq('slug', slug).single(),
    client.from('restaurants').select('id,slug,name').order('name'),
  ]);
  if (selection.error || !selection.data) throw new Error('Restaurant introuvable ou momentanément indisponible.');
  const restaurant = selection.data;
  const [catalog, categories] = await Promise.all([
    client.from('products').select('*').eq('restaurant_id', restaurant.id),
    client.from('categories').select('*').eq('restaurant_id', restaurant.id).order('sort_order', { ascending: true }),
  ]);
  if (catalog.error || categories.error || !Array.isArray(catalog.data) || !Array.isArray(categories.data)) throw new Error('La carte ne peut pas être chargée. Réessayez.');
  return { restaurant, products: catalog.data, categories: categories.data, available: listing.data || [{ id: restaurant.id, slug: restaurant.slug, name: restaurant.name }] };
}
