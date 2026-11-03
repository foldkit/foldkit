import { defineMessageUnion } from 'foldkit/message'

import { ApplicationRoute } from '../../route'

export const InMessage = defineMessageUnion({
  InformedOfRouteChange: { route: ApplicationRoute.People },
})
export type InMessage = typeof InMessage.Type
