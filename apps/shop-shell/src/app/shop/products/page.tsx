'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useShop, PALETTES } from '../ShopContext';
import { getProducts, type Product } from '../products-data';

/**
 * Public product listing. No login required — anyone can browse the catalogue.
 */
export default function ProductsPage() {
  const { theme } = useShop();
  const c = PALETTES[theme];
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts().then((p) => {
      setProducts(p);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: c.heading, margin: '0 0 .25rem' }}>Products</h1>
      <p style={{ color: c.textDim, margin: '0 0 1.5rem', fontSize: '.9rem' }}>
        Browse the full Mestwinkel catalogue — no account needed.
      </p>

      {loading ? (
        <p style={{ color: c.textDim }}>Loading products…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {products.map((p) => (
            <Link key={p.id} href={`/shop/products/${p.id}`}
              style={{
                textDecoration: 'none', color: c.text, background: c.surface,
                border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
              }}>
              <div style={{ fontSize: '3rem', textAlign: 'center', padding: '1.5rem 0', background: c.surfaceAlt }}>
                {p.emoji}
              </div>
              <div style={{ padding: '.85rem 1rem 1rem' }}>
                <div style={{ fontWeight: 600, color: c.heading }}>{p.name}</div>
                <div style={{ fontSize: '.8rem', color: c.textDim, margin: '.25rem 0 .6rem', minHeight: '2.4em' }}>{p.blurb}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: c.accent }}>
                  €{p.price.toFixed(2)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
