export function buildMenuUrl(base, slug, table) {
  const url = new URL(base);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Adresse du site invalide');
  url.pathname = '/'; url.hash = '';
  url.searchParams.set('r', slug);
  if (table !== undefined && String(table).trim()) url.searchParams.set('table', String(table).trim());
  else url.searchParams.delete('table');
  return url.toString();
}
export function unseenOrderIds(seen, orders) {
  return orders.filter(order => order.status === 'new' && !seen.has(order.id)).map(order => order.id);
}
export function navigationUrl(customer) {
  const gps = customer.gpsCoords;
  if (gps && Number.isFinite(gps.lat) && Number.isFinite(gps.lng) && Math.abs(gps.lat) <= 90 && Math.abs(gps.lng) <= 180) {
    return `https://www.google.com/maps/dir/?api=1&destination=${gps.lat},${gps.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`;
}
export function mapOrder(row) {
  const options = items => (items || []).map(option => ({ ...option, price: Number(option.price || 0) }));
  return {
    id: row.id, orderNumber: row.order_number,
    createdAt: new Date(row.created_at).toLocaleString('fr-MA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Casablanca' }),
    status: row.status, mode: row.mode, tableNumber: row.table_number || undefined,
    assignedDriverId: row.assigned_driver_id || undefined, paidAt: row.paid_at || undefined,
    paidBy: row.paid_by || undefined, paymentReceived: row.payment_received == null ? undefined : Number(row.payment_received), archivedAt: row.archived_at || undefined,
    subtotal: Number(row.subtotal), total: Number(row.total), deliveryFee: Number(row.delivery_fee || 0),
    discountAmount: Number(row.discount_amount || 0), pointsRedeemed: Number(row.points_redeemed || 0),
    items: (row.order_items || []).map(item => ({
      cartItemId: item.id, product: { id: item.product_id || item.id, categoryId: '', name: { fr: item.product_name_fr, ar: item.product_name_fr }, description: { fr: '', ar: '' }, price: Number(item.unit_price), image: '', allergens: [], isAvailable: true },
      selectedOptions: options(item.selected_options), quantity: Number(item.quantity), unitPrice: Number(item.unit_price), totalPrice: Number(item.total_price), specialInstructions: item.special_instructions,
    })),
    customer: {
      fullName: row.customer_name || 'Client', phone: row.customer_phone || '', address: row.customer_address || '', landmark: row.customer_landmark,
      specialInstructions: row.special_instructions, deliveryTimeSlot: row.delivery_timeslot, paymentMethod: row.payment_method || 'cash', cashChangeAmount: row.cash_change_amount,
      gpsCoords: row.gps_lat != null && row.gps_lng != null ? { lat: Number(row.gps_lat), lng: Number(row.gps_lng) } : undefined,
    },
  };
}
