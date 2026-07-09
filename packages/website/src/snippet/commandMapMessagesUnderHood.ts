// `Command.mapMessages` is one line, and so is the per-Command helper it
// stacks on: the whole thing is small enough to read top-down.

// Lift every Command in the list through the per-Command helper.
export const mapMessages = (commands, f) =>
  Array.map(commands, command => mapMessage(command, f))

// Per-Command: map the Effect's result through `f`, which is what dispatches
// in production, and also record `f` on the Command. The recorded chain is
// metadata the runtime never reads; a Story or Scene test folds it to replay
// the parent's wrapping when it resolves the Command, so the test passes the
// child's raw result Message. The name and args (which DevTools traces read)
// ride through the spread untouched.
export const mapMessage = (command, f) => ({
  ...command,
  effect: Effect.map(command.effect, f),
  messageMappers: [...command.messageMappers, f],
})
