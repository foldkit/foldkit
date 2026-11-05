import { Update } from 'foldkit'

import { DialogBlock } from '@foldkit/ui/dialog'

import {
  EditorComposition,
  Message,
  makeOutMessageFold,
  makeNoopStep,
  makeFieldsStep,
  makeBinding,
} from './editor/block'

const foldDialogOutMessage = makeOutMessageFold(DialogBlock, {
  Opened: makeNoopStep,
  Closed: () =>
    makeFieldsStep(() => ({
      route: () => '/projects',
    })),
  CompletedClose: makeNoopStep,
})

export const DialogBinding = makeBinding(DialogBlock, {
  field: 'dialog',
}).withOutMessagePolicy({ fold: foldDialogOutMessage })

export const update = EditorComposition.makeUpdate({
  SavedProject: (model, { project }) =>
    Update.combineSteps(model, [
      makeFieldsStep(() => ({
        project: () => project,
      })),
      DialogBinding.requestClose(),
    ]),
})
