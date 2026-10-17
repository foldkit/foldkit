---
'foldkit': minor
'create-foldkit-app': patch
---

Author initializers through the named Composition. `ApplicationComposition.makeInit(fn)` and `SearchComposition.makeInit(fn)` check parent-owned Model fields, shared child input, returned Commands, and startup Steps against the registered graph while preserving the callback's arguments and requirements.

Before:

```ts
import { Runtime } from 'foldkit'

import { type Flags } from './flags'
import { type Message } from './message'
import { Model } from './model'

export const init: Runtime.ApplicationInit<Model, Message, Flags> = flags => ({
  model: Model.make({ count: flags.initialCount }),
})
```

After, import the named Composition that owns application initialization:

```ts
import { ApplicationComposition } from './composition'
import { type Flags } from './flags'

export const init = ApplicationComposition.makeInit((flags: Flags) => ({
  model: { count: flags.initialCount },
}))
```

For a graphless Block, create and reuse a named empty Composition:

```ts
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const Search = Block.define('Search', { Model, Message })
export const SearchComposition = Search.makeComposition()

export const init = SearchComposition.makeInit((query: string) => ({
  model: Model.make({ query }),
}))
```

Initializers use one concrete function signature. Optional, default, and rest parameters are supported. Wrap an overloaded domain helper in a concretely typed initializer callback instead of passing its overload set to `init`. Generic Block factories can capture their type parameters outside the initializer. Foldkit rejects callable shapes it cannot check without changing their argument or result types.

Pass the authored `init` to that same Composition's `makeApplication`, `makeElement`, or `makeBlock` completion method. Completion still checks the initializer against Application Flags and routing configuration, handler provision, and registered child Bindings. Definitions continue to own effects, Steps, lifecycle definitions, and `bindChild`; they no longer expose `init` or `update` authoring aliases.

The helper neither calls the initializer nor starts effects. The Runtime invokes Application initialization and executes returned Commands. Public UI helpers that directly construct a Model keep their existing return shape; their Block initializer adapters use the owned helper.

## Initialize children in their registered graph

For a required exact direct field, omit `init` when the child's initializer can be called without arguments. Use `init: { args }` for required inputs, or `init: false` when the parent supplies that required field. Optional, keyed, and accessor storage remains parent-owned when `init` is omitted; explicit `init.args` or `init.occurrences` chooses automatic presence. For dynamic children or custom storage, `Binding.init` returns a passive initialization recipe. Supply the child arguments, the keyed occurrence's `key` when applicable, and `toParentModel` to store the initialized child. Return the recipe directly from `Composition.makeInit` or `Composition.makeUpdate`, or preserve it through a Definition-owned Step. The Composition callbacks interpret it directly; a completed exposed operation interprets a recipe preserved by its Step. The recipe has no `.model` or `.commands` fields.

Earlier interim Binding prototype:

```ts
import { Array, Number } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { CountersBinding } from './composition'

const counterInit = CountersBinding.init(id)
return {
  model: modifyFields(model, {
    counters: Array.append({ id, counter: counterInit.model }),
    nextCounterId: Number.increment,
  }),
  commands: counterInit.commands,
}
```

Replacement inside a Composition-authored update handler:

```ts
import { Array, Number } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { CountersBinding } from './composition'

return CountersBinding.init({
  key: id,
  args: [],
  toParentModel: counter =>
    modifyFields(model, {
      counters: Array.append({ id, counter }),
      nextCounterId: Number.increment,
    }),
})
```

The compiler checks child arguments, key and parent Model types, and retains Command requirements and the exact Binding requirement. `Composition.makeInit` and `Composition.makeUpdate` check that requirement against their registered graph before interpreting the recipe. `Definition.step` preserves it until a Composition callback or completed exposed operation performs that checked execution. Optional `commands` adds parent Commands after the child's lifted Commands without exposing an intermediate result.

Checked initialization requires that exact Binding in the active composition frame. These guards protect JavaScript with erased types and operations captured for later execution. The Composition executor rejects an incomplete parent Model and a mapping that discards the child, selects the wrong key, or stores duplicate occurrences at that key. Parent Schema constructors may reconstruct an equivalent child Model. Numeric zero and negative zero identify the same occurrence, matching the runtime's Map and Set key equality.

Ordinary Model construction remains available. Connected Binding folds and exposed Steps require their exact graph capability on the Model input, so typed raw-Model calls fail. Return or compose their opaque results intact from `Composition.makeUpdate` or `Composition.makeInit`; no `.model` or `.commands` fields are available before checked execution, and the result cannot narrow to a useful `{ model }` return. `Definition.step` preserves or wraps a connected value. A completed exposed operation carries its own graph, accepts the raw Block Model, and returns the readable executed result. Ordinary pure Steps remain directly callable. TypeScript may erase a connected function's result through a method returning `void`; outside the graph, calling it only constructs and discards passive configuration and executes no child work, so not every structural erasure fails compilation.
