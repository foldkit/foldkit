---
'foldkit': minor
---

`Ui.Switch.update` now returns `[Model, Commands, Option<OutMessage>]` (was `[Model, Commands]`). Adds a new `ToggledChecked({ isChecked: boolean })` OutMessage variant, emitted on every toggle. Same shape as `Ui.Checkbox.ToggledChecked`. Closes the same gap where consumers shortcut around the Submodel wrapper to dispatch a domain Message directly.

Existing 2-tuple destructures keep compiling; TypeScript accepts binding the head of a longer tuple. Consumers wanting to react to the toggle as a domain event pattern-match the third element:

```ts
GotNotificationSwitchMessage: ({ message }) => {
  const [next, commands, maybeOutMessage] = Ui.Switch.update(
    model.notifications,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotNotificationSwitchMessage({ message }),
  )
  return Option.match(maybeOutMessage, {
    onNone: () => [evo(model, { notifications: () => next }), mappedCommands],
    onSome: M.type<Ui.Switch.OutMessage>().pipe(
      M.tagsExhaustive({
        ToggledChecked: ({ isChecked }) => [
          evo(model, { notifications: () => next }),
          [
            ...mappedCommands,
            PersistNotificationsEnabled({ value: isChecked }),
          ],
        ],
      }),
    ),
  })
}
```
