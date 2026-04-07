import { Effect, Match as M } from 'effect'
import { Command, Task } from 'foldkit'
import { m } from 'foldkit/message'

const ClickedResetAfterDelay = m('ClickedResetAfterDelay')
const CompletedDelayReset = m('CompletedDelayReset')

const DelayReset = Command.define('DelayReset', CompletedDelayReset)
const delayReset = DelayReset(
  Task.delay('1 second').pipe(Effect.as(CompletedDelayReset())),
)

const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      ClickedResetAfterDelay: () => [model, [delayReset]],
      CompletedDelayReset: () => [Model({ count: 0 }), []],
    }),
  )
