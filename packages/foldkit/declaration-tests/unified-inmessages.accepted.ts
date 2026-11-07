import { Context, Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { Command, inMessage, init, story, withBlock } from 'foldkit/story'
import * as Update from 'foldkit/update'

export const Model = Schema.Struct({ count: Schema.Number })
export type Model = typeof Model.Type
export const Message = defineMessageUnion({
  CompletedSave: { value: Schema.Number },
})
export type Message = typeof Message.Type
export const InMessage = defineInMessageUnion({
  RequestedSet: { value: Schema.Number },
  RequestedSave: { value: Schema.Number },
})
export type InMessage = typeof InMessage.Type
export class Store extends Context.Service<
  Store,
  Readonly<{ save: (value: number) => Effect.Effect<void> }>
>()('UnifiedInputs/Store') {}

export const CounterKey = Symbol('UnifiedInputTests')
export const CounterBlock = Block.make('UnifiedInputTests', {
  key: CounterKey,
  Model,
  Message,
  InMessage,
  InitArgs: Schema.Tuple([]),
  Context: Schema.Tuple([Schema.String]),
  InMessageContext: Schema.Tuple([Schema.Number]),
  effects: { services: [Store] },
})
const composition = CounterBlock.makeComposition()
export const Save = CounterBlock.makeCommand('Save', {
  args: { value: Schema.Number },
  messages: [Message.CompletedSave],
  handler: function* () {
    const store = yield* Store

    return ({ value }) =>
      Effect.as(store.save(value), Message.CompletedSave({ value }))
  },
})
const update = composition.makeUpdate.withContext((_label: string) => ({
  CompletedSave: CounterBlock.makeFieldsStep.fromMessage(({ value }) => ({
    count: () => value,
  })),
}))
const inMessageUpdate = composition.makeInMessageUpdate.withContext(
  (offset: number) => ({
    RequestedSet: CounterBlock.makeFieldsStep.fromMessage(({ value }) => ({
      count: () => value + offset,
    })),
    RequestedSave: CounterBlock.makeCommandsStep.fromMessage(({ value }) => [
      Save({ value: value + offset }),
    ]),
  }),
)
export const layer = CounterBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: composition.makeInit(() => ({ model: Model.make({ count: 0 }) })),
    update,
    inMessageUpdate,
    EffectsLayer: Save.layer,
  }),
)
export const subject = { block: CounterBlock, layer }
export const scenario = () =>
  story(
    { ...subject, updateContext: ['local'], inMessageContext: [2] },
    init(),
    inMessage(InMessage.RequestedSet({ value: 1 })),
    inMessage(InMessage.RequestedSave({ value: 3 })),
    Command.resolve(Save, Message.CompletedSave({ value: 5 })),
  )
export const acquiredInput = withBlock(
  subject,
  executable =>
    executable.inMessageUpdate(
      Model.make({ count: 0 }),
      InMessage.RequestedSet({ value: 1 }),
      2,
    ).model,
)

export const acquiredCurriedContext = withBlock(subject, executable => {
  const applyCompletedSave = (model: Model) =>
    executable.update(Message.CompletedSave({ value: 2 }))(model, 'local')
  const incrementCount = CounterBlock.makeFieldsStep(() => ({
    count: count => count + 1,
  }))

  return Update.combineSteps(executable.init().model, [
    applyCompletedSave,
    incrementCount,
  ])
})
