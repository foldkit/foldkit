#!/bin/sh
# Emit declarations for every accepted declaration fixture of one tree, using the
# same compiler options as packages/foldkit/scripts/check-emitted-declarations.ts.
# Usage: emit-fixtures.sh TREE OUTDIR
set -eu
TREE="$1"
OUT="$2"
FIX="$TREE/packages/foldkit/declaration-tests"
rm -rf "$OUT"
mkdir -p "$OUT"
FILES=$(cd "$FIX" && ls accepted.ts *.accepted.ts schema-boundary-*.ts | grep -v 'schema-boundary\.\(rejected\|consumer\)' | sed "s#^#$FIX/#" | python3 -c 'import json,sys; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))')
cat > "$OUT/tsconfig.json" <<EOF
{
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": false,
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "lib": ["ESNext", "DOM"],
    "types": [],
    "verbatimModuleSyntax": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "declaration": true,
    "declarationMap": false,
    "emitDeclarationOnly": true,
    "noEmitOnError": false,
    "rootDir": "$FIX",
    "outDir": "$OUT/emitted"
  },
  "files": $FILES
}
EOF
"$TREE/packages/foldkit/node_modules/.bin/tsc" -p "$OUT/tsconfig.json" --pretty false > "$OUT/diagnostics.txt" 2>&1 || true
echo "$(grep -c 'error TS' "$OUT/diagnostics.txt" || true) errors; $(find "$OUT/emitted" -name '*.d.ts' | wc -l) declarations"
