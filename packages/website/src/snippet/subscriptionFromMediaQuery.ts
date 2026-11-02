import { Function, Schema } from 'effect'
import { Block, Dom } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  ChangedReducedMotion: { isReducedMotion: Schema.Boolean },
})

export class MotionPreferences extends Block<MotionPreferences>()(
  'MotionPreferences',
  {
    Model: Schema.Struct({ isReducedMotion: Schema.Boolean }),
    Message,
  },
) {}

export const MotionPreferencesLive = MotionPreferences.toLayer(() => ({
  init: () => ({ isReducedMotion: false }),

  subscriptions: {
    reducedMotionChanges: {
      dependencies: Function.constVoid,
      stream: () =>
        Dom.streamFromMediaQuery({
          query: '(prefers-reduced-motion: reduce)',
          mapMatches: isMatching =>
            Message.ChangedReducedMotion({ isReducedMotion: isMatching }),
        }),
    },
  },

  update: {
    ChangedReducedMotion: (model, { isReducedMotion }) => ({
      model: modifyFields(model, {
        isReducedMotion: () => isReducedMotion,
      }),
    }),
  },
}))
