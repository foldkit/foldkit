import { AnimationBlock } from '@foldkit/ui'

import type { UiViewBuilder } from '../composition'
import { AnimationDemoBinding } from '../composition'
import { Message } from '../message'

type AnimationBlockModel = typeof AnimationBlock.Model.Type

// DEMO CONTENT

const triggerClassName = 'demo-neutral-button'

const contentClassName =
  'mt-4 rounded-lg bg-accent-100 dark:bg-accent-900/30 border border-accent-300 dark:border-accent-700 p-4 transition duration-200 ease-out data-[closed]:opacity-0 data-[closed]:scale-95 data-[closed]:-translate-y-2'

export const view = (animationModel: AnimationBlockModel, h: UiViewBuilder) => [
  h.div(
    [h.Class('flex flex-col items-center')],
    [
      h.button(
        [
          h.Class(triggerClassName),
          h.OnClick(Message.ClickedToggleAnimationDemo()),
        ],
        [animationModel.isShowing ? 'Hide Content' : 'Show Content'],
      ),
      h.block(
        AnimationDemoBinding.embedView({
          slotId: animationModel.id,
          model: animationModel,
          viewInputs: {
            className: contentClassName,
            animateSize: true,
            toView: () =>
              h.p(
                [h.Class('text-accent-800 dark:text-accent-200')],
                [
                  'This content fades in and out using CSS transitions coordinated by the Animation component. The data attributes (data-closed, data-enter, data-leave, data-transition) drive the animation via Tailwind selectors.',
                ],
              ),
          },
        }),
      ),
    ],
  ),
]
