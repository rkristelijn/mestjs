'use client';

import { useShop, PALETTES } from '../ShopContext';

/**
 * My Orders — requires a session. If there is no SSO token, we send the user
 * through the (broken) single sign-on. Orders are shown for the token subject.
 */

// Demo order history keyed by user — in a real shop this comes from the orders
// service; here it is static so the storefront demonstrates the gated area.
const ORDERS_BY_USER: Record<string, { id: number; item: string; total: string; status: string }[]> = {
  admin: [
    { id: 1001, item: 'Widget ×2', total: '€19,98', status: 'Shipped' },
    { id: 1002, item: 'Sprocket ×12', total: '€54,00', status: 'Processing' },
  ],
  alice: [
    { id: 2001, item: 'Gadget ×1', total: '€19,95', status: 'Delivered' },
  ],
};

export default function OrdersPage() {
  const { theme, user, ready, login } = useShop();
  const c = PALETTES[theme];

  if (!ready) return <p style={{ color: c.textDim }}>Loading…</p>;

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: '2.5rem' }}>🔒</div>
        <h1 style={{ fontSize: '1.4rem', color: c.heading, margin: '.5rem 0' }}>Sign in to view your orders</h1>
        <p style={{ color: c.textDim, maxWidth: 420, margin: '0 auto 1.5rem' }}>
          Your order history is private. Please sign in to continue.
        </p>
        <button onClick={() => login(`${window.location.origin}/shop/orders`)}
          style={{ padding: '.7rem 1.4rem', border: 0, borderRadius: 10, cursor: 'pointer', background: c.accent, color: c.accentText, fontWeight: 700 }}>
          Sign in
        </button>
      </div>
    );
  }

  const orders = ORDERS_BY_USER[user.sub] ?? [];

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: c.heading, margin: '0 0 .25rem' }}>My Orders</h1>
      <p style={{ color: c.textDim, margin: '0 0 1.5rem', fontSize: '.9rem' }}>
        Order history for <strong style={{ color: c.heading }}>{user.sub}</strong>.
      </p>

      {orders.length === 0 ? (
        <p style={{ color: c.textDim }}>You have no orders yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {orders.map((o) => (
            <div key={o.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, padding: '1rem 1.25rem',
            }}>
              <div>
                <div style={{ fontWeight: 600, color: c.heading }}>Order #{o.id}</div>
                <div style={{ fontSize: '.85rem', color: c.textDim }}>{o.item}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: c.accent }}>{o.total}</div>
                <div style={{ fontSize: '.78rem', color: c.textDim }}>{o.status}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
