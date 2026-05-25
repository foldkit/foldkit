---
'foldkit': minor
---

`Ui.Tooltip.update` now returns `[Model, Commands, Option<OutMessage>]` (was `[Model, Commands]`). Adds two OutMessage variants:

- `Shown()`: emitted once the tooltip transitions to visible (`isOpen` becomes true).
- `Hidden()`: emitted once the tooltip transitions to hidden (`isOpen` becomes false).

Only fires on actual visibility transitions, not on internal state changes (hover, focus, delay updates), so consumers don't get spurious events. Useful for analytics, instrumentation, or coordinating with other transient UI.

`Ui.Tooltip.setShowDelay` returns the same 3-tuple. Existing 2-tuple destructures keep compiling; TypeScript accepts binding the head of a longer tuple. Consumers wanting to react to visibility transitions as a domain event pattern-match the third element:

```ts
GotHelpTooltipMessage: ({ message }) => {
  const [next, commands, maybeOutMessage] = Ui.Tooltip.update(
    model.helpTooltip,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotHelpTooltipMessage({ message }),
  )
  return Option.match(maybeOutMessage, {
    onNone: () => [evo(model, { helpTooltip: () => next }), mappedCommands],
    onSome: M.type<Ui.Tooltip.OutMessage>().pipe(
      M.tagsExhaustive({
        Shown: () => [
          evo(model, { helpTooltip: () => next }),
          [...mappedCommands, TrackTooltipShown({ id: 'help' })],
        ],
        Hidden: () => [evo(model, { helpTooltip: () => next }), mappedCommands],
      }),
    ),
  })
}
```
