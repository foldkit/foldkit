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
    // isAnimated: true coordinates the open and close transitions
    const dialog = yield* new Dialog.Dialog('dialog', {
      id: 'confirm',
      isAnimated: true,
    })

    return {
      model: { dialog },

      update: {
        ClickedOpenDialog: model => ({
          model,
          messages: [model.dialog.send(Dialog.Dialog.Message.RequestedOpen())],
        }),
      },

      view: (model, h) => {
        // Use data-[closed] for enter and leave transitions
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
            [
              ...dialog,
              h.Class(
                'bg-transparent p-0 open:flex items-center justify-center',
              ),
            ],
            isVisible
              ? [
                  h.div([
                    ...backdrop,
                    h.Class(
                      'fixed inset-0 bg-black/50 transition duration-150 ease-out data-[closed]:opacity-0',
                    ),
                  ]),
                  h.div(
                    [
                      ...panel,
                      h.Class(
                        'rounded-lg p-6 max-w-md mx-auto shadow-xl transition duration-150 ease-out data-[closed]:opacity-0 data-[closed]:scale-95',
                      ),
                    ],
                    [
                      h.h2([...title], ['Confirm Action']),
                      h.p(
                        [...description],
                        ['Are you sure you want to proceed?'],
                      ),
                      h.div(
                        [h.Class('flex gap-2 justify-end mt-4')],
                        [
                          h.button(
                            [
                              ...closeButton,
                              h.Class('px-4 py-2 rounded-lg border'),
                            ],
                            ['Cancel'],
                          ),
                          h.button(
                            [
                              ...closeButton,
                              h.Class(
                                'px-4 py-2 rounded-lg bg-blue-600 text-white',
                              ),
                            ],
                            ['Confirm'],
                          ),
                        ],
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
