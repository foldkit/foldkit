import { defineInMessageUnion } from 'foldkit/message'

export const InMessage = defineInMessageUnion({
  RequestedOpen: {},
  InformedOfRouteChange: {},
})
export type InMessage = typeof InMessage.Type
