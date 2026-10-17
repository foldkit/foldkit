---
'foldkit': minor
'create-foldkit-app': patch
---

Declare child startup inputs beside their Bindings and assemble their initial Models and Commands through the owning Composition. A completed Block already carries its initializer; the parent now supplies the startup policy without repeating Model placement and Command collection.

A required exact direct field initializes automatically when the child's initializer can be called without arguments. Use `init: { args }` when it needs inputs, or `init: false` when the parent supplies the initial field. Optional, keyed, and accessor storage remains parent-owned when `init` is omitted. Select automatic optional presence with `Option<tuple>` and initial keyed membership with `init.occurrences`. Ordinary tuple literals retain the child's exact contextual argument types.

Author the complete startup plan with `ApplicationComposition.makeInit` or `FeatureComposition.makeInit`. Add a `Startup` Schema to the parent Definition when Binding selectors share decoded input. The callback supplies that value through `startup`, returns fields owned by the parent, and may list Commands and startup Steps. This remains the existing Composition startup boundary; it does not add a Runtime phase, construct Layers, or execute Commands.

## Declare startup beside the Binding

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

After, give the Application Definition its shared startup contract:

```ts
import { defineApplication } from 'foldkit'

import { Flags } from './flags'
import { Message } from './message'
import { Model } from './model'

export const Application = defineApplication({
  Model,
  Message,
  Startup: Flags,
})
```

Then declare the child inputs with the Binding in composition.ts. The Definition's `Startup` Schema contextually types the selector:

```ts
import { Application } from './definition'
import { Message } from './message'
import * as Settings from './settings'

export const SettingsBinding = Application.bindChild(Settings.block, {
  field: 'settings',
  parentMessage: Message.GotSettingsMessage,
  init: {
    args: flags => [{ theme: flags.savedTheme }],
  },
})

export const ApplicationComposition = Application.makeComposition({
  childBindings: [SettingsBinding],
})
```

Then let the Composition collect child Models and Commands in init.ts:

```ts
import { ApplicationComposition } from './composition'
import type { Flags } from './flags'

export const init = ApplicationComposition.makeInit((flags: Flags) => ({
  startup: flags,
  model: {
    username: flags.username,
  },
}))
```

The assembler calls selected child initializers once in `childBindings` order and merges their fields with the parent-owned fields. It preserves parent Commands first, child init Commands second, and startup Step Commands last. The Runtime still executes Commands independently; collection order does not sequence their completion. A child initializes its own descendants through its completed init; the assembler does not initialize them a second time.

The final Model determines active occurrences. Init Commands for children absent or gated by `presentWhen` are omitted. `subscriptions.when` only gates Subscription Streams. A boot Step may update initialized child state without discarding its init Commands.

When a child initializer takes no arguments, a required direct field needs no `init` property:

```ts
const SearchBinding = Application.bindChild(Search.block, {
  field: 'search',
  parentMessage: Message.GotSearchMessage,
})
```

Use `init: false` when that required direct field is parent-owned at startup. Omit `init` for parent-owned optional, keyed, and accessor storage. Use the explicit selector forms when Composition should choose optional presence or keyed occurrences automatically.

## Select initial keyed instances

A keyed-array Binding can select its initial instances with `init.occurrences` and construct its stored items with `init.toItem`. Each occurrence has a stable key and the exact child init argument tuple. The assembler calls child init once per occurrence and lifts its Commands through that key. For a direct array, `toItem` returns the exact initialized child Model with the planned key. For a wrapped array, it returns the parent-owned wrapper containing that exact child Model and key.

Return a wrapper as a plain record. Its child field must retain the exact initialized object until the assembler constructs the parent Model. A wrapper Schema constructor may reconstruct that child and fail this check; the assembler applies the parent Model Schema after collecting the wrappers.

```ts
import { Array, Option } from 'effect'

import { Application } from './definition'
import { Message } from './message'
import * as Counter from './counter'

const INITIAL_COUNTER_COUNT = 3

const CountersBinding = Application.bindChild(Counter.block, {
  field: 'counters',
  key: 'id',
  childField: 'counter',
  toParentMessage: (id, message) => Message.GotCounterMessage({ id, message }),
  fromParentMessage: {
    parentMessage: Message.GotCounterMessage,
    args: (_model, { id, message }) => Option.some([id, message]),
  },
  init: {
    occurrences: () =>
      Array.makeBy(INITIAL_COUNTER_COUNT, counterId => ({
        key: `counter-${counterId}`,
        args: [],
      })),
    toItem: ({ key }, counter) => ({ id: key, counter }),
  },
})

const ApplicationComposition = Application.makeComposition({
  childBindings: [CountersBinding],
})

const init = ApplicationComposition.makeInit(() => ({
  model: {
    nextCounterId: INITIAL_COUNTER_COUNT,
  },
}))
```

The occurrence plan is validated before any child initializes. Duplicate keys, non-array `args`, and wrappers that change their planned key are rejected at runtime. TypeScript checks tuple length and element types. JavaScript runtime metadata cannot reconstruct which initializer parameters were required, optional, defaulted, or rest parameters. `Option.none()` from `fromParentMessage.args` ignores a stale or inactive keyed Message without changing the Model. General keyed accessor storage remains explicit; this adapter does not add HashMap initialization.

## Name child Bindings explicitly

Register child Bindings under `childBindings` rather than `children`. Name constructed values `SettingsBinding`, `HomeBinding`, and similar PascalCase names. Model and DOM fields named `children` are unaffected. Assembly modules import extracted policies directly by those names, and Composition barrels re-export the actual values. Use a factory only when the caller supplies configuration needed to construct the Binding.
