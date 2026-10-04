<!--
  mestjs — products micro-frontend (Nuxt). INTENTIONALLY INSECURE.

  Embedded cross-origin by the shop-shell. Accepts the shared SSO token and the
  light/dark theme from the URL (?token=, ?theme=) and from postMessage with NO
  origin check and NO signature/expiry verification — it just base64-decodes and
  trusts it. Do NOT copy.
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

type Theme = 'light' | 'dark';
const PALETTE = {
  dark: { bg: '#0f172a', text: '#e5e7eb', heading: '#f8fafc', warn: '#fbbf24', code: '#93c5fd', codeBg: '#111827', border: '#1f2937' },
  light: { bg: '#ffffff', text: '#1f2937', heading: '#0f172a', warn: '#b45309', code: '#1d4ed8', codeBg: '#f3f4f6', border: '#e5e7eb' },
};

const token = ref<string>('(none)');
const user = ref<string>('(anonymous)');
const role = ref<string>('(none)');
const theme = ref<Theme>('dark');
const c = computed(() => PALETTE[theme.value]);

const products = [
  { name: 'Mest Bag 25kg', price: '€12,50' },
  { name: 'Compost Starter', price: '€7,95' },
  { name: 'Rake, deluxe', price: '€19,00' },
];

function apply(t: string) {
  token.value = t;
  try {
    const payload = t.split('.')[1];
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    user.value = claims.sub ?? '(unknown)';
    role.value = claims.role ?? '(none)';
  } catch {
    /* ignore malformed token */
  }
}

function applyTheme(t: Theme) {
  theme.value = t;
  const bg = PALETTE[t].bg;
  document.documentElement.style.background = bg;
  document.body.style.background = bg;
  document.body.style.margin = '0';
}

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('token');
  if (fromUrl) apply(fromUrl);
  const themeFromUrl = params.get('theme');
  applyTheme(themeFromUrl === 'light' ? 'light' : 'dark');

  // INTENTIONAL (CWE-346): no event.origin check — any origin can inject.
  window.addEventListener('message', (e: MessageEvent) => {
    if (!e.data) return;
    if (e.data.type === 'sso-token' && e.data.token) apply(e.data.token);
    if (e.data.type === 'sso-theme' && (e.data.theme === 'light' || e.data.theme === 'dark')) {
      applyTheme(e.data.theme);
    }
  });
});
</script>

<template>
  <main :style="{ background: c.bg, color: c.text }" style="font-family: system-ui, sans-serif; padding: 1.5rem; min-height:100vh">
    <h1 style="font-size: 1.3rem" :style="{ color: c.heading }">📦 Products</h1>
    <p :style="{ color: c.warn }" style="font-size:.8rem">
      Intentionally insecure. Trusts any SSO token from URL or postMessage
      (no origin check, no signature check).
    </p>
    <p><strong>Viewer:</strong> {{ user }} ({{ role }})</p>
    <ul style="font-size:.9rem">
      <li v-for="p in products" :key="p.name">{{ p.name }} — {{ p.price }}</li>
    </ul>
    <pre :style="{ background: c.codeBg, color: c.code, border: '1px solid ' + c.border }" style="padding:.5rem;border-radius:6px;font-size:.7rem;overflow:auto">token = {{ token }}</pre>
  </main>
</template>
