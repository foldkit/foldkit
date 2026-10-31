import { Duration, Effect, Number, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Message = defineMessageUnion({
  ClickedStart: {},
  ClickedStop: {},
  Ticked: {},
})

export class Timer extends Block<Timer>()('Timer', {
  Model: Schema.Struct({
    isRunning: Schema.Boolean,
    elapsedSeconds: Schema.Number,
  }),
  Message,
}) {}

export const TimerLive = Timer.make(
  Effect.fn(function* () {
    return {
      model: { isRunning: false, elapsedSeconds: 0 },

      update: {
        ClickedStart: model => ({
          model: modifyFields(model, { isRunning: () => true }),
        }),
        ClickedStop: model => ({
          model: modifyFields(model, { isRunning: () => false }),
        }),
        Ticked: model => ({
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
                  Stream.as(Message.Ticked()),
                )
              : Stream.empty,
        },
      },

      view: (model, h) =>
        h.div(
          [],
          [
            h.p([h.Role('timer')], [`${model.elapsedSeconds}s`]),
            model.isRunning
              ? h.button([h.OnClick(Message.ClickedStop())], ['Stop'])
              : h.button([h.OnClick(Message.ClickedStart())], ['Start']),
          ],
        ),
    }
  }),
)
