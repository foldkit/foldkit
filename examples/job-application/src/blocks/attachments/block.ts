import { Schema } from 'effect'
import { Block, File } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { FileDrop } from '@foldkit/ui'

export const Model = Schema.Struct({
  resumeDrop: FileDrop.FileDropBlock.Model,
  maybeResume: Schema.Option(File.File),
  additionalFilesDrop: FileDrop.FileDropBlock.Model,
  additionalFiles: Schema.Array(File.File),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  RemovedResume: {},
  RemovedAdditionalFile: { fileIndex: Schema.Number },
})
export type Message = typeof Message.Type

export const AttachmentsKey = Symbol('Attachments')
export const AttachmentsBlock = Block.make('Attachments', {
  key: AttachmentsKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message,
})

export const {
  makeRequiredFieldBinding,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
} = AttachmentsBlock
