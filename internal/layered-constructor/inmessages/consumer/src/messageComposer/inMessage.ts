import { defineMessageUnion } from 'foldkit/message'

export const InMessage = defineMessageUnion({
  RequestedClear: {},
  RequestedSubmit: {},
})
export type InMessage = typeof InMessage.Type
