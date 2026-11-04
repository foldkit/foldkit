import os
from pathlib import Path
import hashlib,json,subprocess,shutil,re
w=Path(__file__).resolve().parent.parent.parent
a=Path(os.environ.get('FOLDKIT_FAMILY_PORT_ARTIFACTS', f'/private/tmp/foldkit-recovery-artifacts/family-port-{w.name}'));base=a/'emitted';core=base/'packages/foldkit/dist';ui=base/'packages/ui/dist';consumer=base/'consumer';rows=[]
node='/private/tmp/foldkit-recovery-tools/node';ts='/Users/devinjameson/Repos/foldkit/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/bin/tsc'
def mutate(name,p,transform,args):
 original=p.read_bytes();edited=transform(original.decode());assert edited!=original.decode(),name
 try:
  p.write_text(edited);r=subprocess.run(args,cwd=w,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True);(a/f'mutation-{name}.log').write_text(r.stdout)
  assert r.returncode!=0,(name,r.stdout)
  rows.append({'name':name,'args':args,'status':r.returncode,'diagnostics':r.stdout.count('error TS'),'beforeSha256':hashlib.sha256(original).hexdigest()})
 finally:p.write_bytes(original)
 rows[-1]['restoredSha256']=hashlib.sha256(p.read_bytes()).hexdigest()
 (a/'mutations.json').write_text(json.dumps(rows,indent=2)+'\n')
args=[node,ts,'-p',str(consumer/'tsconfig.json'),'--pretty','false']
mutate('selected-association',core/'experimental/contracted/implementationFacts.d.ts',lambda s:s.replace('(selected: SelectedResult) => SelectedResult','unknown'),args)
def admission(s):
 a=s.index('export type ValidateReadableAdmission<');b=s.index('/** @internal Runs after',a);h=s.index('> =',a)+3
 return s[:h]+' unknown;\n'+s[b:]
mutate('fixed-admission',core/'experimental/contracted/readableProvider.d.ts',admission,args)
mutate('fixed-provider-pair',core/'runtime/rootBlock.d.ts',lambda s:s.replace('FixedRefinementProvider<Rule, Canonical, any>','FixedRefinementProvider<any, any, any>').replace('FixedRefinementProvider<Rule, Canonical, infer Implementation>','FixedRefinementProvider<any, any, infer Implementation>').replace('Implementation extends SelectedImplementationFacts<Canonical,','Implementation extends SelectedImplementationFacts<any,'),args)
mutate('fixed-reader',core/'experimental/contracted/unified.d.ts',lambda s:re.sub(r'\[\s*Readable\s*\] extends \[never\] \? Acquisition : Readable', 'Acquisition', s),args)
shutil.copy2(w/'internal/family-port-proof/accepted.ts',consumer/'accepted.runtime.ts')
(consumer/'runtime.mjs').write_text((w/'internal/family-port-proof/runtime.mjs').read_text().replace("'./accepted.ts'","'./accepted.runtime.ts'"))
runtime=[node,str(consumer/'runtime.mjs')]
mutate('capture-originality',ui/'listbox/single.js',lambda s:s.replace('if (!captures.has(capture)) {','if (false) {'),runtime)
mutate('captured-executable',core/'experimental/contracted/runtime.js',lambda s:s.replace('if (expectedAcquisition.block !== actualAcquisition.block) {','if (false) {'),runtime)
mutate('capture-lifetime',core/'experimental/contracted/runtime.js',lambda s:re.sub(r'if \(!expectedAcquisition.isCurrent\(\) \|\|\s*!actualAcquisition.isCurrent\(\)\) \{', 'if (false) {', s),runtime)
mutate('private-reader-guard',core/'experimental/contracted/runtime.js',lambda s:s.replace('get: Effect.flatMap(service, executable => checkFixedProviderAcquisition(declaredBlock, executable))','get: Effect.map(service, executable => executable)'),runtime)
mutate('provided-child-guard',core/'experimental/contracted/runtime.js',lambda s:s.replace('onSome: executable => Effect.map(checkFixedProviderAcquisition(declaredBlock, executable), Option.some)','onSome: executable => Effect.succeed(Option.some(executable))'),runtime)
(a/'mutations.json').write_text(json.dumps(rows,indent=2)+'\n');print(json.dumps(rows,indent=2))
for name,args in [('restored-types',args),('restored-runtime',runtime)]:
 r=subprocess.run(args,cwd=w,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True);(a/f'{name}.log').write_text(r.stdout);assert r.returncode==0,(name,r.stdout)
