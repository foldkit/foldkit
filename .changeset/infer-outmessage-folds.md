---
'foldkit': minor
---

Author parent OutMessage folds with `Definition.makeOutMessageFold(ChildBlock, handlers)`. Pass the completed child explicitly whether the fold is inline under a Binding's `withOutMessagePolicy({ fold })`, extracted as a named callable, adapted for keyed policy, or staged for reciprocal composition. The owning Definition supplies the parent Model, Message, and OutMessage contracts, and the child supplies the exact child contract. Each named variant returns a parent Step. The helper preserves inferred Command requirements and sibling Binding registration evidence.

**Before**

```ts
import type { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import type { Message } from './message'
import type { Model } from './model'
import { TabsBlock } from './tabs'

const foldTabsOutMessage = TabsBlock.OutMessage.match<
  Update.Step<Model, Message>,
  typeof TabsBlock.OutMessage.Type
>({
  Selected:
    ({ value }) =>
    model => ({
      model: modifyFields(model, { currentTab: () => value }),
    }),
})
```

**After**

```ts
import { ApplicationDefinition } from './definition'
import { TabsBlock } from './tabs'

const TabsBinding = ApplicationDefinition.makeRequiredFieldBinding(TabsBlock, {
  field: 'tabs',
}).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(TabsBlock, {
    Selected: ({ value }) =>
      ApplicationDefinition.makeFieldsStep(() => ({ currentTab: () => value })),
  }),
})
```

The helper requires every child OutMessage variant and rejects incompatible parent Models, result Messages, and parent OutMessages. Generic UI payloads retain their literal refinements. A variant may return an existing owned Step or a connected sibling operation; its Command requirements and registration obligations remain part of the parent Composition's checks.

A variant that lifts child Commands receives its typed `FoldContext` as a second parameter. Keep a keyed Binding's key parameter in its policy when parent behavior depends on that key.

Definitions that declare OutMessages also expose `makeOutMessageForward`. Inline `makeOutMessageForward(handlers)` under an unkeyed Binding's `withOutMessagePolicy({ forward })`; pass the completed child explicitly when extracting the callable forward or adapting keyed policy. Each named child variant returns a declared parent OutMessage or `undefined`, and at least one handler must forward. Missing or extra variants and widened `any`, `unknown`, or `never` returns are rejected.

Select policy through the storage-specific Binding's `.withOutMessagePolicy({ fold?, forward? })` and register that full Binding. The required-field example above keeps an ordinary one-way policy fluent. For a self-referential or reciprocal policy, declare the original Bindings first, author helpers against their operations, then select and register `<Child>BindingWithOutMessagePolicy`. Policy selection retains the same child Binding identity and is passive.

This also rejects mixed update branches that return an unapplied Step or an incompatible result beside a valid result. Apply a connected operation to the provided Model before returning it from `Composition.makeUpdate`, or compose it through the existing Step APIs. An OutMessage fold returns a Step because its Binding applies that Step after writing the next child Model. That Step must return a result or connected result recipe. Use the owning `Definition.makeStep` when delegating to another Step or returning a Binding init recipe, so its normalization happens before the Binding consumes the result.
