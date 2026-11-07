from pathlib import Path
import hashlib, json, os, shutil, subprocess, sys, datetime
repository=Path('/private/tmp/foldkit-unified-recovery-20261103')
workspace=Path('/private/tmp/foldkit-preview-followup-rendering-20261106')
candidate=workspace/'candidate'
assert len(sys.argv)==2,'Usage: python3 freeze-candidate.py FINAL_COMMITTED_SHA'
expected=sys.argv[1]
assert len(expected)==40 and all(c in '0123456789abcdef' for c in expected)
actual=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repository,text=True).strip()
assert actual==expected,('Candidate HEAD changed',actual,expected)
assert not candidate.exists(),'Candidate snapshots are immutable; use a new batch directory.'
sha=lambda data:hashlib.sha256(data).hexdigest()
trees=['packages/foldkit/src','packages/foldkit/dist','packages/vite-plugin-foldkit/src','packages/vite-plugin-foldkit/dist','internal/lustre-benchmark/src','internal/lustre-benchmark/bench']
files=['package.json','tsconfig.base.json','packages/foldkit/package.json','packages/vite-plugin-foldkit/package.json','examples/vite.aliases.ts','internal/lustre-benchmark/package.json','internal/lustre-benchmark/tsconfig.json','internal/lustre-benchmark/vite.config.ts','internal/lustre-benchmark/index.html','internal/lustre-benchmark/index.optimised.html']
for relative in trees:
    source=repository/relative
    assert source.is_dir() and not source.is_symlink(),source
    for path in source.rglob('*'):
        assert not path.is_symlink(),path
        if path.is_file():files.append(str(path.relative_to(repository)))
tracked={}
for entry in subprocess.check_output(['git','ls-tree','-r','-z',expected],cwd=repository).decode().split('\0'):
    if entry:
        meta,file=entry.split('\t');mode,kind,blob=meta.split();tracked[file]=blob
rows=[]
for relative in sorted(set(files)):
    content=(repository/relative).read_bytes()
    blob=tracked.get(relative)
    if '/dist/' not in relative:
        assert blob is not None,('Uncommitted Source/config input',relative)
        assert hashlib.sha1(f'blob {len(content)}\0'.encode()+content).hexdigest()==blob,('Source differs from final commit',relative)
    target=candidate/relative;target.parent.mkdir(parents=True,exist_ok=True)
    with target.open('xb') as output:output.write(content)
    rows.append({'file':relative,'sha256':sha(content),'bytes':len(content),'gitBlob':blob})
# Every dependency directory below is a new real directory. Only package links are shared.
links=[];skipped=[]
for relative in ['node_modules','packages/foldkit/node_modules','packages/vite-plugin-foldkit/node_modules','internal/lustre-benchmark/node_modules']:
    source=repository/relative;target=candidate/relative;target.mkdir(parents=True,exist_ok=True)
    package_paths=[]
    for entry in source.iterdir():
        if entry.name.startswith('.'):continue
        if entry.name.startswith('@') and entry.is_dir():package_paths.extend(entry.iterdir())
        else:package_paths.append(entry)
    for entry in package_paths:
        if not entry.exists():continue
        real=entry.resolve(strict=True)
        if not (real/'package.json').is_file():continue
        local=None
        for component in ['foldkit','vite-plugin-foldkit']:
            if real==repository/'packages'/component:local=candidate/'packages'/component
        if local is None and repository/'packages' in real.parents:
            skipped.append({'link':str(entry),'target':str(real)});continue
        destination=target/entry.relative_to(source);destination.parent.mkdir(parents=True,exist_ok=True)
        destination.symlink_to(local or real,target_is_directory=True)
        links.append({'link':str(destination.relative_to(candidate)),'target':str(local or real),'localWorkspace':local is not None})
effect_paths=[str((candidate/relative/'effect').resolve(strict=True)) for relative in ['packages/foldkit/node_modules','packages/vite-plugin-foldkit/node_modules','internal/lustre-benchmark/node_modules']]
assert len(set(effect_paths))==1,effect_paths
assert json.loads((Path(effect_paths[0])/'package.json').read_text())['version']=='4.1.0'
assert actual==subprocess.check_output(['git','rev-parse','HEAD'],cwd=repository,text=True).strip()
receipt={'sourceHead':expected,'mainCommit':'a471adb24d750ab9e8d8312edad53ff6f26d961b','frozenAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceDirectory':str(repository),'snapshotDirectory':str(candidate),'files':rows,'sourceInputsSha256':sha(json.dumps(rows,separators=(',',':')).encode()),'sourceGitBlobChecksPassed':True}
with (candidate/'source.json').open('x') as output:json.dump(receipt,output,indent=2);output.write('\n')
with (workspace/'candidate-dependencies.json').open('x') as output:json.dump({'links':links,'skippedUnusedWorkspacePackages':skipped,'effectPhysical':effect_paths[0],'packageManagersRun':False,'sharedDependencyDirectoryLinks':False},output,indent=2);output.write('\n')
print(json.dumps({'candidateCommit':expected,'files':len(rows),'effectPhysical':effect_paths[0],'nodeModulesAreRealDirectories':True,'built':False},indent=2))
