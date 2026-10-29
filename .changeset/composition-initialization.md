---
'foldkit': minor
'create-foldkit-app': patch
---

Declare direct child init context beside Bindings and assemble their initial Models and Commands through the owning Composition. A completed Block already carries its initializer; the parent now supplies the child initialization policy without repeating Model placement and Command collection.

A required exact direct field initializes automatically when the child's initializer can be called without arguments. Use `init: { contextToArgs }` when it needs inputs, or `init: false` when the parent supplies the initial field. An unkeyed optional field remains parent-owned when `init` is omitted; select automatic optional presence with `Option<tuple>`. Exact keyed arrays use `init.instances` for initial membership. An exact Option-wrapped keyed occurrence and general accessor storage stay explicit through `Binding.init`. Ordinary tuple literals retain the child's exact contextual argument types.

`init.contextToArgs` maps shared child init context to direct child initializer arguments. It does not map the current Block's own init arguments. Keep `args` for concrete tuples in `Binding.init({ args, toParentModel })` and keyed occurrence records. The context selector has no `init.args` alias; `init.instances` still selects whole keyed collections.

Each storage shape has one initialization adapter. A direct field needs only `contextToArgs`. An accessor adds `init.toParentFields`, which projects the exact initialized child into one required parent Struct field before the parent Model is constructed. A keyed array uses `init.instances` and `init.toItem`. Dynamic initialization from a Composition init or update keeps `Binding.init({ args, key?, toParentModel })`, where `toParentModel` constructs the complete parent Model for that one initialized child. The same explicit operation creates an Option-wrapped keyed occurrence because `init.instances` accepts arrays only.

Author the complete startup plan with `ApplicationComposition.makeInit` or `FeatureComposition.makeInit`. Add a `ChildInitContext` Schema to the parent Definition when Binding selectors share decoded context for direct child initializers. The callback supplies that value through `childInitContext`, returns fields owned by the parent, and may list Commands and startup Steps. This remains the existing Composition startup boundary; it does not add a Runtime phase, construct Layers, or execute Commands.

An initialization plan supports `model`, `commands`, `steps`, and `childInitContext`. Unknown string fields are rejected during authoring and at runtime so a misspelled context field cannot silently change which children initialize. Definition contracts and Composition graph configuration also reject unsupported fields at runtime, including for JavaScript callers.

## Move child startup into child init

Keep the initial state transition and Command with the child that owns them. The parent Binding selects child init arguments from `ChildInitContext`; the root does not expose a startup-only child operation and call it through `steps`.

For example, the website's API Reference and Example Detail Bindings select their prerendered inputs in the root Composition:

```ts
const ApiReferenceBinding = ApplicationDefinition.makeBinding(
  ApiReferenceBlock,
  {
    field: 'apiReference',
    init: { contextToArgs: ({ maybeApiData }) => [maybeApiData] },
  },
)

const ExampleDetailBinding = ApplicationDefinition.makeBinding(
  ExampleDetailBlock,
  {
    field: 'exampleDetail',
    init: {
      contextToArgs: ({ route, maybeExampleSources }) => [
        maybeExampleSlugForRoute(route),
        maybeExampleSources,
      ],
    },
  },
)
```

Each child `makeInit` owns its initial loading state and returns its initial load Command when needed. Root init supplies the shared context and keeps root-owned scrolling as ordinary Commands because those Commands do not require a preceding Model transition:

```ts
const init = ApplicationComposition.makeInit((flags: Flags, url: Url) => {
  const route = urlToApplicationRoute(url)

  return {
    childInitContext: {
      route,
      today: flags.today,
      maybeApiData: flags.maybeApiData,
      maybeExampleSources: flags.maybeExampleSources,
    },
    model: parentOwnedFields(flags, url, route),
    commands: [
      ...browserStartupCommands(flags.deployment),
      ...initialScrollCommands(url),
    ],
  }
})
```

Use `steps` when one startup transition must receive the Model produced by an earlier transition. Do not add a Step only to return independent root Commands or to run startup logic that belongs in a child's initializer.

## Declare child init context beside the Binding

An interim Binding prototype manually initialized a registered child, put its Model into the parent, and retained its Commands:

```ts
import { SettingsBinding } from './composition'
import { Application } from './definition'
import type { Flags } from './flags'
import { Model } from './model'

export const init = Application.init((flags: Flags) => {
  const settingsInit = SettingsBinding.init({ theme: flags.savedTheme })

  return {
    model: Model.make({
      username: flags.username,
      settings: settingsInit.model,
    }),
    commands: settingsInit.commands,
  }
})
```

After, give the Application Definition its shared child init context contract:

```ts
import { Block } from 'foldkit'

import { Flags } from './flags'
import { Message } from './message'
import { Model } from './model'

export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
  ChildInitContext: Flags,
})
```

Then declare the child inputs with the Binding in composition.ts. The Definition's `ChildInitContext` Schema contextually types the selector:

