---
'foldkit': minor
---

Rename several `Ui.*` Messages to follow the verb-first past-tense convention, remove two dead Messages, and align one public helper with the `reflect*` convention. Most of the Message renames are internal lifecycle Messages each component's own `update` handles, so consumers who embed components through `h.submodel` and delegate via a `Got*Message` are unaffected. The `Ui.FileDrop` and `Ui.Tooltip` changes below are consumer-facing: a renamed OutMessage variant and a renamed public helper, respectively. Only code that imports or references these specific Message constructors, OutMessage variants, helpers, or types needs updating.

- `Ui.Tabs`: `TabSelected` becomes `SelectedTab`, `TabFocused` becomes `FocusedTab`.
- `Ui.Combobox`, `Ui.Listbox`, `Ui.Menu`, `Ui.Popover`: `CompletedSetupInert` becomes `CompletedInertOthers` and `CompletedTeardownInert` becomes `CompletedRestoreInert`, so each acknowledgement mirrors its `InertOthers` / `RestoreInert` Command.
- `Ui.DragAndDrop`: `CompletedAutoScroll` becomes `AdvancedAutoScrollFrame`, since it is a recurring animation-frame tick rather than a Command acknowledgement.
- `Ui.Menu`: the unused `CompletedAdvanceFocus` Message is removed.
- `Ui.FileDrop`: the `DroppedWithoutFiles` Message becomes `DroppedNonFiles`, and the OutMessage it previously reused is now a distinct `RejectedNonFiles`. This is consumer-facing: a parent that pattern-matches the `DroppedWithoutFiles` arm of the FileDrop OutMessage renames that arm to `RejectedNonFiles`.
- `Ui.Tooltip`: the `setShowDelay` helper becomes `reflectShowDelay`, a silent `reflect*` setter returning `Model` (it conforms the tooltip to an externally-sourced config value and emits nothing). Its internal `ChangedShowDelay` Message is removed.

### Migration

```ts
// Before
Ui.Tabs.TabSelected({ index, value })
Ui.Tabs.TabFocused({ index })

// After
Ui.Tabs.SelectedTab({ index, value })
Ui.Tabs.FocusedTab({ index })
```

For `Ui.FileDrop`, rename the OutMessage match arm in your `Got*Message` handler:

```ts
// Before                  // After
ReceivedFiles: ...         ReceivedFiles: ...
DroppedWithoutFiles: ...   RejectedNonFiles: ...
```

For `Ui.Tooltip`, `setShowDelay(model, delay)` becomes `reflectShowDelay(model, delay)` and returns `Model` directly (no command tuple).
