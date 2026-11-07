import { Schema } from 'effect'
import { Block, Dom } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  ChangedReducedMotion: { isReducedMotion: Schema.Boolean },
})
type Message = typeof Message.Type

const Model = Schema.Struct({
  isReducedMotion: Schema.Boolean,
})
type Model = typeof Model.Type

export const MotionPreferencesKey = Symbol('MotionPreferences')
const MotionPreferencesBlock = Block.make('MotionPreferences', {
  key: MotionPreferencesKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
})

const { makeSubscriptions } = MotionPreferencesBlock

const subscriptions = makeSubscriptions(entry => ({
  reducedMotionChanges: entry('ReducedMotionChanges', {
    messages: [Message.ChangedReducedMotion],
    handler: function* () {
      return () =>
        Dom.streamFromMediaQuery({
          query: '(prefers-reduced-motion: reduce)',
          mapMatches: isMatching =>
            Message.ChangedReducedMotion({ isReducedMotion: isMatching }),
        })
    },
  }),
}))
