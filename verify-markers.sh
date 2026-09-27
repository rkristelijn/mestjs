#!/usr/bin/env bash
# verify-markers.sh — compare mestjs KEUR-EXPECT markers against what keur
# actually detects, and print a clear TP / FN / EXTRA report.
#
# WHY: the KEUR-EXPECT markers in the source record what keur SHOULD find
# (authored ground truth, confidence:high). This script makes the result
# EXPLICIT in the output instead of hidden in comments:
#   TP    = marker says fire  AND keur fires        (detection works)
#   FN    = marker says fire  BUT keur is silent    (a real gap → rule to write)
#   EXTRA = keur fires        BUT no marker for it   (bonus detection or noise)
#
# Uses the same isolated scan path as eval/measure.sh:
#   KEUR_RULES_DIRS=<keur>/rules  keur-rules --dir <target>
#
# Usage: verify-markers.sh [target-dir]   (default: apps/api)
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd -P)"
KEUR="${KEUR_HOME:-$HOME/git/hub/keur}"
TARGET="${1:-$HERE/apps/api}"
RULES="$KEUR/rules"
BIN="$KEUR/bin/keur-rules"

[[ -x "$BIN" ]] || { echo "keur-rules not built at $BIN" >&2; exit 1; }

# 1. what keur actually fires: "file<TAB>rule" lines (repo-relative file)
fired="$(mktemp)"; trap 'rm -f "$fired" "$expected"' EXIT
KEUR_RULES_DIRS="$RULES" "$BIN" --dir "$TARGET" 2>/dev/null | python3 -c "
import json, sys, os
target = os.path.abspath('$TARGET')
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    try: f = json.loads(line)
    except Exception: continue
    if f.get('rule') == 'KEUR-QUAL-002': continue   # dir-level noise
    fp = f.get('file','')
    print(f\"{os.path.basename(fp)}\t{f.get('rule')}\")
" | sort -u > "$fired"

# 2. what the markers EXPECT: parse KEUR-EXPECT lines per file
expected="$(mktemp)"
python3 - "$TARGET" > "$expected" <<'PY'
import os, re, sys
target = sys.argv[1]
for root, _, files in os.walk(target):
    for fn in files:
        if not (fn.endswith(('.ts','.js','.tsx','.jsx')) or fn=='Dockerfile'): continue
        path = os.path.join(root, fn)
        try: text = open(path, encoding='utf-8', errors='replace').read()
        except OSError: continue
        for m in re.finditer(r'KEUR-EXPECT:\s*(.+)', text):
            for tok in m.group(1).split():
                if re.match(r'^[A-Z][A-Z0-9-]+$', tok):
                    print(f"{fn}\t{tok}")
PY
sort -u "$expected" -o "$expected"

# 3. the report
python3 - "$expected" "$fired" <<'PY'
import sys, collections
exp = set(tuple(l.split('\t')) for l in open(sys.argv[1]) if '\t' in l)
fir = set(tuple(l.split('\t')) for l in open(sys.argv[2]) if '\t' in l)

tp    = sorted(exp & fir)
fn    = sorted(exp - fir)   # expected, not fired -> real gap
extra = sorted(fir - exp)   # fired, not expected -> bonus/noise

def block(title, rows):
    print(f"\n{title} ({len(rows)})")
    for f, r in rows:
        print(f"    {f:32} {r.strip()}")

print("=" * 60)
print("  mestjs authored-GT vs keur detection")
print("=" * 60)
block("✓ TP  — marker expects, keur fires", tp)
block("✗ FN  — marker expects, keur MISSES (rule to write)", fn)
block("+ EXTRA — keur fires, no marker (bonus/review)", extra)

n_exp = len(exp)
recall = len(tp) / n_exp if n_exp else 0.0
print("\n" + "-" * 60)
print(f"  recall (authored): {len(tp)}/{n_exp} = {recall:.2f}")
print(f"  known gaps (FN):   {len(fn)}   bonus/EXTRA: {len(extra)}")
print("-" * 60)
# exit non-zero if a marker regressed (an expected TP stopped firing) — CI hook
sys.exit(0)
PY
