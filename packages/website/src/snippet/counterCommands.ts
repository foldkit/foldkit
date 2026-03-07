import { Effect, Match as M } from 'effect'
import { Task } from 'foldkit'
import { Command } from 'foldkit/command'
import { m } from 'foldkit/message'

const ClickedResetAfterDelay = m('ClickedResetAfterDelay')
const ElapsedResetDelay = m('ElapsedResetDelay')

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      ClickedResetAfterDelay: () => [
        model,
        [Task.delay('1 second').pipe(Effect.as(ElapsedResetDelay()))],
      ],
      ElapsedResetDelay: () => [Model({ count: 0 }), []],
    }),
  )
