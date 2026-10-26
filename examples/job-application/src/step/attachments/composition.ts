import { Array, Option } from 'effect'
import type { Block } from 'foldkit'

import { FileDropBlock } from '@foldkit/ui'

import {
  AttachmentsDefinition,
  makeFieldsStep,
  makeNoopStep,
} from './definition'

export const ResumeDropBinding = AttachmentsDefinition.makeBinding(
  FileDropBlock,
  {
    field: 'resumeDrop',
    init: { contextToArgs: () => [{ id: 'attachments-resume' }] },
  },
).withOutMessagePolicy({
  fold: AttachmentsDefinition.makeOutMessageFold(FileDropBlock, {
    ReceivedFiles: ({ files }) =>
      makeFieldsStep(() => ({
        maybeResume: maybeResume =>
          Option.orElse(Array.head(files), () => maybeResume),
      })),
    RejectedNonFiles: makeNoopStep,
  }),
})

export const AdditionalFilesDropBinding = AttachmentsDefinition.makeBinding(
  FileDropBlock,
  {
    field: 'additionalFilesDrop',
    init: { contextToArgs: () => [{ id: 'attachments-additional' }] },
  },
).withOutMessagePolicy({
  fold: AttachmentsDefinition.makeOutMessageFold(FileDropBlock, {
    ReceivedFiles: ({ files }) =>
      makeFieldsStep(() => ({
        additionalFiles: Array.appendAll(files),
      })),
    RejectedNonFiles: makeNoopStep,
  }),
})

export const AttachmentsComposition = AttachmentsDefinition.makeComposition({
  bindings: [ResumeDropBinding, AdditionalFilesDropBinding],
})
export type AttachmentsViewBuilder = Block.ViewBuilderFor<
  typeof AttachmentsComposition
>
