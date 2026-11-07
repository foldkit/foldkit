import { Schema, Stream } from 'effect'
import { Block, Dom } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  TickedFrame: { deltaTime: Schema.Number },
  ClickedTogglePlay: {},
})
type Message = typeof Message.Type

const Model = Schema.Struct({
  isPlaying: Schema.Boolean,
  angle: Schema.Number,
})
type Model = typeof Model.Type

export const SpinnerKey = Symbol('Spinner')
const SpinnerBlock = Block.make('Spinner', {
  key: SpinnerKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
})

const { makeSubscriptions } = SpinnerBlock

const subscriptions = makeSubscriptions(entry => ({
  animationFrameTicks: entry(
    'AnimationFrameTicks',
    { isActive: Schema.Boolean },
    {
      messages: [Message.TickedFrame],
      modelToDependencies: model => ({ isActive: model.isPlaying }),
      handler: function* () {
        return ({ isActive }) =>
          isActive
            ? Dom.animationFrameTicks.pipe(
                Stream.map(deltaTime => Message.TickedFrame({ deltaTime })),
              )
            : Stream.empty
      },
    },
  ),
}))
