import { Update } from 'foldkit'

import { TimestampSentMessage } from './command'
import { MessageComposerBinding } from './composition'
import { makeCommandsStep, makeFieldsStep } from './definition'
import { ConnectionState } from './model'

export const disconnect = makeFieldsStep(() => ({
  connection: () => ConnectionState.Disconnected(),
}))

export const recordSentMessage = (text: string) =>
  Update.combineSteps([
    MessageComposerBinding.requestClear(),
    makeCommandsStep(() => [TimestampSentMessage({ text })]),
  ])
