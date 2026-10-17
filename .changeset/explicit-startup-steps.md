---
'@foldkit/ui': minor
'foldkit': patch
'create-foldkit-app': patch
---

Make feature startup transitions ordinary Steps in a Composition init plan. The callback constructs parent-owned fields, supplies shared child input, and lists Steps that run after the Composition has assembled the complete Model. A simple feature can omit `steps`.

### Initially open Dialogs

`Dialog.boot` is removed. Initialize a closed Dialog through its Binding, then apply the Binding's existing `open()` Step. The Step lifts `ShowDialog` and handles `Opened` through the configured OutMessage policy. Return Commands from both initialization and opening.

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
import { Dialog } from '@foldkit/ui'

import { Application } from './definition'
import { Message } from './message'
import { foldDialogOutMessage } from './operation'

export const DialogBinding = Application.bindChild(Dialog.block, {
  field: 'dialog',
  parentMessage: Message.GotDialogMessage,
  outMessage: { fold: foldDialogOutMessage },
  init: { args: () => [{ id: 'confirm' }] },
})
export const ApplicationComposition = Application.makeComposition({
  childBindings: [DialogBinding],
})
```

Then list the opening transition in the Composition init plan:

```ts
export const init = ApplicationComposition.makeInit(() => ({
  model: {},
  steps: [DialogBinding.open()],
}))
```

For two or more startup Steps, list them in execution order. Each receives the Model produced by the previous Step. Foldkit preserves parent Commands first, child init Commands second, and Step Commands last; Commands within those groups execute independently.

The Init, Block and Dialog guides and generated application guidance explain when a startup Step earns its place. Messages record actual facts; startup code can share pure transition logic with update without dispatching synthetic request or success Messages.
