import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Combobox, Dialog } from '@foldkit/ui'

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

const descriptionClassName = 'text-gray-600 dark:text-gray-300 mb-4'

const dialogClassName =
  'bg-transparent p-0 open:flex items-center justify-center'

const actionsClassName = 'flex gap-2 justify-end'

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

// PANEL CONTENT

const trigger = (label: string, message: Message, h: HtmlBuilder<Message>) =>
  h.div(
    [h.Class('flex gap-3')],
    [h.button([h.Class(triggerClassName), h.OnClick(message)], [label])],
  )

const confirmContent = (
  title: Dialog.RenderInfo['title'],
  description: Dialog.RenderInfo['description'],
  closeButton: Dialog.RenderInfo['closeButton'],
  descriptionText: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [],
    [
      h.h2([...title, h.Class(titleClassName)], ['Confirm Action']),
      h.p([...description, h.Class(descriptionClassName)], [descriptionText]),
      h.div(
        [h.Class(actionsClassName)],
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

const editFiltersContent = (
  title: Dialog.RenderInfo['title'],
  description: Dialog.RenderInfo['description'],
  comboboxModel: Combobox.Model,
  maybeSelectedCity: Option.Option<City>,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [],
    [
      h.h2([...title, h.Class(titleClassName)], ['Edit filters']),
      h.p(
        [...description, h.Class(descriptionClassName)],
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
            restingInputValue: Option.getOrElse(maybeSelectedCity, () => ''),
            anchor: OVERLAY_COMBOBOX_ANCHOR,
            wrapperClass: 'relative w-full',
          }),
          maybeSelectedValue: maybeSelectedCity,
        },
        toParentMessage: message => GotOverlayComboboxDemoMessage({ message }),
      }),
    ],
  )

const projectSettingsContent = (
  title: Dialog.RenderInfo['title'],
  description: Dialog.RenderInfo['description'],
  closeButton: Dialog.RenderInfo['closeButton'],
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [],
    [
      h.h2([...title, h.Class(titleClassName)], ['Project settings']),
      h.p(
        [...description, h.Class(descriptionClassName)],
        [
          'Deleting the project removes all of its data. The confirmation opens as a second dialog stacked on top of this one.',
        ],
      ),
      h.div(
        [h.Class(actionsClassName)],
        [
          h.button([...closeButton, h.Class(cancelButtonClassName)], ['Close']),
          h.button(
            [h.Class(dangerButtonClassName), h.OnClick(ClickedDeleteProject())],
            ['Delete project'],
          ),
        ],
      ),
    ],
  )

const deleteProjectContent = (
  title: Dialog.RenderInfo['title'],
  description: Dialog.RenderInfo['description'],
  closeButton: Dialog.RenderInfo['closeButton'],
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [],
    [
      h.h2([...title, h.Class(titleClassName)], ['Delete project?']),
      h.p(
        [...description, h.Class(descriptionClassName)],
        [
          'This permanently deletes the project and cannot be undone. Escape closes this confirmation first, then the settings dialog.',
        ],
      ),
      h.div(
        [h.Class(actionsClassName)],
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
  )

// VIEW

export const dialogDemo = (
  dialogModel: Dialog.Model,
  h: HtmlBuilder<Message>,
) => {
  return [
    trigger('Open Dialog', ClickedOpenDialog(), h),
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
                  h.div([...backdrop, h.Class(backdropClassName)]),
                  h.div(
                    [...panel, h.Class(panelClassName)],
                    [
                      confirmContent(
                        title,
                        description,
                        closeButton,
                        'Are you sure you want to proceed? This action demonstrates the Dialog component with focus trapping, backdrop click, and Escape key handling.',
                        h,
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
  h: HtmlBuilder<Message>,
) => {
  return [
    trigger('Edit filters', ClickedEditFilters(), h),
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
                  h.div([...backdrop, h.Class(backdropClassName)]),
                  h.div(
                    [...panel, h.Class(panelClassName)],
                    [
                      editFiltersContent(
                        title,
                        description,
                        comboboxModel,
                        maybeSelectedCity,
                        h,
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
  h: HtmlBuilder<Message>,
) => {
  return [
    trigger('Open project settings', ClickedOpenProjectSettings(), h),
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
                  h.div([...backdrop, h.Class(backdropClassName)]),
                  h.div(
                    [...panel, h.Class(settingsPanelClassName)],
                    [
                      projectSettingsContent(
                        title,
                        description,
                        closeButton,
                        h,
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
                  h.div([...backdrop, h.Class(backdropClassName)]),
                  h.div(
                    [...panel, h.Class(confirmPanelClassName)],
                    [deleteProjectContent(title, description, closeButton, h)],
                  ),
                ]
              : [],
          ),
      },
      toParentMessage: message => GotNestedDialogChildDemoMessage({ message }),
    }),
  ]
}

export const dialogAnimatedDemo = (
  dialogModel: Dialog.Model,
  h: HtmlBuilder<Message>,
) => {
  return [
    trigger('Open Animated Dialog', ClickedOpenAnimatedDialog(), h),
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
                  h.div([...backdrop, h.Class(animatedBackdropClassName)]),
                  h.div(
                    [...panel, h.Class(animatedPanelClassName)],
                    [
                      confirmContent(
                        title,
                        description,
                        closeButton,
                        'This dialog uses CSS transitions coordinated by the TransitionState machine: a fade on the backdrop and a scale-up on the panel. Content stays mounted during exit so both enter and leave transitions play smoothly.',
                        h,
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
