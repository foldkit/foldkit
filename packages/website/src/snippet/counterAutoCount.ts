import { Duration, Effect, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  ClickedIncrement: {},
  ToggledAutoCounting: {},
  Ticked: {},
})

const Model = Schema.Struct({
  count: Schema.Number,
  isAutoCounting: Schema.Boolean,
})

export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

export const ApplicationComposition = ApplicationDefinition.makeComposition()

export const subscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
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
