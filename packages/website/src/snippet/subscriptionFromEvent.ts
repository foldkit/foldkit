import { Effect, Schema, Stream } from 'effect'
import { Block, Dom } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  PressedKey: { key: Schema.String },
})

const keyPresses = Dom.streamFromEvent({
  target: window,
  type: 'keydown',
  mapEvent: event => Message.PressedKey({ key: event.key }),
})

export class Shortcuts extends Block<Shortcuts>()('Shortcuts', {
  Model: Schema.Struct({ isListening: Schema.Boolean }),
  Message,
}) {}

export const ShortcutsLive = Shortcuts.make(
  Effect.fn(function* () {
    return {
      model: { isListening: true },

      update: {
        PressedKey: model => ({ model }),
      },

      subscriptions: {
        shortcutKeyPresses: {
          dependencies: model => model.isListening,
          stream: (isListening: boolean) =>
            isListening ? keyPresses : Stream.empty,
        },
      },
    }
  }),
)
