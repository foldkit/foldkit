---
'foldkit': minor
---

Replace `OnInsert`, `OnInsertEffect`, and `OnDestroy` with a single `OnMount` attribute backed by the new `Mount` module. The `Mount.define` constructor names a mount-time action and constrains the Messages it can dispatch; the wrapped Effect resolves to `{ message, cleanup }`, and the runtime invokes the cleanup automatically when the element unmounts. Cleanup runs immediately if the Effect resolves after the element has already been removed.

Migration:

```ts
// Before
import { Function } from 'effect'
const { OnInsertEffect, OnDestroy } = html<Message>()

const view = div(
  [
    OnInsertEffect(element => attachWidget(element)),
    OnDestroy(element => detachWidget(element)),
  ],
  [],
)

// After
import { Mount } from 'foldkit'
import type { MountResult } from 'foldkit/html'

const Mounted = Mount.define('Mounted', SucceededMount)
const mounted = Mounted(
  (element): Effect.Effect<MountResult<Message>> =>
    Effect.sync(() => ({
      message: SucceededMount(),
      cleanup: () => detachWidget(element),
    })),
)

const { OnMount } = html<Message>()
const view = div([OnMount(mounted)], [])
```

For setup that has no cleanup, pass `Function.constVoid`. `Mount.mapMessage` lifts a `MountAction` into a parent's Message universe, mirroring `Command.mapEffect` for the Submodel pattern.

`Ui.Popover`, `Ui.Listbox`, `Ui.Menu`, `Ui.Tooltip`, and `Ui.Combobox` now expose new lifecycle Messages (`CompletedAnchorMount`, plus `CompletedFocusItemsOnMount` for Listbox and Menu, and `CompletedAttachPreventBlur` / `CompletedAttachSelectOnFocus` for Combobox) that widen the `onAction` callback's Message union. Consumers that pattern-match `onAction` exhaustively need to handle the new variants; consumers that route through `Foo.update(model, message)` are unaffected. The internal `anchorHooks` helper is now `anchorSetup`, which returns its cleanup directly.