```ts
import { ApplicationDefinition } from './definition'
import { SettingsBlock } from './settings'
export const SettingsBinding = ApplicationDefinition.makeBinding(
  SettingsBlock,
  {
    field: 'settings',
    init: {
      contextToArgs: flags => [{ theme: flags.savedTheme }],
    },
  },
)
export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [SettingsBinding],
})
```

Then let the Composition collect child Models and Commands in init.ts:

```ts
import { ApplicationComposition } from './composition'
import type { Flags } from './flags'

export const init = ApplicationComposition.makeInit((flags: Flags) => ({
  childInitContext: flags,
  model: {
    username: flags.username,
  },
}))
```

For accessor storage, identify the one parent field that receives the initialized child. The Binding keeps its existing `read` and `write` policy after startup:

```ts
import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { ApplicationDefinition } from './definition'
import { SettingsBlock } from './settings'

export const SettingsBinding = ApplicationDefinition.makeBinding(
  SettingsBlock,
  {
    read: model => Option.some(model.settings),
    write: (model, nextSettings) =>
      modifyFields(model, { settings: () => nextSettings }),
    init: {
      contextToArgs: flags => [{ theme: flags.savedTheme }],
      toParentFields: settings => ({ settings }),
    },
  },
)
```

`toParentFields` must return exactly one declared, required parent Struct field whose decoded type matches the child Model. It cannot initialize an `Option` field or an optional property. Use the direct optional selector form when startup policy decides optional presence.

The assembler calls selected child initializers once in `bindings` order and merges their fields with the parent-owned fields. It preserves parent Commands first, child init Commands second, and startup Step Commands last. The Runtime still executes Commands independently; collection order does not sequence their completion. A child initializes its own descendants through its completed init; the assembler does not initialize them a second time.

The final Model determines active occurrences. Init Commands for children absent or gated by `presentWhen` are omitted. `subscriptions.when` only gates Subscription Streams. A boot Step may update initialized child state without discarding its init Commands.

When a child initializer takes no arguments, a required direct field needs no `init` property:

```ts
const SearchBinding = ApplicationDefinition.makeBinding(SearchBlock, {
  field: 'search',
})
```

Use `init: false` when that required direct field is parent-owned at startup. Omit `init` for parent-owned optional, keyed, and accessor storage. Use `init.contextToArgs` when Composition should choose unkeyed optional presence, and use `init.instances` only when it should construct an exact keyed array.

## Select initial keyed instances

A keyed-array Binding can select its initial instances with `init.instances` and construct its stored items with `init.toItem`. Each occurrence has a stable key and the exact child init argument tuple. The assembler calls child init once per occurrence and lifts its Commands through that key. For a direct array, `toItem` returns the exact initialized child Model with the planned key. For a wrapped array, it returns the parent-owned wrapper containing that exact child Model and key.

Return a wrapper as a plain record. Its child field must retain the exact initialized object until the assembler constructs the parent Model. A wrapper Schema constructor may reconstruct that child and fail this check; the assembler applies the parent Model Schema after collecting the wrappers.

```ts
import { Array } from 'effect'
import { ApplicationDefinition } from './definition'
import { CounterBlock } from './counter'
const INITIAL_COUNTER_COUNT = 3
const CountersBinding = ApplicationDefinition.makeBinding(CounterBlock, {
  field: 'counters',
  key: 'id',
  childField: 'counter',
  init: {
    instances: () =>
      Array.makeBy(INITIAL_COUNTER_COUNT, counterId => ({
        key: `counter-${counterId}`,
        args: [],
      })),
    toItem: ({ key }, counter) => ({ id: key, counter }),
  },
})
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [CountersBinding],
})
const init = ApplicationComposition.makeInit(() => ({
  model: {
    nextCounterId: INITIAL_COUNTER_COUNT,
  },
}))
```

The occurrence plan is validated before any child initializes. Duplicate keys, non-array `args`, and wrappers that change their planned key are rejected at runtime. TypeScript checks tuple length and element types. JavaScript runtime metadata cannot reconstruct which initializer parameters were required, optional, defaulted, or rest parameters. Generated delivery rejects stale occurrence generations. A false `delivery.when` predicate ignores incoming delivery without changing the Model or whole-child presence. General keyed accessor storage remains explicit, requires `keySchema` for generated delivery, and continues to use `Binding.init({ key, args, toParentModel })` for dynamic initialization. The keyed field adapter's `init.toItem` does not add HashMap initialization.

## Name child Bindings explicitly

Register child Bindings under `bindings` rather than `children`. Name constructed values `SettingsBinding`, `HomeBinding`, and similar PascalCase names. Model and DOM fields named `children` are unaffected. Assembly modules import extracted policies directly by those names, and Composition barrels re-export the actual values. Use a factory only when the caller supplies configuration needed to construct the Binding.
