import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Dialog } from '@foldkit/ui'

const Project = Schema.Struct({ name: Schema.String })

const Message = defineMessageUnion({
  SavedProject: { project: Project },
})

export class Editor extends Block<Editor>()('Editor', {
  Model: Schema.Struct({
    dialog: Dialog.Dialog,
    project: Project,
    route: Schema.String,
  }),
  Message,
}) {}

export const EditorLive = Editor.make(
  Effect.fn(function* () {
    const dialog = yield* new Dialog.Dialog('dialog', { id: 'project-editor' })

    return {
      model: { dialog, project: { name: '' }, route: '/projects/new' },

      update: {
        // Saving only asks the Dialog to close
        SavedProject: (model, { project }) => ({
          model: modifyFields(model, { project: () => project }),
          messages: [model.dialog.send(Dialog.Dialog.Message.RequestedClose())],
        }),

        // Every close path, including Escape and the close button, ends here
        ...dialog.on({
          Closed: model => ({
            model: modifyFields(model, { route: () => '/projects' }),
          }),
        }),
      },
    }
  }),
).pipe(Layer.provide(Dialog.DialogLive))
