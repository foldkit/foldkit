import { Ui } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Class, OnClick, button, div, h2, p } from '../html'
import type { Message as ParentMessage } from '../main'
import { ToggledTransitionDemo, type UiMessage } from '../message'
import type { UiModel } from '../model'

const triggerClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-200/50 select-none'

const contentClassName =
  'rounded-lg bg-indigo-50 border border-indigo-200 p-4 transition duration-200 ease-out data-[closed]:opacity-0 data-[closed]:scale-95 data-[closed]:-translate-y-2'

export const view = (
  model: UiModel,
  toParentMessage: (message: UiMessage) => ParentMessage,
): Html => {
  return div(
    [],
    [
      h2([Class('text-2xl font-bold text-gray-900 mb-6')], ['Transition']),
      div(
        [Class('flex gap-3')],
        [
          button(
            [
              Class(triggerClassName),
              OnClick(toParentMessage(ToggledTransitionDemo())),
            ],
            [model.isTransitionDemoShowing ? 'Hide Content' : 'Show Content'],
          ),
        ],
      ),
      div(
        [Class('mt-4')],
        [
          Ui.Transition.view({
            model: model.transitionDemo,
            className: contentClassName,
            animateSize: true,
            content: p(
              [Class('text-indigo-800')],
              [
                'This content smoothly animates in and out. The Transition component coordinates CSS enter/leave animations via data attributes, while animateSize uses a CSS grid wrapper for smooth height animation.',
              ],
            ),
          }),
        ],
      ),
    ],
  )
}
