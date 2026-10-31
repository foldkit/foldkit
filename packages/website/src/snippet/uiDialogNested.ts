import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Dialog } from '@foldkit/ui'
import type { RenderInfo as DialogRenderInfo } from '@foldkit/ui/dialog'

const Message = defineMessageUnion({
  ClickedOpenProjectSettings: {},
  ClickedDeleteProject: {},
  ConfirmedDeleteProject: {},
})

export class ProjectDialogs extends Block<ProjectDialogs>()('ProjectDialogs', {
  Model: Schema.Struct({
    settingsDialog: Dialog.Dialog,
    confirmDialog: Dialog.Dialog,
  }),
  Message,
}) {}

export const ProjectDialogsLive = ProjectDialogs.make(
  Effect.fn(function* () {
    // One Dialog instance per level
    const settingsDialog = yield* new Dialog.Dialog('settingsDialog', {
      id: 'settings',
    })
    const confirmDialog = yield* new Dialog.Dialog('confirmDialog', {
      id: 'confirm-delete',
    })

    return {
      model: { settingsDialog, confirmDialog },

      update: {
        ClickedOpenProjectSettings: model => ({
          model,
          messages: [
            model.settingsDialog.send(Dialog.Dialog.Message.RequestedOpen()),
          ],
        }),

        ClickedDeleteProject: model => ({
          model,
          messages: [
            model.confirmDialog.send(Dialog.Dialog.Message.RequestedOpen()),
          ],
        }),

        ConfirmedDeleteProject: model => ({
          model,
          messages: [
            model.confirmDialog.send(Dialog.Dialog.Message.RequestedClose()),
          ],
        }),
      },

      view: (model, h) => {
        const settingsDialogView = ({
          dialog,
          backdrop,
          panel,
          title,
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
                      h.Class('rounded-lg p-6 max-w-lg mx-auto shadow-xl'),
                    ],
                    [
                      h.h2([...title], ['Project settings']),
                      h.button(
                        [h.OnClick(Message.ClickedDeleteProject())],
                        ['Delete project'],
                      ),
                    ],
                  ),
                ]
              : [],
          )

        const confirmDialogView = ({
          dialog,
          backdrop,
          panel,
          title,
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
                      h.Class('rounded-lg p-6 max-w-sm mx-auto shadow-xl'),
                    ],
                    [
                      h.h2([...title], ['Delete project?']),
                      h.button([...closeButton], ['Cancel']),
                      h.button(
                        [h.OnClick(Message.ConfirmedDeleteProject())],
                        ['Delete'],
                      ),
                    ],
                  ),
                ]
              : [],
          )

        return h.div(
          [],
          [
            h.button(
              [h.OnClick(Message.ClickedOpenProjectSettings())],
              ['Open project settings'],
            ),
            model.settingsDialog.view({ toView: settingsDialogView }),
            model.confirmDialog.view({ toView: confirmDialogView }),
          ],
        )
      },
    }
  }),
).pipe(Layer.provide(Dialog.DialogLive))
