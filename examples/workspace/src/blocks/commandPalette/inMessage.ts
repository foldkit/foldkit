import { defineInMessageUnion } from 'foldkit/message'

export const InMessage = defineInMessageUnion({
  RequestedOpen: {},
  RequestedClose: {},
})
export type InMessage = typeof InMessage.Type
