import { getProduct, removeProduct, updateProduct } from '@/lib/products';
import { handle, json, readJson } from '@/lib/http';

export async function GET(request, { params }) {
  return handle(async () => {
    const { id } = await params;
    return json({ product: await getProduct(id) });
  });
}

export async function PUT(request, { params }) {
  return handle(async () => {
    const { id } = await params;
    return json({ product: await updateProduct(id, await readJson(request)) });
  });
}

export async function DELETE(request, { params }) {
  return handle(async () => {
    const { id } = await params;
    await removeProduct(id);
    return new Response(null, { status: 204 });
  });
}
