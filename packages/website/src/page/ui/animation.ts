import { Ui } from 'foldkit'
import { html } from 'foldkit/html'

import type { TableOfContentsEntry } from '../../main'
import { GotAnimationDemoMessage, type Message } from './message'

// TABLE OF CONTENTS

export const animationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'animation',
  text: 'Animation',
}

// DEMO CONTENT

const triggerClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 dark:border-gray-700 bg-cream dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 select-none'

const contentClassName =
  'mt-4 rounded-lg bg-accent-100 dark:bg-accent-900/30 border border-accent-300 dark:border-accent-700 p-4 transition duration-200 ease-out data-[closed]:opacity-0 data-[closed]:scale-95 data-[closed]:-translate-y-2'

// VIEW

export const animationDemo = (animationModel: Ui.Animation.Model) => {
  const h = html<Message>()

  const toggleMessage = animationModel.isShowing
    ? Ui.Animation.Hid()
    : Ui.Animation.Showed()

  return [
    h.div(
      [h.Class('flex flex-col items-center')],
      [
        h.button(
          [
            h.Class(triggerClassName),
            h.OnClick(GotAnimationDemoMessage({ message: toggleMessage })),
          ],
          [animationModel.isShowing ? 'Hide Content' : 'Show Content'],
        ),
        h.submodel({
          slotId: animationModel.id,
          model: animationModel,
          view: Ui.Animation.view,
          viewInputs: {
            className: contentClassName,
            animateSize: true,
            content: h.p(
              [h.Class('text-accent-800 dark:text-accent-200')],
              [
                'This content fades in and out using CSS transitions coordinated by the Animation component. The data attributes (data-closed, data-enter, data-leave, data-transition) drive the animation via Tailwind selectors.',
              ],
            ),
          },
          toParentMessage: message => GotAnimationDemoMessage({ message }),
        }),
      ],
    ),
  ]
}
