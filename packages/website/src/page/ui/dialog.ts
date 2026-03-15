import { Ui } from 'foldkit'

import { Class, Id, OnClick, button, div, h2, p } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { heading } from '../../prose'
import {
  GotDialogAnimatedDemoMessage,
  GotDialogDemoMessage,
  type Message,
} from './message'

// TABLE OF CONTENTS

export const dialogHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'dialog',
  text: 'Dialog',
}

export const basicHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'dialog-basic',
  text: 'Basic',
}

export const animatedHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'dialog-animated',
  text: 'Animated',
}

// DEMO CONTENT

const triggerClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 dark:border-gray-700 bg-cream dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 select-none'

const backdropClassName = 'fixed inset-0 bg-black/50'

const animatedBackdropClassName =
  'fixed inset-0 bg-black/50 transition duration-150 ease-out data-[closed]:opacity-0'

const panelClassName =
  'bg-cream dark:bg-gray-800 rounded-lg p-6 max-w-md mx-auto relative shadow-xl'

const animatedPanelClassName =
  'bg-cream dark:bg-gray-800 rounded-lg p-6 max-w-md mx-auto relative shadow-xl transition duration-150 ease-out data-[closed]:opacity-0 data-[closed]:scale-95'

const titleClassName = 'text-lg font-normal text-gray-900 dark:text-white mb-2'

const dialogClassName = 'backdrop:bg-transparent bg-transparent p-0 m-auto'

const cancelButtonClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'

const confirmButtonClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900 hover:bg-accent-700'

// VIEW

export const dialogDemo = (
  dialogModel: Ui.Dialog.Model,
  toMessage: (message: Message) => ParentMessage,
) => {
  const toDialogMessage = (message: Ui.Dialog.Message) =>
    toMessage(GotDialogDemoMessage({ message }))

  return [
    heading('h3', basicHeader.id, basicHeader.text),
    div(
      [Class('flex gap-3')],
      [
        button(
          [
            Class(triggerClassName),
            OnClick(toDialogMessage(Ui.Dialog.Opened())),
          ],
          ['Open Dialog'],
        ),
      ],
    ),
    Ui.Dialog.view({
      model: dialogModel,
      toMessage: toDialogMessage,
      panelContent: div(
        [],
        [
          h2(
            [Class(titleClassName), Id(Ui.Dialog.titleId(dialogModel))],
            ['Confirm Action'],
          ),
          p(
            [Class('text-gray-600 dark:text-gray-300 mb-4')],
            [
              'Are you sure you want to proceed? This action demonstrates the Dialog component with focus trapping, backdrop click, and Escape key handling.',
            ],
          ),
          div(
            [Class('flex gap-2 justify-end')],
            [
              button(
                [
                  Class(cancelButtonClassName),
                  OnClick(toDialogMessage(Ui.Dialog.Closed())),
                ],
                ['Cancel'],
              ),
              button(
                [
                  Class(confirmButtonClassName),
                  OnClick(toDialogMessage(Ui.Dialog.Closed())),
                ],
                ['Confirm'],
              ),
            ],
          ),
        ],
      ),
      panelAttributes: [Class(panelClassName)],
      backdropAttributes: [Class(backdropClassName)],
      attributes: [Class(dialogClassName)],
    }),
  ]
}

export const dialogAnimatedDemo = (
  dialogModel: Ui.Dialog.Model,
  toMessage: (message: Message) => ParentMessage,
) => {
  const toDialogMessage = (message: Ui.Dialog.Message) =>
    toMessage(GotDialogAnimatedDemoMessage({ message }))

  return [
    heading('h3', animatedHeader.id, animatedHeader.text),
    div(
      [Class('flex gap-3')],
      [
        button(
          [
            Class(triggerClassName),
            OnClick(toDialogMessage(Ui.Dialog.Opened())),
          ],
          ['Open Animated Dialog'],
        ),
      ],
    ),
    Ui.Dialog.view({
      model: dialogModel,
      toMessage: toDialogMessage,
      panelContent: div(
        [],
        [
          h2(
            [Class(titleClassName), Id(Ui.Dialog.titleId(dialogModel))],
            ['Confirm Action'],
          ),
          p(
            [Class('text-gray-600 dark:text-gray-300 mb-4')],
            [
              'This dialog uses CSS transitions coordinated by the TransitionState machine — a fade on the backdrop and a scale-up on the panel. Content stays mounted during exit so both enter and leave transitions play smoothly.',
            ],
          ),
          div(
            [Class('flex gap-2 justify-end')],
            [
              button(
                [
                  Class(cancelButtonClassName),
                  OnClick(toDialogMessage(Ui.Dialog.Closed())),
                ],
                ['Cancel'],
              ),
              button(
                [
                  Class(confirmButtonClassName),
                  OnClick(toDialogMessage(Ui.Dialog.Closed())),
                ],
                ['Confirm'],
              ),
            ],
          ),
        ],
      ),
      panelAttributes: [Class(animatedPanelClassName)],
      backdropAttributes: [Class(animatedBackdropClassName)],
      attributes: [Class(dialogClassName)],
    }),
  ]
}
