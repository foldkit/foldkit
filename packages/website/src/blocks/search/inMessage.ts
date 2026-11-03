import { defineMessageUnion } from 'foldkit/message'

export const InMessage = defineMessageUnion({
  RequestedOpen: {},
  InformedOfRouteChange: {},
})
export type InMessage = typeof InMessage.Type
