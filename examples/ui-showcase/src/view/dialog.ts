import { Ui } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Class, Id, OnClick, button, div, h2, h3, p } from '../html'
import type { Message as ParentMessage } from '../main'
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

const dialogClassName = 'backdrop:bg-transparent bg-transparent p-0 m-auto'

const cancelButtonClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100'

const confirmButtonClassName =
  'px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg bg-accent-600 text-white hover:bg-accent-700'

const dialogPanel = (
  dialogModel: Ui.Dialog.Model,
  toDialogMessage: (message: Ui.Dialog.Message) => ParentMessage,
) =>
  div(
    [],
    [
      h2(
        [Class(titleClassName), Id(Ui.Dialog.titleId(dialogModel))],
        ['Confirm Action'],
      ),
      p(
        [Class('text-gray-600 mb-4')],
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
  )

export const view = (
  model: UiModel,
  toMessage: (message: UiMessage) => ParentMessage,
): Html => {
  const toDialogMessage = (message: Ui.Dialog.Message) =>
    toMessage(GotDialogDemoMessage({ message }))

  const toAnimatedDialogMessage = (message: Ui.Dialog.Message) =>
    toMessage(GotDialogAnimatedDemoMessage({ message }))

  return div(
    [],
    [
      h2([Class('text-2xl font-bold text-gray-900 mb-6')], ['Dialog']),

      h3([Class('text-lg font-semibold text-gray-900 mt-8 mb-4')], ['Basic']),
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
        panelContent: dialogPanel(model.dialogDemo, toDialogMessage),
        panelAttributes: [Class(panelClassName)],
        backdropAttributes: [Class(backdropClassName)],
        attributes: [Class(dialogClassName)],
      }),

      h3(
        [Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Animated'],
      ),
      div(
        [Class('flex gap-3')],
        [
          button(
            [
              Class(triggerClassName),
              OnClick(toAnimatedDialogMessage(Ui.Dialog.Opened())),
            ],
            ['Open Animated Dialog'],
          ),
        ],
      ),
      Ui.Dialog.view({
        model: model.dialogAnimatedDemo,
        toMessage: toAnimatedDialogMessage,
        panelContent: dialogPanel(
          model.dialogAnimatedDemo,
          toAnimatedDialogMessage,
        ),
        panelAttributes: [Class(animatedPanelClassName)],
        backdropAttributes: [Class(animatedBackdropClassName)],
        attributes: [Class(dialogClassName)],
      }),
    ],
  )
}
