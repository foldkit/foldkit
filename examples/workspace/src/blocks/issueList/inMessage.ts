import { defineMessageUnion } from 'foldkit/message'

export const InMessage = defineMessageUnion({
  RequestedClearFilters: {},
})
export type InMessage = typeof InMessage.Type
