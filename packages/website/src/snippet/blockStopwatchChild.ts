import { Boolean, Duration, Number, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export class Stopwatch extends Block<Stopwatch, Readonly<{ label: string }>>()(
  'Stopwatch',
  {
    Model: Schema.Struct({
      label: Schema.String,
      elapsedSeconds: Schema.Number,
      isRunning: Schema.Boolean,
    }),
    Message: defineMessageUnion({ ClickedToggle: {}, TickedSecond: {} }),
  },
) {}

export const StopwatchLive = Stopwatch.toLayer(() => ({
  init: ({ label }) => ({ label, elapsedSeconds: 0, isRunning: true }),

  update: {
    ClickedToggle: model => ({
      model: modifyFields(model, { isRunning: Boolean.not }),
    }),
    TickedSecond: model => ({
      model: modifyFields(model, { elapsedSeconds: Number.increment }),
    }),
  },

  subscriptions: {
    ticks: {
      dependencies: model => model.isRunning,
      stream: (isRunning: boolean) =>
        isRunning
          ? Stream.tick(Duration.seconds(1)).pipe(
              Stream.drop(1),
              Stream.as(Stopwatch.Message.TickedSecond()),
            )
          : Stream.empty,
    },
  },

  view: (model, h) =>
    h.div(
      [],
      [
        h.span([], [`${model.label}: ${model.elapsedSeconds}s`]),
        h.button(
          [h.OnClick(Stopwatch.Message.ClickedToggle())],
          [model.isRunning ? 'Pause' : 'Resume'],
        ),
      ],
    ),
}))
