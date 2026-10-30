import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Dialog } from '@foldkit/ui'

const Message = defineMessageUnion({
  ClickedDeleteProject: {},
})

export class DeleteProject extends Block<DeleteProject>()('DeleteProject', {
  Model: Schema.Struct({ dialog: Dialog.Dialog }),
  Message,
}) {}

export const DeleteProjectLive = DeleteProject.make(
  Effect.fn(function* () {
    const dialog = yield* new Dialog.Dialog('dialog', {
      id: 'delete-project',
    })

    return {
      model: { dialog },

      update: {
        ClickedDeleteProject: model => ({
          model,
          messages: [model.dialog.send(Dialog.Dialog.Message.RequestedOpen())],
        }),
      },

      view: (model, h) =>
        h.div(
          [],
          [
            h.button(
              [h.OnClick(Message.ClickedDeleteProject())],
              ['Delete project'],
            ),
            model.dialog.view({
              toView: ({ dialog, panel, title, closeButton, isVisible }) =>
                h.dialog(
                  [...dialog],
                  isVisible
                    ? [
                        h.div(
                          [...panel],
                          [
                            h.h2([...title], ['Delete this project?']),
                            h.button([...closeButton], ['Cancel']),
                          ],
                        ),
                      ]
                    : [],
                ),
            }),
          ],
        ),
    }
  }),
).pipe(Layer.provide(Dialog.DialogLive))
