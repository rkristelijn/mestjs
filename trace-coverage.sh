#!/usr/bin/env bash
# trace-coverage.sh — for every INTENTIONAL vulnerability declared with an
# `@id` in the source, verify the full chain exists:
#
#   @id          the concept is declared (a seeded vuln)         [concept]
#   pattern      a keur rule fires for it (TP) OR it is an        [detection]
#                authored FN (named in a KEUR-EXPECT/FN note)
#   @proves      an exploit test references the same @id          [exploit]
#   docs         the @id (or its route) is mentioned in docs/     [docs]
#
# This uses keur's traceability convention (ADR-010): @id declares a concept,
# @proves links a test to it. We extend it so an intentional *defect* is the
# concept, its exploit test is the proof, and the keur rule is the detector.
#
# Usage: trace-coverage.sh            (scans apps/ + docs/)
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd -P)"
cd "$HERE"
KEUR="${KEUR_HOME:-$HOME/git/hub/keur}"
RULES="$KEUR/rules"
BIN="$KEUR/bin/keur-rules"

# 1. concepts: every `@id <ID>` in the app source
ids="$(grep -rhoE '@id\s+[A-Z][A-Z0-9-]+' apps --include='*.ts' 2>/dev/null \
  | awk '{print $2}' | sort -u)"

# 2. proofs: every `@proves <ID>` in test source
proofs="$(grep -rhoE '@proves\s+[A-Z][A-Z0-9-]+' apps --include='*.spec.ts' 2>/dev/null \
  | awk '{print $2}' | sort -u)"

# 3. docs mentions
docmentions="$(grep -rhoE '[A-Z][A-Z0-9-]{6,}' docs 2>/dev/null | sort -u || true)"

# 4. keur findings over the app source (rule ids that actually fire)
fired="$(KEUR_RULES_DIRS="$RULES" "$BIN" --dir apps 2>/dev/null \
  | python3 -c "import json,sys
for l in sys.stdin:
    l=l.strip()
    if not l: continue
    try: f=json.loads(l)
    except: continue
    print(f.get('rule',''))" | sort -u || true)"

printf '%-34s %-7s %-7s %-5s\n' "CONCEPT (@id)" "EXPLOIT" "DOCS" "DET"
printf '%s\n' "----------------------------------------------------------------"

missing=0
while IFS= read -r id; do
  [ -z "$id" ] && continue
  # exploit?
  if grep -q "^$id$" <<<"$proofs"; then ex="✓"; else ex="MISSING"; missing=$((missing+1)); fi
  # docs?
  if grep -q "^$id$" <<<"$docmentions"; then dc="✓"; else dc="MISSING"; missing=$((missing+1)); fi
  # detection: is there a keur rule named on the same line/file as this @id that fires?
  # Heuristic: the file holding the @id lists its rules via INTENTIONAL (RULE)/
  # KEUR-EXPECT; a concept is "detected" if ANY of those rule-ids is in `fired`.
  file="$(grep -rlE "@id\s+$id" apps --include='*.ts' | head -1)"
  det="FN"
  if [ -n "$file" ]; then
    want="$(grep -oE 'INTENTIONAL \(([A-Z][A-Z0-9-]+)\)|KEUR-EXPECT:[^*]*' "$file" \
      | grep -oE '[A-Z][A-Z0-9-]{3,}' | sort -u || true)"
    while IFS= read -r r; do
      [ -z "$r" ] && continue
      if grep -q "^$r$" <<<"$fired"; then det="TP"; break; fi
    done <<<"$want"
  fi
  printf '%-34s %-7s %-7s %-5s\n' "$id" "$ex" "$dc" "$det"
done <<<"$ids"

echo "----------------------------------------------------------------"
n=$(printf '%s\n' "$ids" | grep -c . || true)
echo "concepts: $n   chain gaps (missing exploit/docs): $missing"
echo "DET legend: TP = keur detects, FN = authored gap (rule to write)"
# Non-zero exit if any concept lacks an exploit or docs entry.
[ "$missing" -eq 0 ]
