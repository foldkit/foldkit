import { String } from 'effect'

import { MessageComposerComposition } from './composition'
import { makeFieldsStep, makeNoopStep } from './definition'
import { OutMessage } from './outMessage'

export const update = MessageComposerComposition.makeUpdate({
  UpdatedText: makeFieldsStep.fromMessage(({ value }) => ({
    text: () => value,
  })),
  SubmittedForm: model => {
    const text = String.trim(model.text)

    if (String.isEmpty(text)) {
      return { model }
    }

    return { model, outMessage: OutMessage.Submitted({ text }) }
  },
  RequestedClear: makeFieldsStep(() => ({ text: () => '' })),
  CompletedFocusInput: makeNoopStep(),
})
