---
'foldkit': minor
'create-foldkit-app': patch
---

Author initializers through the named Composition. `ApplicationComposition.makeInit(fn)` and `SearchComposition.makeInit(fn)` check parent-owned Model fields, shared child init context, returned Commands, and startup Steps against the registered graph while preserving the callback's arguments and requirements.

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

For a split graphless Block, create and reuse a named empty Composition from `composition.ts`. When the Definition factory has no other use, keep its owner identity at module scope and chain it directly into the Composition:

```ts
// composition.ts
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const SearchComposition = Block.makeDefinition('Search', {
  Model,
  Message,
}).makeComposition()
```

```ts
// init.ts
import { Model } from './model'
import { SearchComposition } from './composition'

export const init = SearchComposition.makeInit((query: string) => ({
  model: Model.make({ query }),
}))
```

Initializers use one concrete function signature. Optional, default, and rest parameters are supported. Wrap an overloaded domain helper in a concretely typed initializer callback instead of passing its overload set to `init`. Generic Block factories can capture their type parameters outside the initializer. Foldkit rejects callable shapes it cannot check without changing their argument or result types.

Pass the authored `init` to that same Composition's `prepareBlock` method. Block assembly still checks the initializer against handler provision and registered child Bindings. `Program.make`, `Program.makeElement`, and `Server.renderToString` check the completed root Block against host Flags and routing configuration. Definitions continue to own effects, Steps, lifecycle definitions, and the storage-specific Binding constructor; they no longer expose `init` or `update` authoring aliases.

The helper neither calls the initializer nor starts effects. The Runtime invokes Application initialization and executes returned Commands. Canonical UI initializers are authored once through their Composition and return the standard initialization record. Parent automatic child initialization and `Binding.init` retain any child Commands instead of projecting only `.model`. Pure fixture construction may project `.model` when the initializer is known to produce no Commands.

## Initialize children in their registered graph

For a required exact direct field, omit `init` when the child's initializer can be called without arguments. Use `init: { contextToArgs }` for required inputs, or `init: false` when the parent supplies that required field. An unkeyed optional field remains parent-owned when `init` is omitted; `init.contextToArgs` can choose `None` or automatic `Some(child)` creation. An exact keyed array uses `init.instances` and `init.toItem`. An exact Option-wrapped keyed occurrence and custom storage stay explicit through `Binding.init`, which returns a passive initialization recipe. Supply the child arguments, the keyed occurrence's `key` when applicable, and `toParentModel` to store the initialized child. Return the recipe directly from `Composition.makeInit` or `Composition.makeUpdate`, or preserve it through a Definition-owned Step. The Composition callbacks interpret it directly; a completed operation may dispatch a Message whose update branch returns the recipe. The recipe has no `.model` or `.commands` fields.

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

The compiler checks child arguments, key and parent Model types, and retains Command requirements and the exact Binding requirement. `Composition.makeInit` and `Composition.makeUpdate` check that requirement against their registered graph before interpreting the recipe. `Definition.makeStep` preserves it until a Composition callback performs that checked execution. A completed operation may reach the same path by dispatching a Message whose update branch returns the recipe. Optional `commands` adds parent Commands after the child's lifted Commands without exposing an intermediate result.

Checked initialization requires that exact Binding in the active composition frame. These guards protect JavaScript with erased types and operations captured for later execution. The Composition executor rejects an incomplete parent Model and a mapping that discards the child, selects the wrong key, or stores duplicate occurrences at that key. Parent Schema constructors may reconstruct an equivalent child Model. Numeric zero and negative zero identify the same occurrence, matching the runtime's Map and Set key equality.

Ordinary Model construction remains available. Connected Binding folds and named operations require their exact graph capability on the Model input, so typed raw-Model calls fail. Return or compose their opaque results intact from `Composition.makeUpdate` or `Composition.makeInit`; no `.model` or `.commands` fields are available before checked execution, and the result cannot narrow to a useful `{ model }` return. `Definition.makeStep` preserves or wraps a connected value. A completed operation carries its own graph, accepts the raw Block Model and operation arguments, synchronously dispatches the produced Message through update, and returns the readable executed result. Its return contract uses the completed update function's full Command requirements and OutMessage type. Ordinary pure Steps remain directly callable. TypeScript may erase a connected function's result through a method returning `void`; outside the graph, calling it only constructs and discards passive configuration and executes no child work, so not every structural erasure fails compilation.
