import { Schema } from 'effect'
import { Block, File } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { FileDrop } from '@foldkit/ui'

export const Model = Schema.Struct({
  resumeDrop: FileDrop.Model,
  maybeResume: Schema.Option(File.File),
  additionalFilesDrop: FileDrop.Model,
  additionalFiles: Schema.Array(File.File),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotResumeDropMessage: { message: FileDrop.Message },
  GotAdditionalFilesDropMessage: { message: FileDrop.Message },
  RemovedResume: {},
  RemovedAdditionalFile: { fileIndex: Schema.Number },
})

export type Message = typeof Message.Type

export const Attachments = Block.define('Attachments', {
  Model,
  Message,
})
