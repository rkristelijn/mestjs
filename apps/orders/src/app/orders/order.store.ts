/**
 * In-memory order store for the mestjs orders (Fastify) backend.
 *
 * Deliberately its own in-process store (no shared DB with `api`) — realistic
 * micro-service slop: the orders service keeps a private copy of order state
 * and never evicts it. Seeded on boot with a couple of orders that reference
 * the item/user ids the `api` app seeds, so the two apps feel like one product.
 */

export interface Order {
  id: number;
  userId: number;
  itemId: number;
  qty: number;
  status: string;
  total: number;
}

const orders: Order[] = [];
let nextId = 1;

export function initStore(): void {
  orders.length = 0;
  nextId = 1;
  // userId/itemId mirror the ids seeded by apps/api/.../db/database.ts.
  create({ userId: 1, itemId: 1, qty: 2, status: 'paid', total: 19.98 });
  create({ userId: 2, itemId: 2, qty: 1, status: 'pending', total: 19.95 });
}

export function create(o: Omit<Order, 'id'>): Order {
  const order: Order = { id: nextId++, ...o };
  orders.push(order);
  return order;
}

export function findAll(): Order[] {
  return orders;
}

export function findOne(id: number): Order | undefined {
  return orders.find((o) => o.id === id);
}
