import { Boolean, Duration, Effect, Number, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  ClickedToggle: {},
  Ticked: {},
})

export class Stopwatch extends Block<Stopwatch>()('Stopwatch', {
  Model: Schema.Struct({ seconds: Schema.Number, isRunning: Schema.Boolean }),
  Message,
}) {}

export const StopwatchLive = Stopwatch.make(
  Effect.fn(function* () {
    return {
      model: { seconds: 0, isRunning: false },

      update: {
        ClickedToggle: model => ({
          model: modifyFields(model, { isRunning: Boolean.not }),
        }),
        Ticked: model => ({
          model: modifyFields(model, { seconds: Number.increment }),
        }),
      },

      // Foldkit restarts the Stream whenever `dependencies` changes.
      subscriptions: {
        ticks: {
          dependencies: model => model.isRunning,
          stream: (isRunning: boolean) =>
            isRunning
              ? Stream.tick(Duration.seconds(1)).pipe(
                  Stream.drop(1),
                  Stream.as(Message.Ticked()),
                )
              : Stream.empty,
        },
      },

      view: (model, h) =>
        h.button([h.OnClick(Message.ClickedToggle())], [`${model.seconds}s`]),
    }
  }),
)
