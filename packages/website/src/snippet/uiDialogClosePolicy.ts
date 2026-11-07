import { Update } from 'foldkit'

import { Dialog } from '@foldkit/ui'

import {
  EditorComposition,
  Message,
  makeOutMessageFold,
  makeNoopStep,
  makeFieldsStep,
  makeRequiredFieldBinding,
} from './editor/block'

export const DialogBinding = makeRequiredFieldBinding(Dialog.DialogBlock, {
  field: 'dialog',
}).withOutMessagePolicy({
  fold: makeOutMessageFold(Dialog.DialogBlock, {
    Opened: makeNoopStep,
    Closed: () =>
      makeFieldsStep(() => ({
        route: () => '/projects',
      })),
    CompletedClose: makeNoopStep,
  }),
})

export const update = EditorComposition.makeUpdate({
  SavedProject: (model, { project }) =>
    Update.combineSteps(model, [
      makeFieldsStep(() => ({
        project: () => project,
      })),
      DialogBinding.requestClose(),
    ]),
})
