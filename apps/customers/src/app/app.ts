import { Component, signal, computed, OnInit } from '@angular/core';

/**
 * mestjs — customers micro-frontend. INTENTIONALLY INSECURE token handling.
 *
 * This app is embedded as a cross-origin iframe by the shop-shell. It gets the
 * shared SSO token two broken ways and trusts both without any verification:
 *   1. ?token= on its own URL (the shell baked it into the iframe src).
 *   2. window 'message' events — with NO event.origin check, so ANY page that
 *      can postMessage into this frame can inject a token. (CWE-346.)
 * The token is never signature- or expiry-checked; we just base64-decode and
 * display the claims. The light/dark theme is received the same broken way
 * (?theme= + postMessage) and applied live. Do NOT copy.
 */
type Theme = 'light' | 'dark';
const PALETTE = {
  dark: { bg: '#0f172a', text: '#e5e7eb', heading: '#f8fafc', warn: '#fbbf24', code: '#93c5fd', codeBg: '#111827', border: '#1f2937' },
  light: { bg: '#ffffff', text: '#1f2937', heading: '#0f172a', warn: '#b45309', code: '#1d4ed8', codeBg: '#f3f4f6', border: '#e5e7eb' },
};

@Component({
  selector: 'app-root',
  template: `
    <main [style.background]="c().bg" [style.color]="c().text"
      style="font-family: system-ui, sans-serif; padding: 1.5rem; min-height:100vh">
      <h1 style="font-size: 1.3rem" [style.color]="c().heading">👤 Customers</h1>
      <p [style.color]="c().warn" style="font-size:.8rem">
        Intentionally insecure. Trusts any SSO token from URL or postMessage
        (no origin check, no signature check).
      </p>
      <p><strong>Signed in as:</strong> {{ user() }}</p>
      <p><strong>Role:</strong> {{ role() }}</p>
      <pre [style.background]="c().codeBg" [style.color]="c().code" [style.border]="'1px solid ' + c().border"
        style="padding:.5rem;border-radius:6px;font-size:.7rem;overflow:auto">token = {{ token() }}</pre>
      <ul style="font-size:.85rem">
        <li>Alice Jansen — alice&#64;example.com</li>
        <li>Bob de Vries — bob&#64;example.com</li>
      </ul>
    </main>
  `,
})
export class App implements OnInit {
  protected readonly title = signal('customers');
  protected readonly token = signal<string>('(none)');
  protected readonly user = signal<string>('(anonymous)');
  protected readonly role = signal<string>('(none)');
  protected readonly theme = signal<Theme>('dark');
  protected readonly c = computed(() => PALETTE[this.theme()]);

  ngOnInit(): void {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('token');
    if (fromUrl) this.apply(fromUrl);
    const themeFromUrl = params.get('theme');
    if (themeFromUrl === 'light' || themeFromUrl === 'dark') this.applyTheme(themeFromUrl);
    else this.applyTheme('dark');

    // INTENTIONAL (CWE-346): no event.origin check — any origin can inject.
    window.addEventListener('message', (e: MessageEvent) => {
      if (!e.data) return;
      if (e.data.type === 'sso-token' && e.data.token) this.apply(e.data.token);
      if (e.data.type === 'sso-theme' && (e.data.theme === 'light' || e.data.theme === 'dark')) {
        this.applyTheme(e.data.theme);
      }
    });
  }

  /** "Verify" the token = base64-decode the payload and trust it blindly. */
  private apply(token: string): void {
    this.token.set(token);
    try {
      const payload = token.split('.')[1];
      const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      this.user.set(claims.sub ?? '(unknown)');
      this.role.set(claims.role ?? '(none)');
    } catch {
      /* ignore malformed token — still displayed above */
    }
  }

  /** Apply theme + paint the document background so there is no white frame. */
  private applyTheme(theme: Theme): void {
    this.theme.set(theme);
    const bg = PALETTE[theme].bg;
    document.documentElement.style.background = bg;
    document.body.style.background = bg;
    document.body.style.margin = '0';
  }
}
