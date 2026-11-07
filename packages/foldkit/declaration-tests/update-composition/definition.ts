import { Context, Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

import { EditorBlock } from './editor.js'

export class DraftStore extends Context.Service<
  DraftStore,
  Readonly<{ save: (text: string) => Effect.Effect<void> }>
>()('DraftStore') {}

export const Model = Schema.Struct({
  editor: EditorBlock.Model,
  title: Schema.String,
  editCount: Schema.Number,
  dispatchCount: Schema.Number,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  UpdatedTitle: { title: Schema.String },
  ReceivedDraft: { title: Schema.String, text: Schema.String },
  CompletedSaveDraft: {},
})
export type Message = typeof Message.Type

export const ApplicationKey = Symbol('DraftApplication')
export const ApplicationBlock = Block.make('DraftApplication', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  effects: { services: [DraftStore] },
  Model,
  Message,
})

export const {
  makeStep,
  makeFieldsStep,
  makeCommandsStep,
  makeNoopStep,
  makeComposition,
} = ApplicationBlock
