import { Update } from 'foldkit'

import { TimestampSentMessage } from './command'
import { MessageComposerBinding } from './composition'
import { makeCommandsStep } from './definition'

export const recordSentMessage = (text: string) =>
  Update.combineSteps([
    MessageComposerBinding.requestClear(),
    makeCommandsStep(() => [TimestampSentMessage({ text })]),
  ])
