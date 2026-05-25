// `Command.mapMessages` is one line and so are the helpers it stacks
// on: the whole chain is small enough to read top-down.

// Lift every Command in the list through the per-Command helper.
export const mapMessages = (commands, f) =>
  Array.map(commands, command => mapMessage(command, f))

// Per-Command: rebuild the Command with its Effect mapped through `f`.
export const mapMessage = (command, f) => mapEffect(command, Effect.map(f))

// The Effect-level lift. The Command is `{ name, args, effect }`; the
// only piece that changes is `effect`. Everything else (the Command's
// name and args for DevTools traces) is preserved by the spread.
export const mapEffect = (command, f) => ({
  ...command,
  effect: f(command.effect),
})
