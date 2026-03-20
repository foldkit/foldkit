import { Effect, Match as M } from 'effect'
import { Command, Task } from 'foldkit'
import { m } from 'foldkit/message'

const ClickedResetAfterDelay = m('ClickedResetAfterDelay')
const DelayedReset = m('DelayedReset')

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command.Command<Message>>]>(),
    M.tagsExhaustive({
      ClickedResetAfterDelay: () => [
        model,
        [
          Task.delay('1 second').pipe(
            Effect.as(DelayedReset()),
            Command.make('DelayReset'),
          ),
        ],
      ],
      DelayedReset: () => [Model({ count: 0 }), []],
    }),
  )
