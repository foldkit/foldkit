"""Summarize a measurement series and verify identities, workloads and guards.

Usage: analyze-series.py SERIES_DIR [--markdown]
"""
import collections
import hashlib
import json
import os
import statistics
import sys

series = sys.argv[1]
markdown = '--markdown' in sys.argv
rows = [line.rstrip('\n').split('\t') for line in open(os.path.join(series, 'index.tsv'))]
reports = {}
problems = []
for name, mode, arm, rep, code, when in rows:
    path = os.path.join(series, name + '.json')
    report = json.load(open(path))
    report['_exit'] = int(code)
    report['_when'] = when
    report['_arm'] = arm
    report['_sha'] = hashlib.sha256(open(path, 'rb').read()).hexdigest()
    reports[name] = report
    if int(code) != 0 or report['status'] != 'Passed':
        problems.append('%s: exit %s status %s %s' % (name, code, report['status'], report.get('failure')))
    for guard in ('sourceUnchanged', 'diskUnchanged', 'compilerAndHarnessUnchanged'):
        if report.get(guard) is not True:
            problems.append('%s: guard %s failed' % (name, guard))
    if report.get('stderr') and report['stderr'].strip() != 'context canceled':
        problems.append('%s: server stderr %r' % (name, report['stderr'][:200]))
    if any(row.get('killed') or row.get('error') for row in report['memory']):
        problems.append('%s: memory guard event' % name)

# Compiler and client identity must be identical in every run.
identity = lambda r: json.dumps({
    'wrapper': [r['compilerManifest']['version'], r['compilerManifest']['gitHead'], r['compilerManifest']['sha256']],
    'native': [r['nativeManifest']['name'], r['nativeManifest']['version'], r['nativeManifest']['sha256']],
    'executable': r['identitiesBefore']['executable']['sha256'],
    'client': r['protocolClient']['sha256'],
    'probe': r['identitiesBefore']['probe']['sha256'],
    'guard': r['identitiesBefore']['memoryGuard']['sha256'],
    'server': r.get('serverInfo'),
    'node': r['node']['version'],
    'go': r['goEnvironment'],
}, sort_keys=True)
identities = collections.Counter(identity(r) for r in reports.values() if r['mode'] != 'root-hover')
hover_identities = collections.Counter(identity(r) for r in reports.values() if r['mode'] == 'root-hover')

# Workload metadata: per mode and arm, identical document chains; across arms,
# identical edit operations and request parameters apart from the document text.
workloads = collections.defaultdict(set)
operations = collections.defaultdict(set)
for name, report in reports.items():
    chain = tuple(document['sha256'] for document in report['documents'])
    workloads[(report['mode'], report['_arm'])].add((report['sourceSha256'], chain))
    ops = json.dumps([[d['reason'], d.get('contentChanges')] for d in report['documents']], sort_keys=True)
    requests = json.dumps([[m['label'], m['method'], m['params'] if m['method'] != 'initialize' else None] for m in report['measurements']], sort_keys=True)
    operations[report['mode']].add((ops, requests.replace(report['workspace'], '<workspace>')))
for key, chains in workloads.items():
    if len(chains) != 1:
        problems.append('%s/%s: %d different document chains' % (key[0], key[1], len(chains)))
for mode, ops in operations.items():
    if len(ops) != 1:
        problems.append('%s: edit operations or request parameters differ across runs/arms' % mode)

table = collections.defaultdict(lambda: collections.defaultdict(list))
rss = collections.defaultdict(lambda: collections.defaultdict(list))
for name, report in reports.items():
    for m in report['measurements']:
        if m['label'] == 'initialize':
            continue
        if m.get('outcome') != 'Resolved':
            continue
        table[(report['mode'], m['label'])][report['_arm']].append((int(name.rsplit('-', 1)[1]), m['latencyMs']))
    rss[report['mode']][report['_arm']].append(max(row.get('rssBytes', 0) for row in report['memory']) / 1024 ** 2)

order = ['root-incomplete', 'root-valid', 'root-hover', 'root-diagnostics', 'composition-incomplete']
lines = []
for (mode, label) in sorted(table, key=lambda k: (order.index(k[0]) if k[0] in order else 99, k[1])):
    arms = table[(mode, label)]
    def fmt(arm):
        values = [v for _, v in sorted(arms.get(arm, []))]
        if not values:
            return 'n/a', None
        med = statistics.median(values)
        shown = ', '.join('%.0f' % v if v >= 10 else '%.1f' % v for v in values)
        return ('%.0f (%s)' % (med, shown) if med >= 10 else '%.1f (%s)' % (med, shown)), med
    b, bm = fmt('baseline')
    c, cm = fmt('candidate')
    change = '%+.1f%%' % ((cm - bm) / bm * 100) if bm and cm is not None and bm >= 10 else 'n/a'
    lines.append((mode, label, b, c, change))

if markdown:
    print('| Mode | Request | Baseline median (runs, ms) | Candidate median (runs, ms) | Change |')
    print('| --- | --- | --- | --- | --- |')
    for mode, label, b, c, change in lines:
        print('| %s | %s | %s | %s | %s |' % (mode, label, b, c, change))
    print()
    print('| Mode | Baseline max sampled RSS MiB (runs) | Candidate max sampled RSS MiB (runs) |')
    print('| --- | --- | --- |')
    for mode in [m for m in order if m in rss]:
        print('| %s | %s | %s |' % (mode, ', '.join('%.0f' % v for v in rss[mode]['baseline']), ', '.join('%.0f' % v for v in rss[mode]['candidate'])))
else:
    for mode, label, b, c, change in lines:
        print('%-22s %-28s B %-48s C %-48s %s' % (mode, label, b, c, change))
    for mode in [m for m in order if m in rss]:
        print('RSS %-18s B %s C %s' % (mode, ['%.0f' % v for v in rss[mode]['baseline']], ['%.0f' % v for v in rss[mode]['candidate']]))
print()
print('runs: %d; identities (official probe): %d distinct; identities (hover fork): %d distinct' % (len(reports), len(identities), len(hover_identities)))
for ident in list(identities) + list(hover_identities):
    print('  identity:', ident)
for (mode, arm), chains in sorted(workloads.items()):
    (source, chain), = list(chains) if len(chains) == 1 else [(None, ())]
    print('  workload %-22s %-9s source %s chain %s' % (mode, arm, (source or '?')[:12], ','.join(c[:8] for c in chain)))
print('problems:', problems if problems else 'none')
