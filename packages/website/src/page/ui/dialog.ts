import { Option } from 'effect'
import { html } from 'foldkit/html'

import { Combobox, Dialog } from '@foldkit/ui'

import type { TableOfContentsEntry } from '../../main'
import { CityCombobox, comboboxViewInputs } from './combobox'
import {
  ClickedDeleteProject,
  ClickedEditFilters,
  ClickedOpenAnimatedDialog,
  ClickedOpenDialog,
  ClickedOpenProjectSettings,
  GotDialogAnimatedDemoMessage,
  GotDialogDemoMessage,
  GotNestedDialogChildDemoMessage,
  GotNestedDialogParentDemoMessage,
  GotOverlayComboboxDemoMessage,
  GotOverlayDialogDemoMessage,
  type Message,
} from './message'
import type { City } from './model'

// TABLE OF CONTENTS

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

export const overlayHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'dialog-field',
  text: 'Field',
}

export const nestedHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'dialog-stacked',
  text: 'Stacked',
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

const settingsPanelClassName =
  'bg-cream dark:bg-gray-800 rounded-lg p-6 max-w-lg mx-auto relative shadow-xl'

const confirmPanelClassName =
  'bg-cream dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-auto relative shadow-xl'

const titleClassName = 'text-lg font-normal text-gray-900 dark:text-white mb-2'

const dialogClassName =
  'bg-transparent p-0 open:flex items-center justify-center'

const cancelButtonClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'

const confirmButtonClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900 hover:bg-accent-700'

const dangerButtonClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg bg-red-600 text-white hover:bg-red-700'

const OVERLAY_COMBOBOX_ANCHOR = {
  placement: 'bottom-start' as const,
  gap: 8,
  padding: 8,
  portal: false,
}

// VIEW

export const dialogDemo = (dialogModel: Dialog.Model) => {
  const h = html<Message>()

  return [
    h.div(
      [h.Class('flex gap-3')],
      [
        h.button(
          [h.Class(triggerClassName), h.OnClick(ClickedOpenDialog())],
          ['Open Dialog'],
        ),
      ],
    ),
    h.submodel({
      slotId: dialogModel.id,
      model: dialogModel,
      view: Dialog.view,
      viewInputs: {
        toView: ({
          dialog,
          backdrop,
          panel,
          title,
          description,
          closeButton,
          isVisible,
        }) =>
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
                            [...title, h.Class(titleClassName)],
                            ['Confirm Action'],
                          ),
                          h.p(
                            [
                              ...description,
                              h.Class('text-gray-600 dark:text-gray-300 mb-4'),
                            ],
                            [
                              'Are you sure you want to proceed? This action demonstrates the Dialog component with focus trapping, backdrop click, and Escape key handling.',
                            ],
                          ),
                          h.div(
                            [h.Class('flex gap-2 justify-end')],
                            [
                              h.button(
                                [
                                  ...closeButton,
                                  h.Class(cancelButtonClassName),
                                ],
                                ['Cancel'],
                              ),
                              h.button(
                                [
                                  ...closeButton,
                                  h.Class(confirmButtonClassName),
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
      toParentMessage: message => GotDialogDemoMessage({ message }),
    }),
  ]
}

export const overlayDialogDemo = (
  dialogModel: Dialog.Model,
  comboboxModel: Combobox.Model,
  maybeSelectedCity: Option.Option<City>,
) => {
  const h = html<Message>()

  return [
    h.div(
      [h.Class('flex gap-3')],
      [
        h.button(
          [h.Class(triggerClassName), h.OnClick(ClickedEditFilters())],
          ['Edit filters'],
        ),
      ],
    ),
    h.submodel({
      slotId: dialogModel.id,
      model: dialogModel,
      view: Dialog.view,
      viewInputs: {
        toView: ({ dialog, backdrop, panel, title, description, isVisible }) =>
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
                            [...title, h.Class(titleClassName)],
                            ['Edit filters'],
                          ),
                          h.p(
                            [
                              ...description,
                              h.Class('text-gray-600 dark:text-gray-300 mb-4'),
                            ],
                            [
                              'With portal: false, the combobox panel stays inside the dialog instead of rendering behind it.',
                            ],
                          ),
                          h.submodel({
                            slotId: comboboxModel.id,
                            model: comboboxModel,
                            view: CityCombobox.view,
                            viewInputs: {
                              ...comboboxViewInputs({
                                inputValue: comboboxModel.inputValue,
                                restingInputValue: Option.getOrElse(
                                  maybeSelectedCity,
                                  () => '',
                                ),
                                anchor: OVERLAY_COMBOBOX_ANCHOR,
                                wrapperClass: 'relative w-full',
                              }),
                              maybeSelectedValue: maybeSelectedCity,
                            },
                            toParentMessage: message =>
                              GotOverlayComboboxDemoMessage({ message }),
                          }),
                        ],
                      ),
                    ],
                  ),
                ]
              : [],
          ),
      },
      toParentMessage: message => GotOverlayDialogDemoMessage({ message }),
    }),
  ]
}

