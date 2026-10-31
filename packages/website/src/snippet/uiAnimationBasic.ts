import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Animation } from '@foldkit/ui'

const Message = defineMessageUnion({
  ClickedToggleAnimation: {},
})

// Animation tracks its own visibility and lifecycle state, so the parent
// needs no separate flag
export class Details extends Block<Details>()('Details', {
  Model: Schema.Struct({ animation: Animation.Animation }),
  Message,
}) {}

export const DetailsLive = Details.make(
  Effect.fn(function* () {
    const animation = yield* new Animation.Animation('animation', {
      id: 'content',
    })

    return {
      model: { animation },

      update: {
        // The parent reads `isShowing` and sends the matching request
        ClickedToggleAnimation: model => ({
          model,
          messages: [
            model.animation.send(
              model.animation.model.isShowing
                ? Animation.Animation.Message.RequestedHide()
                : Animation.Animation.Message.RequestedShow(),
            ),
          ],
        }),

        ...animation.on({
          // Ask Animation to wait for its wrapper's CSS to settle. A custom
          // policy can race another signal against that settlement instead.
          StartedLeaveAnimating: model => ({
            model,
            messages: [
              model.animation.send(
                Animation.Animation.Message.RequestedWaitForLeaveSettlement(),
              ),
            ],
          }),
        }),
      },

      // The Animation view wraps your content. Data attributes drive the CSS
      // transitions or keyframe animations defined in className.
      view: (model, h) =>
        h.div(
          [],
          [
            h.button(
              [h.OnClick(Message.ClickedToggleAnimation())],
              [model.animation.model.isShowing ? 'Hide' : 'Show'],
            ),
            model.animation.view({
              animateSize: true,
              className:
                'transition duration-200 ease-out data-[closed]:opacity-0 data-[closed]:scale-95',
              toView: () => h.p([], ['This content animates in and out.']),
            }),
          ],
        ),
    }
  }),
).pipe(Layer.provide(Animation.AnimationLive))
