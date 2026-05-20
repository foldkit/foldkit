import { Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'

import {
  GotDialogAnimatedDemoMessage,
  GotDialogDemoMessage,
  type UiMessage,
} from '../message'
import type { UiModel } from '../model'

const triggerClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-100 select-none'

const backdropClassName = 'fixed inset-0 bg-black/50'

const animatedBackdropClassName =
  'fixed inset-0 bg-black/50 transition duration-150 ease-out data-[closed]:opacity-0'

const panelClassName =
  'bg-white rounded-lg p-6 max-w-md mx-auto relative shadow-xl'

const animatedPanelClassName =
  'bg-white rounded-lg p-6 max-w-md mx-auto relative shadow-xl transition duration-150 ease-out data-[closed]:opacity-0 data-[closed]:scale-95'

const titleClassName = 'text-lg font-normal text-gray-900 mb-2'

const dialogClassName =
  'backdrop:bg-transparent bg-transparent p-0 open:flex items-center justify-center'

const cancelButtonClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100'

const confirmButtonClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg bg-accent-600 text-white hover:bg-accent-700'

const dialogPanel = <ParentMessage>(
  dialogModel: Ui.Dialog.Model,
  toDialogMessage: (message: Ui.Dialog.Message) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  return h.div(
    [],
    [
      h.h2(
        [h.Class(titleClassName), h.Id(Ui.Dialog.titleId(dialogModel))],
        ['Confirm Action'],
      ),
      h.p(
        [h.Class('text-gray-600 mb-4')],
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
              h.OnClick(toDialogMessage(Ui.Dialog.Closed())),
            ],
            ['Cancel'],
          ),
          h.button(
            [
              h.Class(confirmButtonClassName),
              h.OnClick(toDialogMessage(Ui.Dialog.Closed())),
            ],
            ['Confirm'],
          ),
        ],
      ),
    ],
  )
}

export const view = <ParentMessage>(
  model: UiModel,
  toParentMessage: (message: UiMessage) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  const toDialogMessage = (message: Ui.Dialog.Message) =>
    toParentMessage(GotDialogDemoMessage({ message }))

  const toAnimatedDialogMessage = (message: Ui.Dialog.Message) =>
    toParentMessage(GotDialogAnimatedDemoMessage({ message }))

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
            [
              h.Class(triggerClassName),
              h.OnClick(toDialogMessage(Ui.Dialog.Opened())),
            ],
            ['Open Dialog'],
          ),
        ],
      ),
      Ui.Dialog.view({
        model: model.dialogDemo,
        toParentMessage: toDialogMessage,
        panelContent: dialogPanel<ParentMessage>(
          model.dialogDemo,
          toDialogMessage,
        ),
        panelAttributes: [h.Class(panelClassName)],
        backdropAttributes: [h.Class(backdropClassName)],
        attributes: [h.Class(dialogClassName)],
      }),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Animated'],
      ),
      h.div(
        [h.Class('flex gap-3')],
        [
          h.button(
            [
              h.Class(triggerClassName),
              h.OnClick(toAnimatedDialogMessage(Ui.Dialog.Opened())),
            ],
            ['Open Animated Dialog'],
          ),
        ],
      ),
      Ui.Dialog.view({
        model: model.dialogAnimatedDemo,
        toParentMessage: toAnimatedDialogMessage,
        panelContent: dialogPanel<ParentMessage>(
          model.dialogAnimatedDemo,
          toAnimatedDialogMessage,
        ),
        panelAttributes: [h.Class(animatedPanelClassName)],
        backdropAttributes: [h.Class(animatedBackdropClassName)],
        attributes: [h.Class(dialogClassName)],
      }),
    ],
  )
}
