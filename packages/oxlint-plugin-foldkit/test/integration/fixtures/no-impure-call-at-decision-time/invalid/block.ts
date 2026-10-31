import { Effect, Schema, Stream } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  ClickedSave: {},
  CompletedSave: {},
  TickedClock: { now: Schema.Number },
})

const Save = Command.define('Save', {
  args: { savedAt: Schema.Number },
  messages: [Message.CompletedSave],
})

export class Editor extends Block<Editor>()('Editor', {
  Model: Schema.Struct({ isRunning: Schema.Boolean, lastSavedAt: Schema.Number }),
  Message,
  Command: [Save],
}) {}

export const EditorLive = Editor.make(
  Effect.fn(function* () {
    return {
      model: { isRunning: true, lastSavedAt: 0 },
      update: {
        ClickedSave: model => ({
          model: { ...model, lastSavedAt: Date.now() },
          commands: [Save({ savedAt: Date.now() })],
        }),
        CompletedSave: model => ({ model }),
        TickedClock: model => ({ model }),
      },
      commands: {
        Save: () => Effect.succeed(Message.CompletedSave()),
      },
      subscriptions: {
        clock: {
          dependencies: model => (model.isRunning ? Math.random() : 0),
          stream: () => Stream.make(Message.TickedClock({ now: Date.now() })),
        },
      },
      view: (model, h) => h.div([], [`${model.lastSavedAt}-${Date.now()}`]),
    }
  }),
)
