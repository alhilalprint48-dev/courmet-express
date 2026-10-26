import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { Order, OrderStatus } from '@/types';

export async function GET() {
  return NextResponse.json(store.orders);
}

export async function POST(request: Request) {
  try {
    const body: Order = await request.json();
    const created = store.addOrder(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { orderId, status }: { orderId: string; status: OrderStatus } = await request.json();
    const updated = store.updateOrderStatus(orderId, status);
    if (!updated) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    if (orderId) {
      store.orders = store.orders.filter((o) => o.id !== orderId);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 400 });
  }
}
