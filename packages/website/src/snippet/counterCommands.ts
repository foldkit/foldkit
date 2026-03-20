import { Effect, Match as M } from 'effect'
import { Command, Task } from 'foldkit'
import { m } from 'foldkit/message'

const ClickedResetAfterDelay = m('ClickedResetAfterDelay')
const DelayedReset = m('DelayedReset')

const DelayReset = Command.define('DelayReset')
const delayReset = DelayReset(
  Task.delay('1 second').pipe(Effect.as(DelayedReset())),
)

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command.Command<Message>>]>(),
    M.tagsExhaustive({
      ClickedResetAfterDelay: () => [model, [delayReset]],
      DelayedReset: () => [Model({ count: 0 }), []],
    }),
  )
