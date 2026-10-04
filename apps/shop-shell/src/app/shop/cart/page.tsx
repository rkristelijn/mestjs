'use client';

import Link from 'next/link';
import { useShop, PALETTES } from '../ShopContext';

/**
 * Shopping cart. Public to view/edit; checkout requires a session, so an
 * anonymous shopper is sent through the single sign-on at checkout.
 */
export default function CartPage() {
  const { theme, cart, cartTotal, removeFromCart, clearCart, user, login } = useShop();
  const c = PALETTES[theme];

  function checkout() {
    if (!user) {
      login(`${window.location.origin}/shop/cart`);
      return;
    }
    clearCart();
    alert('Order placed! Thanks for shopping at Mestwinkel.');
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: c.heading, margin: '0 0 1.25rem' }}>Your Cart</h1>

      {cart.length === 0 ? (
        <div style={{ color: c.textDim }}>
          <p>Your cart is empty.</p>
          <Link href="/shop/products" style={{ color: c.accent }}>Browse products →</Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
            {cart.map((line) => (
              <div key={line.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, padding: '.85rem 1.1rem',
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: c.heading }}>{line.name}</div>
                  <div style={{ fontSize: '.8rem', color: c.textDim }}>
                    {line.qty} × €{line.price.toFixed(2)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <strong style={{ color: c.accent }}>€{(line.price * line.qty).toFixed(2)}</strong>
                  <button onClick={() => removeFromCart(line.id)} aria-label={`Remove ${line.name}`}
                    style={{ border: `1px solid ${c.border}`, background: c.surfaceAlt, color: c.text, borderRadius: 8, cursor: 'pointer', padding: '.3rem .55rem', fontSize: '.8rem' }}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: '1.25rem', paddingTop: '1rem', borderTop: `1px solid ${c.border}`,
          }}>
            <div style={{ fontSize: '1.1rem', color: c.heading }}>
              Total: <strong style={{ color: c.accent }}>€{cartTotal.toFixed(2)}</strong>
            </div>
            <button onClick={checkout}
              style={{ padding: '.7rem 1.5rem', border: 0, borderRadius: 10, cursor: 'pointer', background: c.accent, color: c.accentText, fontWeight: 700 }}>
              {user ? 'Checkout' : 'Sign in to checkout'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
