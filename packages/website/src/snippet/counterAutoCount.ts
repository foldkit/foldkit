import { Duration, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
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

export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
})

const { makeComposition, makeSubscriptions } = ApplicationBlock

export const ApplicationComposition = makeComposition()

export const subscriptions = makeSubscriptions(entry => ({
  gameClockTicks: entry('GameClockTicks', {
    messages: [Message.Ticked],
    when: model => model.isAutoCounting,
    handler: function* () {
      return () =>
        Stream.tick(Duration.seconds(1)).pipe(
          Stream.drop(1),
          Stream.map(Message.Ticked),
        )
    },
  }),
}))
