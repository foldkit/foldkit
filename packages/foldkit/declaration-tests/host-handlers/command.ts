import { HostDefinition, Message } from './contracts.js'

export const ReadValue = HostDefinition.makeCommand('ReadValue', {
  messages: [Message.CompletedReadValue],
})
