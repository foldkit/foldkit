import os
from pathlib import Path
import json,os,shutil
w=Path(__file__).resolve().parent.parent.parent
a=Path(os.environ.get('FOLDKIT_FAMILY_PORT_ARTIFACTS', f'/private/tmp/foldkit-recovery-artifacts/family-port-{w.name}'))/'emitted';a.mkdir(parents=True,exist_ok=True)
for name in ['foldkit','ui']:
 p=a/'packages'/name;p.mkdir(parents=True,exist_ok=True)
 shutil.copytree(w/'packages'/name/'dist',p/'dist',dirs_exist_ok=True)
 shutil.copy2(w/'packages'/name/'package.json',p/'package.json')
 d=p/'node_modules';d.mkdir(exist_ok=True)
 for dep in (w/'packages'/name/'node_modules').iterdir():
  if dep.name=='.bin':continue
  if dep.name.startswith('@'):
   scope=d/dep.name;scope.mkdir(exist_ok=True)
   entries=list(dep.iterdir())
  else: entries=[dep];scope=d
  for entry in entries:
   out=scope/entry.name
   target=(a/'packages/foldkit') if entry.name=='foldkit' else entry.resolve()
   if out.is_symlink():out.unlink()
   if not out.exists():out.symlink_to(target,target_is_directory=True)
c=a/'consumer';c.mkdir(exist_ok=True);(c/'package.json').write_text('{"type":"module"}\n')
n=c/'node_modules';(n/'@foldkit').mkdir(parents=True,exist_ok=True)
for name,target in [('foldkit',a/'packages/foldkit'),('@foldkit/ui',a/'packages/ui'),('effect',w/'node_modules/effect')]:
 out=n/name
 if out.is_symlink():out.unlink()
 out.symlink_to(target.resolve(),target_is_directory=True)
shutil.copytree(w/'internal/family-port-proof/.generated/author',c,dirs_exist_ok=True)
shutil.copy2(w/'internal/family-port-proof/rejected.ts',c/'rejected.ts')
(c/'consume.ts').write_text('''import { Effect, Layer } from 'effect'
import * as Story from 'foldkit/story'
import * as Query from 'foldkit/experimental/query'
import { quotesStory, selectedQuotesStory, failingQuotesStory, fixedStory, readGeneric, Apple, type GraphSource, type GraphFailure, Quotes, QuotesLayer, OtherQuotes, OtherQuotesLayer, type FetchSource, type OtherSource } from './accepted.js'
const merged = Layer.mergeAll(QuotesLayer, OtherQuotesLayer)
export const selectedA = Story.withBlock({ block: Quotes, layer: merged }, executable => Layer.build(executable.EffectsLayer)).pipe(Effect.provide(Query.layer))
export const selectedB = Story.withBlock({ block: OtherQuotes, layer: merged }, executable => Layer.build(executable.EffectsLayer)).pipe(Effect.provide(Query.layer))
type Assert<Value extends true> = Value
type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false
export type Checks = readonly [
  Assert<Equal<Exclude<Effect.Services<typeof selectedA>, Effect.Services<typeof quotesStory>>, GraphSource | FetchSource>>,
  Assert<Equal<Exclude<Effect.Services<typeof selectedB>, Effect.Services<typeof quotesStory>>, GraphSource | OtherSource>>,
  Assert<Equal<Effect.Services<typeof quotesStory>, never>>,
  Assert<Equal<Effect.Services<typeof selectedQuotesStory>, GraphSource>>,
  Assert<Equal<Effect.Error<typeof failingQuotesStory>, GraphFailure>>,
  Assert<Equal<Effect.Services<typeof fixedStory>, never>>,
  Assert<Equal<Effect.Services<ReturnType<typeof readGeneric>>, never>>,
  Assert<Equal<'get' extends keyof typeof Apple ? true : false, false>>,
]
''')
opts={'target':'ES2022','lib':['ESNext','DOM'],'module':'NodeNext','moduleResolution':'NodeNext','strict':True,'skipLibCheck':False,'exactOptionalPropertyTypes':True,'noUncheckedIndexedAccess':True,'types':[],'noEmit':True}
(c/'tsconfig.json').write_text(json.dumps({'compilerOptions':opts,'files':['accepted.d.ts','consumer/block.d.ts','consume.ts','rejected.ts']},indent=2)+'\n')
print(a)

(c/'runtime-split.mjs').write_text("import assert from 'node:assert/strict'\nimport { Effect } from 'effect'\nimport { pureStory } from './consumer/block.js'\nconst result = await Effect.runPromise(pureStory)\nassert.equal(result.model.selectedFruit, 'Apple')\nassert.equal(result.commands.length, 1)\nconsole.log(JSON.stringify({ splitConsumer: true, boundRefresh: true, deferredChildInit: true }))\n")
