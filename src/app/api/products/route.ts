import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { Product } from '@/types';

export async function GET() {
  return NextResponse.json(store.products);
}

export async function POST(request: Request) {
  try {
    const body: Product = await request.json();
    const created = store.addProduct(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add product' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { productId }: { productId: string } = await request.json();
    const updated = store.toggleProductStock(productId);
    if (!updated) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to toggle product stock' }, { status: 400 });
  }
}
