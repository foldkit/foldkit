from pathlib import Path
import shutil,json,tempfile
w=Path(__file__).resolve().parent.parent;d=Path(tempfile.mkdtemp(prefix='foldkit-unified-relocated-'))
core=d/'package-core';shutil.copytree(w/'packages/foldkit/dist',core/'dist');shutil.copy2(w/'packages/foldkit/package.json',core/'package.json')
for name in ['effect','parse5','@effect/platform-browser']:
 p=core/'node_modules'/name;p.parent.mkdir(parents=True,exist_ok=True);p.symlink_to((w/'packages/foldkit/node_modules'/name).resolve(),target_is_directory=True)
rel=d/'relocated';shutil.copytree(w/'probe/current-child-declarations',rel/'feature');(rel/'package.json').write_text('{"type":"module"}\n')
for name,target in [('foldkit',core),('effect',(w/'node_modules/effect').resolve())]:
 p=rel/'node_modules'/name;p.parent.mkdir(parents=True,exist_ok=True);p.symlink_to(target,target_is_directory=True)
(rel/'consumer.ts').write_text('''import {Effect,Layer} from 'effect'
import {CounterBlock,layer} from './feature/counter.js'
import {ApplicationBlock} from './feature/block.js'
import {ApplicationDefinition} from './feature/definition.js'
type Assert<Value extends true>=Value
type Equal<A,B>=[A,B] extends [B,A]?true:false
const read=CounterBlock.get.pipe(Effect.provide(layer))
export type Checks=readonly[Assert<Equal<Effect.Services<typeof read>,never>>,Assert<Equal<Layer.Services<typeof ApplicationBlock>,never>>]
const ready=CounterBlock.Instance.make({key:'first',model:{count:1}})
const model=ApplicationDefinition.Model.make({counters:[ready],summary:1,lastChangedCount:1})
void model
if(false){
 // @ts-expect-error Ready Instance has exact child Model.
 CounterBlock.Instance.make({key:'bad',model:{count:'wrong'}})
 // @ts-expect-error Removed public projection remains absent through relocated declarations.
 void CounterBlock.contract
}
''')
(rel/'tsconfig.json').write_text(json.dumps({'compilerOptions':{'target':'ES2022','lib':['ESNext','DOM'],'module':'NodeNext','moduleResolution':'NodeNext','strict':True,'skipLibCheck':False,'noEmit':True,'types':[]},'files':['consumer.ts']},indent=2)+'\n')
p=rel/'consumer.ts';s=p.read_text().replace("import {ApplicationBlock}","import {CountersBinding} from './feature/composition.js'\nimport {ApplicationBlock}").replace('CounterBlock.get.pipe(Effect.provide(layer))','Effect.gen(function*(){return yield* CountersBinding}).pipe(Effect.provide(layer))');p.write_text(s)
print(rel/'tsconfig.json')
