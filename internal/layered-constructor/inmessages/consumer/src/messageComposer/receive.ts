import { MessageComposerComposition } from './composition'
import { makeFieldsStep } from './definition'
import { submitMessage } from './steps'

export const receive = MessageComposerComposition.makeReceive({
  RequestedClear: makeFieldsStep(() => ({ text: () => '' })),
  RequestedSubmit: submitMessage,
})
