import { Effect, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  ClickedReadSetting: {},
  CompletedReadSetting: { maybeValue: Schema.Option(Schema.String) },
  FailedReadSetting: { error: Schema.String },
})
const Namespace = Block.makeNamespace('HostEffectProbe')
export const ReadSetting = Namespace.makeCommand('ReadSetting', {
  messages: [Message.CompletedReadSetting, Message.FailedReadSetting],
})
export const ReadSettingLayer = ReadSetting.toLayer(
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore

    return () =>
      store.get('theme').pipe(
        Effect.map(value =>
          Message.CompletedReadSetting({
            maybeValue: Option.fromNullishOr(value),
          }),
        ),
        Effect.catch(error =>
          Effect.succeed(Message.FailedReadSetting({ error: error.message })),
        ),
      )
  }),
)
const Key = Symbol('HostEffectProbe')
export const Definition = Namespace.makeDefinition({
  key: Key,
  Model: Schema.Struct({ maybeValue: Schema.Option(Schema.String) }),
  Message,
  Init: Schema.Tuple([]),
  effects: { services: [KeyValueStore.KeyValueStore] },
})
const Composition = Definition.makeComposition()
const init = Composition.makeInit(() => ({
  model: { maybeValue: Option.none<string>() },
}))
const update = Composition.makeUpdate({
  ClickedReadSetting: Definition.makeCommandsStep(() => [ReadSetting()]),
  CompletedReadSetting: Definition.makeFieldsStep.fromMessage(
    ({ maybeValue }) => ({ maybeValue: () => maybeValue }),
  ),
  FailedReadSetting: Definition.makeNoopStep(),
})
export const Implementation = Definition.makeBlock(
  Effect.succeed({
    children: [],
    init,
    update,
    EffectsLayer: ReadSettingLayer,
  }),
)

const pendingBody = { children: [], init, update, hostHandlers: [ReadSetting] }
const rejectUnboundedPendingHandler = () => {
  // @ts-expect-error Ordinary independent completion cannot hide a pending Command Handler.
  Definition.makeBlock(Effect.succeed(pendingBody))
}
void rejectUnboundedPendingHandler

const selectPendingOrdinaryHandler = () => {
  // @ts-expect-error Ordinary completed descriptors do not expose family host reselection.
  Implementation.provideHandlers(ReadSettingLayer)
}
void selectPendingOrdinaryHandler
