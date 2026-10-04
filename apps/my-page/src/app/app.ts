import { Component, signal, computed, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * mestjs — my-page (profile) micro-frontend. INTENTIONALLY INSECURE.
 *
 * Embedded cross-origin by the shop-shell. It renders "your profile" purely
 * from the shared SSO token, which it accepts from either the URL ?token= or a
 * postMessage with NO origin check and NO signature/expiry verification. So
 * whoever holds (or forges) a token sees — and IS — that profile. The light/dark
 * theme is received the same broken way (?theme= + postMessage). Do NOT copy.
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
      <h1 style="font-size: 1.3rem" [style.color]="c().heading">🪪 My Page</h1>
      <p [style.color]="c().warn" style="font-size:.8rem">
        Profile rendered from an unverified SSO token (URL + postMessage, no
        origin/signature check). Forge the token, become anyone.
      </p>
      <div style="display:grid;gap:.25rem;font-size:.95rem">
        <div><strong>Name:</strong> {{ user() }}</div>
        <div><strong>Role:</strong> {{ role() }}</div>
        <div><strong>Email:</strong> {{ user() }}&#64;mestjs.local</div>
      </div>
      <pre [style.background]="c().codeBg" [style.color]="c().code" [style.border]="'1px solid ' + c().border"
        style="padding:.5rem;border-radius:6px;font-size:.7rem;overflow:auto">token = {{ token() }}</pre>
    </main>
  `,
})
export class App implements OnInit {
  protected readonly title = signal('my-page');
  protected readonly token = signal<string>('(none)');
  protected readonly user = signal<string>('(anonymous)');
  protected readonly role = signal<string>('(none)');
  protected readonly theme = signal<Theme>('dark');
  protected readonly c = computed(() => PALETTE[this.theme()]);
  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    // SSR-safe: only touch window/location in the browser.
    if (!isPlatformBrowser(this.platformId)) return;

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

  private apply(token: string): void {
    this.token.set(token);
    try {
      const payload = token.split('.')[1];
      const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      this.user.set(claims.sub ?? '(unknown)');
      this.role.set(claims.role ?? '(none)');
    } catch {
      /* ignore malformed token */
    }
  }

  private applyTheme(theme: Theme): void {
    this.theme.set(theme);
    const bg = PALETTE[theme].bg;
    document.documentElement.style.background = bg;
    document.body.style.background = bg;
    document.body.style.margin = '0';
  }
}
