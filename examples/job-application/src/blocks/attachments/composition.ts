import { Array, Option } from 'effect'
import type { Block } from 'foldkit'

import { FileDrop } from '@foldkit/ui'

import {
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
} from './block'

export const ResumeDropBinding = makeRequiredFieldBinding(
  FileDrop.FileDropBlock,
  {
    field: 'resumeDrop',
    init: { contextToArgs: () => [{ id: 'attachments-resume' }] },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(FileDrop.FileDropBlock, {
    ReceivedFiles: ({ files }) =>
      makeFieldsStep(() => ({
        maybeResume: maybeResume =>
          Option.orElse(Array.head(files), () => maybeResume),
      })),
    RejectedNonFiles: makeNoopStep,
  }),
})

export const AdditionalFilesDropBinding = makeRequiredFieldBinding(
  FileDrop.FileDropBlock,
  {
    field: 'additionalFilesDrop',
    init: { contextToArgs: () => [{ id: 'attachments-additional' }] },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(FileDrop.FileDropBlock, {
    ReceivedFiles: ({ files }) =>
      makeFieldsStep(() => ({
        additionalFiles: Array.appendAll(files),
      })),
    RejectedNonFiles: makeNoopStep,
  }),
})

export const AttachmentsComposition = makeComposition({
  bindings: [ResumeDropBinding, AdditionalFilesDropBinding],
})
export type AttachmentsViewBuilder = Block.ViewBuilderFor<
  typeof AttachmentsComposition
>
