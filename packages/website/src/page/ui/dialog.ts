import { Ui } from 'foldkit'
import { html } from 'foldkit/html'

import type { TableOfContentsEntry } from '../../main'
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

const dialogClassName =
  'backdrop:bg-transparent bg-transparent p-0 open:flex items-center justify-center'

const cancelButtonClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'

const confirmButtonClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900 hover:bg-accent-700'

// VIEW

export const dialogDemo = (dialogModel: Ui.Dialog.Model) => {
  const h = html<Message>()

  const dialogToParentMessage = (message: Ui.Dialog.Message): Message =>
    GotDialogDemoMessage({ message })

  return [
    h.div(
      [h.Class('flex gap-3')],
      [
        h.button(
          [
            h.Class(triggerClassName),
            h.OnClick(dialogToParentMessage(Ui.Dialog.RequestedOpen())),
          ],
          ['Open Dialog'],
        ),
      ],
    ),
    h.submodel({
      slotId: dialogModel.id,
      model: dialogModel,
      view: Ui.Dialog.view,
      viewInputs: {
        toView: ({ dialog, backdrop, panel, isVisible }) =>
          h.dialog(
            [...dialog, h.Class(dialogClassName)],
            isVisible
              ? [
                  h.div([...backdrop, h.Class(backdropClassName)], []),
                  h.div(
                    [...panel, h.Class(panelClassName)],
                    [
                      h.div(
                        [],
                        [
                          h.h2(
                            [
                              h.Class(titleClassName),
                              h.Id(Ui.Dialog.titleId(dialogModel)),
                            ],
                            ['Confirm Action'],
                          ),
                          h.p(
                            [h.Class('text-gray-600 dark:text-gray-300 mb-4')],
                            [
                              'Are you sure you want to proceed? This action demonstrates the Dialog component with focus trapping, backdrop click, and Escape key handling.',
                            ],
                          ),
                          h.div(
                            [h.Class('flex gap-2 justify-end')],
                            [
                              h.button(
                                [
                                  h.Class(cancelButtonClassName),
                                  h.OnClick(
                                    dialogToParentMessage(
                                      Ui.Dialog.RequestedClose(),
                                    ),
                                  ),
                                ],
                                ['Cancel'],
                              ),
                              h.button(
                                [
                                  h.Class(confirmButtonClassName),
                                  h.OnClick(
                                    dialogToParentMessage(
                                      Ui.Dialog.RequestedClose(),
                                    ),
                                  ),
                                ],
                                ['Confirm'],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ]
              : [],
          ),
      },
      toParentMessage: message => dialogToParentMessage(message),
    }),
  ]
}

export const dialogAnimatedDemo = (dialogModel: Ui.Dialog.Model) => {
  const h = html<Message>()

  const dialogToParentMessage = (message: Ui.Dialog.Message): Message =>
    GotDialogAnimatedDemoMessage({ message })

  return [
    h.div(
      [h.Class('flex gap-3')],
      [
        h.button(
          [
            h.Class(triggerClassName),
            h.OnClick(dialogToParentMessage(Ui.Dialog.RequestedOpen())),
          ],
          ['Open Animated Dialog'],
        ),
      ],
    ),
    h.submodel({
      slotId: dialogModel.id,
      model: dialogModel,
      view: Ui.Dialog.view,
      viewInputs: {
        toView: ({ dialog, backdrop, panel, isVisible }) =>
          h.dialog(
            [...dialog, h.Class(dialogClassName)],
            isVisible
              ? [
                  h.div([...backdrop, h.Class(animatedBackdropClassName)], []),
                  h.div(
                    [...panel, h.Class(animatedPanelClassName)],
                    [
                      h.div(
                        [],
                        [
                          h.h2(
                            [
                              h.Class(titleClassName),
                              h.Id(Ui.Dialog.titleId(dialogModel)),
                            ],
                            ['Confirm Action'],
                          ),
                          h.p(
                            [h.Class('text-gray-600 dark:text-gray-300 mb-4')],
                            [
                              'This dialog uses CSS transitions coordinated by the TransitionState machine: a fade on the backdrop and a scale-up on the panel. Content stays mounted during exit so both enter and leave transitions play smoothly.',
                            ],
                          ),
                          h.div(
                            [h.Class('flex gap-2 justify-end')],
                            [
                              h.button(
                                [
                                  h.Class(cancelButtonClassName),
                                  h.OnClick(
                                    dialogToParentMessage(
                                      Ui.Dialog.RequestedClose(),
                                    ),
                                  ),
                                ],
                                ['Cancel'],
                              ),
                              h.button(
                                [
                                  h.Class(confirmButtonClassName),
                                  h.OnClick(
                                    dialogToParentMessage(
                                      Ui.Dialog.RequestedClose(),
                                    ),
                                  ),
                                ],
                                ['Confirm'],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ]
              : [],
          ),
      },
      toParentMessage: message => dialogToParentMessage(message),
    }),
  ]
}
