import { Option } from 'effect'
import { Submodel } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

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

const descriptionClassName = 'text-gray-600 mb-4'

const dialogClassName =
  'bg-transparent p-0 open:flex items-center justify-center'

const actionsClassName = 'flex gap-2 justify-end'

const triggerRowClassName = 'flex gap-3'

const sectionHeadingClassName = 'text-lg font-semibold text-gray-900 mt-8 mb-4'

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

// PANEL CONTENT

const trigger = (
  label: string,
  message: UiMessage,
  h: HtmlBuilder<UiMessage>,
): Html =>
  h.div(
    [h.Class(triggerRowClassName)],
    [h.button([h.Class(triggerClassName), h.OnClick(message)], [label])],
  )

const confirmContent = (
  closeButton: Dialog.RenderInfo['closeButton'],
  title: Dialog.RenderInfo['title'],
  description: Dialog.RenderInfo['description'],
  h: HtmlBuilder<UiMessage>,
): Html =>
  h.div(
    [],
    [
      h.h2([...title, h.Class(titleClassName)], ['Confirm Action']),
      h.p(
        [...description, h.Class(descriptionClassName)],
        [
          'Are you sure you want to proceed? This action demonstrates the Dialog component with focus trapping, backdrop click, and Escape key handling.',
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
  h: HtmlBuilder<UiMessage>,
): ReadonlyArray<Html> => [
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
      ...comboboxInputs(
        {
          inputValue: comboboxModel.inputValue,
          restingInputValue: Option.getOrElse(maybeSelectedCity, () => ''),
          anchor: OVERLAY_COMBOBOX_ANCHOR,
          wrapperClass: 'relative w-full',
        },
        h,
      ),
      maybeSelectedValue: maybeSelectedCity,
    },
    toParentMessage: message => GotOverlayComboboxDemoMessage({ message }),
  }),
]

const projectSettingsContent = (
  closeButton: Dialog.RenderInfo['closeButton'],
  title: Dialog.RenderInfo['title'],
  description: Dialog.RenderInfo['description'],
  h: HtmlBuilder<UiMessage>,
): ReadonlyArray<Html> => [
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
]

const deleteProjectContent = (
  closeButton: Dialog.RenderInfo['closeButton'],
  title: Dialog.RenderInfo['title'],
  description: Dialog.RenderInfo['description'],
  h: HtmlBuilder<UiMessage>,
): ReadonlyArray<Html> => [
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
      h.button([...closeButton, h.Class(cancelButtonClassName)], ['Cancel']),
      h.button([...closeButton, h.Class(dangerButtonClassName)], ['Delete']),
    ],
  ),
]

// DEMOS

const basicDemo = (
  dialogModel: Dialog.Model,
  h: HtmlBuilder<UiMessage>,
): Html =>
  h.submodel({
    slotId: dialogModel.id,
    model: dialogModel,
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
                h.div([...backdrop, h.Class(backdropClassName)]),
                h.div(
                  [...panel, h.Class(panelClassName)],
                  [confirmContent(closeButton, title, description, h)],
                ),
              ]
            : [],
        ),
    },
    toParentMessage: message => GotDialogDemoMessage({ message }),
  })

const animatedDemo = (
  dialogModel: Dialog.Model,
  h: HtmlBuilder<UiMessage>,
): Html =>
  h.submodel({
    slotId: dialogModel.id,
    model: dialogModel,
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
                h.div([...backdrop, h.Class(animatedBackdropClassName)]),
                h.div(
                  [...panel, h.Class(animatedPanelClassName)],
                  [confirmContent(closeButton, title, description, h)],
                ),
              ]
            : [],
        ),
    },
    toParentMessage: message => GotDialogAnimatedDemoMessage({ message }),
  })

const overlayDemo = (
  dialogModel: Dialog.Model,
  comboboxModel: Combobox.Model,
  maybeSelectedCity: Option.Option<City>,
  h: HtmlBuilder<UiMessage>,
): Html =>
  h.div(
    [],
    [
      trigger('Edit filters', ClickedEditFilters(), h),
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
                    h.div([...backdrop, h.Class(backdropClassName)]),
                    h.div(
                      [...panel, h.Class(panelClassName)],
                      editFiltersContent(
                        title,
                        description,
                        comboboxModel,
                        maybeSelectedCity,
                        h,
                      ),
                    ),
                  ]
                : [],
            ),
        },
        toParentMessage: message => GotOverlayDialogDemoMessage({ message }),
      }),
    ],
  )

const nestedDemo = (
  parentDialogModel: Dialog.Model,
  childDialogModel: Dialog.Model,
  h: HtmlBuilder<UiMessage>,
): Html =>
  h.div(
    [],
    [
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
            closeButton,
            title,
            description,
            isVisible,
          }) =>
            h.dialog(
              [...dialog, h.Class(dialogClassName)],
              isVisible
                ? [
                    h.div([...backdrop, h.Class(backdropClassName)]),
                    h.div(
                      [...panel, h.Class(settingsPanelClassName)],
                      projectSettingsContent(
                        closeButton,
                        title,
                        description,
                        h,
                      ),
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
                    h.div([...backdrop, h.Class(backdropClassName)]),
                    h.div(
                      [...panel, h.Class(confirmPanelClassName)],
                      deleteProjectContent(closeButton, title, description, h),
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

// VIEW

export const view = Submodel.defineView<UiModel, UiMessage>(
  (model, h): Html => {
    return h.div(
      [],
      [
        h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Dialog']),

        h.h3([h.Class(sectionHeadingClassName)], ['Basic']),
        trigger('Open Dialog', ClickedOpenDialog(), h),
        basicDemo(model.dialogDemo, h),

        h.h3([h.Class(sectionHeadingClassName)], ['Animated']),
        trigger('Open Animated Dialog', ClickedOpenAnimatedDialog(), h),
        animatedDemo(model.dialogAnimatedDemo, h),

        h.h3([h.Class(sectionHeadingClassName)], ['Field']),
        overlayDemo(
          model.overlayDialogDemo,
          model.overlayComboboxDemo,
          model.maybeOverlayComboboxDemoSelectedCity,
          h,
        ),

        h.h3([h.Class(sectionHeadingClassName)], ['Stacked']),
        nestedDemo(
          model.nestedDialogParentDemo,
          model.nestedDialogChildDemo,
          h,
        ),
      ],
    )
  },
)
