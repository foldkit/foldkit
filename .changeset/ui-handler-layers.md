---
'@foldkit/ui': minor
---

Every stateful Foldkit UI component is a Block. A parent creates an instance in its constructor, holds it in its Model, provides the component's Layer, renders it with `model.x.view(input)`, sends it Messages with `model.x.send(...)` under `messages`, and handles its OutMessages with `.on`. The `init`, `update`, `view`, `Model`, `Message`, `OutMessage`, `subscriptions`, and Command exports of each component are replaced by the Block class, and a parent no longer needs a `Got*Message` wrapper, `Update.foldChild`, or `h.submodel`. The component's Commands, Mounts, and Subscriptions run from its Layer, so the parent does not register them.

Components with a fixed Item type export a class and its Layer: `Animation.Animation` and `AnimationLive`, `Calendar.Calendar`, `DatePicker.DatePicker`, `Dialog.Dialog`, `DragAndDrop.DragAndDrop`, `FileDrop.FileDrop`, `HoverIntent.HoverIntent`, `Popover.Popover`, `Slider.Slider`, and `Tooltip.Tooltip`, each with a matching `*Live` Layer. Generic components have a `makeBlock` factory that returns a class with its Layer attached as `Live`. Call it once at module scope and name the result for its domain. `Combobox.create`, `Combobox.Multi.create`, `Listbox.create`, `Listbox.Multi.create`, `Menu.create`, `RadioGroup.create`, `Tabs.create`, and `VirtualList.create` become `makeBlock`, and `Toast.make` becomes `Toast.makeBlock`. Existing type parameters and Schema arguments are unchanged.

Before:

```ts
const ActionMenu = Menu.create<Action>()

const Model = Schema.Struct({ menu: Menu.Model })
const Message = defineMessageUnion({
  GotMenuMessage: { message: Menu.Message },
})

const foldMenu = Update.foldChild({
  update: ActionMenu.update,
  read: (model: Model) => Option.some(model.menu),
  write: (model, nextMenu) => modifyFields(model, { menu: () => nextMenu }),
  toParentMessage: message => Message.GotMenuMessage({ message }),
  foldOutMessage: foldMenuOutMessage,
})

const view = (model: Model, h: HtmlBuilder<Message>) =>
  h.submodel({
    slotId: 'menu',
    model: model.menu,
    view: ActionMenu.view,
    viewInputs: menuViewInputs,
    toParentMessage: message => Message.GotMenuMessage({ message }),
  })
```

After:

```ts
const ActionMenu = Menu.makeBlock<Action>()

export class Toolbar extends Block<Toolbar>()('Toolbar', {
  Model: Schema.Struct({ menu: ActionMenu }),
}) {}

export const ToolbarLive = Toolbar.make(
  Effect.fn(function* () {
    const menu = yield* new ActionMenu('menu', { id: 'actions' })

    return {
      model: { menu },
      update: {
        ...menu.on({
          Selected: (model, { value }) => ({ model }),
        }),
      },
      view: (model, h) => model.menu.view(menuViewInputs),
    }
  }),
).pipe(Layer.provide(ActionMenu.Live))
```

Drive a component by sending one of its `Requested*` Messages. The free functions that returned an updated child Model, such as `Dialog.open`, `Dialog.close`, `Animation.show`, and `VirtualList.scrollToIndex`, are removed. For example, `model.dialog.send(Dialog.Dialog.Message.RequestedOpen())` opens a Dialog, and VirtualList's `requestScrollTo`, `requestScrollToIndex`, `requestScrollToKey`, `requestScrollToOffset`, `requestScrollToEnd`, `informItemsChanged`, and `informHistoryPrepended` build the Messages to send to a list instance.

`Dialog.boot` is removed. To show a Dialog when its parent starts, return a `start` Command from the parent and send `RequestedOpen` from the handler for that Command's result Message.

For a dynamic collection of components, create a factory with `yield* Dialog.Dialog.each('dialogs', args)` and store the instances it returns in a Model field such as `Schema.Array(Dialog.Dialog)`. Each instance needs a stable key. `factory.on({...})` handles OutMessages from every instance in the collection.

Animation's view input takes a `toView: () => Html` renderer instead of `content: Html`. The renderer runs as the parent, so event handlers inside it produce the parent's Messages.

```ts
// Before
viewInputs: {
  content: h.p([], ['Saved'])
}

// After
model.animation.view({ toView: () => h.p([], ['Saved']) })
```

`Animation.defaultLeaveCommand` is removed. Handle `StartedLeaveAnimating` by sending `Animation.Animation.Message.RequestedWaitForLeaveSettlement()` to the instance, which waits for the leave transition to settle using the Animation's current id and transition generation. A custom leave policy can race another signal against settlement: take `generation` from `StartedLeaveAnimating` and send `RequestedFinish({ generation })`.

DragAndDrop renders through its own view. `model.dragAndDrop.view({ toView })` passes a `RenderInfo` with `draggable`, `droppable`, and `sortable` attribute builders already bound to the instance, and the parent keeps ownership of the list markup and item order. The public `DragAndDrop.draggable` mapper and its `toParentMessage` adapter are removed. `DragAndDrop.droppable` and `DragAndDrop.sortable` remain available as handler-free attribute builders.

```ts
// Before
DragAndDrop.draggable(
  {
    model: model.dragAndDrop,
    toParentMessage: message => Message.GotDragAndDropMessage({ message }),
    itemId: item.id,
    containerId: column.id,
    index,
  },
  h,
)

// After
model.dragAndDrop.view({
  toView: ({ draggable, droppable }) =>
    h.ul(
      [...droppable('todo', 'To do')],
      Array.map(model.items, (item, index) =>
        h.li(
          [...draggable({ itemId: item.id, containerId: 'todo', index })],
          [item.label],
        ),
      ),
    ),
})
```

Toast is a class built by `Toast.makeBlock(PayloadSchema)`. Show an entry by sending `AppToast.requestShow({ payload })` to the instance, and provide `AppToast.Live`. The Toast Story helper moves from the module-level `Toast.test.drainEntry` to the class: `AppToast.test.drainEntry({ path, entryId })`, where `path` is the Toast instance's path from the Story root, as in `Block.deliver`. It drains a freshly shown, non-sticky entry through enter, auto-dismiss, and exit, and `version` defaults to `0`. Resolve individual Commands after hover, swipe, or manual dismissal has advanced the entry.

```ts
// Before
Toast.test.drainEntry({
  entryId: 'notifications-entry-0',
  waitBeforeDismissal: [WaitBeforeDismissal, completedTimer],
})

// After
Notifications.test.drainEntry({
  path: 'toast',
  entryId: 'notifications-entry-0',
})
```

Command and Mount Definitions used to match pending work in Story and Scene tests live under each component's `test` namespace: Animation, Calendar, Combobox, Dialog, DragAndDrop, HoverIntent, Listbox, Menu, Popover, RadioGroup, Tabs, Tooltip, and VirtualList. Their names carry the component, such as `Menu.test.FocusMenuButton`. Pair the Definition with a result Message from the component's class, and address a Message to a child instance with `Block.deliver`.

```ts
// Before
Command.resolve(Menu.FocusButton, Menu.Message.CompletedFocusButton())

// After
Command.resolve(
  Menu.test.FocusMenuButton,
  ActionMenu.Message.CompletedFocusMenuButton(),
)
```

Stateless render helpers such as Button, Input, Textarea, Select, Fieldset, Checkbox, Switch, Disclosure, and Nav remain direct view functions with no Model or Layer.
