import { Block } from 'foldkit'

import {
  OutMessage,
  makeComposition,
  makeFieldsStep,
  makeKeyedArrayBinding,
  makeOptionalFieldBinding,
  makeOutMessageFold,
  makeOutMessageStep,
  makeRecordBinding,
  makeRequiredFieldBinding,
} from './block.js'
import { EditorBlock } from './editor.js'

const foldEditorOutMessage = makeOutMessageFold(EditorBlock, {
  Changed: ({ text }) =>
    makeFieldsStep(() => ({ lastChangedText: () => text })),
  Saved: ({ text }) => makeFieldsStep(() => ({ lastSavedText: () => text })),
})

export const PrimaryBinding = makeRequiredFieldBinding(EditorBlock, {
  field: 'primary',
  init: { contextToArgs: () => ['primary'] },
}).withOutMessagePolicy({ fold: foldEditorOutMessage })
export const SecondaryBinding = makeRequiredFieldBinding(EditorBlock, {
  field: 'secondary',
  init: { contextToArgs: () => ['secondary'] },
}).withOutMessagePolicy({ fold: foldEditorOutMessage })
export const FocusedBinding = makeRequiredFieldBinding(EditorBlock, {
  field: 'focused',
  init: { contextToArgs: () => ['focused'] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(EditorBlock, {
    Changed: ({ text }) =>
      makeFieldsStep(() => ({ lastChangedText: () => text })),
    Saved: ({ id, text }) =>
      makeOutMessageStep(() => OutMessage.SavedFocused({ id, text })),
  }),
})
export const MaybeEditorBinding = makeOptionalFieldBinding(EditorBlock, {
  field: 'maybeEditor',
}).withOutMessagePolicy({ fold: foldEditorOutMessage })
export const EditorsBinding = makeRecordBinding(EditorBlock, {
  field: 'editors',
}).withOutMessagePolicy({ fold: foldEditorOutMessage })
export const RowsBinding = makeKeyedArrayBinding(EditorBlock, {
  field: 'rows',
  key: 'key',
  childField: 'model',
}).withOutMessagePolicy({ fold: foldEditorOutMessage })

export const ApplicationComposition = makeComposition({
  bindings: [
    PrimaryBinding,
    SecondaryBinding,
    FocusedBinding,
    MaybeEditorBinding,
    EditorsBinding,
    RowsBinding,
  ],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
