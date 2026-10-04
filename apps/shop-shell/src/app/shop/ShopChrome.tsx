'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useShop, PALETTES } from './ShopContext';

/**
 * mestjs webshop chrome — a professional-looking storefront shell:
 * a top bar with brand + account controls, and a right-hand navigation menu.
 * Content is route-driven by the pages rendered as {children}.
 */
export function ShopChrome({ children }: { children: React.ReactNode }) {
  const { user, theme, toggleTheme, login, logout, ready, cartCount } = useShop();
  const pathname = usePathname();
  const c = PALETTES[theme];

  const navItems = [
    { href: '/shop/products', label: 'Products', icon: '🛍️', public: true },
    { href: '/shop/cart', label: 'Cart', icon: '🛒', public: true },
    { href: '/shop/orders', label: 'My Orders', icon: '📦', public: false },
    { href: '/shop/account', label: 'My Page', icon: '🪪', public: false },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: c.bg, color: c.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* ---- top bar ---- */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.25rem', height: 60, background: c.surface,
        borderBottom: `1px solid ${c.border}`, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/shop/products" style={{ display: 'flex', alignItems: 'center', gap: '.5rem', textDecoration: 'none', color: c.heading }}>
          <span style={{ fontSize: '1.5rem' }}>🌱</span>
          <strong style={{ fontSize: '1.15rem', letterSpacing: '-.01em' }}>Mestwinkel</strong>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          <Link href="/shop/cart" aria-label="Cart" style={{ position: 'relative', textDecoration: 'none', fontSize: '1.3rem', lineHeight: 1 }}>
            🛒
            {cartCount > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -10, minWidth: 16, height: 16,
                padding: '0 4px', borderRadius: 8, background: c.accent, color: c.accentText,
                fontSize: '.65rem', fontWeight: 700, display: 'grid', placeItems: 'center',
              }}>
                {cartCount}
              </span>
            )}
          </Link>
          <button onClick={toggleTheme} aria-label="Toggle theme"
            style={{ padding: '.4rem .6rem', border: `1px solid ${c.border}`, borderRadius: 8, cursor: 'pointer', background: c.surfaceAlt, color: c.text, fontSize: '.85rem' }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {ready && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <span style={{ fontSize: '.85rem', color: c.textDim }}>Hi, <strong style={{ color: c.heading }}>{user.sub}</strong></span>
              <button onClick={logout}
                style={{ padding: '.4rem .8rem', border: `1px solid ${c.border}`, borderRadius: 8, cursor: 'pointer', background: c.surfaceAlt, color: c.text, fontSize: '.85rem' }}>
                Log out
              </button>
            </div>
          ) : (
            <button onClick={() => login()}
              style={{ padding: '.4rem .9rem', border: 0, borderRadius: 8, cursor: 'pointer', background: c.accent, color: c.accentText, fontSize: '.85rem', fontWeight: 600 }}>
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* ---- body: content + right menu ---- */}
      <div style={{ display: 'flex', flex: 1, alignItems: 'stretch' }}>
        <main style={{ flex: 1, padding: '1.5rem', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
          {children}
        </main>

        <nav style={{
          width: 220, flexShrink: 0, background: c.surface, borderLeft: `1px solid ${c.border}`,
          padding: '1.25rem .75rem', display: 'flex', flexDirection: 'column', gap: '.25rem',
        }}>
          <div style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.08em', color: c.textDim, padding: '0 .5rem .5rem' }}>
            Menu
          </div>
          {navItems.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.55rem .65rem',
                  borderRadius: 8, textDecoration: 'none', fontSize: '.9rem',
                  background: active ? c.surfaceAlt : 'transparent',
                  color: active ? c.heading : c.text,
                  fontWeight: active ? 600 : 400,
                }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {!item.public && !user && (
                  <span style={{ marginLeft: 'auto', fontSize: '.65rem', color: c.textDim }}>🔒</span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <footer style={{ padding: '.75rem 1.25rem', borderTop: `1px solid ${c.border}`, color: c.textDim, fontSize: '.75rem', textAlign: 'center' }}>
        Mestwinkel — demo storefront · © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
