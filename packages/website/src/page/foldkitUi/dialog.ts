import { Ui } from 'foldkit'

import { Class, Id, OnClick, button, div, h2, p } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { GotDialogDemoMessage, type Message } from './message'
import type { Model } from './model'

// TABLE OF CONTENTS

export const dialogHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'dialog',
  text: 'Dialog',
}

// DEMO CONTENT

const triggerClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 dark:border-gray-700 bg-cream dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 select-none'

const backdropClassName = 'fixed inset-0 bg-black/50'

const panelClassName =
  'bg-cream dark:bg-gray-800 rounded-lg p-6 max-w-md mx-auto relative shadow-xl'

const titleClassName =
  'text-lg font-normal text-gray-900 dark:text-white mb-2'

const dialogClassName =
  'backdrop:bg-transparent bg-transparent p-0 m-auto'

const cancelButtonClassName =
  'px-4 py-2 text-sm font-normal cursor-pointer transition rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'

const confirmButtonClassName =
  'px-4 py-2 text-sm font-normal cursor-pointer transition rounded-lg bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900 hover:bg-accent-700'

// VIEW

export const dialogDemo = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
) => {
  const toDialogMessage = (message: Ui.Dialog.Message) =>
    toMessage(GotDialogDemoMessage({ message }))

  return [
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
      model: model.dialogDemo,
      toMessage: toDialogMessage,
      panelContent: div(
        [],
        [
          h2(
            [
              Class(titleClassName),
              Id(Ui.Dialog.titleId(model.dialogDemo)),
            ],
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
      panelClassName,
      backdropClassName,
      className: dialogClassName,
    }),
  ]
}
