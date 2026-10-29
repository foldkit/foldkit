import { Option } from 'effect'
import type { Html } from 'foldkit/html'

import { DialogBlock } from '@foldkit/ui'
import type { RenderInfo as DialogRenderInfo } from '@foldkit/ui/dialog'

import { CityComboboxBlock } from '../combobox'
import type { UiViewBuilder } from '../composition'
import {
  DialogAnimatedDemoBinding,
  DialogDemoBinding,
  NestedDialogChildDemoBinding,
  NestedDialogParentDemoBinding,
  OverlayComboboxDemoBinding,
  OverlayDialogDemoBinding,
} from '../composition'
import type { City } from '../domain/domain'
import { Message } from '../message'
import { comboboxViewInputs } from './combobox'

type CityComboboxBlockModel = typeof CityComboboxBlock.Model.Type
type DialogBlockModel = typeof DialogBlock.Model.Type

// DEMO CONTENT

const triggerClassName = 'demo-neutral-button'

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

const descriptionClassName = 'text-gray-700 dark:text-gray-300 mb-4'

const dialogClassName =
  'bg-transparent p-0 open:flex items-center justify-center'

const actionsClassName = 'flex gap-2 justify-end'

const cancelButtonClassName = 'demo-neutral-button'

const confirmButtonClassName =
  'button-accent px-4 py-2 text-base cursor-pointer rounded-lg'

const dangerButtonClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg bg-red-600 text-white hover:bg-red-700'

const OVERLAY_COMBOBOX_ANCHOR = {
  placement: 'bottom-start' as const,
  gap: 8,
  padding: 8,
}

// PANEL CONTENT

const trigger = (label: string, message: Message, h: UiViewBuilder) =>
  h.div(
    [h.Class('flex gap-3')],
    [h.button([h.Class(triggerClassName), h.OnClick(message)], [label])],
  )

const confirmContent = (
  title: DialogRenderInfo['title'],
  description: DialogRenderInfo['description'],
  closeButton: DialogRenderInfo['closeButton'],
  descriptionText: string,
  h: UiViewBuilder,
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
  title: DialogRenderInfo['title'],
  description: DialogRenderInfo['description'],
  comboboxModel: CityComboboxBlockModel,
  maybeSelectedCity: Option.Option<City>,
  h: UiViewBuilder,
): Html =>
  h.div(
    [],
    [
      h.h2([...title, h.Class(titleClassName)], ['Edit filters']),
      h.p(
        [...description, h.Class(descriptionClassName)],
        [
          'The combobox panel portals into the dialog, so it renders above the dialog content.',
        ],
      ),
      h.block(
        OverlayComboboxDemoBinding.embedView({
          slotId: comboboxModel.id,
          model: comboboxModel,
          viewInputs: {
            ...comboboxViewInputs({
              inputValue: comboboxModel.inputValue,
              restingInputValue: Option.getOrElse(maybeSelectedCity, () => ''),
              anchor: OVERLAY_COMBOBOX_ANCHOR,
              wrapperClass: 'relative w-full',
            }),
            maybeSelectedValue: maybeSelectedCity,
          },
        }),
      ),
    ],
  )

const projectSettingsContent = (
  title: DialogRenderInfo['title'],
  description: DialogRenderInfo['description'],
  closeButton: DialogRenderInfo['closeButton'],
  h: UiViewBuilder,
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
            [
              h.Class(dangerButtonClassName),
              h.OnClick(Message.ClickedDeleteProject()),
            ],
            ['Delete project'],
          ),
        ],
      ),
    ],
  )

const deleteProjectContent = (
  title: DialogRenderInfo['title'],
  description: DialogRenderInfo['description'],
  closeButton: DialogRenderInfo['closeButton'],
  h: UiViewBuilder,
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

export const view = (dialogModel: DialogBlockModel, h: UiViewBuilder) => {
  return [
    trigger('Open Dialog', Message.ClickedOpenDialog(), h),
    h.block(
      DialogDemoBinding.embedView({
        slotId: dialogModel.id,
        model: dialogModel,
        viewInputs: {
          hasDescription: true,
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
      }),
    ),
  ]
}

export const overlayDialogDemo = (
  dialogModel: DialogBlockModel,
  comboboxModel: CityComboboxBlockModel,
  maybeSelectedCity: Option.Option<City>,
  h: UiViewBuilder,
) => {
  return [
    trigger('Edit filters', Message.ClickedEditFilters(), h),
    h.block(
      OverlayDialogDemoBinding.embedView({
        slotId: dialogModel.id,
        model: dialogModel,
        viewInputs: {
          hasDescription: true,
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
      }),
    ),
  ]
}

export const nestedDialogDemo = (
  parentDialogModel: DialogBlockModel,
  childDialogModel: DialogBlockModel,
  h: UiViewBuilder,
) => {
  return [
    trigger('Open project settings', Message.ClickedOpenProjectSettings(), h),
    h.block(
      NestedDialogParentDemoBinding.embedView({
        slotId: parentDialogModel.id,
        model: parentDialogModel,
        viewInputs: {
          hasDescription: true,
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
      }),
    ),
    h.block(
      NestedDialogChildDemoBinding.embedView({
        slotId: childDialogModel.id,
        model: childDialogModel,
        viewInputs: {
          hasDescription: true,
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
                      [
                        deleteProjectContent(
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
      }),
    ),
  ]
}

export const dialogAnimatedDemo = (
  dialogModel: DialogBlockModel,
  h: UiViewBuilder,
) => {
  return [
    trigger('Open Animated Dialog', Message.ClickedOpenAnimatedDialog(), h),
    h.block(
      DialogAnimatedDemoBinding.embedView({
        slotId: dialogModel.id,
        model: dialogModel,
        viewInputs: {
          hasDescription: true,
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
      }),
    ),
  ]
}
