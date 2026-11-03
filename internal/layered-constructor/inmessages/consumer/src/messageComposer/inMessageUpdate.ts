import { MessageComposerComposition } from './composition'
import { makeFieldsStep } from './definition'
import { submitMessage } from './steps'

export const inMessageUpdate = MessageComposerComposition.makeInMessageUpdate({
  RequestedClear: makeFieldsStep(() => ({ text: () => '' })),
  RequestedSubmit: submitMessage,
})
