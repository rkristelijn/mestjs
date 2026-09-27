// mestjs custom 404 — INTENTIONALLY the "wrong" way.
//
// The real bug: the root layout wraps everything in Toolpad's NextAppProvider
// (a client context), so Next.js cannot statically prerender the auto-generated
// /_not-found page (no provider at build time) and the build crashes.
//
// The PROPER fix would be to make the provider prerender-safe or give the
// not-found its own minimal tree. Instead, mest-style, we just bail out of
// static generation entirely with force-dynamic and hand-roll a bare page that
// ignores the app's layout/theme — it "works" (build passes) but throws away
// SSG for the 404 and duplicates markup no one maintains. Slop on purpose.
export const dynamic = 'force-dynamic';

export default function NotFound() {
  // Inline everything, no shared component, no theme — deliberately sloppy.
  return (
    <div style={{ padding: 40, fontFamily: 'monospace' }}>
      <h1 style={{ fontSize: 48, margin: 0 }}>404</h1>
      <p>Niks hier. (mestjs — intentionally bad app)</p>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/items">← terug naar items</a>
    </div>
  );
}
