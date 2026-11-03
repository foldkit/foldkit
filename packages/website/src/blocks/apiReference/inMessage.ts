import { defineMessageUnion } from 'foldkit/message'

export const InMessage = defineMessageUnion({ InformedOfRouteChange: {} })
export type InMessage = typeof InMessage.Type
