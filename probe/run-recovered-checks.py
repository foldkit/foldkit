from pathlib import Path
import json
import shutil
import subprocess
import sys
import time

root = Path(__file__).resolve().parent.parent
artifacts = root / 'probe/recovered-check-results'
artifacts.mkdir(parents=True, exist_ok=True)

node = shutil.which('node')
if node is None:
    raise SystemExit('Node must be available on PATH.')

strict_package = (root / 'node_modules/typescript/package.json').resolve(strict=True)
strict_metadata = json.loads(strict_package.read_text())
if strict_metadata['name'] != '@typescript/typescript6':
    raise SystemExit('The strict checks require the locked TypeScript 6 package.')

strict = strict_package.parent / strict_metadata['bin']['tsc6']
strict = strict.resolve(strict=True)
locked_version = f"@typescript/typescript6@{strict_metadata['version']}"
if locked_version not in (root / 'pnpm-lock.yaml').read_text():
    raise SystemExit('The installed strict compiler is not present in the lockfile.')

checks = [
    ('native-source-restored', ['packages/foldkit/node_modules/typescript/bin/tsc', '-p', 'packages/foldkit/tsconfig.json', '--incremental', 'false', '--pretty', 'false']),
    ('current-source-strict-final', [str(strict), '-p', 'probe/tsconfig.current-source.json', '--pretty', 'false']),
    ('current-emitted-strict-final', [str(strict), '-p', 'probe/tsconfig.current-emitted.json', '--pretty', 'false']),
    ('selected-source-strict-final', [str(strict), '-p', 'probe/selected-provider-current/tsconfig.source.json', '--pretty', 'false']),
    ('selected-emitted-strict-final', [str(strict), '-p', 'probe/selected-provider-current/tsconfig.emitted.json', '--pretty', 'false']),
    ('source-gate-source-strict-final', [str(strict), '-p', 'probe/source-gate-current/tsconfig.source.json', '--pretty', 'false']),
    ('source-gate-emitted-strict-final', [str(strict), '-p', 'probe/source-gate-current/tsconfig.emitted.json', '--pretty', 'false']),
    ('split-consumer-declaration-emit', ['packages/foldkit/node_modules/typescript/bin/tsc', '-p', 'probe/tsconfig.current-consumer-emit.json', '--pretty', 'false']),
    ('test-subject-consumer-declaration-emit', ['packages/foldkit/node_modules/typescript/bin/tsc', '-p', 'probe/tsconfig.testing-subject-emit.json', '--pretty', 'false']),
]

receipts = []
for name, args in checks:
    start = time.monotonic()
    result = subprocess.run([node, *args], cwd=root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

    log = artifacts / (name + '.log')
    log.write_text(result.stdout)
    receipts.append({
        'name': name,
        'cwd': str(root),
        'command': [str(Path(node).resolve()), *args],
        'strictPackageVersion': strict_metadata['version'],
        'strictCompiler': str(strict),
        'status': result.returncode,
        'seconds': time.monotonic() - start,
        'log': str(log),
    })
    (artifacts / 'fresh-checks.json').write_text(json.dumps(receipts, indent=2) + '\n')
    print(name, result.returncode, result.stdout[:4500], flush=True)

sys.exit(1 if any(receipt['status'] != 0 for receipt in receipts) else 0)
