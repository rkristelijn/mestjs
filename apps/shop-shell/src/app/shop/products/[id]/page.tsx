'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useShop, PALETTES } from '../../ShopContext';
import { getProduct, type Product } from '../../products-data';

/**
 * Public product detail page. No login required.
 */
export default function ProductDetailPage() {
  const { theme, addToCart } = useShop();
  const c = PALETTES[theme];
  const params = useParams();
  const id = Number(params?.id);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setLoading(false);
      return;
    }
    getProduct(id).then((p) => {
      setProduct(p);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <p style={{ color: c.textDim }}>Loading…</p>;

  if (!product) {
    return (
      <div>
        <p style={{ color: c.textDim }}>Product not found.</p>
        <Link href="/shop/products" style={{ color: c.accent }}>← Back to products</Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/shop/products" style={{ color: c.textDim, textDecoration: 'none', fontSize: '.85rem' }}>
        ← All products
      </Link>

      <div style={{
        display: 'flex', gap: '2rem', flexWrap: 'wrap', marginTop: '1rem',
        background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, padding: '1.5rem',
      }}>
        <div style={{ fontSize: '6rem', background: c.surfaceAlt, borderRadius: 12, padding: '1.5rem 2.5rem', alignSelf: 'flex-start' }}>
          {product.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: c.heading, margin: '0 0 .5rem' }}>{product.name}</h1>
          <p style={{ color: c.textDim, margin: '0 0 1rem' }}>{product.blurb}</p>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: c.accent, marginBottom: '1.25rem' }}>
            €{product.price.toFixed(2)}
          </div>
          <button onClick={() => { addToCart({ id: product.id, name: product.name, price: product.price }); setAdded(true); }}
            style={{
              padding: '.7rem 1.4rem', border: 0, borderRadius: 10, cursor: 'pointer',
              background: c.accent, color: c.accentText, fontWeight: 700, fontSize: '.95rem',
            }}>
            {added ? '✓ Added to cart' : 'Add to cart'}
          </button>
          <p style={{ color: c.textDim, fontSize: '.8rem', marginTop: '1rem' }}>
            SKU #{product.id} · In stock · Ships from Mestwinkel NL
          </p>
        </div>
      </div>
    </div>
  );
}
