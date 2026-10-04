'use client';

import { useShop, PALETTES } from '../ShopContext';

/**
 * My Page — the account/profile area. Requires a session; the profile is
 * rendered from the SSO token subject. Also embeds the help-bot micro-frontend
 * as a support widget (one of the separately-deployed apps).
 */
export default function AccountPage() {
  const { theme, user, ready, login, token } = useShop();
  const c = PALETTES[theme];

  if (!ready) return <p style={{ color: c.textDim }}>Loading…</p>;

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: '2.5rem' }}>🔒</div>
        <h1 style={{ fontSize: '1.4rem', color: c.heading, margin: '.5rem 0' }}>Sign in to view your page</h1>
        <button onClick={() => login(`${window.location.origin}/shop/account`)}
          style={{ padding: '.7rem 1.4rem', border: 0, borderRadius: 10, cursor: 'pointer', background: c.accent, color: c.accentText, fontWeight: 700, marginTop: '1rem' }}>
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: c.heading, margin: '0 0 1.25rem' }}>My Page</h1>

      <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, padding: '1.25rem', maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2.5rem', background: c.surfaceAlt, borderRadius: '50%', width: 64, height: 64, display: 'grid', placeItems: 'center' }}>
            🧑‍🌾
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: c.heading }}>{user.sub}</div>
            <div style={{ fontSize: '.85rem', color: c.textDim }}>{user.sub}@mestwinkel.local</div>
            <div style={{ fontSize: '.78rem', color: c.textDim }}>Role: {user.role}</div>
          </div>
        </div>
      </div>

      {/* Support widget — the help-bot micro-frontend, embedded cross-origin and
          handed the shared session token via its URL. */}
      <h2 style={{ fontSize: '1rem', color: c.heading, margin: '1.75rem 0 .5rem' }}>Need help?</h2>
      <iframe
        title="help-bot"
        src={`http://localhost:4205/?token=${encodeURIComponent(token ?? '')}&theme=${theme}`}
        style={{ width: '100%', maxWidth: 480, height: 220, border: `1px solid ${c.border}`, borderRadius: 12, background: c.surface, colorScheme: theme }}
      />
    </div>
  );
}
