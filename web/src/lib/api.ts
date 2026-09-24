// Thin fetch client over the mestjs NestJS API.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000/api';

export interface Item {
  id: number;
  name: string;
  price: number;
}

export async function fetchItems(): Promise<Item[]> {
  const res = await fetch(`${API_BASE}/items`);
  if (!res.ok) throw new Error(`GET /items failed: ${res.status}`);
  return res.json();
}

export async function createItem(input: {
  name: string;
  price: number;
}): Promise<Item> {
  const res = await fetch(`${API_BASE}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`POST /items failed: ${res.status}`);
  return res.json();
}
