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

const { button, div, empty, h2, p, Class, Id } = html<Message>()

const toErrorDialogMessage = (message: Ui.Dialog.Message): Message =>
  GotErrorDialogMessage({ message })

const toGridSizeConfirmDialogMessage = (message: Ui.Dialog.Message): Message =>
  GotGridSizeConfirmDialogMessage({ message })

export const errorDialogView = (
  errorDialog: typeof Ui.Dialog.Model.Type,
  maybeExportError: Option.Option<string>,
): Html =>
  Ui.Dialog.view({
    model: errorDialog,
    toParentMessage: toErrorDialogMessage,
    onClosed: () => DismissedErrorDialog(),
    attributes: [
      Class(
        'backdrop:bg-transparent bg-transparent p-0 open:flex items-center justify-center',
      ),
    ],
    backdropAttributes: [Class('fixed inset-0 bg-black/60')],
    panelAttributes: [
      Class(
        'bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-sm relative shadow-xl',
      ),
    ],
    panelContent: Option.match(maybeExportError, {
      onNone: () => empty,
      onSome: error =>
        div(
          [],
          [
            h2(
              [
                Class('text-lg font-semibold text-red-400 mb-2'),
                Id(Ui.Dialog.titleId(errorDialog)),
              ],
              ['Export Failed'],
            ),
            p(
              [
                Class('text-sm text-gray-400 mb-4'),
                Id(Ui.Dialog.descriptionId(errorDialog)),
              ],
              [error],
            ),
            Ui.Button.view({
              onClick: DismissedErrorDialog(),
              toView: attributes =>
                button(
                  [
                    ...attributes.button,
                    Class(
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

export const gridSizeConfirmDialogView = (
  gridSizeConfirmDialog: typeof Ui.Dialog.Model.Type,
  maybePendingGridSize: Option.Option<number>,
): Html =>
  Ui.Dialog.view({
    model: gridSizeConfirmDialog,
    toParentMessage: toGridSizeConfirmDialogMessage,
    onClosed: () => DismissedGridSizeConfirmDialog(),
    attributes: [
      Class(
        'backdrop:bg-transparent bg-transparent p-0 open:flex items-center justify-center',
      ),
    ],
    backdropAttributes: [Class('fixed inset-0 bg-black/60')],
    panelAttributes: [
      Class(
        'bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-sm relative shadow-xl',
      ),
    ],
    panelContent: Option.match(maybePendingGridSize, {
      onNone: () => empty,
      onSome: pendingSize =>
        div(
          [],
          [
            h2(
              [
                Class('text-lg font-semibold text-gray-100 mb-2'),
                Id(Ui.Dialog.titleId(gridSizeConfirmDialog)),
              ],
              [`Change to ${pendingSize}\u00d7${pendingSize}?`],
            ),
            p(
              [
                Class('text-sm text-gray-400 mb-5'),
                Id(Ui.Dialog.descriptionId(gridSizeConfirmDialog)),
              ],
              ['This will clear your canvas and reset undo history.'],
            ),
            div(
              [Class('flex gap-3')],
              [
                Ui.Button.view({
                  onClick: DismissedGridSizeConfirmDialog(),
                  toView: attributes =>
                    button(
                      [
                        ...attributes.button,
                        Class(
                          'flex-1 px-4 py-2 bg-gray-800 text-gray-200 rounded hover:bg-gray-700 transition motion-reduce:transition-none cursor-pointer',
                        ),
                      ],
                      ['Cancel'],
                    ),
                }),
                Ui.Button.view({
                  onClick: ConfirmedGridSizeChange(),
                  toView: attributes =>
                    button(
                      [
                        ...attributes.button,
                        Class(
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
