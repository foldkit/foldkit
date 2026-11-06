import { defineInMessageUnion } from 'foldkit/message'

export const InMessage = defineInMessageUnion({
  RequestedSave: {},
})
export type InMessage = typeof InMessage.Type
