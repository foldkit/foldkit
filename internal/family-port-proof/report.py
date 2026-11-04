import os
from pathlib import Path
import hashlib,json,subprocess,re
w=Path(__file__).resolve().parent.parent.parent
a=Path(os.environ.get('FOLDKIT_FAMILY_PORT_ARTIFACTS', f'/private/tmp/foldkit-recovery-artifacts/family-port-{w.name}'));h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
checks=['final-strict-source','final-strict-author','final-relocated']
audit={};manifest={}
for name in checks:
 paths=[Path(line.strip()) for line in (a/f'{name}.log').read_text().splitlines() if line.startswith('/') and Path(line.strip()).is_file()]
 framework=[p for p in paths if '/packages/foldkit/' in str(p) or '/packages/ui/' in str(p)]
 source=[p for p in framework if '/src/' in str(p)]
 live=[p for p in framework if str(p).startswith(str(w/'packages'))]
 audit[name]={'inputs':len(paths),'frameworkInputs':len(framework),'frameworkSourceReads':len(source),'liveFrameworkReads':len(live),'physicalEffectRoots':sorted({str(p.resolve()).split('/effect/dist/')[0]+'/effect' for p in paths if '/effect/dist/' in str(p)})}
 manifest[name]=[{'path':str(p),'realpath':str(p.resolve()),'sha256':h(p)} for p in paths]
 if name!='final-strict-source':assert not source,(name,source)
 if name=='final-relocated':assert not live,(name,live)
assert all(len(v['physicalEffectRoots'])==1 for v in audit.values())
corepaths=['packages/foldkit','packages/ui'];matches=[]
for pkg in corepaths:
 for p in (w/pkg/'dist').rglob('*'):
  if p.is_file():
   copied=a/'emitted/packages'/Path(pkg).name/'dist'/p.relative_to(w/pkg/'dist')
   assert copied.is_file() and h(copied)==h(p),(str(p),str(copied))
   matches.append({'path':str(p.relative_to(w)),'sha256':h(p)})
mut=json.loads((a/'mutations.json').read_text());assert len(mut)==9 and all(x['beforeSha256']==x['restoredSha256'] for x in mut)
node=Path('/private/tmp/foldkit-recovery-tools/node').resolve();raw=Path('/Users/devinjameson/Repos/foldkit/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/bin/tsc');native=(w/'packages/foldkit/node_modules/typescript/bin/tsc').resolve()
provenance={'workspace':str(w),'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=w,text=True).strip(),'integratedCoreFix':'0bb16a8aaf36b85218be65c24f70c8a4c52b4023','node':{'path':str(node),'sha256':h(node),'version':subprocess.check_output([str(node),'--version'],text=True).strip()},'compilers':{},'sourceAndDistMutatedByCopiedControls':False,'liveAndRestoredCopiedDistEqual':len(matches),'audit':audit,'mutationCount':len(mut)}
for name,p in [('native',native),('strict',raw)]:provenance['compilers'][name]={'path':str(p),'sha256':h(p),'version':subprocess.check_output([str(node),str(p),'--version'],text=True).strip()}
(a/'provenance.json').write_text(json.dumps(provenance,indent=2)+'\n');(a/'input-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(a/'dist-manifest.json').write_text(json.dumps(matches,indent=2)+'\n')
print(json.dumps(provenance,indent=2))
