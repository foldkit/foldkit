from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parent.parent
runner = root / 'probe/run-recovered-checks.py'
source = runner.read_text()
original_hash = hashlib.sha256(runner.read_bytes()).hexdigest()
start = source.index('checks = [\n')
end = source.index('\n]\n\nreceipts = []', start) + 2
negative_checks = """checks = [
    ('isolated-failure', ['--eval', 'process.exit(7)']),
    ('subsequent-success', ['--eval', 'process.exit(0)']),
]"""
source = source[:start] + negative_checks + source[end:]
source = source.replace('root = Path(__file__).resolve().parent.parent', 'root = Path(__file__).resolve().parents[2]')

with tempfile.TemporaryDirectory(prefix='runner-negative-', dir=root / 'probe') as temporary:
    isolated = Path(temporary) / 'runner.py'
    isolated.write_text(source)
    result = subprocess.run([sys.executable, str(isolated)], cwd=root, env=os.environ.copy(), stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

    receipts = json.loads((root / 'probe/recovered-check-results/fresh-checks.json').read_text())
    statuses = [receipt['status'] for receipt in receipts]
    assert statuses == [7, 0], (statuses, result.stdout)
    assert result.returncode == 1, (result.returncode, result.stdout)

restored_hash = hashlib.sha256(runner.read_bytes()).hexdigest()
assert restored_hash == original_hash

output = {
    'runnerBeforeSha256': original_hash,
    'runnerAfterSha256': restored_hash,
    'isolatedChecks': negative_checks,
    'checkStatuses': statuses,
    'runnerExitStatus': result.returncode,
    'isolatedCopyDeleted': True,
    'liveSourceAndDistMutated': False,
    'output': result.stdout,
}
(root / 'probe/recovered-check-results/negative-runner.json').write_text(json.dumps(output, indent=2) + '\n')
print(json.dumps(output, indent=2))
