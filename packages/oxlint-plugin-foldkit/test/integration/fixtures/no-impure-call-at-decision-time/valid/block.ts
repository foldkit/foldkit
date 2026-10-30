import { Effect, Schema, Stream } from 'effect'
import { Block, Command, Mount } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  ClickedSave: {},
  CompletedSave: { savedAt: Schema.Number },
  CompletedMeasure: { measuredAt: Schema.Number },
  TickedClock: { now: Schema.Number },
})

const Save = Command.define('Save', {
  messages: [Message.CompletedSave],
})

const Measure = Mount.define('Measure', {
  messages: [Message.CompletedMeasure],
})

export class Editor extends Block<Editor>()('Editor', {
  Model: Schema.Struct({ isRunning: Schema.Boolean, lastSavedAt: Schema.Number }),
  Message,
  Command: [Save],
  Mount: [Measure],
}) {}

export const EditorLive = Editor.make(
  Effect.fn(function* () {
    return {
      model: { isRunning: true, lastSavedAt: 0 },
      update: {
        ClickedSave: model => ({ model, commands: [Save()] }),
        CompletedSave: (model, { savedAt }) => ({
          model: { ...model, lastSavedAt: savedAt },
        }),
        CompletedMeasure: model => ({ model }),
        TickedClock: model => ({ model }),
      },
      commands: {
        Save: () =>
          Effect.sync(() => Message.CompletedSave({ savedAt: Date.now() })),
      },
      mounts: {
        Measure: ({ element }) =>
          Effect.sync(() =>
            Message.CompletedMeasure({
              measuredAt: element.isConnected ? performance.now() : Date.now(),
            }),
          ),
      },
      subscriptions: {
        clock: {
          dependencies: model => model.isRunning,
          stream: () => Stream.make(Message.TickedClock({ now: Date.now() })),
        },
      },
      view: (model, h) =>
        h.div([h.OnMount(Measure())], [`${model.lastSavedAt}`]),
    }
  }),
)
