import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { Animation } from '@foldkit/ui'

const Model = Schema.Struct({
  animationDemo: Animation.Animation,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ToggledAnimationDemo: {},
})
type Message = typeof Message.Type

export class AnimationPage extends Block<AnimationPage>()('AnimationPage', {
  Model,
  Message,
}) {}

const triggerClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-200/50 select-none'

const contentClassName =
  'rounded-lg bg-indigo-50 border border-indigo-200 p-4 transition duration-200 ease-out data-[closed]:opacity-0 data-[closed]:scale-95 data-[closed]:-translate-y-2'

const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Animation']),
      h.div(
        [h.Class('flex gap-3')],
        [
          h.button(
            [
              h.Class(triggerClassName),
              h.OnClick(Message.ToggledAnimationDemo()),
            ],
            [
              model.animationDemo.model.isShowing
                ? 'Hide Content'
                : 'Show Content',
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('mt-4')],
        [
          model.animationDemo.view({
            className: contentClassName,
            animateSize: true,
            toView: () =>
              h.p(
                [h.Class('text-indigo-800')],
                [
                  'This content smoothly animates in and out. The Animation component coordinates CSS enter/leave lifecycles via data attributes, while animateSize uses a CSS grid wrapper for smooth height animation.',
                ],
              ),
          }),
        ],
      ),
    ],
  )
}

export const AnimationPageLive = AnimationPage.make(
  Effect.fn(function* () {
    const animationDemo = yield* new Animation.Animation('animationDemo', {
      id: 'animation-demo',
    })

    return {
      model: { animationDemo },

      update: {
        ToggledAnimationDemo: model => ({
          model,
          messages: [
            model.animationDemo.send(
              model.animationDemo.model.isShowing
                ? Animation.Animation.Message.RequestedHide()
                : Animation.Animation.Message.RequestedShow(),
            ),
          ],
        }),

        ...animationDemo.on({
          StartedLeaveAnimating: model => ({
            model,
            messages: [
              model.animationDemo.send(
                Animation.Animation.Message.RequestedWaitForLeaveSettlement(),
              ),
            ],
          }),
        }),
      },

      view,
    }
  }),
).pipe(Layer.provide(Animation.AnimationLive))
