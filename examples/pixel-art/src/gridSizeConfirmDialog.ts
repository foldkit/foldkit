import { Effect, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button, Dialog } from '@foldkit/ui'

const Model = Schema.Struct({
  dialog: Dialog.Dialog,
  maybePendingGridSize: Schema.Option(Schema.Number),
})

const Message = defineMessageUnion({
  RequestedConfirmation: { size: Schema.Number },
  ConfirmedGridSizeChange: {},
})

const OutMessage = defineMessageUnion({
  ConfirmedGridSizeChange: { size: Schema.Number },
})

export class GridSizeConfirmDialog extends Block<GridSizeConfirmDialog>()(
  'GridSizeConfirmDialog',
  { Model, Message, OutMessage },
) {}

export const GridSizeConfirmDialogLive = GridSizeConfirmDialog.make(
  Effect.fn(function* () {
    const dialog = yield* new Dialog.Dialog('dialog', {
      id: 'grid-size-confirm-dialog',
    })

    return {
      model: { dialog, maybePendingGridSize: Option.none() },

      update: {
        RequestedConfirmation: (model, { size }) => ({
          model: modifyFields(model, {
            maybePendingGridSize: () => Option.some(size),
          }),
          messages: [model.dialog.send(Dialog.Dialog.Message.RequestedOpen())],
        }),

        ConfirmedGridSizeChange: model =>
          Option.match(model.maybePendingGridSize, {
            onNone: () => ({ model }),
            onSome: size => ({
              model,
              outMessage: OutMessage.ConfirmedGridSizeChange({ size }),
              messages: [
                model.dialog.send(Dialog.Dialog.Message.RequestedClose()),
              ],
            }),
          }),

        ...dialog.on({
          Closed: model => ({
            model: modifyFields(model, {
              maybePendingGridSize: () => Option.none(),
            }),
          }),
        }),
      },

      view: (model, h) =>
        model.dialog.view({
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
              [
                ...dialog,
                h.Class(
                  'bg-transparent p-0 open:flex items-center justify-center',
                ),
              ],
              isVisible
                ? [
                    h.div([...backdrop, h.Class('fixed inset-0 bg-black/60')]),
                    h.div(
                      [
                        ...panel,
                        h.Class(
                          'bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-sm relative shadow-xl',
                        ),
                      ],
                      Option.match(model.maybePendingGridSize, {
                        onNone: () => [],
                        onSome: pendingSize => [
                          h.h2(
                            [
                              ...title,
                              h.Class(
                                'text-lg font-semibold text-gray-100 mb-2',
                              ),
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
        }),
    }
  }),
)
