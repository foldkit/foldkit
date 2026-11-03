import { defineMessageUnion } from 'foldkit/message'

export const InMessage = defineMessageUnion({
  RequestedDisconnect: {},
})
export type InMessage = typeof InMessage.Type
