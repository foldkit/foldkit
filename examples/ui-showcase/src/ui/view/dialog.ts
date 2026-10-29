import { Option } from 'effect'
import type { Html } from 'foldkit/html'

import { DialogBlock } from '@foldkit/ui'
import type { RenderInfo as DialogRenderInfo } from '@foldkit/ui/dialog'

import { CityComboboxBlock } from '../combobox'
import {
  DialogAnimatedDemoBinding,
  DialogDemoBinding,
  NestedDialogChildDemoBinding,
  NestedDialogParentDemoBinding,
  OverlayComboboxDemoBinding,
  OverlayDialogDemoBinding,
  UiComposition,
} from '../composition'
import type { UiViewBuilder } from '../composition'
import type { City } from '../domain'
import { Message } from '../message'
import { comboboxInputs } from './combobox'

type CityComboboxModel = typeof CityComboboxBlock.Model.Type
type DialogModel = typeof DialogBlock.Model.Type

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
}

// PANEL CONTENT

const trigger = (label: string, message: Message, h: UiViewBuilder): Html =>
  h.div(
    [h.Class(triggerRowClassName)],
    [h.button([h.Class(triggerClassName), h.OnClick(message)], [label])],
  )

const confirmContent = (
  closeButton: DialogRenderInfo['closeButton'],
  title: DialogRenderInfo['title'],
  description: DialogRenderInfo['description'],
  h: UiViewBuilder,
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
  title: DialogRenderInfo['title'],
  description: DialogRenderInfo['description'],
  comboboxModel: CityComboboxModel,
  maybeSelectedCity: Option.Option<City>,
  h: UiViewBuilder,
): ReadonlyArray<Html> => [
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
    }),
  ),
]

const projectSettingsContent = (
  closeButton: DialogRenderInfo['closeButton'],
  title: DialogRenderInfo['title'],
  description: DialogRenderInfo['description'],
  h: UiViewBuilder,
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
        [
          h.Class(dangerButtonClassName),
          h.OnClick(Message.ClickedDeleteProject()),
        ],
        ['Delete project'],
      ),
    ],
  ),
]

const deleteProjectContent = (
  closeButton: DialogRenderInfo['closeButton'],
  title: DialogRenderInfo['title'],
  description: DialogRenderInfo['description'],
  h: UiViewBuilder,
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

const dialogWithPanel = (
  { dialog, backdrop, panel, isVisible }: DialogRenderInfo,
  backdropClassName: string,
  panelClassNameValue: string,
  content: () => ReadonlyArray<Html>,
  h: UiViewBuilder,
): Html =>
  h.dialog(
    [...dialog, h.Class(dialogClassName)],
    isVisible
      ? [
          h.div([...backdrop, h.Class(backdropClassName)]),
          h.div([...panel, h.Class(panelClassNameValue)], content()),
        ]
      : [],
  )

const basicDemo = (dialogModel: DialogModel, h: UiViewBuilder) => {
  const basicDialogView = (render: DialogRenderInfo): Html =>
    dialogWithPanel(
      render,
      backdropClassName,
      panelClassName,
      () => [
        confirmContent(render.closeButton, render.title, render.description, h),
      ],
      h,
    )

  return h.block(
    DialogDemoBinding.embedView({
      slotId: dialogModel.id,
      model: dialogModel,
      viewInputs: {
        hasDescription: true,
        toView: basicDialogView,
      },
    }),
  )
}

const animatedDemo = (dialogModel: DialogModel, h: UiViewBuilder) => {
  const animatedDialogView = (render: DialogRenderInfo): Html =>
    dialogWithPanel(
      render,
      animatedBackdropClassName,
      animatedPanelClassName,
      () => [
        confirmContent(render.closeButton, render.title, render.description, h),
      ],
      h,
    )

  return h.block(
    DialogAnimatedDemoBinding.embedView({
      slotId: dialogModel.id,
      model: dialogModel,
      viewInputs: {
        hasDescription: true,
        toView: animatedDialogView,
      },
    }),
  )
}

const overlayDemo = (
  dialogModel: DialogModel,
  comboboxModel: CityComboboxModel,
  maybeSelectedCity: Option.Option<City>,
  h: UiViewBuilder,
): Html => {
  const overlayDialogView = (render: DialogRenderInfo): Html =>
    dialogWithPanel(
      render,
      backdropClassName,
      panelClassName,
      () =>
        editFiltersContent(
          render.title,
          render.description,
          comboboxModel,
          maybeSelectedCity,
          h,
        ),
      h,
    )

  return h.div(
    [],
    [
      trigger('Edit filters', Message.ClickedEditFilters(), h),
      h.block(
        OverlayDialogDemoBinding.embedView({
          slotId: dialogModel.id,
          model: dialogModel,
          viewInputs: {
            hasDescription: true,
            toView: overlayDialogView,
          },
        }),
      ),
    ],
  )
}

const nestedDemo = (
  parentDialogModel: DialogModel,
  childDialogModel: DialogModel,
  h: UiViewBuilder,
): Html => {
  const settingsDialogView = (render: DialogRenderInfo): Html =>
    dialogWithPanel(
      render,
      backdropClassName,
      settingsPanelClassName,
      () =>
        projectSettingsContent(
          render.closeButton,
          render.title,
          render.description,
          h,
        ),
      h,
    )

  const deleteProjectDialogView = (render: DialogRenderInfo): Html =>
    dialogWithPanel(
      render,
      backdropClassName,
      confirmPanelClassName,
      () =>
        deleteProjectContent(
          render.closeButton,
          render.title,
          render.description,
          h,
        ),
      h,
    )

  return h.div(
    [],
    [
      trigger('Open project settings', Message.ClickedOpenProjectSettings(), h),
      h.block(
        NestedDialogParentDemoBinding.embedView({
          slotId: parentDialogModel.id,
          model: parentDialogModel,
          viewInputs: {
            hasDescription: true,
            toView: settingsDialogView,
          },
        }),
      ),
      h.block(
        NestedDialogChildDemoBinding.embedView({
          slotId: childDialogModel.id,
          model: childDialogModel,
          viewInputs: {
            hasDescription: true,
            toView: deleteProjectDialogView,
          },
        }),
      ),
    ],
  )
}

export const view = UiComposition.makeView((model, h) => {
  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Dialog']),

      h.h3([h.Class(sectionHeadingClassName)], ['Basic']),
      trigger('Open Dialog', Message.ClickedOpenDialog(), h),
      basicDemo(model.dialogDemo, h),

      h.h3([h.Class(sectionHeadingClassName)], ['Animated']),
      trigger('Open Animated Dialog', Message.ClickedOpenAnimatedDialog(), h),
      animatedDemo(model.dialogAnimatedDemo, h),

      h.h3([h.Class(sectionHeadingClassName)], ['Field']),
      overlayDemo(
        model.overlayDialogDemo,
        model.overlayComboboxDemo,
        model.maybeOverlayComboboxDemoSelectedCity,
        h,
      ),

      h.h3([h.Class(sectionHeadingClassName)], ['Stacked']),
      nestedDemo(model.nestedDialogParentDemo, model.nestedDialogChildDemo, h),
    ],
  )
})
