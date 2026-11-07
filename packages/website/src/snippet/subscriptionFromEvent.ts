import { Effect, Schema, Stream } from 'effect'
import { Block, Dom } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  PressedKey: { key: Schema.String },
})
type Message = typeof Message.Type

const Model = Schema.Struct({
  isListening: Schema.Boolean,
})
type Model = typeof Model.Type

export const ShortcutsKey = Symbol('Shortcuts')
const ShortcutsBlock = Block.make('Shortcuts', {
  key: ShortcutsKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
})

const { makeSubscriptions } = ShortcutsBlock

const subscriptions = makeSubscriptions(entry => ({
  shortcutKeyPresses: entry(
    'ShortcutKeyPresses',
    { isListening: Schema.Boolean },
    {
      messages: [Message.PressedKey],
      modelToDependencies: model => ({ isListening: model.isListening }),
      handler: function* () {
        return ({ isListening }) =>
          Stream.when(
            Dom.streamFromEvent({
              target: window,
              type: 'keydown',
              mapEvent: event => Message.PressedKey({ key: event.key }),
            }),
            Effect.sync(() => isListening),
          )
      },
    },
  ),
}))
