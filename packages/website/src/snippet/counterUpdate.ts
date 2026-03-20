import { Match as M } from 'effect'
import { Command } from 'foldkit'

// UPDATE

// Returns a tuple of [nextModel, commands] —
// commands are side effects like HTTP requests (none needed here)
const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command.Command<Message>>]>(),
    M.tagsExhaustive({
      ClickedDecrement: () => [Model({ count: model.count - 1 }), []],
      ClickedIncrement: () => [Model({ count: model.count + 1 }), []],
      ClickedReset: () => [Model({ count: 0 }), []],
    }),
  )
