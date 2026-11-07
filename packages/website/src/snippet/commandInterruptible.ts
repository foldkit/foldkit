// application.ts
import { Effect, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedResetAfterDelay: {},
  ClickedCancelReset: {},
  CompletedWaitBeforeReset: {},
  CompletedCancelWaitBeforeReset: {
    outcome: Command.Interruptible.Outcome,
  },
})
export type Message = typeof Message.Type

export const ApplicationKey = Symbol('Application')
const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
})

const {
  makeFieldsStep,
  makeCommandsStep,
  makeNoopStep,
  makeComposition,
  makeCommand,
} = ApplicationBlock

const ApplicationComposition = makeComposition()

export const WaitBeforeReset = makeCommand('WaitBeforeReset', {
  messages: [Message.CompletedWaitBeforeReset],
  interrupt: true,
  handler: function* () {
    return () =>
      Effect.sleep('1 second').pipe(
        Effect.as(Message.CompletedWaitBeforeReset()),
      )
  },
})

export const EffectsLayer = WaitBeforeReset.layer

const update = ApplicationComposition.makeUpdate({
  ClickedResetAfterDelay: makeCommandsStep(() => [WaitBeforeReset()]),
  ClickedCancelReset: makeCommandsStep(() => [
    WaitBeforeReset.Interrupt(outcome =>
      Message.CompletedCancelWaitBeforeReset({ outcome }),
    ),
  ]),
  CompletedWaitBeforeReset: makeFieldsStep(() => ({
    count: () => 0,
  })),
  CompletedCancelWaitBeforeReset: makeNoopStep(),
})
