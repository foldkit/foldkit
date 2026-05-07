import { Effect, Match as M } from 'effect'
import { Command } from 'foldkit'
import { m } from 'foldkit/message'

const ClickedResetAfterDelay = m('ClickedResetAfterDelay')
const CompletedDelayReset = m('CompletedDelayReset')

const DelayReset = Command.define(
  // The identifier for the Command, surfaces in DevTools and Story/Scene tests
  'DelayReset',
  // The returned Message (can be more than one)
  CompletedDelayReset,
)(
  // The Effect
  Effect.sleep('1 second').pipe(Effect.as(CompletedDelayReset())),
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
      ClickedResetAfterDelay: () => [model, [DelayReset()]],
      CompletedDelayReset: () => [{ count: 0 }, []],
    }),
  )
