import { defineInMessageUnion } from 'foldkit/message'

export const InMessage = defineInMessageUnion({ InformedOfRouteChange: {} })
export type InMessage = typeof InMessage.Type
