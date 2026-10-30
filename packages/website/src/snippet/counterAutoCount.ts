import { Duration, Effect, Number, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  ClickedToggleAutoCount: {},
  Ticked: {},
})

export class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({
    count: Schema.Number,
    isAutoCounting: Schema.Boolean,
  }),
  Message,
}) {}

const ticks = Stream.tick(Duration.seconds(1)).pipe(
  Stream.drop(1),
  Stream.as(Message.Ticked()),
)

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    return {
      model: { count: 0, isAutoCounting: false },

      update: {
        ClickedToggleAutoCount: model => ({
          model: modifyFields(model, { isAutoCounting: isOn => !isOn }),
        }),
        Ticked: model => ({
          model: modifyFields(model, { count: Number.increment }),
        }),
      },

      subscriptions: {
        gameClockTicks: {
          dependencies: model => model.isAutoCounting,
          stream: (isAutoCounting: boolean) =>
            isAutoCounting ? ticks : Stream.empty,
        },
      },

      view: (model, h) => ({
        title: `Counter: ${model.count}`,
        body: h.main(
          [],
          [
            h.p([], [`Count: ${model.count}`]),
            h.button(
              [h.OnClick(Application.Message.ClickedToggleAutoCount())],
              [model.isAutoCounting ? 'Stop' : 'Start'],
            ),
          ],
        ),
      }),
    }
  }),
)
