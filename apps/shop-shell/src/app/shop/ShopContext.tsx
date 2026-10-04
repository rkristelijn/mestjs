'use client';

/**
 * mestjs webshop — shared SSO + theme context.
 *
 * SECURITY NOTE (kept out of the UI on purpose — this is a scanner-training
 * app that must *look* like a real shop): the single sign-on here is
 * deliberately broken. The token is an UNSIGNED base64 blob minted by the SSO
 * service, it travels in the URL (?token=), is persisted to localStorage, and
 * is logged to the console. Nothing verifies the signature or expiry. Products
 * are public; only the Orders / My Page areas require a token.
 *
 * KEUR-EXPECT: SEC-032
 * KEUR-CATEGORY: security
 * KEUR-OWASP: A07-auth-failures A05-security-misconfiguration
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const SSO_URL = 'http://localhost:4000';

export type Theme = 'light' | 'dark';

export interface SsoClaims {
  sub: string;
  role: string;
  exp?: number;
}

export interface CartLine {
  id: number;
  name: string;
  price: number;
  qty: number;
}

interface ShopState {
  token: string | null;
  user: SsoClaims | null;
  theme: Theme;
  ready: boolean;
  cart: CartLine[];
  cartCount: number;
  cartTotal: number;
  addToCart: (p: { id: number; name: string; price: number }) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  login: (returnTo?: string) => void;
  logout: () => void;
  toggleTheme: () => void;
}

const ShopContext = createContext<ShopState | null>(null);

/** Decode (never verify) the unsigned token payload. */
function decode(token: string | null): SsoClaims | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as SsoClaims;
  } catch {
    return null;
  }
}

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('dark');
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('shop_theme') as Theme | null;
    if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);

    const savedCart = localStorage.getItem('shop_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {
        /* ignore corrupt cart */
      }
    }

    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('token');
    if (fromUrl) {
      // INTENTIONAL (SEC-032): bearer token logged to the console.
      console.log('[shop] received SSO token from URL:', fromUrl);
      localStorage.setItem('sso_token', fromUrl);
      setToken(fromUrl);
      // Strip the token from the visible URL (cosmetic — it is already logged).
      params.delete('token');
      const clean = window.location.pathname + (params.toString() ? `?${params}` : '');
      window.history.replaceState({}, '', clean);
    } else {
      const stored = localStorage.getItem('sso_token');
      if (stored) setToken(stored);
    }
    setReady(true);
  }, []);

  // Persist the cart whenever it changes — but only after the initial load has
  // run, so the empty initial state does not clobber a saved cart on mount.
  useEffect(() => {
    if (!ready) return;
    localStorage.setItem('shop_cart', JSON.stringify(cart));
  }, [cart, ready]);

  const addToCart = useCallback((p: { id: number; name: string; price: number }) => {
    setCart((lines) => {
      const existing = lines.find((l) => l.id === p.id);
      if (existing) {
        return lines.map((l) => (l.id === p.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...lines, { ...p, qty: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((id: number) => {
    setCart((lines) => lines.filter((l) => l.id !== id));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const login = useCallback((returnTo?: string) => {
    const back = returnTo ?? `${window.location.origin}${window.location.pathname}`;
    // INTENTIONAL: open redirect target handed straight to the broken SSO.
    window.location.href = `${SSO_URL}/?redirect=${encodeURIComponent(back)}`;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sso_token');
    setToken(null);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      localStorage.setItem('shop_theme', next);
      return next;
    });
  }, []);

  const value: ShopState = {
    token,
    user: decode(token),
    theme,
    ready,
    cart,
    cartCount: cart.reduce((n, l) => n + l.qty, 0),
    cartTotal: cart.reduce((sum, l) => sum + l.price * l.qty, 0),
    addToCart,
    removeFromCart,
    clearCart,
    login,
    logout,
    toggleTheme,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopState {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within ShopProvider');
  return ctx;
}

/** Theme palette shared across the shop UI. */
export const PALETTES: Record<Theme, {
  bg: string; surface: string; surfaceAlt: string; text: string; textDim: string;
  heading: string; accent: string; accentText: string; border: string;
}> = {
  dark: {
    bg: '#0b0f17', surface: '#0f172a', surfaceAlt: '#1e293b', text: '#e5e7eb',
    textDim: '#94a3b8', heading: '#f8fafc', accent: '#22c55e', accentText: '#06240f',
    border: '#1f2937',
  },
  light: {
    bg: '#f1f5f9', surface: '#ffffff', surfaceAlt: '#f8fafc', text: '#1f2937',
    textDim: '#6b7280', heading: '#0f172a', accent: '#16a34a', accentText: '#ffffff',
    border: '#e2e8f0',
  },
};
