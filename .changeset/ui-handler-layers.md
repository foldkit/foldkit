---
'@foldkit/ui': minor
---

Expose each stateful Foldkit UI component as a completed Block. The owning parent creates Bindings with `bindChild` and includes them under its Composition's `childBindings`. Composition carries handler Layers, Mounts, Subscriptions, and ManagedResources to the application root.

Before:

```ts
import { Menu } from '@foldkit/ui'
import { Submodel } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { menuViewInputs } from './viewInputs'

const AppMenu = Menu.create<string>()

export const mounts = Menu.mounts

export const view = Submodel.defineView<Model, Message>((model, h) =>
  h.submodel({
    slotId: model.menu.id,
    model: model.menu,
    view: AppMenu.view,
    viewInputs: menuViewInputs,
    toParentMessage: message => Message.GotMenuMessage({ message }),
  }),
)
```

After:

```ts
import { Menu, Tabs } from '@foldkit/ui'
import { Block } from 'foldkit'

import { foldMenuOutMessage, foldTabsOutMessage } from './outMessage'
import { Message } from './message'
import { Model, type Tab } from './model'
import { menuViewInputs } from './viewInputs'

const AppMenu = Menu.create()
const AppTabs = Tabs.create<Tab>()

const Panel = Block.define('Panel', { Model, Message })

const MenuBinding = Panel.bindChild(AppMenu, {
  field: 'menu',
  parentMessage: Message.GotMenuMessage,
  outMessage: { fold: foldMenuOutMessage },
})

const TabsBinding = Panel.bindChild(AppTabs, {
  field: 'tabs',
  parentMessage: Message.GotTabsMessage,
  outMessage: { fold: foldTabsOutMessage },
})

const PanelComposition = Panel.makeComposition({
  childBindings: [MenuBinding, TabsBinding],
})

export const view = PanelComposition.makeView((model, h) =>
  h.block(
    MenuBinding.embedView({
      slotId: model.menu.id,
      model: model.menu,
      viewInputs: menuViewInputs,
    }),
  ),
)
```

Register only the components the owner embeds. A Binding makes the parent-child relationship explicit once: the Composition routes received wrapper Messages through the Binding automatically, update uses exposed operations such as `binding.open()` for parent-driven changes, and view uses `binding.embedView`.

Factories live on the component namespace: `Combobox.create`, `Combobox.Multi.create`, `Listbox.create`, `Listbox.Multi.create`, `Menu.create`, `Tabs.create`, `RadioGroup.create`, `VirtualList.create`, and `Toast.make`. Factory instances retain stable local names; Binding placement and keys distinguish occurrences. Schema-taking factories such as `Combobox.create(City)` preserve decoded Item payloads. Type-only factories such as `Tabs.create<Tab>()` preserve selected value types. Import ViewInputs and domain helpers from component subpaths; the completed value carries its Model, Message, and declared OutMessage matcher.

```ts
import { Toast } from '@foldkit/ui'
import { Option, Schema } from 'effect'
import { defineApplication } from 'foldkit'

import { foldToastOutMessage } from './outMessage'
import { Message } from './message'
import { Model } from './model'

const ToastPayload = Schema.Struct({ message: Schema.String })
const AppToast = Toast.make(ToastPayload)

const Application = defineApplication({ Model, Message })

const ToastBinding = Application.bindChild(AppToast, {
  field: 'toast',
  parentMessage: Message.GotToastMessage,
  outMessage: { fold: foldToastOutMessage },
})
```

The Binding contributes Toast's swipe Subscription and handler recipe automatically. Scene swipe events continue to use `Subscription.emit` with the registration carried by the completed Block.

For dynamic keyed component collections, use the keyed `bindChild` shape. Every rendered occurrence needs a stable string or finite number key.

```ts
import { Dialog } from '@foldkit/ui'
import { defineApplication } from 'foldkit'

import { replaceDialog } from './dialog'
import { foldDialogOutMessage } from './outMessage'
import { Message } from './message'
import { Model } from './model'

const Application = defineApplication({ Model, Message })

const DialogsBinding = Application.bindChild(Dialog.block, {
  readAll: model => model.dialogs,
  key: dialog => dialog.id,
  read: dialog => dialog.model,
  writeAt: (model, dialogId, nextDialog) =>
    replaceDialog(model, dialogId, nextDialog),
  toParentMessage: (dialogId, message) =>
    Message.GotDialogMessage({ dialogId, message }),
  fromParentMessage: {
    parentMessage: Message.GotDialogMessage,
    args: (_model, { dialogId, message }) => Option.some([dialogId, message]),
  },
  outMessage: { fold: foldDialogOutMessage },
})
```

Stateless render helpers such as Button, Input, Textarea, Select, Fieldset, Checkbox, Switch, Disclosure, and Nav remain direct view functions. They own no Model or lifecycle graph and need no Binding.
