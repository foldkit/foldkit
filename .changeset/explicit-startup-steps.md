---
'@foldkit/ui': minor
'foldkit': patch
'create-foldkit-app': patch
---

Make feature startup transitions ordinary Steps in a Composition init plan. The callback constructs parent-owned fields, supplies shared child input, and lists Steps that run after the Composition has assembled the complete Model. A simple feature can omit `steps`.

### Initially open Dialogs

`Dialog.boot` is removed. Initialize a closed Dialog through its Binding, then apply the Binding's existing `requestOpen()` Step. The Step lifts `ShowDialog` and handles `Opened` through the configured OutMessage policy. Return Commands from both initialization and opening.

Before:

```ts
import { Update } from 'foldkit'
import { Dialog } from '@foldkit/ui'

import { Message } from './message'
import { Model } from './model'
import { foldDialogOutMessage } from './operation'

return Update.foldChildInit(Dialog.boot({ id: 'confirm' }), {
  toParentModel: dialog => Model.make({ dialog }),
  toParentMessage: message => Message.GotDialogMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})
```

After, declare the initial inputs and register the Binding in composition.ts. The early Application Definition lives in definition.ts:

```ts
import { DialogBlock } from '@foldkit/ui'
import { ApplicationDefinition } from './definition'
import { foldDialogOutMessage } from './operation'
export const DialogBinding = ApplicationDefinition.makeRequiredFieldBinding(
  DialogBlock,
  {
    field: 'dialog',
    init: { contextToArgs: () => [{ id: 'confirm' }] },
  },
).withOutMessagePolicy({ fold: foldDialogOutMessage })
export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [DialogBinding],
})
```

Then list the opening transition in the Composition init plan:

```ts
import { ApplicationComposition, DialogBinding } from './composition'

export const init = ApplicationComposition.makeInit(() => ({
  model: {},
  steps: [DialogBinding.requestOpen()],
}))
```

For two or more startup Steps, list them in execution order. Each receives the Model produced by the previous Step. Foldkit preserves parent Commands first, child init Commands second, and Step Commands last; Commands within those groups execute independently.

The Init, Block and Dialog guides and generated application guidance explain when a startup Step earns its place. Startup operations enter update through their declared request or notification Messages. Do not simulate an unrelated UI event or fetch completion merely to assemble initial state; share the pure transition logic where appropriate.
