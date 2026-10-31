import { Effect, Schema, Stream } from 'effect'
import { Block, Dom } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const DEGREES_PER_SECOND = 90
const MILLISECONDS_PER_SECOND = 1000

const Message = defineMessageUnion({
  TickedFrame: { deltaTime: Schema.Number },
  ClickedTogglePlay: {},
})

export class Spinner extends Block<Spinner>()('Spinner', {
  Model: Schema.Struct({ isPlaying: Schema.Boolean, angle: Schema.Number }),
  Message,
}) {}

const frameTicks = Dom.animationFrameTicks.pipe(
  Stream.map(deltaTime => Message.TickedFrame({ deltaTime })),
)

export const SpinnerLive = Spinner.make(
  Effect.fn(function* () {
    return {
      model: { isPlaying: false, angle: 0 },

      update: {
        TickedFrame: (model, { deltaTime }) => ({
          model: modifyFields(model, {
            angle: angle =>
              angle +
              (DEGREES_PER_SECOND * deltaTime) / MILLISECONDS_PER_SECOND,
          }),
        }),
        ClickedTogglePlay: model => ({
          model: modifyFields(model, { isPlaying: isPlaying => !isPlaying }),
        }),
      },

      subscriptions: {
        animationFrameTicks: {
          dependencies: model => model.isPlaying,
          stream: (isPlaying: boolean) =>
            isPlaying ? frameTicks : Stream.empty,
        },
      },
    }
  }),
)
