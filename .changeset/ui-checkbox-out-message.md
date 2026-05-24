---
'foldkit': minor
---

`Ui.Checkbox.update` now returns `[Model, Commands, Option<OutMessage>]` (was `[Model, Commands]`). Adds a new `ToggledChecked({ isChecked: boolean })` OutMessage variant, emitted on every toggle. Closes a gap that pushed consumers to shortcut the Submodel boundary: wrapping `Ui.Checkbox.Message` as a domain Message directly in `toParentMessage` instead of the conventional `GotCheckboxMessage` wrapper, which bypassed `Ui.Checkbox.update` and left `model.checkbox.isChecked` stale.

Existing 2-tuple destructures (`const [next, commands] = Ui.Checkbox.update(...)`) keep compiling; TypeScript accepts binding the head of a longer tuple. Consumers wanting to react to the toggle as a domain event now pattern-match the third element:

```ts
GotAdminCheckboxMessage: ({ message }) => {
  const [next, commands, maybeOut] = Ui.Checkbox.update(model.admin, message)
  const mappedCommands = Command.mapMessages(commands, message =>
    GotAdminCheckboxMessage({ message }),
  )
  return Option.match(maybeOut, {
    onNone: () => [evo(model, { admin: () => next }), mappedCommands],
    onSome: M.type<Ui.Checkbox.OutMessage>().pipe(
      M.tagsExhaustive({
        ToggledChecked: ({ isChecked }) => [
          evo(model, { admin: () => next }),
          [...mappedCommands, PersistAdminFlag({ value: isChecked })],
        ],
      }),
    ),
  })
}
```
