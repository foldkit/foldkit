import { Duration, Effect, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const TICK_INTERVAL_MS = 1000

const Model = Schema.Struct({
  count: Schema.Number,
  isAutoCounting: Schema.Boolean,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedIncrement: {},
  ClickedToggleAutoCount: {},
  Ticked: {},
})
type Message = typeof Message.Type

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    return {
      model: { count: 0, isAutoCounting: false },

      update: {
        ClickedIncrement: model => ({
          model: modifyFields(model, { count: count => count + 1 }),
        }),
        ClickedToggleAutoCount: model => ({
          model: modifyFields(model, {
            isAutoCounting: isAutoCounting => !isAutoCounting,
          }),
        }),
        Ticked: model => ({
          model: modifyFields(model, { count: count => count + 1 }),
        }),
      },

      subscriptions: {
        ticks: {
          dependencies: model => model.isAutoCounting,
          stream: (isAutoCounting: boolean) =>
            isAutoCounting
              ? Stream.tick(Duration.millis(TICK_INTERVAL_MS)).pipe(
                  Stream.drop(1),
                  Stream.map(Message.Ticked),
                )
              : Stream.empty,
        },
      },

      view: (model, h) => ({
        title: `Count: ${model.count}`,
        body: h.div(
          [],
          [
            h.p([], [`Count: ${model.count}`]),
            h.button([h.OnClick(Message.ClickedIncrement())], ['Increment']),
            h.button(
              [h.OnClick(Message.ClickedToggleAutoCount())],
              [model.isAutoCounting ? 'Stop' : 'Auto-Count'],
            ),
          ],
        ),
      }),
    }
  }),
)
