import { Ui } from 'foldkit'

import { Class, OnClick, button, div, p } from '../../html'
import type { Message as ParentMessage, TableOfContentsEntry } from '../../main'
import { type Message, ToggledTransitionDemo } from './message'

// TABLE OF CONTENTS

export const transitionHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'transition',
  text: 'Transition',
}

// DEMO CONTENT

const triggerClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 dark:border-gray-700 bg-cream dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 select-none'

const contentClassName =
  'rounded-lg bg-accent-100 dark:bg-accent-900/30 border border-accent-300 dark:border-accent-700 p-4 transition duration-200 ease-out data-[closed]:opacity-0 data-[closed]:scale-95 data-[closed]:-translate-y-2'

// VIEW

export const transitionDemo = (
  transitionModel: Ui.Transition.Model,
  isTransitionDemoShowing: boolean,
  toParentMessage: (message: Message) => ParentMessage,
) => {
  return [
    div(
      [Class('flex gap-3')],
      [
        button(
          [
            Class(triggerClassName),
            OnClick(toParentMessage(ToggledTransitionDemo())),
          ],
          [isTransitionDemoShowing ? 'Hide Content' : 'Show Content'],
        ),
      ],
    ),
    div(
      [Class('mt-4')],
      [
        Ui.Transition.view({
          model: transitionModel,
          className: contentClassName,
          animateSize: true,
          content: p(
            [Class('text-accent-800 dark:text-accent-200')],
            [
              'This content fades in and out using CSS transitions coordinated by the Transition component. The data attributes (data-closed, data-enter, data-leave, data-transition) drive the animation via Tailwind selectors.',
            ],
          ),
        }),
      ],
    ),
  ]
}
