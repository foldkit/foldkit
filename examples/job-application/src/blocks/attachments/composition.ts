import { Array, Option } from 'effect'
import type { Block } from 'foldkit'

import { FileDropBlock } from '@foldkit/ui/fileDrop'

import { AttachmentsBlock, makeFieldsStep, makeNoopStep } from './definition'

export const ResumeDropBinding = AttachmentsBlock.makeBinding(FileDropBlock, {
  field: 'resumeDrop',
  init: { contextToArgs: () => [{ id: 'attachments-resume' }] },
}).withOutMessagePolicy({
  fold: AttachmentsBlock.makeOutMessageFold(FileDropBlock, {
    ReceivedFiles: ({ files }) =>
      makeFieldsStep(() => ({
        maybeResume: maybeResume =>
          Option.orElse(Array.head(files), () => maybeResume),
      })),
    RejectedNonFiles: makeNoopStep,
  }),
})

export const AdditionalFilesDropBinding = AttachmentsBlock.makeBinding(
  FileDropBlock,
  {
    field: 'additionalFilesDrop',
    init: { contextToArgs: () => [{ id: 'attachments-additional' }] },
  },
).withOutMessagePolicy({
  fold: AttachmentsBlock.makeOutMessageFold(FileDropBlock, {
    ReceivedFiles: ({ files }) =>
      makeFieldsStep(() => ({
        additionalFiles: Array.appendAll(files),
      })),
    RejectedNonFiles: makeNoopStep,
  }),
})

export const AttachmentsComposition = AttachmentsBlock.makeComposition({
  bindings: [ResumeDropBinding, AdditionalFilesDropBinding],
})
export type AttachmentsViewBuilder = Block.ViewBuilderFor<
  typeof AttachmentsComposition
>
