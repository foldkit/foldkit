import { Schema } from 'effect'
import { Block, File } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { FileDropBlock } from '@foldkit/ui'

export const Model = Schema.Struct({
  resumeDrop: FileDropBlock.Model,
  maybeResume: Schema.Option(File.File),
  additionalFilesDrop: FileDropBlock.Model,
  additionalFiles: Schema.Array(File.File),
})

export const Message = defineMessageUnion({
  RemovedResume: {},
  RemovedAdditionalFile: { fileIndex: Schema.Number },
})

export const AttachmentsDefinition = Block.makeDefinition('Attachments', {
  Model,
  Message,
})

export const { makeFieldsStep, makeNoopStep } = AttachmentsDefinition
