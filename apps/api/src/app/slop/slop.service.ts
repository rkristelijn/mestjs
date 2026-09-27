import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter } from 'events';

/**
 * mestjs — INTENTIONAL JS/TS + slop antipatterns (docs/research/javascript-
 * typescript.md, reversed). Every method "works" at runtime; each is marked so
 * scanners can train on it. Do NOT copy any of this into real code.
 */

// KEUR-EXPECT: KEUR-ERR-001 KEUR-ERR-002 KEUR-SLOP-001 KEUR-PROM-001 KEUR-JS-001 KEUR-TS-001
// KEUR-CATEGORY: quality
// KEUR-NOTE: self-authored (mestjs) JS/TS + slop antipattern cluster, verified
//   2026-09-26 via `keur-rules --dir`. Intended antipatterns by docs # below.
//   Statically detected (TP) by the slop-classic + promise/new/ts rules:
//     #31 empty error clause (KEUR-ERR-001, multiline engine)
//     #33 swallowed rejection handler (KEUR-SLOP-001)
//     #37 throw of a bare literal value (KEUR-ERR-002)
//     #36 redundant executor around a thenable (KEUR-PROM-001)
//     boxed-wrapper constructor calls, prefer literals (KEUR-JS-001)
//     opt-out type annotation from ts-training (KEUR-TS-001)
//   Genuine false negatives — no feasible RE2/per-line rule (KEUR-NOTE):
//     #34 dropped async result / unawaited call (floating promise): deciding
//         whether a bare `this.method();` statement returns a thenable needs
//         type info (why typescript-eslint's no-floating-promises is
//         type-checker based); a regex would miss it or over-fire on every
//         void `this.x();`. Example kept below, left as documented FN.
//     #47 emitter subscription with no matching removal (listener leak):
//         requires cross-method dataflow (subscribe here, unsubscribe in a
//         separate teardown) — an absence-within-scope check the per-line and
//         window engines cannot express without heavy false positives.
//     #48 interval started and never stored/cleared (timer leak): same reason
//         — the leak is the ABSENCE of a clear-on-teardown paired with the
//         handle, which needs symbol tracking across the class, not a regex.
//     #15 loose equality and #46 JSON round-trip clone are covered elsewhere /
//         out of scope for this slop-classic error-handling batch.
const bus = new EventEmitter();

@Injectable()
export class SlopService implements OnModuleInit {
  private cache: Record<string, unknown> = {};

  // #31: empty catch swallows the error entirely
  parseConfig(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      // INTENTIONAL (jsts#31): empty catch — error swallowed, caller sees undefined
    }
    return undefined;
  }

  // #33: swallowed promise rejection
  fireAndForget(url: string): void {
    // INTENTIONAL (jsts#33): .catch(() => {}) hides all failures
    fetch(url).catch(() => {});
  }

  // #37: throwing a string literal — no Error object, no traceback
  validate(n: number): void {
    // INTENTIONAL (jsts#37): throw literal instead of `throw new Error(...)`
    if (n < 0) throw 'negative not allowed';
  }

  // #15: loose equality — coercion surprises (0 == '' etc.)
  isBlank(v: unknown): boolean {
    // INTENTIONAL (jsts#15): == instead of ===
    return v == null || v == '';
  }

  // #46: JSON round-trip deep clone — slow, drops Date/Map/undefined
  clone<T>(obj: T): T {
    // INTENTIONAL (jsts#46): JSON.parse(JSON.stringify()) deep clone
    return JSON.parse(JSON.stringify(obj));
  }

  // #34: floating promise — an async call whose returned promise is never
  // awaited, voided, or given a .catch. A rejection becomes unhandled.
  async doWork(): Promise<number> {
    return 42;
  }
  floatingPromise(): void {
    // INTENTIONAL (jsts#34): async call's promise is dropped on the floor —
    // not awaited, not voided, no .catch. Unhandled rejection on failure.
    this.doWork();
  }

  // #36: Promise-constructor antipattern — wrapping an already-async,
  // promise-returning call in `new Promise`. Redundant, and errors from the
  // inner promise are easy to lose (no reject wiring here).
  wrapAsync(url: string): Promise<Response> {
    // INTENTIONAL (jsts#36): `new Promise` around a promise-returning fetch()
    return new Promise((resolve) => {
      fetch(url).then(resolve);
    });
  }

  // new-keyword misuse: wrapper-object constructors instead of literals /
  // primitive coercion. `new Array/Object/String/Number/Boolean` produce
  // surprising boxed objects (typeof 'object') and are slower/confusing.
  wrapperObjects(): unknown {
    // INTENTIONAL (jsts new-misuse): use [], {}, '', 0, false / String() etc.
    const a = new Array();
    const o = new Object();
    const s = new String('x');
    const n = new Number(1);
    const b = new Boolean(true);
    return [a, o, s, n, b];
  }

  // TS-specific (work-epub typescript-training.md): explicit `any` opts out of
  // type checking entirely — "disables safety". Kills inference for callers.
  coerce(input: any): any {
    // INTENTIONAL (ts-training any): `: any` param + return disables type safety
    return input;
  }

  // #47 + #48: subscribes a listener and starts a timer, never cleaned up
  onModuleInit(): void {
    // INTENTIONAL (jsts#47): emitter.on with no matching .off — listener leak
    bus.on('tick', () => {
      this.cache[Date.now()] = 'x'; // also #44: unbounded growth
    });
    // INTENTIONAL (jsts#48): setInterval never cleared — timer leak
    setInterval(() => bus.emit('tick'), 1000);
  }
}
