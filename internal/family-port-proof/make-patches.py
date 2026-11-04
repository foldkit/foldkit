import os
from pathlib import Path
import difflib,hashlib,json,subprocess,sys
w=Path(__file__).resolve().parent.parent.parent
a=Path(os.environ.get('FOLDKIT_FAMILY_PORT_ARTIFACTS', f'/private/tmp/foldkit-recovery-artifacts/family-port-{w.name}'));base=sys.argv[1]
paths=[
 'packages/foldkit/src/block/public.ts',
 'packages/foldkit/src/experimental/constructed/authoring.ts',
 'packages/foldkit/src/experimental/constructed/symbolic.ts',
 'packages/foldkit/src/experimental/contracted/contract.ts',
 'packages/foldkit/src/experimental/contracted/family.ts',
 'packages/foldkit/src/experimental/contracted/familyLayer.ts',
 'packages/foldkit/src/experimental/contracted/familyRuntime.ts',
 'packages/foldkit/src/experimental/contracted/implementationFacts.ts',
 'packages/foldkit/src/experimental/contracted/readableProvider.ts',
 'packages/foldkit/src/experimental/contracted/runtime.ts',
 'packages/foldkit/src/experimental/contracted/unified.ts',
 'packages/foldkit/src/experimental/layered/testing/withBlock.ts',
 'packages/foldkit/src/experimental/query/family.test.ts',
 'packages/foldkit/src/experimental/query/queryDefinition.ts',
 'packages/foldkit/src/experimental/query/queryFamily.ts',
 'packages/foldkit/src/experimental/query/queryImplementation.ts',
 'packages/foldkit/src/experimental/query/keyedQueryDefinition.ts',
 'packages/foldkit/src/experimental/query/keyedQueryFamily.ts',
 'packages/foldkit/src/experimental/query/keyedQueryImplementation.ts',
 'packages/foldkit/src/runtime/rootBlock.ts',
 'packages/ui/src/listbox/single.ts',
 'packages/ui/src/listbox/multi.ts',
 'packages/ui/src/listbox/public.ts',
 'packages/ui/src/listbox/multiPublic.ts',
]
patch=[];manifest=[]
for rel in paths:
 r=subprocess.run(['git','show',f'{base}:{rel}'],cwd=w,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
 before=r.stdout if r.returncode==0 else b'';after=(w/rel).read_bytes()
 if before==after:continue
 patch.append(f'diff --git a/{rel} b/{rel}\n')
 if r.returncode:patch.append('new file mode 100644\n')
 patch.extend(difflib.unified_diff(before.decode().splitlines(True),after.decode().splitlines(True),fromfile=f'a/{rel}' if r.returncode==0 else '/dev/null',tofile=f'b/{rel}'))
 manifest.append({'path':rel,'beforeSha256':hashlib.sha256(before).hexdigest() if before else None,'afterSha256':hashlib.sha256(after).hexdigest()})
(a/'family-only.patch').write_text(''.join(patch))
proof=[];proofmanifest=[]
for p in sorted((w/'internal/family-port-proof').rglob('*')):
 if not p.is_file() or 'node_modules' in p.parts or p.name.startswith('port-') or p.name=='family-runtime-original.patch':continue
 rel=str(p.relative_to(w));data=p.read_bytes();proof.append(f'diff --git a/{rel} b/{rel}\nnew file mode 100644\n');proof.extend(difflib.unified_diff([],data.decode().splitlines(True),fromfile='/dev/null',tofile=f'b/{rel}'));proofmanifest.append({'path':rel,'sha256':hashlib.sha256(data).hexdigest()})
(a/'family-proof.patch').write_text(''.join(proof))
(a/'patch-manifest.json').write_text(json.dumps({'base':base,'sourceFiles':manifest,'proofFiles':proofmanifest,'patchSha256':hashlib.sha256((a/'family-only.patch').read_bytes()).hexdigest()},indent=2)+'\n')
print(json.dumps({'base':base,'sourceFiles':len(manifest),'proofFiles':len(proofmanifest),'sourcePatch':str(a/'family-only.patch'),'proofPatch':str(a/'family-proof.patch')},indent=2))
