import { Duration, Effect, Schema, Stream } from 'effect'
import { defineApplication } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  ClickedIncrement: {},
  ToggledAutoCounting: {},
  Ticked: {},
})
type Message = typeof Message.Type

const Model = Schema.Struct({
  count: Schema.Number,
  isAutoCounting: Schema.Boolean,
})
type Model = typeof Model.Type

export const Application = defineApplication({ Model, Message })

export const ApplicationComposition = Application.makeComposition()

export const subscriptions = Application.subscriptions(entry => ({
  gameClockTicks: entry(
    'GameClockTicks',
    { isAutoCounting: Schema.Boolean },
    {
      messages: [Message.Ticked],
      modelToDependencies: model => ({
        isAutoCounting: model.isAutoCounting,
      }),
      handler: function* () {
        return ({ isAutoCounting }) =>
          Stream.when(
            Stream.tick(Duration.seconds(1)).pipe(
              Stream.drop(1),
              Stream.map(Message.Ticked),
            ),
            Effect.sync(() => isAutoCounting),
          )
      },
    },
  ),
}))

export const EffectsLayer = subscriptions.gameClockTicks.layer
