import { Option } from 'effect'
import type { Html } from 'foldkit/html'

import { Button, DialogBlock } from '@foldkit/ui'

import {
  type ApplicationViewBuilder,
  ErrorDialogBinding as ErrorDialogBinding,
  GridSizeConfirmDialogBinding as GridSizeConfirmDialogBinding,
} from '../composition'
import { Message } from '../message'

type DialogModel = typeof DialogBlock.Model.Type

const dialogClassName =
  'bg-transparent p-0 open:flex items-center justify-center'
const backdropClassName = 'fixed inset-0 bg-black/60'
const panelClassName =
  'bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-sm relative shadow-xl'

export const errorDialogView = (
  errorDialog: DialogModel,
  maybeExportError: Option.Option<string>,
  h: ApplicationViewBuilder,
): Html =>
  h.block(
    ErrorDialogBinding.embedView({
      slotId: errorDialog.id,
      model: errorDialog,
      viewInputs: {
        hasDescription: true,
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
                    Option.match(maybeExportError, {
                      onNone: () => [],
                      onSome: error => [
                        h.h2(
                          [
                            ...title,
                            h.Class('text-lg font-semibold text-red-400 mb-2'),
                          ],
                          ['Export Failed'],
                        ),
                        h.p(
                          [
                            ...description,
                            h.Class('text-sm text-gray-400 mb-4'),
                          ],
                          [error],
                        ),
                        h.button(
                          [
                            ...closeButton,
                            h.Class(
                              'w-full px-4 py-2 bg-gray-800 text-gray-200 rounded hover:bg-gray-700 transition motion-reduce:transition-none cursor-pointer',
                            ),
                          ],
                          ['Dismiss'],
                        ),
                      ],
                    }),
                  ),
                ]
              : [],
          ),
      },
    }),
  )

export const gridSizeConfirmDialogView = (
  gridSizeConfirmDialog: DialogModel,
  maybePendingGridSize: Option.Option<number>,
  h: ApplicationViewBuilder,
): Html =>
  h.block(
    GridSizeConfirmDialogBinding.embedView({
      slotId: gridSizeConfirmDialog.id,
      model: gridSizeConfirmDialog,
      viewInputs: {
        hasDescription: true,
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
                    Option.match(maybePendingGridSize, {
                      onNone: () => [],
                      onSome: pendingSize => [
                        h.h2(
                          [
                            ...title,
                            h.Class('text-lg font-semibold text-gray-100 mb-2'),
                          ],
                          [`Change to ${pendingSize}×${pendingSize}?`],
                        ),
                        h.p(
                          [
                            ...description,
                            h.Class('text-sm text-gray-400 mb-5'),
                          ],
                          [
                            'This will clear your canvas and reset undo history.',
                          ],
                        ),
                        h.div(
                          [h.Class('flex gap-3')],
                          [
                            h.button(
                              [
                                ...closeButton,
                                h.Class(
                                  'flex-1 px-4 py-2 bg-gray-800 text-gray-200 rounded hover:bg-gray-700 transition motion-reduce:transition-none cursor-pointer',
                                ),
                              ],
                              ['Cancel'],
                            ),
                            Button.view(
                              {
                                onClick: Message.ConfirmedGridSizeChange(),
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
                              },
                              h,
                            ),
                          ],
                        ),
                      ],
                    }),
                  ),
                ]
              : [],
          ),
      },
    }),
  )
