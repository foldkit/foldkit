import { AnimationDemoBinding, UiComposition } from '../composition'
import { Message } from '../message'

const triggerClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-200/50 select-none'

const contentClassName =
  'rounded-lg bg-indigo-50 border border-indigo-200 p-4 transition duration-200 ease-out data-[closed]:opacity-0 data-[closed]:scale-95 data-[closed]:-translate-y-2'

export const view = UiComposition.makeView((model, h) => {
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
            [model.animationDemo.isShowing ? 'Hide Content' : 'Show Content'],
          ),
        ],
      ),
      h.div(
        [h.Class('mt-4')],
        [
          h.block(
            AnimationDemoBinding.embedView({
              slotId: model.animationDemo.id,
              model: model.animationDemo,
              viewInputs: {
                className: contentClassName,
                animateSize: true,
                toView: () =>
                  h.p(
                    [h.Class('text-indigo-800')],
                    [
                      'This content smoothly animates in and out. The Animation component coordinates CSS enter/leave lifecycles via data attributes, while animateSize uses a CSS grid wrapper for smooth height animation.',
                    ],
                  ),
              },
            }),
          ),
        ],
      ),
    ],
  )
})
