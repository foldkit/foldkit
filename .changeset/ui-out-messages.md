---
'foldkit': minor
---

Ui.\* components that previously routed child events through ViewConfig callback props (`onSelectedItem`, `onSelected`, `onSelectedDate`, `onToggled`, `onOpened`, `onClosed`) now expose `OutMessage`. Each migrated component's `update` returns `[Model, Commands, Option<OutMessage>]`; the parent pattern-matches the third tuple element to lift child events to domain Messages.

The shift is paired with the new `h.submodel` embedding primitive: Ui.\* components are no longer called as `Ui.X.view({ ... })` with config callbacks. Consumers embed them via `h.submodel({ view: Ui.X.view, ... })` and handle OutMessages in the parent's update.

### Migration

Before:

```ts
// In view:
Ui.Menu.view<ExampleSlug>({
  model: model.menu,
  toParentMessage: message => GotMenuMessage({ message }),
  onSelectedItem: index => SelectedExample({ slug: slugs[index] }),
  // ... other ViewConfig fields
})

// In update:
GotMenuMessage: ({ message }) => {
  const [nextMenu, commands] = Ui.Menu.update(model.menu, message)
  return [
    evo(model, { menu: () => nextMenu }),
    commands.map(
      Command.mapEffect(Effect.map(message => GotMenuMessage({ message }))),
    ),
  ]
}
```

After:

```ts
// At module scope:
const ExampleMenu = Ui.Menu.create<ExampleSlug>()

// In view:
h.submodel({
  id: 'menu',
  model: model.menu,
  view: ExampleMenu.view,
  toParentMessage: message => GotMenuMessage({ message }),
})

// In update:
GotMenuMessage: ({ message }) => {
  const [nextMenu, commands, maybeOut] = ExampleMenu.update(model.menu, message)
  const mappedCommands = Command.mapMessages(commands, message =>
    GotMenuMessage({ message }),
  )
  return Option.match(maybeOut, {
    onNone: () => [
      evo(model, { menu: () => nextMenu }),
      mappedCommands,
      Option.none(),
    ],
    onSome: M.type<Ui.Menu.OutMessage<ExampleSlug>>().pipe(
      M.tagsExhaustive({
        Selected: ({ value }) => [
          evo(model, { menu: () => nextMenu }),
          [...mappedCommands, Navigation.go(ExampleRoute(value))],
          Option.none(),
        ],
      }),
    ),
  })
}
```

### OutMessage variants per component

- **`Ui.Menu.Selected({ value: Item, index: number })`**: replaces `onSelectedItem(index)`. Carries both the picked value (typed as `Item` via `Ui.Menu.create<Item>()`) and its index. The menu closes itself; consumers do not need to dispatch `Ui.Menu.close`.
- **`Ui.Disclosure.ToggledOpenState({ isOpen: boolean })`**: replaces `onToggled()`. Fires on each toggle.
- **`Ui.Listbox.Selected({ value: string, wasAdded: boolean })`**: replaces `onSelectedItem(value)`. Single-select always emits `wasAdded: true`; multi-select emits `wasAdded: false` when toggling off.
- **`Ui.Combobox.Selected({ value: string, wasAdded: boolean })`**: replaces `onSelectedItem(value)`. Same semantics as Listbox.
- **`Ui.RadioGroup.Selected({ value: string, index: number })`**: replaces `onSelected(value, index)`. Programmatic `RadioGroup.select` carries the same signal.
- **`Ui.Tabs.Selected({ value: Value, index: number })`**: new. Carries both the tab's value (typed via `Ui.Tabs.create<Value>()`) and its index. `Tabs.update` now returns a 3-tuple to match the rest of the family. The internal `TabSelected` Message also carries `value` so the OutMessage is populated from every dispatch site; `Tabs.selectTab` becomes `(model, value, index)`.
- **`Ui.Calendar.SelectedDate({ date })`**: replaces `onSelectedDate(date)`. `Calendar.commitSelection` always emits `SelectedDate`. The pre-existing `Ui.Calendar.ChangedViewMonth` OutMessage remains.
- **`Ui.DatePicker.SelectedDateOut({ date })`**: replaces `onSelectedDate(date)`. The pre-existing `Ui.DatePicker.ChangedViewMonth` OutMessage remains. DatePicker's internal `delegateToCalendar`/`delegateToPopover` helpers now handle Calendar and Popover OutMessages directly: on `Calendar.SelectedDate` it closes the popover and propagates `SelectedDateOut`; on `Popover.OpenedPanel`/`ClosedPanel` it drops the calendar back to the Days view. The programmatic helpers `DatePicker.open`, `close`, `selectDate`, and `clear` now return the full `[Model, Commands, Option<OutMessage>]` tuple (previously they discarded the third element), so a programmatic `selectDate` emits the same `SelectedDateOut` a user-initiated selection would.
- **`Ui.Popover.OpenedPanel()` / `Ui.Popover.ClosedPanel()`**: replace `onOpened()` and `onClosed()`. Tag names are distinct from the internal `Opened`/`Closed` Messages (the requests to open/close). The OutMessage fires once `update` has processed the request and `isOpen` reflects the new state. Programmatic `Popover.close` on an already-closed model is a no-op that does not re-emit.

### When the parent has no reaction

If the parent has no reaction to the child's OutMessage, drop the `Option.match` entirely. Destructure only the first two tuple elements and return `Option.none()` for your own OutMessage:

```ts
GotProficiencyMessage: ({ message }) => {
  const [next, commands] = Ui.RadioGroup.update(model.proficiency, message)
  return [
    evo(model, { proficiency: () => next }),
    Command.mapMessages(commands, message =>
      GotProficiencyMessage({ message }),
    ),
    Option.none(),
  ]
}
```

The `Option.match` only earns its weight when `onSome` does work `onNone` doesn't (lifting to a richer parent type, dispatching additional commands, mutating sibling state).

### Public exports

`OutMessage` types and their variant tag constructors are exposed from each migrated primitive's public module:

- `Ui.Menu.OutMessage`, `Ui.Menu.Selected`
- `Ui.Disclosure.OutMessage`, `Ui.Disclosure.ToggledOpenState`
- `Ui.Listbox.OutMessage`, `Ui.Listbox.Selected`
- `Ui.Combobox.OutMessage`, `Ui.Combobox.Selected`
- `Ui.RadioGroup.OutMessage`, `Ui.RadioGroup.Selected`
- `Ui.Tabs.OutMessage`, `Ui.Tabs.Selected`
- `Ui.Calendar.OutMessage`, `Ui.Calendar.SelectedDate`, `Ui.Calendar.ChangedViewMonth`
- `Ui.DatePicker.OutMessage`, `Ui.DatePicker.SelectedDateOut`, `Ui.DatePicker.ChangedViewMonth`
- `Ui.Popover.OutMessage`, `Ui.Popover.OpenedPanel`, `Ui.Popover.ClosedPanel`
