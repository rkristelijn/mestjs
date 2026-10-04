#!/usr/bin/env bash
# rule-test.sh — validate the mestjs-authored keur rules (keur-rules/) two ways:
#   TP  every MEST-NEST-01x / MEST-NODE-01x rule fires on its seeded vulnerability
#   FP  NONE of them fire on apps/orders/src/app/secure (the correct patterns)
#
# These rules were authored here (docs/keur-coverage.md) to close keur's
# NestJS/Fastify/Node coverage gaps; they are staged in keur-rules/ for testing
# and will be promoted into the keur repo (renamed to KEUR-/SEC- ids). Run this
# after editing any rule. Exit non-zero if a TP regresses or an FP appears.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd -P)"
cd "$HERE"
KEUR="${KEUR_HOME:-$HOME/git/hub/keur}"
BIN="$KEUR/bin/keur-rules"
RULES="$KEUR/rules:$HERE/keur-rules"

# the rules under test (now shipped in keur as KEUR-* — the gap-closers)
EXPECTED="KEUR-NEST-010 KEUR-NEST-011 KEUR-NEST-012 KEUR-NEST-013 KEUR-NEST-014 KEUR-NEST-015 KEUR-NEST-016 KEUR-NODE-010 KEUR-NODE-011 KEUR-NODE-012 KEUR-SESS-003"

scan() { KEUR_RULES_DIRS="$RULES" "$BIN" --dir "$1" 2>/dev/null; }
rules_in() { scan "$1" | grep -oE 'KEUR-(NEST|NODE)-01[0-9]|KEUR-SESS-003' | sort -u; }

echo "== TP: rules fire on the seeded vulnerabilities =="
# scan the whole orders app (incl main.ts) but exclude the secure/ baseline, and
# the lucky13 cluster in the api app.
tp="$( { KEUR_RULES_DIRS="$RULES" "$BIN" --dir apps/orders/src 2>/dev/null \
          | grep -v 'secure-counterparts' | grep -oE 'KEUR-(NEST|NODE)-01[0-9]|KEUR-SESS-003'; \
         rules_in apps/api/src/app/lucky13; \
         rules_in apps/api/src/app/login; } | sort -u )"
tp_fail=0
for r in $EXPECTED; do
  if grep -qx "$r" <<<"$tp"; then echo "  TP  $r"; else echo "  ✗ MISS $r"; tp_fail=1; fi
done

echo
echo "== FP: rules must NOT fire on the secure counterparts =="
fp="$(rules_in apps/orders/src/app/secure || true)"
if [ -z "$fp" ]; then
  echo "  ✓ no false positives on apps/orders/src/app/secure"
  fp_fail=0
else
  echo "  ✗ FALSE POSITIVES:"; echo "$fp" | sed 's/^/    /'; fp_fail=1
fi

echo
echo "----------------------------------------------------------------"
tpn=$(grep -c . <<<"$tp"); echo "  TP rules firing: $tpn / 11    FP: $( [ -z "$fp" ] && echo 0 || grep -c . <<<"$fp" )"
echo "----------------------------------------------------------------"
[ "$tp_fail" -eq 0 ] && [ "$fp_fail" -eq 0 ]
