import * as Update from 'foldkit/update'

import { EditorBinding, makeUpdate } from './composition.js'
import { makeFieldsStep, makeNoopStep, makeStep } from './definition.js'
import { commonUpdates } from './sharedUpdates.js'

export const editDocument = makeUpdate({
  UpdatedTitle: makeFieldsStep.fromMessage(({ title }) => ({
    title: () => title,
  })),
  ReceivedDraft: makeStep.fromMessage(({ title, text }) =>
    Update.combineSteps([
      makeFieldsStep(() => ({ title: () => title })),
      EditorBinding.informOfTextChange({ text }),
    ]),
  ),
  CompletedSaveDraft: makeNoopStep(),
})

export const update = makeUpdate.compose(editDocument, commonUpdates)
