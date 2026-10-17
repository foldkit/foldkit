import { Array, Option } from 'effect'
import { type Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { FileDrop } from '@foldkit/ui'

import { Attachments, Message, type Model } from './definition'

const foldResumeDropOutMessage = FileDrop.OutMessage.match<
  Update.Step<Model, Message>
>({
  ReceivedFiles:
    ({ files }) =>
    model => ({
      model: modifyFields(model, {
        maybeResume: () =>
          Option.orElse(Array.head(files), () => model.maybeResume),
      }),
    }),
  RejectedNonFiles: () => model => ({ model }),
})

export const ResumeDropBinding = Attachments.bindChild(FileDrop.block, {
  field: 'resumeDrop',
  parentMessage: Message.GotResumeDropMessage,
  init: { args: () => [{ id: 'attachments-resume' }] },
  outMessage: { fold: foldResumeDropOutMessage },
})

const foldAdditionalFilesDropOutMessage = FileDrop.OutMessage.match<
  Update.Step<Model, Message>
>({
  ReceivedFiles:
    ({ files }) =>
    model => ({
      model: modifyFields(model, {
        additionalFiles: Array.appendAll(files),
      }),
    }),
  RejectedNonFiles: () => model => ({ model }),
})

export const AdditionalFilesDropBinding = Attachments.bindChild(
  FileDrop.block,
  {
    field: 'additionalFilesDrop',
    parentMessage: Message.GotAdditionalFilesDropMessage,
    init: { args: () => [{ id: 'attachments-additional' }] },
    outMessage: { fold: foldAdditionalFilesDropOutMessage },
  },
)

export const AttachmentsComposition = Attachments.makeComposition({
  childBindings: [ResumeDropBinding, AdditionalFilesDropBinding],
})
