// Thin fetch client over the mestjs NestJS API.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000/api';

// INTENTIONAL (MEST-NEXT-001): a secret in a NEXT_PUBLIC_* var — Next.js inlines
// this into the client bundle at build, so it ships to every browser.
const API_TOKEN = process.env.NEXT_PUBLIC_API_SECRET ?? 'fallback-token';

export interface Item {
  id: number;
  name: string;
  price: number;
}

export async function fetchItems(): Promise<Item[]> {
  const res = await fetch(`${API_BASE}/items`, {
    headers: { authorization: `Bearer ${API_TOKEN}` },
  });
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
