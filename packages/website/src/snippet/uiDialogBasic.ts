import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Dialog } from '@foldkit/ui'
import type { RenderInfo as DialogRenderInfo } from '@foldkit/ui/dialog'

const Message = defineMessageUnion({
  ClickedOpenDialog: {},
})

export class Settings extends Block<Settings>()('Settings', {
  Model: Schema.Struct({ dialog: Dialog.Dialog }),
  Message,
}) {}

export const SettingsLive = Settings.make(
  Effect.fn(function* () {
    // Declare the Dialog instance and hold it in the Model
    const dialog = yield* new Dialog.Dialog('dialog', { id: 'confirm' })

    return {
      model: { dialog },

      update: {
        // Open the Dialog by sending it a Message
        ClickedOpenDialog: model => ({
          model,
          messages: [model.dialog.send(Dialog.Dialog.Message.RequestedOpen())],
        }),
      },

      view: (model, h) => {
        const dialogView = ({
          dialog,
          backdrop,
          panel,
          title,
          description,
          closeButton,
          isVisible,
        }: DialogRenderInfo) =>
          h.dialog(
            [...dialog],
            isVisible
              ? [
                  h.div([...backdrop, h.Class('fixed inset-0 bg-black/50')]),
                  h.div(
                    [
                      ...panel,
                      h.Class('rounded-lg p-6 max-w-md mx-auto shadow-xl'),
                    ],
                    [
                      h.h2([...title], ['Confirm Action']),
                      h.p(
                        [...description],
                        ['Are you sure you want to proceed?'],
                      ),
                      h.button(
                        [
                          ...closeButton,
                          h.Class('px-4 py-2 rounded-lg border'),
                        ],
                        ['Cancel'],
                      ),
                    ],
                  ),
                ]
              : [],
          )

        return h.div(
          [],
          [
            h.button([h.OnClick(Message.ClickedOpenDialog())], ['Open Dialog']),
            model.dialog.view({ hasDescription: true, toView: dialogView }),
          ],
        )
      },
    }
  }),
).pipe(Layer.provide(Dialog.DialogLive))
