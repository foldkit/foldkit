import { Match as M } from 'effect'
import { Command } from 'foldkit'

// UPDATE

// Returns a tuple of [nextModel, commands].
// commands are side effects like HTTP requests (none needed here)
const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      ClickedDecrement: () => [{ count: model.count - 1 }, []],
      ClickedIncrement: () => [{ count: model.count + 1 }, []],
      ClickedReset: () => [{ count: 0 }, []],
    }),
  )
