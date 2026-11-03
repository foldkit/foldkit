import { defineMessageUnion } from 'foldkit/message'

export const InMessage = defineMessageUnion({
  RequestedOpen: {},
  RequestedClose: {},
})
export type InMessage = typeof InMessage.Type
