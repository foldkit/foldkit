import { String } from 'effect'

import {
  MessageComposerComposition,
  OutMessage,
  makeFieldsStep,
  makeStep,
} from './blockInMessageDefinition'

export const submitMessage = makeStep(model => {
  const text = String.trim(model.text)

  if (String.isEmpty(text)) {
    return { model }
  }

  return { model, outMessage: OutMessage.Submitted({ text }) }
})

export const update = MessageComposerComposition.makeUpdate({
  UpdatedText: makeFieldsStep.fromMessage(({ value }) => ({
    text: () => value,
  })),
  SubmittedForm: submitMessage,
})

export const inMessageUpdate = MessageComposerComposition.makeInMessageUpdate({
  RequestedSubmit: submitMessage,
  RequestedClear: makeFieldsStep(() => ({ text: () => '' })),
  InformedOfDraftChanged: makeFieldsStep.fromMessage(({ text }) => ({
    text: () => text,
  })),
})
