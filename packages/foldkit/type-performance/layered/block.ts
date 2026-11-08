import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { DraftStore, EditorBlock } from './editor.js'

export const Model = Schema.Struct({
  primary: EditorBlock.Model,
  secondary: EditorBlock.Model,
  focused: EditorBlock.Model,
  maybeEditor: Schema.Option(EditorBlock.Model),
  editors: Schema.Record(Schema.String, EditorBlock.Model),
  rows: Schema.Array(EditorBlock.Instance),
  lastChangedText: Schema.String,
  lastSavedText: Schema.String,
  updateCount: Schema.Number,
  nextEditorId: Schema.Number,
})
export type Model = typeof Model.Type
export const Message = defineMessageUnion({
  ClickedClearPairedEditors: {},
  ClickedSaveFocused: {},
  ClickedAddEditor: {},
  UpdatedPairedText: { text: Schema.String },
})
export type Message = typeof Message.Type
export const OutMessage = defineMessageUnion({
  SavedFocused: { id: Schema.String, text: Schema.String },
})
export type OutMessage = typeof OutMessage.Type

export const ApplicationKey = Symbol('TypePerformanceLayeredApplication')
export const ApplicationBlock = Block.make(
  'TypePerformanceLayeredApplication',
  {
    key: ApplicationKey,
    Model,
    Message,
    OutMessage,
    InitArgs: Schema.Tuple([]),
    view: { kind: 'Element' },
    effects: { services: [DraftStore] },
  },
)

export const {
  makeComposition,
  makeRequiredFieldBinding,
  makeOptionalFieldBinding,
  makeRecordBinding,
  makeKeyedArrayBinding,
  makeFieldsStep,
  makeOutMessageFold,
  makeOutMessageStep,
  makeStep,
} = ApplicationBlock
