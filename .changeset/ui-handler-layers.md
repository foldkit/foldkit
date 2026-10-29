---
'@foldkit/ui': minor
---

Expose each stateful Foldkit UI component as a completed Block. The owning parent creates Bindings with `makeBinding` and includes them under its Composition's `bindings`. Composition carries handler Layers, Mounts, Subscriptions, and ManagedResources to the application root.

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
const MenuBlock = Menu.makeBlock()
const TabsBlock = Tabs.makeBlock<Tab>()
const PanelDefinition = Block.makeDefinition('Panel', { Model, Message })
const MenuBinding = PanelDefinition.makeBinding(MenuBlock, {
  field: 'menu',
}).withOutMessagePolicy({ fold: foldMenuOutMessage })
const TabsBinding = PanelDefinition.makeBinding(TabsBlock, {
  field: 'tabs',
}).withOutMessagePolicy({ fold: foldTabsOutMessage })
const PanelComposition = PanelDefinition.makeComposition({
  bindings: [MenuBinding, TabsBinding],
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

Register only the components the owner embeds. A Binding makes the parent-child relationship explicit once: the Composition routes received wrapper Messages through the Binding automatically, update uses operations such as `binding.requestOpen()` for parent-driven changes, and view uses `binding.embedView`.

Factories live on the component namespace: `Combobox.makeBlock`, `Combobox.Multi.makeBlock`, `Listbox.makeBlock`, `Listbox.Multi.makeBlock`, `Menu.makeBlock`, `Tabs.makeBlock`, `RadioGroup.makeBlock`, `VirtualList.makeBlock`, and `Toast.makeBlock`. Name completed factory results `FooBlock`. Factory definitions retain stable local names; Binding placement and keys distinguish occurrences. Schema-taking factories such as `Combobox.makeBlock(City)` preserve decoded Item payloads and encoded types. Item Codecs must be synchronous and service-free because the component decodes supplied values synchronously. Type-only factories such as `Tabs.makeBlock<Tab>()` preserve selected value types. Import ViewInputs and domain helpers from component subpaths; the completed value carries its Model, Message, and declared OutMessage matcher.

```ts
import { Toast } from '@foldkit/ui'
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { foldToastOutMessage } from './outMessage'
import { Message } from './message'
import { Model } from './model'
const ToastPayload = Schema.Struct({ message: Schema.String })
type ToastPayload = typeof ToastPayload.Type
const ToastBlock = Toast.makeBlock(ToastPayload)
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const ToastBinding = ApplicationDefinition.makeBinding(ToastBlock, {
  field: 'toast',
}).withOutMessagePolicy({ fold: foldToastOutMessage })
```

The Binding contributes Toast's swipe Subscription and handler recipe automatically. Scene swipe events continue to use `Subscription.emit` with the registration carried by the completed Block.

For dynamic keyed component collections, use the keyed `makeBinding` shape. Every rendered occurrence needs a stable string or finite number key.

```ts
import { Schema } from 'effect'
import { DialogBlock } from '@foldkit/ui'
import { Block } from 'foldkit'
import { replaceDialog } from './dialog'
import { foldDialogOutMessage } from './outMessage'
import { Message } from './message'
import { Model } from './model'
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const DialogsBinding = ApplicationDefinition.makeBinding(DialogBlock, {
  readAll: model => model.dialogs,
  key: dialog => dialog.id,
  read: dialog => dialog.model,
  writeAt: (model, dialogId, nextDialog) =>
    replaceDialog(model, dialogId, nextDialog),
  keySchema: Schema.String,
}).withOutMessagePolicy({ fold: foldDialogOutMessage })
```

## Use completed component contracts and test matchers

Ordinary stateful components export one feature-named completed value such as `DialogBlock`, `DragAndDropBlock`, or `SliderBlock`. Generic factories return an exact completed Block that the consumer names for its domain, such as `CityComboboxBlock` or `NavigationTabsBlock`. Read the component Model, Message, and OutMessage contracts from that completed value.

Command and Mount Definitions used only to match pending work in Story and Scene tests now live under the component's `test` namespace. Pair that Definition with the result Message from the completed instance:

Before:

```ts
import { Menu } from '@foldkit/ui'
import { Command } from 'foldkit/story'

const resolveMenuFocus = Command.resolve(
  Menu.FocusMenuButton,
  Menu.Message.CompletedFocusMenuButton(),
)
```

After:

```ts
import { Menu } from '@foldkit/ui'
import { Command } from 'foldkit/story'

import { NavigationMenuBlock } from './menu'

const resolveMenuFocus = Command.resolve(
  Menu.test.FocusMenuButton,
  NavigationMenuBlock.Message.CompletedFocusMenuButton(),
)
```

The same move applies to matcher Definitions from Dialog, Listbox, Popover, RadioGroup, Tabs, and the other stateful component families. Application code uses the completed Block and its Binding operations; the `test` namespace exists for resolving or asserting the original pending Command or Mount.

## Embed DragAndDrop's canonical view

`DragAndDropBlock` now has a canonical embedded view. Its `RenderInfo` supplies `draggable`, `droppable`, and `sortable` attribute builders already bound to the child Model and dispatcher. The parent still owns the list markup and data order through `viewInputs.toView`.

Before, the parent mapped DragAndDrop's local Message by hand when it created draggable attributes:

```ts
import { DragAndDrop } from '@foldkit/ui'

const itemAttributes = DragAndDrop.draggable(
  {
    model: model.dragAndDrop,
    toParentMessage: message => Message.GotDragAndDropMessage({ message }),
    itemId: item.id,
    containerId: column.id,
    index,
  },
  h,
)
```

After, embed the registered Binding and use the bound builders inside `toView`:

```ts
import { Array } from 'effect'

import { ApplicationComposition, DragAndDropBinding } from './composition'

export const view = ApplicationComposition.makeView((model, h) =>
  h.block(
    DragAndDropBinding.embedView({
      slotId: 'drag-and-drop',
      model: model.dragAndDrop,
      viewInputs: {
        toView: ({ draggable, droppable }) =>
          h.ul(
            [...droppable('todo', 'To do')],
            Array.map(model.items, (item, index) =>
              h.li(
                [
                  ...draggable({
                    itemId: item.id,
                    containerId: 'todo',
                    index,
                  }),
                ],
                [item.label],
              ),
            ),
          ),
      },
    }),
  ),
)
```

Remove the public `DragAndDrop.draggable` mapper and every `toParentMessage` adapter used only by it. Generated delivery routes the embedded Block's Messages. `droppable` and `sortable` remain handler-free attribute builders, and the canonical integration receives all three builders together from `RenderInfo`.

Stateless render helpers such as Button, Input, Textarea, Select, Fieldset, Checkbox, Switch, Disclosure, and Nav remain direct view functions. They own no Model or lifecycle graph and need no Binding.
