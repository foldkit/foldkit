import { ApplicationBlock, makeFieldsStep } from './definition.js'
import { EditorBlock } from './editor.js'

export const EditorBinding = ApplicationBlock.makeRequiredFieldBinding(
  EditorBlock,
  {
    field: 'editor',
  },
).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(EditorBlock, {
    Edited: () =>
      makeFieldsStep(() => ({ editCount: editCount => editCount + 1 })),
  }),
})

export const ApplicationComposition = ApplicationBlock.makeComposition({
  bindings: [EditorBinding],
})

export const { makeUpdate } = ApplicationComposition
