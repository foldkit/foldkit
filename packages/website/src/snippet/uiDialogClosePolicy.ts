import { Update } from 'foldkit'

import { DialogBlock } from '@foldkit/ui/dialog'

import { EditorBlock, EditorComposition, Message } from './editor/definition'

const foldDialogOutMessage = EditorBlock.makeOutMessageFold(DialogBlock, {
  Opened: EditorBlock.makeNoopStep,
  Closed: () =>
    EditorBlock.makeFieldsStep(() => ({
      route: () => '/projects',
    })),
  CompletedClose: EditorBlock.makeNoopStep,
})

export const DialogBinding = EditorBlock.makeBinding(DialogBlock, {
  field: 'dialog',
}).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const update = EditorComposition.makeUpdate({
  SavedProject: (model, { project }) =>
    Update.combineSteps(model, [
      EditorBlock.makeFieldsStep(() => ({
        project: () => project,
      })),
      DialogBinding.requestClose(),
    ]),
})
