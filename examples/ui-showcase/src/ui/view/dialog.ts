import { Option } from 'effect'
import { Submodel } from 'foldkit'
import { Html, html } from 'foldkit/html'

import { Combobox, Dialog } from '@foldkit/ui'

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
  type UiMessage,
} from '../message'
import type { City, UiModel } from '../model'
import { CityCombobox, comboboxInputs } from './combobox'

const triggerClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-100 select-none'

const backdropClassName = 'fixed inset-0 bg-black/50'

const animatedBackdropClassName =
  'fixed inset-0 bg-black/50 transition duration-150 ease-out data-[closed]:opacity-0'

const panelClassName =
  'bg-white rounded-lg p-6 max-w-md mx-auto relative shadow-xl'

const settingsPanelClassName =
  'bg-white rounded-lg p-6 max-w-lg mx-auto relative shadow-xl'

const confirmPanelClassName =
  'bg-white rounded-lg p-6 max-w-sm mx-auto relative shadow-xl'

const animatedPanelClassName =
  'bg-white rounded-lg p-6 max-w-md mx-auto relative shadow-xl transition duration-150 ease-out data-[closed]:opacity-0 data-[closed]:scale-95'

const titleClassName = 'text-lg font-normal text-gray-900 mb-2'

const dialogClassName =
  'bg-transparent p-0 open:flex items-center justify-center'

const cancelButtonClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100'

const confirmButtonClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg bg-accent-600 text-white hover:bg-accent-700'

const dangerButtonClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg bg-red-600 text-white hover:bg-red-700'

const OVERLAY_COMBOBOX_ANCHOR = {
  placement: 'bottom-start' as const,
  gap: 8,
  padding: 8,
  portal: false,
}

const dialogPanel = (
  closeButton: Dialog.RenderInfo['closeButton'],
  title: Dialog.RenderInfo['title'],
  description: Dialog.RenderInfo['description'],
): Html => {
  const h = html<UiMessage>()

  return h.div(
    [],
    [
      h.h2([...title, h.Class(titleClassName)], ['Confirm Action']),
      h.p(
        [...description, h.Class('text-gray-600 mb-4')],
        [
          'Are you sure you want to proceed? This action demonstrates the Dialog component with focus trapping, backdrop click, and Escape key handling.',
        ],
      ),
      h.div(
        [h.Class('flex gap-2 justify-end')],
        [
          h.button(
            [...closeButton, h.Class(cancelButtonClassName)],
            ['Cancel'],
          ),
          h.button(
            [...closeButton, h.Class(confirmButtonClassName)],
            ['Confirm'],
          ),
        ],
      ),
    ],
  )
}

const overlayDemo = (
  dialogModel: Dialog.Model,
  comboboxModel: Combobox.Model,
  maybeSelectedCity: Option.Option<City>,
): Html => {
  const h = html<UiMessage>()

  return h.div(
    [],
    [
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
          toView: ({
            dialog,
            backdrop,
            panel,
            title,
            description,
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
                        h.h2(
                          [...title, h.Class(titleClassName)],
                          ['Edit filters'],
                        ),
                        h.p(
                          [...description, h.Class('text-gray-600 mb-4')],
                          [
                            'With portal: false, the combobox panel stays inside the dialog instead of rendering behind it.',
                          ],
                        ),
                        h.submodel({
                          slotId: comboboxModel.id,
                          model: comboboxModel,
                          view: CityCombobox.view,
                          viewInputs: {
                            ...comboboxInputs({
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
                  ]
                : [],
            ),
        },
        toParentMessage: message => GotOverlayDialogDemoMessage({ message }),
      }),
    ],
  )
}

const nestedDemo = (
  parentDialogModel: Dialog.Model,
  childDialogModel: Dialog.Model,
): Html => {
  const h = html<UiMessage>()

  return h.div(
    [],
    [
      h.div(
        [h.Class('flex gap-3')],
        [
          h.button(
            [
              h.Class(triggerClassName),
              h.OnClick(ClickedOpenProjectSettings()),
            ],
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
            closeButton,
            title,
            description,
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
                        h.h2(
                          [...title, h.Class(titleClassName)],
                          ['Project settings'],
                        ),
                        h.p(
                          [...description, h.Class('text-gray-600 mb-4')],
                          [
                            'Deleting the project removes all of its data. The confirmation opens as a second dialog stacked on top of this one.',
                          ],
                        ),
                        h.div(
                          [h.Class('flex gap-2 justify-end')],
                          [
                            h.button(
                              [...closeButton, h.Class(cancelButtonClassName)],
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
                  ]
                : [],
            ),
        },
        toParentMessage: message =>
          GotNestedDialogParentDemoMessage({ message }),
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
            closeButton,
            title,
            description,
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
                        h.h2(
                          [...title, h.Class(titleClassName)],
                          ['Delete project?'],
                        ),
                        h.p(
                          [...description, h.Class('text-gray-600 mb-4')],
                          [
                            'This permanently deletes the project and cannot be undone. Escape closes this confirmation first, then the settings dialog.',
                          ],
                        ),
                        h.div(
                          [h.Class('flex gap-2 justify-end')],
                          [
                            h.button(
                              [...closeButton, h.Class(cancelButtonClassName)],
                              ['Cancel'],
                            ),
                            h.button(
                              [...closeButton, h.Class(dangerButtonClassName)],
                              ['Delete'],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ]
                : [],
            ),
        },
        toParentMessage: message =>
          GotNestedDialogChildDemoMessage({ message }),
      }),
    ],
  )
}

export const view = Submodel.defineView<UiModel, UiMessage>((model): Html => {
  const h = html<UiMessage>()

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Dialog']),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Basic'],
      ),
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
        slotId: model.dialogDemo.id,
        model: model.dialogDemo,
        view: Dialog.view,
        viewInputs: {
          toView: ({
            dialog,
            backdrop,
            panel,
            closeButton,
            title,
            description,
            isVisible,
          }) =>
            h.dialog(
              [...dialog, h.Class(dialogClassName)],
              isVisible
                ? [
                    h.div([...backdrop, h.Class(backdropClassName)], []),
                    h.div(
                      [...panel, h.Class(panelClassName)],
                      [dialogPanel(closeButton, title, description)],
                    ),
                  ]
                : [],
            ),
        },
        toParentMessage: message => GotDialogDemoMessage({ message }),
      }),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Animated'],
      ),
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
        slotId: model.dialogAnimatedDemo.id,
        model: model.dialogAnimatedDemo,
        view: Dialog.view,
        viewInputs: {
          toView: ({
            dialog,
            backdrop,
            panel,
            closeButton,
            title,
            description,
            isVisible,
          }) =>
            h.dialog(
              [...dialog, h.Class(dialogClassName)],
              isVisible
                ? [
                    h.div(
                      [...backdrop, h.Class(animatedBackdropClassName)],
                      [],
                    ),
                    h.div(
                      [...panel, h.Class(animatedPanelClassName)],
                      [dialogPanel(closeButton, title, description)],
                    ),
                  ]
                : [],
            ),
        },
        toParentMessage: message => GotDialogAnimatedDemoMessage({ message }),
      }),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Field'],
      ),
      overlayDemo(
        model.overlayDialogDemo,
        model.overlayComboboxDemo,
        model.maybeOverlayComboboxDemoSelectedCity,
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Stacked'],
      ),
      nestedDemo(model.nestedDialogParentDemo, model.nestedDialogChildDemo),
    ],
  )
})