export const nestedDialogDemo = (
  parentDialogModel: Dialog.Model,
  childDialogModel: Dialog.Model,
) => {
  const h = html<Message>()

  return [
    h.div(
      [h.Class('flex gap-3')],
      [
        h.button(
          [h.Class(triggerClassName), h.OnClick(ClickedOpenProjectSettings())],
          ['Open project settings'],
        ),
      ],
    ),
    h.submodel({
      slotId: parentDialogModel.id,
      model: parentDialogModel,
      view: Dialog.view,
      viewInputs: {
        toView: ({
          dialog,
          backdrop,
          panel,
          title,
          description,
          closeButton,
          isVisible,
        }) =>
          h.dialog(
            [...dialog, h.Class(dialogClassName)],
            isVisible
              ? [
                  h.div([...backdrop, h.Class(backdropClassName)], []),
                  h.div(
                    [...panel, h.Class(settingsPanelClassName)],
                    [
                      h.div(
                        [],
                        [
                          h.h2(
                            [...title, h.Class(titleClassName)],
                            ['Project settings'],
                          ),
                          h.p(
                            [
                              ...description,
                              h.Class('text-gray-600 dark:text-gray-300 mb-4'),
                            ],
                            [
                              'Deleting the project removes all of its data. The confirmation opens as a second dialog stacked on top of this one.',
                            ],
                          ),
                          h.div(
                            [h.Class('flex gap-2 justify-end')],
                            [
                              h.button(
                                [
                                  ...closeButton,
                                  h.Class(cancelButtonClassName),
                                ],
                                ['Close'],
                              ),
                              h.button(
                                [
                                  h.Class(dangerButtonClassName),
                                  h.OnClick(ClickedDeleteProject()),
                                ],
                                ['Delete project'],
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
      toParentMessage: message => GotNestedDialogParentDemoMessage({ message }),
    }),
    h.submodel({
      slotId: childDialogModel.id,
      model: childDialogModel,
      view: Dialog.view,
      viewInputs: {
        toView: ({
          dialog,
          backdrop,
          panel,
          title,
          description,
          closeButton,
          isVisible,
        }) =>
          h.dialog(
            [...dialog, h.Class(dialogClassName)],
            isVisible
              ? [
                  h.div([...backdrop, h.Class(backdropClassName)], []),
                  h.div(
                    [...panel, h.Class(confirmPanelClassName)],
                    [
                      h.div(
                        [],
                        [
                          h.h2(
                            [...title, h.Class(titleClassName)],
                            ['Delete project?'],
                          ),
                          h.p(
                            [
                              ...description,
                              h.Class('text-gray-600 dark:text-gray-300 mb-4'),
                            ],
                            [
                              'This permanently deletes the project and cannot be undone. Escape closes this confirmation first, then the settings dialog.',
                            ],
                          ),
                          h.div(
                            [h.Class('flex gap-2 justify-end')],
                            [
                              h.button(
                                [
                                  ...closeButton,
                                  h.Class(cancelButtonClassName),
                                ],
                                ['Cancel'],
                              ),
                              h.button(
                                [
                                  ...closeButton,
                                  h.Class(dangerButtonClassName),
                                ],
                                ['Delete'],
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
      toParentMessage: message => GotNestedDialogChildDemoMessage({ message }),
    }),
  ]
}

export const dialogAnimatedDemo = (dialogModel: Dialog.Model) => {
  const h = html<Message>()

  return [
    h.div(
      [h.Class('flex gap-3')],
      [
        h.button(
          [h.Class(triggerClassName), h.OnClick(ClickedOpenAnimatedDialog())],
          ['Open Animated Dialog'],
        ),
      ],
    ),
    h.submodel({
      slotId: dialogModel.id,
      model: dialogModel,
      view: Dialog.view,
      viewInputs: {
        toView: ({
          dialog,
          backdrop,
          panel,
          title,
          description,
          closeButton,
          isVisible,
        }) =>
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
                            [...title, h.Class(titleClassName)],
                            ['Confirm Action'],
                          ),
                          h.p(
                            [
                              ...description,
                              h.Class('text-gray-600 dark:text-gray-300 mb-4'),
                            ],
                            [
                              'This dialog uses CSS transitions coordinated by the TransitionState machine: a fade on the backdrop and a scale-up on the panel. Content stays mounted during exit so both enter and leave transitions play smoothly.',
                            ],
                          ),
                          h.div(
                            [h.Class('flex gap-2 justify-end')],
                            [
                              h.button(
                                [
                                  ...closeButton,
                                  h.Class(cancelButtonClassName),
                                ],
                                ['Cancel'],
                              ),
                              h.button(
                                [
                                  ...closeButton,
                                  h.Class(confirmButtonClassName),
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
      toParentMessage: message => GotDialogAnimatedDemoMessage({ message }),
    }),
  ]
}
