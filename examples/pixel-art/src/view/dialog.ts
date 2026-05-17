import { Option } from 'effect'
import { Ui } from 'foldkit'
import { type Html, html } from 'foldkit/html'

import {
  ConfirmedGridSizeChange,
  DismissedErrorDialog,
  DismissedGridSizeConfirmDialog,
  GotErrorDialogMessage,
  GotGridSizeConfirmDialogMessage,
  type Message,
} from '../message'

const errorDialogMessageToMessage = (message: Ui.Dialog.Message): Message =>
  GotErrorDialogMessage({ message })

const confirmDialogMessageToMessage = (message: Ui.Dialog.Message): Message =>
  GotGridSizeConfirmDialogMessage({ message })

export const errorDialogView = (
  errorDialog: typeof Ui.Dialog.Model.Type,
  maybeExportError: Option.Option<string>,
): Html => {
  const h = html<Message>()

  return Ui.Dialog.view({
    model: errorDialog,
    toParentMessage: errorDialogMessageToMessage,
    onClosed: () => DismissedErrorDialog(),
    attributes: [
      h.Class(
        'backdrop:bg-transparent bg-transparent p-0 open:flex items-center justify-center',
      ),
    ],
    backdropAttributes: [h.Class('fixed inset-0 bg-black/60')],
    panelAttributes: [
      h.Class(
        'bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-sm relative shadow-xl',
      ),
    ],
    panelContent: Option.match(maybeExportError, {
      onNone: () => h.empty,
      onSome: error =>
        h.div(
          [],
          [
            h.h2(
              [
                h.Class('text-lg font-semibold text-red-400 mb-2'),
                h.Id(Ui.Dialog.titleId(errorDialog)),
              ],
              ['Export Failed'],
            ),
            h.p(
              [
                h.Class('text-sm text-gray-400 mb-4'),
                h.Id(Ui.Dialog.descriptionId(errorDialog)),
              ],
              [error],
            ),
            Ui.Button.view({
              onClick: DismissedErrorDialog(),
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      'w-full px-4 py-2 bg-gray-800 text-gray-200 rounded hover:bg-gray-700 transition motion-reduce:transition-none cursor-pointer',
                    ),
                  ],
                  ['Dismiss'],
                ),
            }),
          ],
        ),
    }),
  })
}

export const gridSizeConfirmDialogView = (
  gridSizeConfirmDialog: typeof Ui.Dialog.Model.Type,
  maybePendingGridSize: Option.Option<number>,
): Html => {
  const h = html<Message>()

  return Ui.Dialog.view({
    model: gridSizeConfirmDialog,
    toParentMessage: confirmDialogMessageToMessage,
    onClosed: () => DismissedGridSizeConfirmDialog(),
    attributes: [
      h.Class(
        'backdrop:bg-transparent bg-transparent p-0 open:flex items-center justify-center',
      ),
    ],
    backdropAttributes: [h.Class('fixed inset-0 bg-black/60')],
    panelAttributes: [
      h.Class(
        'bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-sm relative shadow-xl',
      ),
    ],
    panelContent: Option.match(maybePendingGridSize, {
      onNone: () => h.empty,
      onSome: pendingSize =>
        h.div(
          [],
          [
            h.h2(
              [
                h.Class('text-lg font-semibold text-gray-100 mb-2'),
                h.Id(Ui.Dialog.titleId(gridSizeConfirmDialog)),
              ],
              [`Change to ${pendingSize}×${pendingSize}?`],
            ),
            h.p(
              [
                h.Class('text-sm text-gray-400 mb-5'),
                h.Id(Ui.Dialog.descriptionId(gridSizeConfirmDialog)),
              ],
              ['This will clear your canvas and reset undo history.'],
            ),
            h.div(
              [h.Class('flex gap-3')],
              [
                Ui.Button.view({
                  onClick: DismissedGridSizeConfirmDialog(),
                  toView: attributes =>
                    h.button(
                      [
                        ...attributes.button,
                        h.Class(
                          'flex-1 px-4 py-2 bg-gray-800 text-gray-200 rounded hover:bg-gray-700 transition motion-reduce:transition-none cursor-pointer',
                        ),
                      ],
                      ['Cancel'],
                    ),
                }),
                Ui.Button.view({
                  onClick: ConfirmedGridSizeChange(),
                  toView: attributes =>
                    h.button(
                      [
                        ...attributes.button,
                        h.Class(
                          'flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition motion-reduce:transition-none cursor-pointer',
                        ),
                      ],
                      ['Clear and Resize'],
                    ),
                }),
              ],
            ),
          ],
        ),
    }),
  })
}
