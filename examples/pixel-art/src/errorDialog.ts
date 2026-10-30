import { Effect, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Dialog } from '@foldkit/ui'

const Model = Schema.Struct({
  dialog: Dialog.Dialog,
  maybeExportError: Schema.Option(Schema.String),
})

const Message = defineMessageUnion({
  RequestedShowError: { error: Schema.String },
})

export class ErrorDialog extends Block<ErrorDialog>()('ErrorDialog', {
  Model,
  Message,
}) {}

export const ErrorDialogLive = ErrorDialog.make(
  Effect.fn(function* () {
    const dialog = yield* new Dialog.Dialog('dialog', {
      id: 'export-error-dialog',
    })

    return {
      model: { dialog, maybeExportError: Option.none() },

      update: {
        RequestedShowError: (model, { error }) => ({
          model: modifyFields(model, {
            maybeExportError: () => Option.some(error),
          }),
          messages: [model.dialog.send(Dialog.Dialog.Message.RequestedOpen())],
        }),

        ...dialog.on({
          Closed: model => ({
            model: modifyFields(model, {
              maybeExportError: () => Option.none(),
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
                      Option.match(model.maybeExportError, {
                        onNone: () => [],
                        onSome: error => [
                          h.h2(
                            [
                              ...title,
                              h.Class(
                                'text-lg font-semibold text-red-400 mb-2',
                              ),
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
        }),
    }
  }),
)
