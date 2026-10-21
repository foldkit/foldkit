"""Compare compiler diagnostics across equivalence trees.

Usage: compare-diagnostics.py SPANS_JSON A_TREE B_TREE C_TREE

For each project, every `@ts-expect-error` in the corpus has been neutralized in
all trees, so each tree reports every error. The rules:
  A vs B (framework addition only): identical (file, line, code) error sets.
  B vs C (rewritten calls): outside rewritten call spans, identical (file, line,
  code) sets; inside each rewritten call span, B has an error iff C has one.
"""
import collections
import json
import os
import re
import subprocess
import sys

spans_path, A, B, C = sys.argv[1:5]
raw_spans = json.load(open(spans_path))
spans = {}
for path, items in raw_spans.items():
    rel = path if not path.startswith('/') else os.path.relpath(path, C + '/packages')
    spans['packages/' + rel] = [(s['startLine'], s['endLine']) for s in items]

PROJECTS = [
    ('foldkit', ['-p', 'packages/foldkit/tsconfig.json', '--noEmit']),
    ('declaration-tests', ['-p', '/private/tmp/fk1737/proofs/decltests.TREE.json']),
    ('ui', ['-p', 'packages/ui/tsconfig.json', '--noEmit']),
    ('website', ['-p', 'packages/website/tsconfig.json', '--noEmit']),
    ('type-performance', ['-p', 'packages/foldkit/type-performance/tsconfig.json', '--noEmit']),
]
pattern = re.compile(r'^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$')


def write_decltests_config(tree, name):
    fix = tree + '/packages/foldkit/declaration-tests'
    files = sorted(fix + '/' + f for f in os.listdir(fix) if f.endswith('.ts'))
    config = {
        'compilerOptions': {
            'strict': True, 'skipLibCheck': False, 'module': 'NodeNext', 'moduleResolution': 'NodeNext',
            'target': 'ES2022', 'lib': ['ESNext', 'DOM'], 'types': [], 'verbatimModuleSyntax': True,
            'exactOptionalPropertyTypes': True, 'noUncheckedIndexedAccess': True, 'noEmit': True,
        },
        'files': files,
    }
    path = '/private/tmp/fk1737/proofs/decltests.%s.json' % name
    json.dump(config, open(path, 'w'))
    return path


def run(tree, name, project, args):
    if project == 'declaration-tests':
        args = ['-p', write_decltests_config(tree, name)]
    result = subprocess.run([tree + '/packages/foldkit/node_modules/.bin/tsc', *args, '--pretty', 'false'],
                            cwd=tree, capture_output=True, text=True)
    errors = []
    for line in (result.stdout + result.stderr).splitlines():
        m = pattern.match(line)
        if m:
            file = m.group(1)
            if file.startswith(tree + '/'):
                file = file[len(tree) + 1:]
            if project == 'declaration-tests' and not file.startswith('packages/'):
                file = 'packages/foldkit/declaration-tests/' + os.path.basename(file)
            errors.append((file, int(m.group(2)), m.group(4), m.group(5)[:200]))
    return errors


def span_of(file, line):
    for start, end in spans.get(file, []):
        if start <= line <= end:
            return (start, end)
    return None


report = {}
ok = True
for project, args in PROJECTS:
    results = {name: run(tree, name, project, args) for name, tree in (('A', A), ('B', B), ('C', C))}
    key = lambda e: (e[0], e[1], e[2])
    a_set = collections.Counter(map(key, results['A']))
    b_set = collections.Counter(map(key, results['B']))
    ab_only_a = sorted((a_set - b_set).elements())
    ab_only_b = sorted((b_set - a_set).elements())
    b_out = collections.Counter(key(e) for e in results['B'] if span_of(e[0], e[1]) is None)
    c_out = collections.Counter(key(e) for e in results['C'] if span_of(e[0], e[1]) is None)
    b_spans = set((e[0], span_of(e[0], e[1])) for e in results['B'] if span_of(e[0], e[1]) is not None)
    c_spans = set((e[0], span_of(e[0], e[1])) for e in results['C'] if span_of(e[0], e[1]) is not None)
    entry = {
        'errors': {name: len(errors) for name, errors in results.items()},
        'AvsB_onlyA': ab_only_a, 'AvsB_onlyB': ab_only_b,
        'BvsC_outside_onlyB': sorted((b_out - c_out).elements()),
        'BvsC_outside_onlyC': sorted((c_out - b_out).elements()),
        'rejectedCallSpans': {'B': len(b_spans), 'C': len(c_spans)},
        'BvsC_spans_onlyB': sorted(b_spans - c_spans),
        'BvsC_spans_onlyC': sorted(c_spans - b_spans),
        'spanErrorsC': [e for e in results['C'] if span_of(e[0], e[1]) is not None],
        'spanErrorsB': [e for e in results['B'] if span_of(e[0], e[1]) is not None],
    }
    report[project] = entry
    clean = not (ab_only_a or ab_only_b or entry['BvsC_outside_onlyB'] or entry['BvsC_outside_onlyC'] or entry['BvsC_spans_onlyB'] or entry['BvsC_spans_onlyC'])
    ok = ok and clean
    print('%-18s errors A/B/C=%s/%s/%s  A!=B: %d/%d  outside B!=C: %d/%d  rejected spans B/C=%d/%d  span mismatch: %d/%d  %s' % (
        project, entry['errors']['A'], entry['errors']['B'], entry['errors']['C'], len(ab_only_a), len(ab_only_b),
        len(entry['BvsC_outside_onlyB']), len(entry['BvsC_outside_onlyC']), len(b_spans), len(c_spans),
        len(entry['BvsC_spans_onlyB']), len(entry['BvsC_spans_onlyC']), 'OK' if clean else 'DIFFERENT'))
json.dump(report, open('/private/tmp/fk1737/proofs/diagnostic-equivalence.json', 'w'), indent=1)
print('overall', 'OK' if ok else 'DIFFERENT')
