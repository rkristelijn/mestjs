import { useEffect, useState } from 'react';

/**
 * mestjs — help-bot micro-frontend (React + Vite). INTENTIONALLY INSECURE.
 *
 * A "support chatbot" embedded cross-origin by the shop-shell. It is the
 * textbook postMessage victim: it listens for messages and acts on them with
 * NO event.origin check (CWE-346), so any page that can reach this frame can
 * push a forged SSO token in and the bot will happily greet "you" as that user.
 * It also reads ?token= / ?theme= off its own URL. Nothing is signature/expiry-
 * verified. The light/dark theme is received the same broken way. Do NOT copy.
 */
type Theme = 'light' | 'dark';
const PALETTE = {
  dark: { bg: '#0f172a', text: '#e5e7eb', heading: '#f8fafc', warn: '#fbbf24', code: '#93c5fd', codeBg: '#111827', border: '#1f2937', bubble: '#1e293b' },
  light: { bg: '#ffffff', text: '#1f2937', heading: '#0f172a', warn: '#b45309', code: '#1d4ed8', codeBg: '#f3f4f6', border: '#e5e7eb', bubble: '#f3f4f6' },
};

export function App() {
  const [token, setToken] = useState<string>('(none)');
  const [user, setUser] = useState<string>('(anonymous)');
  const [theme, setTheme] = useState<Theme>('dark');
  const c = PALETTE[theme];

  function apply(t: string) {
    setToken(t);
    try {
      const payload = t.split('.')[1];
      const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      setUser(claims.sub ?? '(unknown)');
    } catch {
      /* ignore malformed token */
    }
  }

  function applyTheme(t: Theme) {
    setTheme(t);
    const bg = PALETTE[t].bg;
    document.documentElement.style.background = bg;
    document.body.style.background = bg;
    document.body.style.margin = '0';
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('token');
    if (fromUrl) apply(fromUrl);
    const themeFromUrl = params.get('theme');
    applyTheme(themeFromUrl === 'light' ? 'light' : 'dark');

    // INTENTIONAL (CWE-346): message handler with NO event.origin check. Any
    // origin that can postMessage into this iframe can inject a bearer token.
    const onMsg = (e: MessageEvent) => {
      if (!e.data) return;
      if (e.data.type === 'sso-token' && e.data.token) apply(e.data.token);
      if (e.data.type === 'sso-theme' && (e.data.theme === 'light' || e.data.theme === 'dark')) {
        applyTheme(e.data.theme);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '1.5rem', background: c.bg, color: c.text, minHeight: '100vh' }}>
      <h1 style={{ fontSize: '1.3rem', color: c.heading }}>💬 Help Bot</h1>
      <p style={{ color: c.warn, fontSize: '.8rem' }}>
        Intentionally insecure. Accepts any SSO token via postMessage (no origin
        check) or URL — the classic postMessage token-theft target.
      </p>
      <div style={{ background: c.bubble, borderRadius: 8, padding: '.75rem', fontSize: '.9rem' }}>
        <p>🤖 Hi {user}! How can I help with your mest order today?</p>
      </div>
      <pre style={{ background: c.codeBg, color: c.code, padding: '.5rem', borderRadius: 6, fontSize: '.7rem', overflowX: 'auto', marginTop: '.75rem', border: `1px solid ${c.border}` }}>
        token = {token}
      </pre>
    </main>
  );
}

export default App;
