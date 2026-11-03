import { MessageComposerComposition } from './composition'
import { makeFieldsStep, makeNoopStep } from './definition'
import { submitMessage } from './steps'

export const update = MessageComposerComposition.makeUpdate({
  UpdatedText: makeFieldsStep.fromMessage(({ value }) => ({
    text: () => value,
  })),
  SubmittedForm: submitMessage,
  CompletedFocusInput: makeNoopStep(),
})
