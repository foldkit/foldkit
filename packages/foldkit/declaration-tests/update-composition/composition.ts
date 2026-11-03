import { ApplicationDefinition, makeFieldsStep } from './definition.js'
import { EditorBlock } from './editor.js'

export const EditorBinding = ApplicationDefinition.makeBinding(EditorBlock, {
  field: 'editor',
}).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(EditorBlock, {
    Edited: () =>
      makeFieldsStep(() => ({ editCount: editCount => editCount + 1 })),
  }),
})

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [EditorBinding],
})

export const { makeUpdate } = ApplicationComposition
