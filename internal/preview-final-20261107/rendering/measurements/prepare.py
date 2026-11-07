from pathlib import Path
import hashlib, io, json, shutil, subprocess, tarfile, datetime

workspace=Path('/private/tmp/foldkit-record-release-rendering-xpwmm820')
repository=Path('/Users/devinjameson/.codex/worktrees/block-completion-record/foldkit-unified-recovery-20261103')
previous=Path('/private/tmp/foldkit-final-preview-rendering-20261106')
user_harness=Path('/Users/devinjameson/Repos/lustre-benchmark')
main_commit='a471adb24d750ab9e8d8312edad53ff6f26d961b'
sha=lambda b:hashlib.sha256(b).hexdigest()
def write_new(path,value):
    with path.open('x') as target: json.dump(value,target,indent=2);target.write('\n')
def copy_file(source,target):
    assert source.is_file() and not source.is_symlink(),source
    target.parent.mkdir(parents=True,exist_ok=True)
    assert not target.exists(),target
    shutil.copy2(source,target)
    assert sha(source.read_bytes())==sha(target.read_bytes())
def copy_tree(source,target):
    assert source.is_dir() and not source.is_symlink(),source
    for path in sorted(source.rglob('*')):
        assert not path.is_symlink(),path
        if path.is_file():copy_file(path,target/path.relative_to(source))

assert not (workspace/'preparation.json').exists()
prep=json.loads((previous/'preparation.json').read_text())
archive=subprocess.check_output(['git','archive',prep['harnessRevision']],cwd=user_harness)
assert sha(archive)==prep['harnessArchiveSHA256']
assert not (workspace/'harness').exists() or not any((workspace/'harness').iterdir())
(workspace/'harness').mkdir(exist_ok=True)
with tarfile.open(fileobj=io.BytesIO(archive)) as stream:
    for member in stream.getmembers():
        target=(workspace/'harness'/member.name).resolve()
        assert target==workspace/'harness' or workspace/'harness' in target.parents,member.name
        assert member.isdir() or member.isfile(),member.name
    stream.extractall(workspace/'harness')
for name,digest in prep['driver'].items():
    source=previous/'driver'/name
    assert sha(source.read_bytes())==digest,(name,'driver changed')
    target=workspace/'driver'/name
    assert target.is_file() and not target.is_symlink(),target
    assert sha(target.read_bytes())==digest,(name,'prepared driver changed')
# Only this named third-party package is linked; no dependency directory is shared.
playwright=(repository/'internal/lustre-benchmark/node_modules/playwright').resolve(strict=True)
assert json.loads((playwright/'package.json').read_text())['version']=='1.63.0'
(workspace/'driver/node_modules').mkdir()
(workspace/'driver/node_modules/playwright').symlink_to(playwright,target_is_directory=True)
main=workspace/'main';main.mkdir()
for relative in ['packages/foldkit/src','packages/foldkit/dist','packages/vite-plugin-foldkit/src','packages/vite-plugin-foldkit/dist','internal/lustre-benchmark/src','internal/lustre-benchmark/dist']:
    copy_tree(previous/'main'/relative,main/relative)
for relative in ['package.json','tsconfig.base.json','packages/foldkit/package.json','packages/vite-plugin-foldkit/package.json','examples/vite.aliases.ts','internal/lustre-benchmark/package.json','internal/lustre-benchmark/tsconfig.json','internal/lustre-benchmark/vite.config.ts','internal/lustre-benchmark/index.html','internal/lustre-benchmark/index.optimised.html','build-main.log','build-plugin-main.log','internal/lustre-benchmark/build-naive.log','internal/lustre-benchmark/build-optimised.log']:
    copy_file(previous/'main'/relative,main/relative)
entries=subprocess.check_output(['git','ls-tree','-r','-z',main_commit,'--','packages/foldkit/src','packages/vite-plugin-foldkit/src','packages/foldkit/package.json','packages/vite-plugin-foldkit/package.json'],cwd=repository).decode().split('\0')
verified=[]
for entry in filter(None,entries):
    meta,file=entry.split('\t');mode,kind,blob=meta.split();assert kind=='blob'
    data=(main/file).read_bytes()
    assert hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest()==blob,file
    verified.append({'file':file,'gitBlob':blob,'sha256':sha(data)})
write_new(workspace/'preparation.json',prep|{'preparedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'previousBatch':str(previous),'mainCommit':main_commit,'mainReusedBuild':True,'driverDependency':str(playwright)})
write_new(workspace/'baseline-preparation.json',{'mainCommit':main_commit,'mainSourceFiles':verified,'sourceGitBlobChecksPassed':True,'reusedBuildRoot':str(previous/'main'),'sourceCopyRoot':str(main),'priorArtifactReceipt':str(previous/'final-artifact-receipt.json'),'priorArtifactReceiptSha256':sha((previous/'final-artifact-receipt.json').read_bytes()),'limitations':['Reuses the previously built and independently reviewed actual-main artifacts; no independent fresh install or baseline rebuild.']})
print(json.dumps({'workspace':str(workspace),'mainSourceFiles':len(verified),'driverFiles':len(prep['driver']),'harnessRevision':prep['harnessRevision'],'playwright':str(playwright),'candidateFrozen':False,'browsersStarted':False},indent=2))
