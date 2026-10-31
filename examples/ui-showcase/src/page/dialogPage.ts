import { Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Dialog } from '@foldkit/ui'
import type { AnchorConfig } from '@foldkit/ui/combobox'
import type { RenderInfo as DialogRenderInfo } from '@foldkit/ui/dialog'

import { City, CityCombobox, comboboxInputs } from '../domain/city'

const Model = Schema.Struct({
  dialogDemo: Dialog.Dialog,
  dialogAnimatedDemo: Dialog.Dialog,
  overlayDialogDemo: Dialog.Dialog,
  overlayComboboxDemo: CityCombobox,
  maybeOverlayComboboxDemoSelectedCity: Schema.Option(City),
  nestedDialogParentDemo: Dialog.Dialog,
  nestedDialogChildDemo: Dialog.Dialog,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedDeleteProject: {},
  ClickedOpenDialog: {},
  ClickedOpenAnimatedDialog: {},
  ClickedEditFilters: {},
  ClickedOpenProjectSettings: {},
})
type Message = typeof Message.Type

export class DialogPage extends Block<DialogPage>()('DialogPage', {
  Model,
  Message,
}) {}

export const DialogPageLive = DialogPage.make(
  Effect.fn(function* () {
    const dialogDemo = yield* new Dialog.Dialog('dialogDemo', {
      id: 'dialog-demo',
    })
    const dialogAnimatedDemo = yield* new Dialog.Dialog('dialogAnimatedDemo', {
      id: 'dialog-animated-demo',
      isAnimated: true,
    })
    const overlayDialogDemo = yield* new Dialog.Dialog('overlayDialogDemo', {
      id: 'overlay-dialog-demo',
    })
    const overlayComboboxDemo = yield* new CityCombobox('overlayComboboxDemo', {
      id: 'overlay-combobox-demo',
    })
    const nestedDialogParentDemo = yield* new Dialog.Dialog(
      'nestedDialogParentDemo',
      { id: 'nested-dialog-parent-demo' },
    )
    const nestedDialogChildDemo = yield* new Dialog.Dialog(
      'nestedDialogChildDemo',
      { id: 'nested-dialog-child-demo' },
    )

    return {
      model: {
        dialogDemo,
        dialogAnimatedDemo,
        overlayDialogDemo,
        overlayComboboxDemo,
        maybeOverlayComboboxDemoSelectedCity: Option.none(),
        nestedDialogParentDemo,
        nestedDialogChildDemo,
      },

      update: {
        ClickedDeleteProject: model => ({
          model,
          messages: [
            model.nestedDialogChildDemo.send(
              Dialog.Dialog.Message.RequestedOpen(),
            ),
          ],
        }),

        ClickedOpenDialog: model => ({
          model,
          messages: [
            model.dialogDemo.send(Dialog.Dialog.Message.RequestedOpen()),
          ],
        }),

        ClickedOpenAnimatedDialog: model => ({
          model,
          messages: [
            model.dialogAnimatedDemo.send(
              Dialog.Dialog.Message.RequestedOpen(),
            ),
          ],
        }),

        ClickedEditFilters: model => ({
          model,
          messages: [
            model.overlayDialogDemo.send(Dialog.Dialog.Message.RequestedOpen()),
          ],
        }),

        ClickedOpenProjectSettings: model => ({
          model,
          messages: [
            model.nestedDialogParentDemo.send(
              Dialog.Dialog.Message.RequestedOpen(),
            ),
          ],
        }),

        ...overlayComboboxDemo.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              maybeOverlayComboboxDemoSelectedCity: () => Option.some(value),
            }),
          }),
          ClearedSelection: model => ({ model }),
        }),
      },

      view,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(Dialog.DialogLive, CityCombobox.Live)))

type CityComboboxModel = Model['overlayComboboxDemo']
type DialogModel = Model['dialogDemo']

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

const OVERLAY_COMBOBOX_ANCHOR: AnchorConfig = {
  placement: 'bottom-start',
  gap: 8,
  padding: 8,
}

// PANEL CONTENT

const trigger = (
  label: string,
  message: Message,
  h: HtmlBuilder<Message, unknown>,
): Html =>
  h.div(
    [h.Class(triggerRowClassName)],
    [h.button([h.Class(triggerClassName), h.OnClick(message)], [label])],
  )

const confirmContent = (
  closeButton: DialogRenderInfo['closeButton'],
  title: DialogRenderInfo['title'],
  description: DialogRenderInfo['description'],
  h: HtmlBuilder<Message, unknown>,
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
  h: HtmlBuilder<Message, unknown>,
): ReadonlyArray<Html> => [
  h.h2([...title, h.Class(titleClassName)], ['Edit filters']),
  h.p(
    [...description, h.Class(descriptionClassName)],
    [
      'The combobox panel portals into the dialog, so it renders above the dialog content.',
    ],
  ),
  comboboxModel.view({
    ...comboboxInputs(
      {
        inputValue: comboboxModel.model.inputValue,
        restingInputValue: Option.getOrElse(maybeSelectedCity, () => ''),
        anchor: OVERLAY_COMBOBOX_ANCHOR,
        wrapperClass: 'relative w-full',
      },
      h,
    ),
    maybeSelectedValue: maybeSelectedCity,
  }),
]

const projectSettingsContent = (
  closeButton: DialogRenderInfo['closeButton'],
  title: DialogRenderInfo['title'],
  description: DialogRenderInfo['description'],
  h: HtmlBuilder<Message, unknown>,
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
  h: HtmlBuilder<Message, unknown>,
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
  h: HtmlBuilder<Message, unknown>,
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

const basicDemo = (
  dialogModel: DialogModel,
  h: HtmlBuilder<Message, unknown>,
) => {
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

  return dialogModel.view({
    hasDescription: true,
    toView: basicDialogView,
  })
}

const animatedDemo = (
  dialogModel: DialogModel,
  h: HtmlBuilder<Message, unknown>,
) => {
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

  return dialogModel.view({
    hasDescription: true,
    toView: animatedDialogView,
  })
}

const overlayDemo = (
  dialogModel: DialogModel,
  comboboxModel: CityComboboxModel,
  maybeSelectedCity: Option.Option<City>,
  h: HtmlBuilder<Message, unknown>,
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
      dialogModel.view({
        hasDescription: true,
        toView: overlayDialogView,
      }),
    ],
  )
}

const nestedDemo = (
  parentDialogModel: DialogModel,
  childDialogModel: DialogModel,
  h: HtmlBuilder<Message, unknown>,
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
      parentDialogModel.view({
        hasDescription: true,
        toView: settingsDialogView,
      }),
      childDialogModel.view({
        hasDescription: true,
        toView: deleteProjectDialogView,
      }),
    ],
  )
}

const view = (model: Model, h: HtmlBuilder<Message, unknown>): Html => {
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
}
