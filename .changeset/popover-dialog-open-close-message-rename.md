---
'foldkit': minor
---

Rename `Ui.Popover` and `Ui.Dialog` internal `Opened`/`Closed` Messages to `RequestedOpen`/`RequestedClose`. The new names are more honest. They're requests to open or close, not the events themselves. The actual events the parent observes are the `Opened` and `Closed` OutMessage variants described in the broader OutMessage migration.

### Migration

#### `Ui.Popover`

```ts
// Before
h.OnClick(toPopoverMessage(Ui.Popover.Opened()))
h.OnClick(toPopoverMessage(Ui.Popover.Closed()))

const [next, commands] = Ui.Popover.update(model.popover, Ui.Popover.Closed())

// After
h.OnClick(toPopoverMessage(Ui.Popover.RequestedOpen()))
h.OnClick(toPopoverMessage(Ui.Popover.RequestedClose()))

const [next, commands] = Ui.Popover.update(
  model.popover,
  Ui.Popover.RequestedClose(),
)
```

#### `Ui.Dialog`

```ts
// Before
h.OnClick(toDialogMessage(Ui.Dialog.Opened()))
h.OnClick(toDialogMessage(Ui.Dialog.Closed()))

const [next, commands] = Ui.Dialog.update(model.dialog, Ui.Dialog.Closed())

// After
h.OnClick(toDialogMessage(Ui.Dialog.RequestedOpen()))
h.OnClick(toDialogMessage(Ui.Dialog.RequestedClose()))

const [next, commands] = Ui.Dialog.update(
  model.dialog,
  Ui.Dialog.RequestedClose(),
)
```
