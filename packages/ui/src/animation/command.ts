import { Effect, Layer, Schema } from 'effect'
import * as Dom from 'foldkit/dom'
import * as Render from 'foldkit/render'

import { idSelector } from '../internal/selectors.js'
import { AnimationBlock } from './definition.js'
import { Message } from './schema.js'

const elementSelector = (id: string): string => idSelector(id)

/** Waits for paint via double-rAF, then reports the transition generation that
 *  scheduled the wait. */
export const WaitForPaint = AnimationBlock.makeCommand('WaitForPaint', {
  args: { generation: Schema.Number },
  messages: [Message.CompletedWaitForPaint],
  handler: function* () {
    return ({ generation }) =>
      Render.afterPaint.pipe(
        Effect.as(Message.CompletedWaitForPaint({ generation })),
      )
  },
})

/** Waits for all CSS transitions and keyframe animations on the element to
 *  settle, then reports the transition generation that scheduled the wait. */
export const WaitForAnimationSettled = AnimationBlock.makeCommand(
  'WaitForAnimationSettled',
  {
    args: { id: Schema.String, generation: Schema.Number },
    messages: [Message.EndedAnimation],
    handler: function* () {
      return ({ id, generation }) =>
        Dom.waitForAnimationSettled(elementSelector(id)).pipe(
          Effect.as(Message.EndedAnimation({ generation })),
        )
    },
  },
)

/** Effect providers used by the Animation component. */
export const EffectsLayer = Layer.mergeAll(
  WaitForPaint.layer,
  WaitForAnimationSettled.layer,
)
