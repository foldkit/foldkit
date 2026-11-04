from pathlib import Path
import json,os
w=Path(__file__).resolve().parent.parent.parent
root=w/'internal/family-port-proof';paths={}
for package,name in [('foldkit','foldkit'),('ui','@foldkit/ui')]:
 for key,value in json.loads((w/'packages'/package/'package.json').read_text())['exports'].items():
  if isinstance(value,dict) and 'types' in value:
   paths[name+key[1:]]=[os.path.relpath(w/'packages'/package/value['types'].replace('./dist/','src/').replace('.d.ts','.ts'),root)]
opts={'target':'ES2022','lib':['ESNext','DOM'],'module':'NodeNext','moduleResolution':'NodeNext','strict':True,'skipLibCheck':False,'exactOptionalPropertyTypes':True,'noUncheckedIndexedAccess':True,'types':[],'noEmit':True,'paths':paths}
(root/'tsconfig.source.json').write_text(json.dumps({'compilerOptions':opts,'files':['accepted.ts','rejected.ts','../../packages/foldkit/src/vite-env.d.ts','consumer/block.ts']},indent=2)+'\n')
emit={key:value for key,value in opts.items() if key not in ['paths','noEmit']};emit.update({'noEmit':False,'declaration':True,'emitDeclarationOnly':False,'outDir':'.generated/author','rootDir':'.'})
(root/'tsconfig.emit.json').write_text(json.dumps({'compilerOptions':emit,'files':['accepted.ts','consumer/block.ts']},indent=2)+'\n')
for name,target in [('foldkit',w/'packages/foldkit'),('@foldkit/ui',w/'packages/ui')]:
 p=root/'node_modules'/name;p.parent.mkdir(parents=True,exist_ok=True)
 if p.is_symlink():
  if p.resolve()==target:continue
  p.unlink()
 if p.exists():raise RuntimeError(f'Refusing to replace a non-symlink dependency at {p}')
 p.symlink_to(target,target_is_directory=True)
