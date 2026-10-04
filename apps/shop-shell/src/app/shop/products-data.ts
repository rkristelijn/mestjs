'use client';

/**
 * mestjs webshop — product data access.
 *
 * Reads products from the NestJS API on :3000. Products are PUBLIC, so no token
 * is attached here. Falls back to a static catalogue when the API is offline so
 * the storefront still renders during demos.
 */

export interface Product {
  id: number;
  name: string;
  price: number;
  blurb: string;
  emoji: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000/api';

// Presentation metadata layered on top of the API's bare {id,name,price}.
const DRESSING: Record<string, { blurb: string; emoji: string }> = {
  Widget: { blurb: 'All-purpose widget for the modern mest enthusiast.', emoji: '🔩' },
  Gadget: { blurb: 'A premium gadget that pairs with any widget.', emoji: '🧰' },
  Sprocket: { blurb: 'Precision sprocket, sold by the dozen.', emoji: '⚙️' },
};

const FALLBACK: Product[] = [
  { id: 1, name: 'Widget', price: 9.99, ...DRESSING.Widget },
  { id: 2, name: 'Gadget', price: 19.95, ...DRESSING.Gadget },
  { id: 3, name: 'Sprocket', price: 4.5, ...DRESSING.Sprocket },
];

function dress(item: { id: number; name: string; price: number }): Product {
  const extra = DRESSING[item.name] ?? { blurb: 'Quality mest supply.', emoji: '📦' };
  return { ...item, ...extra };
}

export async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_BASE}/items`, { cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    const items = (await res.json()) as { id: number; name: string; price: number }[];
    if (!Array.isArray(items) || items.length === 0) return FALLBACK;
    return items.map(dress);
  } catch {
    return FALLBACK;
  }
}

export async function getProduct(id: number): Promise<Product | null> {
  try {
    const res = await fetch(`${API_BASE}/items/${id}`, { cache: 'no-store' });
    if (res.ok) {
      const item = (await res.json()) as { id: number; name: string; price: number };
      if (item && item.id != null) return dress(item);
    }
  } catch {
    /* fall through to fallback */
  }
  return FALLBACK.find((p) => p.id === id) ?? null;
}
